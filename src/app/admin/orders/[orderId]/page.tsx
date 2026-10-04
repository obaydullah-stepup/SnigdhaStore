import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { formatPrice, formatShippingAddress } from "@/lib/utils";
import {
  paymentStatusLabel,
  paymentStatusTone,
  statusLabel,
  statusTone,
} from "@/lib/order-status";
import { getAdminOrder } from "@/lib/data/admin/orders";
import { paymentMethodLabel } from "@/lib/payments/labels";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { OrderTimeline } from "@/components/account/order-timeline";
import { OrderStatusControl } from "@/components/admin/order-status-control";

export const metadata = { title: "Order detail" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requireStaff();
  const { orderId } = await params;
  const order = await getAdminOrder(orderId);
  if (!order) notFound();

  type ShippingAddress = {
    name?: string;
    phone?: string;
    email?: string | null;
    division?: string;
    district?: string;
    area?: string;
    addressLine?: string;
    postalCode?: string | null;
  };
  const address = (order.shippingAddress ?? {}) as ShippingAddress;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Orders", href: "/admin/orders" },
          { label: order.orderNumber },
        ]}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {order.orderNumber}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Placed{" "}
            {order.createdAt.toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/orders/${orderId}/invoice`}
            className="border-border bg-card hover:bg-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium"
          >
            <FileText className="size-4" aria-hidden="true" />
            Invoice
          </Link>
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(order.status)}`}
          >
            {statusLabel(order.status)}
          </span>
<span
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${paymentStatusTone(order.paymentStatus)}`}
          >
            {paymentStatusLabel(order.paymentStatus)}
          </span>
        </div>
      </div>

      <section className="border-border bg-card mt-6 rounded-xl border p-5">
        <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
          Timeline
        </h2>
        <div className="mt-4">
          <OrderTimeline status={order.status} events={order.timeline} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <section className="border-border bg-card rounded-xl border p-5">
            <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
              Items
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              {order.items.map((item) => {
                const image = item.product?.images[0];
                const productName = item.product?.name ?? item.productName;
                return (
                  <li key={item.id} className="flex gap-4">
                    <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-md">
                      {image ? (
                        <Image
                          src={image.url}
                          alt={image.alt ?? productName}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-muted-foreground flex h-full items-center justify-center text-[10px]">
                          —
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">
                        {item.product ? (
                          <Link
                            href={`/admin/products/${item.product.id}`}
                            className="hover:underline"
                          >
                            {productName}
                          </Link>
                        ) : (
                          productName
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {item.sku} · {item.variant?.name ? `${item.variant.name} · ` : ""}
                        Qty {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold">
                      {formatPrice(item.total)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="border-border bg-card rounded-xl border p-5">
            <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
              Delivery address
            </h2>
            <p className="mt-3 text-sm font-medium">
              {address.name ?? order.customerName} ·{" "}
              {address.phone ?? order.customerPhone}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {formatShippingAddress(address)}
            </p>
            {address.email || order.customerEmail ? (
              <p className="text-muted-foreground mt-2 text-sm">
                Email: {address.email ?? order.customerEmail}
              </p>
            ) : null}
          </section>

          {order.notes ? (
            <section className="border-border bg-card rounded-xl border p-5">
              <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
                Customer notes
              </h2>
              <p className="text-muted-foreground mt-3 whitespace-pre-wrap text-sm">
                {order.notes}
              </p>
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <OrderStatusControl
            orderId={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
            internalNote={order.internalNote}
          />
          <section className="border-border bg-card rounded-xl border p-5">
            <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
              Summary
            </h2>
            <dl className="text-sm">
              <div className="flex justify-between py-1.5">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="font-medium text-red-600">
                  {order.discount > 0
                    ? `-${formatPrice(order.discount)}`
                    : formatPrice(0)}
                </dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-medium">{formatPrice(order.deliveryFee)}</dd>
              </div>
              <div className="border-border flex justify-between border-t pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
            {order.couponCode && (
              <p className="text-muted-foreground mt-2 text-xs">
                Coupon: <span className="text-primary font-mono">{order.couponCode}</span>
              </p>
            )}
            <p className="text-muted-foreground mt-2 text-xs">
              Payment method: {paymentMethodLabel(order.paymentMethod)}
            </p>
          </section>

          {order.user && (
            <section className="border-border bg-card rounded-xl border p-5">
              <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
                Customer
              </h2>
              <p className="mt-3 text-sm font-medium">{order.user.name}</p>
              <p className="text-muted-foreground text-sm">{order.user.email}</p>
              <Link
                href={`/admin/customers/${order.user.id}`}
                className="text-primary mt-2 inline-block text-sm hover:underline"
              >
                View customer
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
