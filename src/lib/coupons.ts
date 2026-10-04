import "server-only";
import { prisma } from "@/lib/prisma";
import type { Coupon } from "@/generated/prisma/client";

export type CouponValidation =
  { ok: true; coupon: Coupon; discount: number } | { ok: false; error: string };

function computeDiscount(coupon: Coupon, subtotal: number): number {
  if (coupon.type === "PERCENTAGE") {
    const raw = Math.floor((subtotal * coupon.value) / 100);
    return coupon.maximumDiscount ? Math.min(raw, coupon.maximumDiscount) : raw;
  }
  return Math.min(coupon.value, subtotal);
}

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<CouponValidation> {
  if (!code.trim()) return { ok: false, error: "Enter a coupon code." };
  if (subtotal <= 0) return { ok: false, error: "Add items before applying a coupon." };

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (!coupon) return { ok: false, error: "That coupon code isn't valid." };

  const now = new Date();
  if (!coupon.isActive) return { ok: false, error: "This coupon is no longer active." };
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, error: "This coupon hasn't started yet." };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { ok: false, error: "This coupon has expired." };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "This coupon has reached its usage limit." };
  }
  if (subtotal < coupon.minimumOrder) {
    return {
      ok: false,
      error: `Minimum order for this coupon is ৳${coupon.minimumOrder.toLocaleString("en-US")}.`,
    };
  }

  return { ok: true, coupon, discount: computeDiscount(coupon, subtotal) };
}
