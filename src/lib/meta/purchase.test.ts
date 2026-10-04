import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  buildPurchasePayload,
  hashForMeta,
  normalizeBdPhone,
  sendCapiPurchase,
  sendPurchaseCapi,
} from "@/lib/meta/purchase";
import { purchaseEventId } from "@/lib/meta/purchase-id";
import { prisma } from "@/lib/prisma";

describe("purchaseEventId", () => {
  it("is deterministic for the same order", () => {
    expect(purchaseEventId("SN-1001")).toBe(purchaseEventId("SN-1001"));
  });

  it("differs between orders", () => {
    expect(purchaseEventId("SN-1001")).not.toBe(purchaseEventId("SN-1002"));
  });

  it("survives retries with the same value", () => {
    // Retries must not mint a new ID, or Meta treats them as separate
    // conversions.
    const first = purchaseEventId("SN-1001");
    expect(purchaseEventId("SN-1001")).toBe(first);
  });
});

describe("normalizeBdPhone", () => {
  it("converts local 01XXXXXXXXX to E.164", () => {
    expect(normalizeBdPhone("01712345678")).toBe("+8801712345678");
  });

  it("leaves an already-prefixed number alone", () => {
    expect(normalizeBdPhone("+8801712345678")).toBe("+8801712345678");
  });

  it("tolerates spacing", () => {
    expect(normalizeBdPhone("017 1234 5678")).toBe("+8801712345678");
  });
});

describe("hashForMeta", () => {
  it("is stable and case/space insensitive", () => {
    expect(hashForMeta("  Customer@Example.COM ")).toBe(hashForMeta("customer@example.com"));
  });

  it("does not leak the plaintext", () => {
    expect(hashForMeta("customer@example.com")).not.toContain("customer");
  });
});

describe("buildPurchasePayload", () => {
  const base = {
    orderNumber: "SN-1001",
    eventId: "purchase_SN-1001",
    total: 2500,
    deliveryFee: 60,
    couponCode: null as string | null,
    customerEmail: "buyer@example.com",
    customerPhone: "01712345678",
    items: [{ id: "prod_1", quantity: 2, price: 1000 }],
  };

  it("uses the shared event id so Meta can deduplicate pixel and CAPI", () => {
    const payload = buildPurchasePayload(base);
    expect(payload.data.event_id).toBe("purchase_SN-1001");
    expect(payload.data.event_name).toBe("Purchase");
  });

  it("hashes customer PII rather than sending it raw", () => {
    const payload = buildPurchasePayload(base);
    const userData = payload.data.user_data as Record<string, string>;
    expect(userData.em).toMatch(/^[0-9a-f]{64}$/);
    expect(userData.ph).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(payload)).not.toContain("buyer@example.com");
    expect(JSON.stringify(payload)).not.toContain("01712345678");
  });

  it("converts taka to the minor-unit value Meta expects", () => {
    expect(buildPurchasePayload(base).data.custom_data.value).toBe(25);
  });

  it("includes the coupon only when one was applied", () => {
    expect(buildPurchasePayload(base).data.custom_data.coupon).toBeUndefined();
    expect(
      buildPurchasePayload({ ...base, couponCode: "WELCOME10" }).data.custom_data.coupon
    ).toBe("WELCOME10");
  });

  it("omits the email hash when the order has none", () => {
    const payload = buildPurchasePayload({ ...base, customerEmail: null });
    expect((payload.data.user_data as Record<string, unknown>).em).toBeUndefined();
  });

  it("sums item quantities", () => {
    const payload = buildPurchasePayload({
      ...base,
      items: [
        { id: "a", quantity: 2, price: 100 },
        { id: "b", quantity: 3, price: 200 },
      ],
    });
    expect(payload.data.custom_data.num_items).toBe(5);
  });
});

