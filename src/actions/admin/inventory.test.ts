import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock("@/lib/auth/guards", () => ({ requireStaff: vi.fn(async () => {}) }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(async () => {}) }));
vi.mock("@/lib/email/emails", () => ({
  sendOrderStatusEmail: vi.fn(async () => {}),
  sendOrderPaymentEmail: vi.fn(async () => {}),
}));

const { prisma } = await import("@/lib/prisma");
const { adjustStockAction } = await import("@/actions/admin/inventory");
const { updateOrderStatusAction } = await import("@/actions/admin/orders");

const suffix = () => Math.random().toString(36).slice(2, 8);
let categoryId: string;

beforeAll(async () => {
  const cat = await prisma.category.create({
    data: { name: "InvTest", slug: `invtest-${Date.now().toString(36)}` },
  });
  categoryId = cat.id;
});

afterAll(async () => {
  await prisma.category.deleteMany({ where: { id: categoryId } });
});

async function makeProduct(stock: number, soldCount = 0) {
  return prisma.product.create({
    data: {
      name: `P-${suffix()}`,
      slug: `p-${suffix()}`,
      sku: `sku-${suffix()}`,
      price: 1000,
      stock,
      soldCount,
      status: "ACTIVE",
      published: true,
      categoryId,
    },
  });
}

function adjustForm(fields: Record<string, string | number>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  return fd;
}

describe("adjustStockAction concurrency", () => {
  it("applies both increments when two restocks run concurrently", async () => {
    // Regression: the old code read `stock`, computed an absolute value, and
    // wrote it back, so both requests wrote 15 and one restock was silently
    // lost. A conditional increment must yield 20.
    const product = await makeProduct(10);

    const results = await Promise.all([
      adjustStockAction(
        { ok: true },
        adjustForm({ productId: product.id, quantityChange: 5, reason: "RESTOCK" })
      ),
      adjustStockAction(
        { ok: true },
        adjustForm({ productId: product.id, quantityChange: 5, reason: "RESTOCK" })
      ),
    ]);

    expect(
      results.every((r) => r.ok),
      JSON.stringify(results)
    ).toBe(true);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.stock).toBe(20);

    await prisma.product.delete({ where: { id: product.id } });
  }, 20000);

  it("rejects a decrement that would go below zero", async () => {
    const product = await makeProduct(3);

    const result = await adjustStockAction(
      { ok: true },
      adjustForm({ productId: product.id, quantityChange: -5, reason: "ADJUSTMENT" })
    );

    expect(result.ok).toBe(false);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.stock).toBe(3);

    await prisma.product.delete({ where: { id: product.id } });
  });

  it("writes no inventory ledger row when the adjustment is rejected", async () => {
    const product = await makeProduct(3);

    await adjustStockAction(
      { ok: true },
      adjustForm({ productId: product.id, quantityChange: -5, reason: "ADJUSTMENT" })
    );

    const ledger = await prisma.inventoryTransaction.count({
      where: { productId: product.id },
    });
    expect(ledger).toBe(0);

    await prisma.product.delete({ where: { id: product.id } });
  });

  it("allows decrementing to exactly zero", async () => {
    const product = await makeProduct(3);

    const result = await adjustStockAction(
      { ok: true },
      adjustForm({ productId: product.id, quantityChange: -3, reason: "ADJUSTMENT" })
    );

    expect(result.ok, `err=${result.error}`).toBe(true);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.stock).toBe(0);

    await prisma.product.delete({ where: { id: product.id } });
  });

  it("adjusts a variant without touching the parent product", async () => {
    const product = await makeProduct(10);
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: "V",
        sku: `v-${suffix()}`,
        price: 1000,
        stock: 4,
        attributes: {},
      },
    });

    const result = await adjustStockAction(
      { ok: true },
      adjustForm({
        productId: product.id,
        variantId: variant.id,
        quantityChange: -3,
        reason: "ADJUSTMENT",
      })
    );

    expect(result.ok).toBe(true);
    const v = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    const p = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(v.stock).toBe(1);
    expect(p.stock).toBe(10);

    await prisma.product.delete({ where: { id: product.id } });
  });
});

describe("updateOrderStatusAction soldCount reversal", () => {
  async function makeOrderWithItem(
    productId: string,
    quantity: number,
    status: "PENDING" | "SHIPPED"
  ) {
    return prisma.order.create({
      data: {
        orderNumber: `ORD-${suffix()}-${Date.now().toString(36)}`,
        status,
        paymentMethod: "CASH_ON_DELIVERY",
        subtotal: 1000 * quantity,
        total: 1000 * quantity,
        customerName: "Tester",
        customerPhone: "01700000000",
        shippingAddress: {},
        items: {
          create: {
            productId,
            productName: "P",
            sku: "S",
            quantity,
            price: 1000,
            total: 1000 * quantity,
          },
        },
      },
      include: { items: true },
    });
  }

  it("restocks stock and reverses soldCount when an order is cancelled", async () => {
    const product = await makeProduct(10, 5);
    const order = await makeOrderWithItem(product.id, 2, "PENDING");

    const result = await updateOrderStatusAction(order.id, "CANCELLED");
    expect(result.ok).toBe(true);

    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.stock).toBe(12);
    expect(after.soldCount).toBe(3);

    await prisma.order.delete({ where: { id: order.id } });
    await prisma.product.delete({ where: { id: product.id } });
  }, 20000);

  it("reverses soldCount on a return as well", async () => {
    const product = await makeProduct(10, 5);
    const order = await makeOrderWithItem(product.id, 2, "SHIPPED");

    const result = await updateOrderStatusAction(order.id, "RETURNED");
    expect(result.ok).toBe(true);

    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.stock).toBe(12);
    expect(after.soldCount).toBe(3);

    await prisma.order.delete({ where: { id: order.id } });
    await prisma.product.delete({ where: { id: product.id } });
  }, 20000);

  it("never drives soldCount below zero", async () => {
    const product = await makeProduct(10, 1);
    const order = await makeOrderWithItem(product.id, 4, "PENDING");

    await updateOrderStatusAction(order.id, "CANCELLED");

    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.soldCount).toBe(0);

    await prisma.order.delete({ where: { id: order.id } });
    await prisma.product.delete({ where: { id: product.id } });
  }, 20000);

  it("cannot restock or decrement twice, since CANCELLED is terminal", async () => {
    const product = await makeProduct(10, 5);
    const order = await makeOrderWithItem(product.id, 2, "PENDING");

    await updateOrderStatusAction(order.id, "CANCELLED");
    const second = await updateOrderStatusAction(order.id, "CANCELLED");
    expect(second.ok).toBe(false);

    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.stock).toBe(12);
    expect(after.soldCount).toBe(3);

    await prisma.order.delete({ where: { id: order.id } });
    await prisma.product.delete({ where: { id: product.id } });
  }, 20000);

  it("does not touch stock or soldCount on a non-restocking transition", async () => {
    const product = await makeProduct(10, 5);
    const order = await makeOrderWithItem(product.id, 2, "PENDING");

    await updateOrderStatusAction(order.id, "CONFIRMED");

    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.stock).toBe(10);
    expect(after.soldCount).toBe(5);

    await prisma.order.delete({ where: { id: order.id } });
    await prisma.product.delete({ where: { id: product.id } });
  }, 20000);
});
