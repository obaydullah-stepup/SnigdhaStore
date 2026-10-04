import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";

const GUEST_COOKIE = "snigdha_guest";
const GUEST_TTL_DAYS = 30;

export async function getGuestId(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? null;
}

export async function getOrCreateGuestId(): Promise<string> {
  const existing = await getGuestId();
  if (existing && existing.length === 36) return existing;

  const id = crypto.randomUUID();
  const store = await cookies();
  store.set(GUEST_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_TTL_DAYS * 24 * 60 * 60,
  });
  return id;
}

export async function parseQuantity(raw: unknown): Promise<number> {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 1;
}

export async function resolveActiveCartId(): Promise<string | null> {
  const user = await getSessionUser();
  if (user) {
    const cart = await prisma.cart.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    return cart?.id ?? null;
  }
  const guestId = await getGuestId();
  if (!guestId) return null;
  const cart = await prisma.cart.findFirst({
    where: { userId: null, sessionId: guestId },
    select: { id: true },
  });
  return cart?.id ?? null;
}

export async function getCartItemCount(): Promise<number> {
  const cartId = await resolveActiveCartId();
  if (!cartId) return 0;
  const agg = await prisma.cartItem.aggregate({
    where: { cartId },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}
