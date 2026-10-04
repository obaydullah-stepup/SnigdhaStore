import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn<(orderId: string) => Promise<unknown>>();

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
vi.mock("@/lib/meta/purchase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/meta/purchase")>();
  return {
    ...actual,
    sendPurchaseCapi: (orderId: string) => sendMock(orderId),
  };
});

const triggerState = { value: "immediately" as "immediately" | "confirmed" };

vi.mock("@/lib/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/settings")>();
  return {
    ...actual,
    getCachedPurchaseTrigger: async () => triggerState.value,
    getCachedAnalyticsSettings: async () => ({
      metaPixelId: "1234567890123456",
      metaPixelEnabled: true,
      metaPixelSource: "admin" as const,
      purchaseTrigger: triggerState.value,
    }),
  };
});

const { prisma } = await import("@/lib/prisma");
type OrderStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED";
const { triggerPurchaseIfDue, triggerPurchaseOnConfirmation } = await import(
  "@/lib/meta/trigger"
);
const { updateOrderStatusAction } = await import("@/actions/admin/orders");

const suffix = () => Math.random().toString(36).slice(2, 8);
let categoryId: string;

beforeAll(async () => {
  categoryId = (
    await prisma.category.create({
      data: { name: "MetaTest", slug: `metatest-${Date.now().toString(36)}` },
    })
  ).id;
});

afterAll(async () => {
  await prisma.category.deleteMany({ where: { id: categoryId } });
});

beforeEach(() => {
  triggerState.value = "immediately";
  sendMock.mockReset();
  sendMock.mockResolvedValue("sent");
});

