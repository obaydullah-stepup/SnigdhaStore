import "server-only";
import { cookies } from "next/headers";

const LAST_ORDER_COOKIE = "snigdha_last_order";
const TTL_DAYS = 30;

export async function setLastOrderNumber(orderNumber: string): Promise<void> {
  const store = await cookies();
  store.set(LAST_ORDER_COOKIE, orderNumber, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * TTL_DAYS,
  });
}

export async function getLastOrderNumber(): Promise<string | null> {
  const store = await cookies();
  return store.get(LAST_ORDER_COOKIE)?.value ?? null;
}
