import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  CheckCircle2,
  FileText,
  LockKeyhole,
  MapPin,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { getLastOrderNumber } from "@/lib/order-cookie";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { PurchaseTracker } from "@/components/analytics/trackers";
import { purchaseEventId } from "@/lib/meta/purchase-id";
import { getCachedPurchaseTrigger } from "@/lib/settings";
import type { OrderStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Order placed" };

const STATUS_LABELS: Record<string, { en: string; bn: string }> = {
  PENDING: { en: "Pending", bn: "অপেক্ষমাণ" },
  CONFIRMED: { en: "Confirmed", bn: "নিশ্চিত" },
  PROCESSING: { en: "Processing", bn: "প্রসেসিং" },
  SHIPPED: { en: "Shipped", bn: "পাঠানো হয়েছে" },
  DELIVERED: { en: "Delivered", bn: "ডেলিভারি হয়েছে" },
  CANCELLED: { en: "Cancelled", bn: "বাতিল" },
  RETURNED: { en: "Returned", bn: "ফেরত" },
};

type OrderWithEverything = {
  orderNumber: string;
  createdAt: Date;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode: string | null;
  customerName: string;
  customerPhone: string;
  metaPurchaseSent: boolean;
  metaPurchaseEventId: string | null;
  shippingAddress: {
    addressLine?: string;
    area?: string;
    district?: string;
    division?: string;
    postalCode?: string | null;
    name?: string;
    phone?: string;
  };
  items: {
    productName: string;
    sku: string;
    quantity: number;
    price: number;
    total: number;
    product: { slug: string; images: { url: string }[] } | null;
  }[];
  timeline: { status: OrderStatus; note: string | null; createdAt: Date }[];
};

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      userId: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      subtotal: true,
      discount: true,
      deliveryFee: true,
      total: true,
      couponCode: true,
      customerName: true,
      customerPhone: true,
      shippingAddress: true,
      metaPurchaseSent: true,
      metaPurchaseEventId: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          productName: true,
          sku: true,
          quantity: true,
          price: true,
          total: true,
          product: {
            select: {
              slug: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
            },
          },
        },
      },
      timeline: {
        orderBy: { createdAt: "asc" },
        select: { status: true, note: true, createdAt: true },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const [user, lastOrder] = await Promise.all([getSessionUser(), getLastOrderNumber()]);
  const isOwner =
    (order.userId != null && user != null && order.userId === user.id) ||
    (order.userId == null && lastOrder === order.orderNumber);

  // The invoice route lives under /account and requires a session, so only
  // offer the link to a signed-in owner. Guest orders can still print the
  // confirmation from this page.
  const canDownloadInvoice =
    order.userId != null && user != null && order.userId === user.id;

  if (!isOwner) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <LockKeyhole
          className="text-muted-foreground mx-auto size-10"
          aria-hidden="true"
        />
        <h2 className="font-heading mt-4 text-2xl font-semibold">
          That order is private
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          For security, order details are only visible from the account or device that
          placed them.
        </p>
        <Link href="/shop" className="mt-6">
          <Button>Continue shopping</Button>
        </Link>
      </div>
    );
  }

  // The browser Purchase event belongs to the "immediately" trigger only, and
  // must not re-send for an order whose Purchase has already gone out.
  const purchaseTrigger = await getCachedPurchaseTrigger();
  const fireBrowserPurchase = purchaseTrigger === "immediately" && !order.metaPurchaseSent;

  const address = order.shippingAddress as OrderWithEverything["shippingAddress"];
  const placed = order.createdAt.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Order confirmation" }]} />
      {/* Only in "immediately" mode: CAPI already fires Purchase server-side, and
          this browser event shares its event ID so Meta deduplicates the pair.
          In "confirmed" mode nothing fires here, because the customer is not on
          the site when an admin confirms. The `metaPurchaseSent` guard is also
          what stops a refresh or a revisit from re-sending Purchase. */}
      {fireBrowserPurchase && (
        <PurchaseTracker
          transactionId={order.orderNumber}
          eventId={order.metaPurchaseEventId ?? purchaseEventId(order.orderNumber)}
          value={order.total}
          deliveryFee={order.deliveryFee}
          coupon={order.couponCode}
        />
      )}

      <div className="bg-card mt-6 flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="size-7 text-emerald-600" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Thanks, {order.customerName.split(" ")[0]}! Order placed
        </h1>
        <p className="text-muted-foreground text-sm">
          Order{" "}
          <span className="text-foreground font-mono font-semibold">
            {order.orderNumber}
          </span>{" "}
          · placed {placed}
        </p>
        <p className="text-muted-foreground max-w-md text-sm">
          We&apos;ll confirm your order by a call on{" "}
          <span className="text-foreground font-medium">{order.customerPhone}</span>{" "}
          within 24 hours. Pay{" "}
          <span className="font-heading text-foreground font-semibold">
            {formatPrice(order.total)}
          </span>{" "}
          in cash on delivery.
        </p>
        <Link href="/shop" className="mt-2">
          <Button>Continue shopping</Button>
        </Link>
        <div className="mt-3 flex flex-col items-center gap-2">
          {canDownloadInvoice && (
            <Link
              href={`/account/orders/${order.id}/invoice`}
              className="text-primary flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              <FileText className="size-4" aria-hidden="true" />
              Download invoice
            </Link>
          )}
          <Link
            href={`/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`}
            className="text-primary text-sm font-medium hover:underline"
          >
            Track this order status →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
            <MapPin className="size-4" aria-hidden="true" /> Delivering to
          </h2>
          <p className="mt-3 text-sm font-medium">{address.name ?? order.customerName}</p>
          <p className="text-muted-foreground text-sm">
            {address.phone ?? order.customerPhone}
          </p>
          <p className="text-muted-foreground mt-1 text-sm leading-5">
            {address.addressLine}, {address.area}, {address.district}, {address.division}
            {address.postalCode ? ` — ${address.postalCode}` : ""}
          </p>
        </section>

        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
            <Truck className="size-4" aria-hidden="true" /> Delivery & payment
          </h2>
          <dl className="mt-3 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">
                {STATUS_LABELS[order.status]?.en ?? order.status}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Payment</dt>
              <dd className="font-medium">Cash on Delivery</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="font-medium">
                {order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="border-border mt-6 rounded-xl border">
        <ul className="bg-card divide-border flex flex-col divide-y rounded-t-xl border-b">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center gap-4 p-4">
              <div className="bg-muted relative block aspect-square w-14 shrink-0 overflow-hidden rounded-lg">
                {item.product?.images[0]?.url ? (
                  <Image
                    src={item.product.images[0].url}
                    alt={item.productName}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <ShoppingBag
                    className="text-muted-foreground absolute inset-0 m-auto size-5"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium">{item.productName}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {item.sku} · {formatPrice(item.price)} × {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatPrice(item.total)}</p>
            </li>
          ))}
        </ul>
        <div className="bg-card rounded-b-xl p-5 text-sm">
          <dl className="ml-auto flex w-full max-w-xs flex-col gap-1.5">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Coupon {order.couponCode ? `(${order.couponCode})` : ""}
                </dt>
                <dd className="font-medium text-emerald-600">
                  −{formatPrice(order.discount)}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd>{order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t pt-2 text-base">
              <dt className="font-heading font-semibold">Total</dt>
              <dd className="font-heading font-semibold">{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {order.timeline.length > 0 && (
        <section className="border-border bg-card mt-6 rounded-xl border p-5">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Order status
          </h2>
          <ol className="mt-4 flex flex-col gap-3">
            {order.timeline.map((event, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span
                  className="bg-primary mt-1 size-2 shrink-0 rounded-full"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-medium">
                    {STATUS_LABELS[event.status]?.en ?? event.status}
                  </span>
                  {event.note && (
                    <span className="text-muted-foreground"> — {event.note}</span>
                  )}
                  <span className="text-muted-foreground ml-2 text-xs">
                    {event.createdAt.toLocaleString("en-GB")}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Questions about your order? Call us at{" "}
        <span className="text-foreground font-medium">+880 1000-000000</span>
      </p>
    </div>
  );
}
