import Link from "next/link";
import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { getCartSnapshot } from "@/lib/data/cart";
import { getShippingConfig, deliveryFeeForZone } from "@/lib/shipping";
import { validateCoupon } from "@/lib/coupons";
import { getAppliedCouponCode } from "@/lib/coupon-cookie";
import { CartLines } from "@/components/cart/cart-lines";
import { CartSummary } from "@/components/cart/cart-summary";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/product/breadcrumbs";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const [snapshot, shipping, couponCode] = await Promise.all([
    getCartSnapshot(),
    getShippingConfig(),
    getAppliedCouponCode(),
  ]);

  const items = snapshot?.items ?? [];
  const active = items.filter((i) => !i.savedForLater);
  const saved = items.filter((i) => i.savedForLater);
  const subtotal = active.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const coupon = couponCode ? await validateCoupon(couponCode, subtotal) : null;
  const discount = coupon?.ok ? coupon.discount : 0;
  const fee = deliveryFeeForZone(null, subtotal, shipping);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Cart" }]} />
      <h1 className="font-heading mt-4 text-3xl font-semibold tracking-tight">
        Your cart
      </h1>

      {items.length === 0 ? (
        <div className="border-border mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-20 text-center">
          <ShoppingBag className="text-muted-foreground size-10" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">Your cart is empty</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Discover something you&apos;ll love from the collection.
            </p>
          </div>
          <Link href="/shop">
            <Button variant="secondary">Continue shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
          <CartLines active={active} saved={saved} />
          <CartSummary
            subtotal={subtotal}
            discount={discount}
            deliveryFee={fee}
            couponCode={couponCode}
            shipping={shipping}
          />
        </div>
      )}
    </div>
  );
}