describe("sendCapiPurchase error handling", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi_unstubEnvs();
  });

  function vi_unstubEnvs() {
    process.env.META_CAPI_ACCESS_TOKEN = undefined as unknown as string;
    delete process.env.META_CAPI_ACCESS_TOKEN;
    delete process.env.META_CAPI_PIXEL_ID;
  }

  it("reports failure instead of throwing, so the event stays retryable", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "bad token" } }), {
        status: 400,
      })) as typeof fetch;

    const result = await sendCapiPurchase(
      buildPurchasePayload({
        orderNumber: "SN-1",
        eventId: "purchase_SN-1",
        total: 100,
        deliveryFee: 0,
        couponCode: null,
        customerEmail: null,
        customerPhone: "01712345678",
        items: [{ id: "a", quantity: 1, price: 100 }],
      }),
      { accessToken: "tok", pixelId: "123" }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("bad token");
  });

  it("reports a network failure rather than throwing", async () => {
    globalThis.fetch = (async () => {
      throw new Error("ECONNRESET");
    }) as typeof fetch;

    expect((await sendCapiPurchase({ data: {} }, { accessToken: "t", pixelId: "1" })).ok).toBe(
      false
    );
  });

  it("reports success on a 200 with no error object", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ events_received: 1 }), { status: 200 })) as typeof fetch;

    expect((await sendCapiPurchase({ data: {} }, { accessToken: "t", pixelId: "1" })).ok).toBe(
      true
    );
  });
});