async function makeOrder(status: OrderStatus = "PENDING") {
  const product = await prisma.product.create({
    data: {
      name: `MP-${suffix()}`,
      slug: `mp-${suffix()}`,
      sku: `sku-${suffix()}`,
      price: 1000,
      stock: 50,
      categoryId,
    },
  });
  const order = await prisma.order.create({
    data: {
      orderNumber: `SN-META-${suffix()}`,
      status,
      paymentMethod: "CASH_ON_DELIVERY",
      subtotal: 2000,
      total: 2060,
      deliveryFee: 60,
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

describe("immediately trigger", () => {
  it("sends Purchase for a newly placed order", async () => {
    triggerState.value = "immediately";
    const { order, product } = await makeOrder();
    try {
      await triggerPurchaseIfDue(order.id);
      expect(sendMock).toHaveBeenCalledWith(order.id);
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("does not send on confirmation while set to immediately", async () => {
    triggerState.value = "immediately";
    const { order, product } = await makeOrder();
    try {
      await triggerPurchaseOnConfirmation(order.id, "PENDING", "CONFIRMED");
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      await cleanup(order.id, product.id);
    }
  });
});

describe("confirmed trigger", () => {
  it("does not send when the order is created", async () => {
    triggerState.value = "confirmed";
    const { order, product } = await makeOrder();
    try {
      await triggerPurchaseIfDue(order.id);
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("sends on PENDING -> CONFIRMED", async () => {
    triggerState.value = "confirmed";
    const { order, product } = await makeOrder();
    try {
      await triggerPurchaseOnConfirmation(order.id, "PENDING", "CONFIRMED");
      expect(sendMock).toHaveBeenCalledWith(order.id);
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("sends on PROCESSING -> CONFIRMED, not only PENDING", async () => {
    // ORDER_TRANSITIONS allows PROCESSING -> CONFIRMED, so an order that
    // bounces through Processing first must still report a Purchase.
    triggerState.value = "confirmed";
    const { order, product } = await makeOrder("PROCESSING");
    try {
      await triggerPurchaseOnConfirmation(order.id, "PROCESSING", "CONFIRMED");
      expect(sendMock).toHaveBeenCalledWith(order.id);
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("ignores transitions that do not reach CONFIRMED", async () => {
    triggerState.value = "confirmed";
    const { order, product } = await makeOrder();
    try {
      await triggerPurchaseOnConfirmation(order.id, "PENDING", "PROCESSING");
      await triggerPurchaseOnConfirmation(order.id, "PENDING", "CANCELLED");
      await triggerPurchaseOnConfirmation(order.id, "CONFIRMED", "RETURNED");
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("ignores an invalid transition that does not exist in the map", async () => {
    triggerState.value = "confirmed";
    const { order, product } = await makeOrder("DELIVERED");
    try {
      // DELIVERED -> CONFIRMED is not an allowed edge.
      await triggerPurchaseOnConfirmation(order.id, "DELIVERED", "CONFIRMED");
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("delegates repeat handling to the dedupe layer", async () => {
    triggerState.value = "confirmed";
    const { order, product } = await makeOrder();
    try {
      await triggerPurchaseOnConfirmation(order.id, "PENDING", "CONFIRMED");
      await triggerPurchaseOnConfirmation(order.id, "PENDING", "CONFIRMED");
      // The trigger is called on every confirmation attempt; sendPurchaseCapi
      // is the single gate that stops the duplicate Purchase.
      expect(sendMock).toHaveBeenCalledTimes(2);
    } finally {
      await cleanup(order.id, product.id);
    }
  });
});

describe("cancelled COD orders", () => {
  it("never sends a Purchase for a cancellation or return", async () => {
    triggerState.value = "confirmed";
    const { order, product } = await makeOrder();
    try {
      await triggerPurchaseOnConfirmation(order.id, "CONFIRMED", "CANCELLED");
      await triggerPurchaseOnConfirmation(order.id, "DELIVERED", "RETURNED");
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("keeps a sent Purchase flagged as sent after cancellation", async () => {
    triggerState.value = "confirmed";
    const { order, product } = await makeOrder();
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: { metaPurchaseSent: true, metaPurchaseEventId: "purchase_seed" },
      });

      const cancelled = await updateOrderStatusAction(order.id, "CONFIRMED");
      expect(cancelled.ok).toBe(true);
      const row = await prisma.order.findUnique({ where: { id: order.id } });
      expect(row?.metaPurchaseSent).toBe(true);
      expect(row?.metaPurchaseEventId).toBe("purchase_seed");
    } finally {
      await cleanup(order.id, product.id);
    }
  });
});

describe("admin status change integration", () => {
  it("fires Purchase when an admin confirms an order in confirmed mode", async () => {
    triggerState.value = "confirmed";
    const { order, product } = await makeOrder();
    try {
      const res = await updateOrderStatusAction(order.id, "CONFIRMED");
      expect(res.ok).toBe(true);
      expect(sendMock).toHaveBeenCalledWith(order.id);
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("does not fire on creation in confirmed mode", async () => {
    triggerState.value = "confirmed";
    const { order, product } = await makeOrder();
    try {
      await prisma.order.create({
        data: {
          orderNumber: `SN-RAW-${suffix()}`,
          paymentMethod: "CASH_ON_DELIVERY",
          subtotal: 100,
          total: 100,
          customerName: "Raw",
          customerPhone: "01712345678",
          shippingAddress: { addressLine: "x" },
        },
      });
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      await prisma.order.deleteMany({ where: { orderNumber: { startsWith: "SN-RAW-" } } });
      await cleanup(order.id, product.id);
    }
  });

  it("fires on PROCESSING -> CONFIRMED through the admin action", async () => {
    triggerState.value = "confirmed";
    const { order, product } = await makeOrder();
    try {
      expect((await updateOrderStatusAction(order.id, "PROCESSING")).ok).toBe(true);
      sendMock.mockClear();
      expect((await updateOrderStatusAction(order.id, "CONFIRMED")).ok).toBe(true);
      expect(sendMock).toHaveBeenCalledWith(order.id);
    } finally {
      await cleanup(order.id, product.id);
    }
  });
});

describe("changing the setting", () => {
  it("does not reset metaPurchaseSent on existing orders", async () => {
    const { order, product } = await makeOrder();
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: { metaPurchaseSent: true },
      });
      triggerState.value = "confirmed";
      await triggerPurchaseIfDue(order.id);
      triggerState.value = "immediately";
      await triggerPurchaseIfDue(order.id);
      const row = await prisma.order.findUnique({ where: { id: order.id } });
      expect(row?.metaPurchaseSent).toBe(true);
    } finally {
      await cleanup(order.id, product.id);
    }
  });

  it("applies the new trigger only to later triggering actions", async () => {
    const { order, product } = await makeOrder();
    try {
      // Placed while "confirmed" was active, so creation sent nothing.
      triggerState.value = "confirmed";
      await triggerPurchaseIfDue(order.id);
      expect(sendMock).not.toHaveBeenCalled();

      // Switched to "immediately" before the admin confirms: confirmation is no
      // longer a trigger point, so still nothing.
      triggerState.value = "immediately";
      await triggerPurchaseOnConfirmation(order.id, "PENDING", "CONFIRMED");
      expect(sendMock).not.toHaveBeenCalled();

      // The creation trigger is live again for any new order.
      await triggerPurchaseIfDue(order.id);
      expect(sendMock).toHaveBeenCalledWith(order.id);
    } finally {
      await cleanup(order.id, product.id);
    }
  });
});