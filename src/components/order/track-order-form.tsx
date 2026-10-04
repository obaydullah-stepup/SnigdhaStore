"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoaderCircle, PackageSearch, Search } from "lucide-react";
import { lookupOrderAction, type TrackOrderResult } from "@/actions/order-tracking";
import { formatPrice, formatShippingAddress } from "@/lib/utils";
import {
  paymentStatusLabel,
  statusLabel,
  statusTone,
} from "@/lib/order-status";
import { paymentMethodLabel } from "@/lib/payments/labels";
import { OrderTimeline } from "@/components/account/order-timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: TrackOrderResult | null = null;

export function TrackOrderForm({ initialOrderNumber }: { initialOrderNumber?: string }) {
  const [result, action, pending] = useActionState(lookupOrderAction, initialState);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="flex flex-col items-center text-center">
        <span className="border-border bg-card flex size-12 items-center justify-center rounded-full border">
          <PackageSearch className="text-primary size-6" aria-hidden="true" />
        </span>
        <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight">
          Track your order
        </h1>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          Enter your order number and the email or phone you used at checkout.
        </p>
      </div>

      <form action={action} className="border-border bg-card mt-8 rounded-xl border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="orderNumber">Order number</Label>
            <Input
              id="orderNumber"
              name="orderNumber"
              placeholder="e.g. SNIG-2417"
              defaultValue={initialOrderNumber}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" placeholder="01XXXXXXXXX" />
          </div>
        </div>
        <Button type="submit" className="mt-4 w-full" disabled={pending}>
          {pending ? (
            <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="mr-2 size-4" aria-hidden="true" />
          )}
          {pending ? "Looking up…" : "Track order"}
        </Button>
        {result?.ok === false ? (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {result.error}
          </p>
        ) : null}
      </form>

      {result?.ok ? <OrderResult order={result.order} /> : null}
    </div>
  );
}

function OrderResult({ order }: { order: Extract<TrackOrderResult, { ok: true }>["order"] }) {
  const address = order.shippingAddress;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            {order.orderNumber}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {order.customerName} · placed{" "}
            {new Date(order.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(order.status)}`}
        >
          {statusLabel(order.status)}
        </span>
      </div>

      <section className="border-border bg-card mt-6 rounded-xl border p-5">
        <h3 className="font-heading text-sm font-semibold tracking-wide uppercase">Status</h3>
        <div className="mt-4">
          <OrderTimeline
            status={order.status}
            events={order.timeline.map((e) => ({
              status: e.status,
              note: e.note,
              createdAt: new Date(e.createdAt),
            }))}
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="border-border bg-card rounded-xl border p-5">
          <h3 className="font-heading text-sm font-semibold tracking-wide uppercase">Items</h3>
          <ul className="mt-4 flex flex-col gap-4">
            {order.items.map((item) => (
              <li key={item.id}>
                <div className="flex gap-4 rounded-lg p-1">
                  <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-md">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt ?? item.productName}
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
                    {item.productSlug ? (
                      <Link
                        href={`/product/${item.productSlug}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{item.productName}</p>
                    )}
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                      {item.variantName && <span>{item.variantName}</span>}
                      <span>
                        Qty {item.quantity} × {formatPrice(item.price)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 self-center text-right">
                    <span className="text-sm font-semibold">{formatPrice(item.total)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          <section className="border-border bg-card rounded-xl border p-5">
            <h3 className="font-heading text-sm font-semibold tracking-wide uppercase">
              Summary
            </h3>
            <dl className="text-sm">
              <div className="flex justify-between py-1.5">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="font-medium text-red-600">
                  {order.discount > 0 ? `-${formatPrice(order.discount)}` : formatPrice(0)}
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
          </section>

          {address && (
            <section className="border-border bg-card rounded-xl border p-5">
              <h3 className="font-heading text-sm font-semibold tracking-wide uppercase">
                Delivery
              </h3>
              <p className="mt-3 text-sm font-medium">
                {address.name ?? order.customerName}
                {address.phone ? ` · ${address.phone}` : ""}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatShippingAddress(address)}
              </p>
              <p className="text-muted-foreground mt-3 text-xs">
                Payment: {order.paymentMethod ? paymentMethodLabel(order.paymentMethod) : paymentStatusLabel(order.paymentStatus)}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}