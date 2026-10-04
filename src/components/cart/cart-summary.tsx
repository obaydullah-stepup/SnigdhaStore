"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { applyCouponAction, removeCouponAction } from "@/actions/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import type { ShippingConfig } from "@/lib/shipping";
import { trackAnalytics } from "@/components/analytics/analytics";

type CartSummaryProps = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  couponCode: string | null;
  shipping: ShippingConfig;
};

export function CartSummary({
  subtotal,
  discount,
  deliveryFee,
  couponCode,
  shipping,
}: CartSummaryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const freeEligible = subtotal >= shipping.freeShippingThreshold;

  function applyCoupon(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("code", code);
      const res = await applyCouponAction(null, formData);
      if (res.status === "success") {
        trackAnalytics("apply_coupon", { coupon: code.trim() });
        toast.success(res.message.en);
        setCode("");
      } else {
        toast.error(res.message.en);
      }
      router.refresh();
    });
  }

  function removeCoupon() {
    startTransition(async () => {
      const res = await removeCouponAction();
      if (res.status === "success") toast.success(res.message.en);
      router.refresh();
    });
  }

  return (
    <aside className="border-border bg-card h-fit rounded-xl border p-5">
      <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
        Order summary
      </h2>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{formatPrice(subtotal)}</span>
      </div>

      <form onSubmit={applyCoupon} className="mt-4 flex items-center gap-2">
        <label htmlFor="coupon" className="sr-only">
          Coupon code
        </label>
        <div className="relative flex-1">
          <Tag
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="coupon"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={couponCode ?? "Coupon code"}
            disabled={isPending || Boolean(couponCode)}
            className="pl-8"
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={isPending || Boolean(couponCode)}
        >
          Apply
        </Button>
      </form>

      {couponCode && (
        <div className="border-border bg-primary/5 text-primary mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
          <span className="font-medium">{couponCode}</span>
          <button
            type="button"
            onClick={removeCoupon}
            disabled={isPending}
            className="hover:text-destructive flex items-center gap-1"
          >
            <X className="size-3" aria-hidden="true" />
            Remove
          </button>
        </div>
      )}

      <dl className="mt-4 flex flex-col gap-1.5 text-sm">
        {discount > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="font-medium text-emerald-600">−{formatPrice(discount)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">
            Delivery
            {freeEligible && (
              <span className="text-muted-foreground ml-1 text-xs">
                (free over {formatPrice(shipping.freeShippingThreshold)})
              </span>
            )}
          </dt>
          <dd
            className={deliveryFee === 0 ? "font-medium text-emerald-600" : "font-medium"}
          >
            {deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}
          </dd>
        </div>
        <div className="mt-2 flex items-center justify-between border-t pt-3 text-base">
          <dt className="font-heading font-semibold">Total</dt>
          <dd className="font-heading font-semibold">
            {formatPrice(subtotal - discount + deliveryFee)}
          </dd>
        </div>
      </dl>

      {subtotal > 0 ? (
        <Link href="/checkout" className="mt-5 block">
          <Button className="w-full font-medium">Proceed to checkout</Button>
        </Link>
      ) : (
        <Button className="mt-5 w-full font-medium" disabled>
          Proceed to checkout
        </Button>
      )}

      {!freeEligible && subtotal > 0 && (
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          Add {formatPrice(shipping.freeShippingThreshold - subtotal)} more to get{" "}
          <span className="font-medium text-emerald-600">free delivery</span>.
        </p>
      )}

      <p className="text-muted-foreground mt-4 flex items-center justify-center gap-1.5 text-xs">
        {isPending && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
        Cash on delivery available
      </p>
    </aside>
  );
}
