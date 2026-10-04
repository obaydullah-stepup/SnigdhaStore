import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getInvoiceOrder } from "@/lib/data/invoice";

const rnd = () => Math.random().toString(36).slice(2, 8);

let ownerId: string;
let otherUserId: string;
let orderId: string;

async function makeOrder() {
  const order = await prisma.order.create({
    data: {
      orderNumber: `INV-${rnd().toUpperCase()}`,
      userId: ownerId,
      status: "DELIVERED",
      paymentStatus: "PAID",
      paymentMethod: "CASH_ON_DELIVERY",
      subtotal: 3000,
      discount: 500,
      deliveryFee: 60,
      total: 2560,
      couponCode: "SAVE10",
      customerName: "Owner Tester",
      customerPhone: "+8801700000000",
      customerEmail: "owner@example.com",
      shippingAddress: {
        name: "Owner Tester",
        phone: "+8801700000000",
        addressLine: "12 Green Road",
        area: "Dhanmondi",
        district: "Dhaka",
        division: "Dhaka",
        postalCode: "1209",
      },
      // Staff-only field: must never reach a customer-facing invoice.
      internalNote: "customer asked for gift wrap",
      items: {
        create: [
          {
            productName: "Cotton Kurti",
            sku: "SKU-1",
            quantity: 2,
            price: 1000,
            total: 2000,
          },
          {
            productName: "Woven Scarf",
            sku: "SKU-2",
            quantity: 1,
            price: 1000,
            total: 1000,
          },
        ],
      },
    },
    include: { items: true },
  });
  orderId = order.id;
}

beforeEach(async () => {
  const [owner, other] = await Promise.all([
    prisma.user.create({
      data: { email: `inv-owner-${rnd()}@example.com`, passwordHash: "x", name: "Owner" },
    }),
    prisma.user.create({
      data: { email: `inv-other-${rnd()}@example.com`, passwordHash: "x", name: "Other" },
    }),
  ]);
  ownerId = owner.id;
  otherUserId = other.id;
  await makeOrder();
});

afterEach(async () => {
  // Scoped strictly to rows this file created.
  await prisma.orderItem.deleteMany({ where: { orderId } });
  await prisma.order.deleteMany({ where: { id: orderId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherUserId] } } });
});

describe("getInvoiceOrder", () => {
  it("returns the order for its owner", async () => {
    const invoice = await getInvoiceOrder(orderId, { userId: ownerId });
    expect(invoice).not.toBeNull();
    expect(invoice?.orderNumber).toMatch(/^INV-/);
  });

  it("returns null when scoped to a different user", async () => {
    // The security-critical case: another customer must not read this order.
    const invoice = await getInvoiceOrder(orderId, { userId: otherUserId });
    expect(invoice).toBeNull();
  });

  it("returns null for an unknown order id", async () => {
    expect(await getInvoiceOrder("does-not-exist")).toBeNull();
    expect(await getInvoiceOrder("does-not-exist", { userId: ownerId })).toBeNull();
  });

  it("never exposes the staff-only internal note", async () => {
    const scoped = await getInvoiceOrder(orderId, { userId: ownerId });
    const unscoped = await getInvoiceOrder(orderId);
    expect(JSON.stringify(scoped)).not.toContain("gift wrap");
    expect(scoped).not.toHaveProperty("internalNote");
    // The unscoped staff call is still allowed, but never carries the field.
    expect(unscoped).not.toHaveProperty("internalNote");
  });

  it("carries the money fields the invoice renders", async () => {
    const invoice = await getInvoiceOrder(orderId);
    expect(invoice?.subtotal).toBe(3000);
    expect(invoice?.discount).toBe(500);
    expect(invoice?.deliveryFee).toBe(60);
    expect(invoice?.total).toBe(2560);
    expect(invoice?.couponCode).toBe("SAVE10");
  });

  it("keeps line-item snapshots after the product is deleted", async () => {
    const invoice = await getInvoiceOrder(orderId);
    expect(invoice?.items).toHaveLength(2);
    // productId is null on these rows, so the sheet must fall back to the
    // denormalized productName.
    expect(invoice?.items.map((i) => i.productName)).toEqual([
      "Cotton Kurti",
      "Woven Scarf",
    ]);
    expect(invoice?.items.every((i) => i.product === null)).toBe(true);
    const lineSum = invoice!.items.reduce((sum, i) => sum + i.total, 0);
    expect(lineSum).toBe(3000);
  });
});
