import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  InvoiceDocument,
  type InvoiceBrand,
  type InvoiceOrder,
} from "@/components/invoice/invoice-document";
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/client";

const brand: InvoiceBrand = {
  storeName: "Acme",
  footerPhone: "+880 1700-000000",
  footerDescription: "Everything you need.",
  footerRights: "All rights reserved.",
};

function makeOrder(overrides: Partial<InvoiceOrder> = {}): InvoiceOrder {
  return {
    orderNumber: "INV-1001",
    status: "DELIVERED" as OrderStatus,
    paymentMethod: "CASH_ON_DELIVERY" as PaymentMethod,
    paymentStatus: "PAID" as PaymentStatus,
    subtotal: 3000,
    discount: 500,
    deliveryFee: 60,
    total: 2560,
    couponCode: "SAVE10",
    customerName: "Ayesha Rahman",
    customerPhone: "+8801700000000",
    customerEmail: "ayesha@example.com",
    createdAt: new Date("2026-03-14T10:30:00Z"),
    shippingAddress: {
      name: "Ayesha Rahman",
      phone: "+8801700000000",
      addressLine: "12 Green Road",
      area: "Dhanmondi",
      district: "Dhaka",
      division: "Dhaka",
      postalCode: "1209",
    },
    items: [
      {
        id: "i1",
        productName: "Cotton Kurti",
        sku: "SKU-1",
        quantity: 2,
        price: 1000,
        total: 2000,
        product: null,
        variant: null,
      },
      {
        id: "i2",
        productName: "Woven Scarf",
        sku: "SKU-2",
        quantity: 1,
        price: 1000,
        total: 1000,
        product: { name: "Woven Scarf" },
        variant: { name: "Maroon" },
      },
    ],
    ...overrides,
  };
}

const render = (order: InvoiceOrder) =>
  renderToStaticMarkup(<InvoiceDocument order={order} brand={brand} />);

describe("InvoiceDocument", () => {
  it("shows the store name from settings, not a hardcoded brand", () => {
    const html = render(makeOrder());
    expect(html).toContain("Acme");
    expect(html).not.toMatch(/Snigdha/i);
  });

  it("renders the order number, status and coupon", () => {
    const html = render(makeOrder());
    expect(html).toContain("INV-1001");
    expect(html).toContain("Delivered");
    expect(html).toContain("SAVE10");
  });

  it("renders the shipping address and customer contact", () => {
    const html = render(makeOrder());
    expect(html).toContain("12 Green Road");
    expect(html).toContain("Dhanmondi");
    expect(html).toContain("+8801700000000");
    expect(html).toContain("ayesha@example.com");
  });

  it("renders all four money rows with the taka symbol", () => {
    const html = render(makeOrder());
    expect(html).toContain("৳3,000"); // subtotal
    expect(html).toContain("-৳500"); // discount
    expect(html).toContain("৳60"); // delivery
    expect(html).toContain("৳2,560"); // total
  });

  it("falls back to the denormalized product name when the product is gone", () => {
    const html = render(makeOrder());
    expect(html).toContain("Cotton Kurti");
    expect(html).toContain("Woven Scarf");
    // Variant is rendered alongside the line item.
    expect(html).toContain("Maroon");
  });

  it("renders a zero discount as 0 rather than a negative", () => {
    const html = render(makeOrder({ discount: 0 }));
    expect(html).not.toContain("-৳");
    expect(html).toContain("৳0");
  });

  it("shows an em dash when no coupon was used", () => {
    const html = render(makeOrder({ couponCode: null }));
    expect(html).toContain("—");
  });

  it("omits the email line entirely for a guest order with no email", () => {
    const html = render(makeOrder({ customerEmail: null }));
    expect(html).not.toContain("example.com");
  });

  it("marks the sheet for print styling", () => {
    const html = render(makeOrder());
    expect(html).toContain("invoice-sheet");
  });
});
