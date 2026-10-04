import "server-only";
import { cookies } from "next/headers";

const COUPON_COOKIE = "snigdha_coupon";

export async function getAppliedCouponCode(): Promise<string | null> {
  const store = await cookies();
  return store.get(COUPON_COOKIE)?.value ?? null;
}

export async function setAppliedCouponCode(code: string): Promise<void> {
  const store = await cookies();
  store.set(COUPON_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAppliedCoupon(): Promise<void> {
  const store = await cookies();
  store.delete(COUPON_COOKIE);
}
