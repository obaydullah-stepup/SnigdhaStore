import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCartSnapshot } from "@/lib/data/cart";
import {
  DEFAULT_ZONE_ID,
  deliveryFeeForZone,
  getShippingConfig,
  getShippingZones,
} from "@/lib/shipping";
import { validateCoupon } from "@/lib/coupons";
import { getAppliedCouponCode } from "@/lib/coupon-cookie";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PAYMENT_PROVIDERS } from "@/lib/payments/provider";
import { formatShippingAddress } from "@/lib/utils";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { BeginCheckoutTracker } from "@/components/analytics/trackers";

export const metadata: Metadata = { title: "Checkout" };

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const snapshot = await getCartSnapshot();
  const active = (snapshot?.items ?? []).filter((i) => !i.savedForLater);
  const subtotal = active.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (snapshot == null || active.length === 0) {
    redirect("/cart");
  }

  const [shipping, couponCode, user, zones] = await Promise.all([
    getShippingConfig(),
    getAppliedCouponCode(),
    getSessionUser(),
    getShippingZones(),
  ]);

  const coupon = couponCode ? await validateCoupon(couponCode, subtotal) : null;
  const discount = coupon?.ok ? coupon.discount : 0;

  const deliveryZones = zones.length
    ? zones.map((z) => ({
        id: z.id,
        name: z.name,
        description: z.description ?? "",
        fee: deliveryFeeForZone(z, subtotal, shipping),
      }))
    : [
        {
          id: DEFAULT_ZONE_ID,
          name: "Standard Delivery",
          description: "Delivery across Bangladesh",
          fee: deliveryFeeForZone(null, subtotal, shipping),
        },
      ];

  const savedAddresses = user
    ? (
        await prisma.address.findMany({
          where: { userId: user.id },
          orderBy: { isDefault: "desc" },
          select: {
            id: true,
            name: true,
            phone: true,
            division: true,
            district: true,
            area: true,
            addressLine: true,
            postalCode: true,
          },
        })
      ).map((a) => ({
        id: a.id,
        fullName: a.name,
        phone: a.phone,
        address: formatShippingAddress(a),
      }))
    : [];

  const savedAddress = savedAddresses[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Checkout" }]} />
      <h1 className="font-heading mt-4 text-3xl font-semibold tracking-tight">
        Checkout
      </h1>

      <BeginCheckoutTracker
        value={subtotal}
        coupon={coupon?.ok ? coupon.coupon.code : couponCode}
        items={active.map((i) => ({
          item_id: i.productId,
          item_name: i.name,
          price: i.price,
          quantity: i.quantity,
        }))}
      />

      <CheckoutForm
        items={active}
        subtotal={subtotal}
        discount={discount}
        couponCode={coupon?.ok ? coupon.coupon.code : couponCode}
        deliveryZones={deliveryZones}
        paymentProviders={PAYMENT_PROVIDERS}
        canSaveAddress={Boolean(user)}
        savedAddresses={savedAddresses}
        defaults={{
          fullName: savedAddress?.fullName ?? user?.name ?? "",
          phone: savedAddress?.phone ?? "",
          email: user?.email ?? "",
          address: savedAddress?.address ?? "",
        }}
      />
    </div>
  );
}