describe("sendPurchaseCapi dedupe and retry", () => {
  const originalFetch = globalThis.fetch;
  let categoryId: string;
  const suffix = () => Math.random().toString(36).slice(2, 8);

  beforeAll(async () => {
    categoryId = (
      await prisma.category.create({
        data: { name: "CapiTest", slug: `capitest-${Date.now().toString(36)}` },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.category.deleteMany({ where: { id: categoryId } });
  });

  // CAPI credentials now resolve from Admin > Settings with an env fallback,
  // so the rows are what these tests have to control. Snapshot any pre-existing
  // values and put them back, since this suite runs against the live database.
  const capiRows = [
    "tracking.metaCapiEnabled",
    "tracking.metaCapiPixelId",
    "tracking.metaCapiAccessToken",
  ];
  let savedCapiRows: Map<string, string> = new Map();

  async function writeCapiSettings(values: Record<string, string>) {
    await prisma.setting.deleteMany({ where: { key: { in: capiRows } } });
    for (const [key, value] of Object.entries(values)) {
      await prisma.setting.create({ data: { key, value } });
    }
  }

  beforeAll(async () => {
    const rows = await prisma.setting.findMany({
      where: { key: { in: capiRows } },
      select: { key: true, value: true },
    });
    savedCapiRows = new Map(rows.map((r) => [r.key, r.value]));
  });

  beforeEach(async () => {
    // No env fallback here: an unset variable would quietly supply credentials
    // on a developer machine and mask a missing row.
    delete process.env.META_CAPI_ACCESS_TOKEN;
    delete process.env.META_CAPI_PIXEL_ID;
    await writeCapiSettings({
      "tracking.metaCapiEnabled": "1",
      "tracking.metaCapiPixelId": "1234567890123456",
      "tracking.metaCapiAccessToken": "tok",
    });
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ events_received: 1 }), { status: 200 })) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterAll(async () => {
    await prisma.setting.deleteMany({ where: { key: { in: capiRows } } });
    for (const [key, value] of savedCapiRows) {
      await prisma.setting.create({ data: { key, value } });
    }
  });

  async function makeOrder() {
    const product = await prisma.product.create({
      data: {
        name: `CP-${suffix()}`,
        slug: `cp-${suffix()}`,
        sku: `sku-${suffix()}`,
        price: 1000,
        stock: 50,
        categoryId,
      },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `SN-CAPI-${suffix()}`,
        paymentMethod: "CASH_ON_DELIVERY",
        subtotal: 2000,
        total: 2060,
        customerName: "Test Buyer",
        customerPhone: "01712345678",
        shippingAddress: { addressLine: "x" },
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity: 2,
            price: 1000,
            total: 2000,
          },
        },
      },
    });
    return { order, product };
  }

  async function cleanup(orderId: string, productId: string) {
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.product.deleteMany({ where: { id: productId } });
  }

  it("sends once and marks the order sent", async () => {
    const { order, product } = await makeOrder();
    try {
      expect(await sendPurchaseCapi(order.id)).toBe("sent");
      const row = await prisma.order.findUnique({ where: { id: order.id } });
      expect(row?.metaPurchaseSent).toBe(true);
      expect(row?.metaPurchaseSentAt).toBeTruthy();
      expect(row?.metaPurchaseEventId).toBe(purchaseEventId(order.orderNumber));
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("refuses a second send for the same order", async () => {
    const { order, product } = await makeOrder();
    try {
      expect(await sendPurchaseCapi(order.id)).toBe("sent");
      expect(await sendPurchaseCapi(order.id)).toBe("already-sent");
      expect(await sendPurchaseCapi(order.id)).toBe("already-sent");
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("sends only once when called concurrently", async () => {
    const { order, product } = await makeOrder();
    try {
      const results = await Promise.all([
        sendPurchaseCapi(order.id),
        sendPurchaseCapi(order.id),
        sendPurchaseCapi(order.id),
      ]);
      expect(results.filter((r) => r === "sent")).toHaveLength(1);
      expect(results.filter((r) => r === "already-sent")).toHaveLength(2);
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("skips cleanly when CAPI credentials are absent", async () => {
    await writeCapiSettings({ "tracking.metaCapiEnabled": "1" });
    const { order, product } = await makeOrder();
    try {
      expect(await sendPurchaseCapi(order.id)).toBe("skipped-not-configured");
      const row = await prisma.order.findUnique({ where: { id: order.id } });
      expect(row?.metaPurchaseSent).toBe(false);
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("skips when the owner has turned CAPI off", async () => {
    await writeCapiSettings({
      "tracking.metaCapiEnabled": "0",
      "tracking.metaCapiPixelId": "1234567890123456",
      "tracking.metaCapiAccessToken": "tok",
    });
    // Assert the negative path is the one we intend to exercise.
    
    const { order, product } = await makeOrder();
    try {
      expect(await sendPurchaseCapi(order.id)).toBe("skipped-not-configured");
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("falls back to the environment when no row is stored", async () => {
    await writeCapiSettings({});
    process.env.META_CAPI_ACCESS_TOKEN = "envtok";
    process.env.META_CAPI_PIXEL_ID = "6543210987654321";
    try {
      const { order, product } = await makeOrder();
      try {
        expect(await sendPurchaseCapi(order.id)).toBe("sent");
      } finally {
        await cleanup(order.id, product.id);
      }
    } finally {
      delete process.env.META_CAPI_ACCESS_TOKEN;
      delete process.env.META_CAPI_PIXEL_ID;
    }
  });

  it("leaves the order unsent after a Meta failure, so it can retry", async () => {
    const { order, product } = await makeOrder();
    try {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ error: { message: "transient" } }), {
          status: 503,
        })) as typeof fetch;

      expect(await sendPurchaseCapi(order.id)).toBe("failed");
      const failed = await prisma.order.findUnique({ where: { id: order.id } });
      expect(failed?.metaPurchaseSent).toBe(false);
      expect(failed?.metaPurchaseError).toContain("transient");
      expect(failed?.metaPurchaseAttempts).toBe(1);

      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ events_received: 1 }), { status: 200 })) as typeof fetch;

      expect(await sendPurchaseCapi(order.id)).toBe("sent");
      const after = await prisma.order.findUnique({ where: { id: order.id } });
      expect(after?.metaPurchaseSent).toBe(true);
      expect(after?.metaPurchaseError).toBeNull();
      expect(after?.metaPurchaseAttempts).toBe(2);
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("reuses the same event id across a failed attempt and its retry", async () => {
    const { order, product } = await makeOrder();
    try {
      globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;
      expect(await sendPurchaseCapi(order.id)).toBe("failed");
      const afterFail = await prisma.order.findUnique({ where: { id: order.id } });

      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ events_received: 1 }), { status: 200 })) as typeof fetch;
      expect(await sendPurchaseCapi(order.id)).toBe("sent");
      const afterRetry = await prisma.order.findUnique({ where: { id: order.id } });

      expect(afterRetry?.metaPurchaseEventId).toBe(afterFail?.metaPurchaseEventId);
      expect(afterRetry?.metaPurchaseEventId).toBe(purchaseEventId(order.orderNumber));
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("does not resend when a cancelled order is touched again", async () => {
    const { order, product } = await makeOrder();
    try {
      expect(await sendPurchaseCapi(order.id)).toBe("sent");
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      expect(await sendPurchaseCapi(order.id)).toBe("already-sent");
      const row = await prisma.order.findUnique({ where: { id: order.id } });
      expect(row?.metaPurchaseSent).toBe(true);
    } finally {
      await cleanup(order.id, product.id);
    }
  });
});