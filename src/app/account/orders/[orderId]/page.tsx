import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { statusLabel, statusTone } from "@/lib/order-status";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { OrderTimeline } from "@/components/account/order-timeline";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const user = await requireUser();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              slug: true,
              name: true,
              images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" } },
            },
          },
          variant: { select: { name: true } },
        },
      },
      timeline: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order || order.userId !== user.id) {
    notFound();
  }

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
          { label: "Account", href: "/account" },
          { label: "Orders", href: "/account/orders" },
          { label: order.orderNumber },
        ]}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {order.orderNumber}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Placed on{" "}
            {order.createdAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/account/orders/${orderId}/invoice`}
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
        </div>
      </div>

      <section className="border-border bg-card mt-6 rounded-xl border p-5">
        <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
          Status
        </h2>
        <div className="mt-4">
          <OrderTimeline status={order.status} events={order.timeline} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Items
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {order.items.map((item) => {
              const image = item.product?.images[0];
              const productName = item.product?.name ?? item.productName;
              return (
                <li key={item.id}>
                  <Link
                    href={item.product ? `/product/${item.product.slug}` : "#"}
                    className="hover:bg-muted/60 flex gap-4 rounded-lg p-1 transition-colors"
                  >
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
                          No image
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{productName}</p>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                        {item.variant && <span>{item.variant.name}</span>}
                        <span>
                          Qty {item.quantity} × {formatPrice(item.price)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 self-center text-right">
                      <span className="text-sm font-semibold">
                        {formatPrice(item.total)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
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
                Coupon used:{" "}
                <span className="text-primary font-mono">{order.couponCode}</span>
              </p>
            )}
          </section>

          <section className="border-border bg-card rounded-xl border p-5">
            <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
              Delivery
            </h2>
            <p className="mt-3 text-sm font-medium">
              {order.customerName} · {order.customerPhone}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {address.addressLine}
              <br />
              {address.area ? `${address.area}, ` : ""}
              {address.district}
              <br />
              {address.division}
              {address.postalCode ? ` · ${address.postalCode}` : ""}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
