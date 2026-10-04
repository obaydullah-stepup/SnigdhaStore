import type {
  Order,
  OrderItem,
  Product,
  ProductVariant,
} from "@/generated/prisma/client";
import { formatPrice, formatShippingAddress } from "@/lib/utils";
import { paymentStatusLabel, statusLabel } from "@/lib/order-status";
import { paymentMethodLabel } from "@/lib/payments/labels";

/**
 * Store identity shown in the invoice header. A structural subset of
 * `LayoutSettings` so callers can pass the whole settings object straight in.
 */
export type InvoiceBrand = {
  storeName: string;
  footerPhone: string;
  footerDescription: string;
  footerRights: string;
};

/** One invoice line. Kept structural rather than extending the model, so the
 * loader may select only what the sheet needs. */
type InvoiceItem = Pick<
  OrderItem,
  "id" | "productName" | "sku" | "quantity" | "price" | "total"
> & {
  product: Pick<Product, "name"> | null;
  variant: Pick<ProductVariant, "name"> | null;
};

export type InvoiceOrder = Pick<
  Order,
  | "orderNumber"
  | "status"
  | "paymentMethod"
  | "paymentStatus"
  | "subtotal"
  | "discount"
  | "deliveryFee"
  | "total"
  | "couponCode"
  | "customerName"
  | "customerPhone"
  | "customerEmail"
  | "createdAt"
  | "shippingAddress"
> & {
  items: InvoiceItem[];
};

/**
 * The printable invoice sheet, shared by the staff and customer routes so both
 * render exactly the same document.
 *
 * Everything here uses inline `style` objects rather than theme classes on
 * purpose: the sheet is printed on white paper, and the inline colours survive
 * Tailwind theme changes and `prefers-color-scheme`.
 */
export function InvoiceDocument({
  order,
  brand,
}: {
  order: InvoiceOrder;
  brand: InvoiceBrand;
}) {
  const address = (order.shippingAddress ?? {}) as {
    name?: string;
    phone?: string;
    division?: string;
    district?: string;
    area?: string;
    addressLine?: string;
    postalCode?: string | null;
  };

  return (
    <div className="invoice-sheet mx-auto w-full max-w-3xl bg-white px-8 py-10 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p style={{ fontSize: 22, fontWeight: 700 }}>{brand.storeName}</p>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            {brand.footerPhone}
            <br />
            {brand.footerDescription}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 18, fontWeight: 700, textTransform: "uppercase" }}>
            Invoice
          </p>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            {order.orderNumber}
            <br />
            {order.createdAt.toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 28,
          paddingTop: 16,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>BILLED TO</p>
          <p style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
            {order.customerName}
          </p>
          <p style={{ fontSize: 13, color: "#4b5563" }}>
            {order.customerPhone}
            {order.customerEmail ? (
              <>
                <br />
                {order.customerEmail}
              </>
            ) : null}
            <br />
            {formatShippingAddress(address)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>ORDER DETAILS</p>
          <p style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>
            Status: <strong>{statusLabel(order.status)}</strong>
            <br />
            Payment: {order.paymentMethod ? paymentMethodLabel(order.paymentMethod) : paymentStatusLabel(order.paymentStatus)}
            <br />
            Coupon: {order.couponCode ?? "—"}
          </p>
        </div>
      </div>

      <table
        style={{ width: "100%", marginTop: 28, borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #111827", textAlign: "left" }}>
            <th style={{ padding: "8px 0" }}>Item</th>
            <th style={{ padding: "8px 0", textAlign: "center" }}>Qty</th>
            <th style={{ padding: "8px 0", textAlign: "right" }}>Unit</th>
            <th style={{ padding: "8px 0", textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px 0" }}>
                {item.product?.name ?? item.productName}
                {item.variant ? (
                  <span style={{ color: "#6b7280" }}> · {item.variant.name}</span>
                ) : null}
              </td>
              <td style={{ padding: "10px 0", textAlign: "center" }}>{item.quantity}</td>
              <td style={{ padding: "10px 0", textAlign: "right" }}>
                {formatPrice(item.price)}
              </td>
              <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>
                {formatPrice(item.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <div style={{ width: 240, fontSize: 13 }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}
          >
            <span style={{ color: "#6b7280" }}>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div
            style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}
          >
            <span style={{ color: "#6b7280" }}>Discount</span>
            <span>
              {order.discount > 0 ? `-${formatPrice(order.discount)}` : formatPrice(0)}
            </span>
          </div>
          <div
            style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}
          >
            <span style={{ color: "#6b7280" }}>Delivery</span>
            <span>{formatPrice(order.deliveryFee)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "2px solid #111827",
              padding: "8px 0",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <p
        style={{
          marginTop: 40,
          paddingTop: 12,
          borderTop: "1px solid #e5e7eb",
          fontSize: 12,
          color: "#9ca3af",
          textAlign: "center",
        }}
      >
        Thank you for shopping with {brand.storeName}. {brand.footerRights}
      </p>
    </div>
  );
}
