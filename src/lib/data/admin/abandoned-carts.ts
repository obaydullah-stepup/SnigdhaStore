import "server-only";
import { prisma } from "@/lib/prisma";

export const ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000;
export const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type AbandonedCart = {
  id: string;
  customerName: string;
  customerEmail: string;
  itemCount: number;
  subtotal: number;
  updatedAt: Date;
  reminderCount: number;
  reminderSentAt: Date | null;
  items: {
    productName: string;
    variantName: string | null;
    quantity: number;
    total: number;
  }[];
};

export async function getAbandonedCarts(): Promise<AbandonedCart[]> {
  const cutoff = new Date(Date.now() - ABANDONED_AFTER_MS);
  const cooldownCutoff = new Date(Date.now() - REMINDER_COOLDOWN_MS);

  const carts = await prisma.cart.findMany({
    where: {
      userId: { not: null },
      updatedAt: { lte: cutoff },
      OR: [{ reminderSentAt: null }, { reminderSentAt: { lte: cooldownCutoff } }],
      items: { some: { quantity: { gt: 0 } } },
    },
    select: {
      id: true,
      updatedAt: true,
      reminderCount: true,
      reminderSentAt: true,
      user: { select: { name: true, email: true } },
      items: {
        where: { quantity: { gt: 0 } },
        include: { product: { select: { name: true } }, variant: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: "asc" },
  });

  return carts.map((cart) => {
    const items = cart.items.map((item) => ({
      productName: item.product.name,
      variantName: item.variant?.name ?? null,
      quantity: item.quantity,
      total: item.price * item.quantity,
    }));
    return {
      id: cart.id,
      customerName: cart.user?.name ?? "Valued customer",
      customerEmail: cart.user?.email ?? "",
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.total, 0),
      updatedAt: cart.updatedAt,
      reminderCount: cart.reminderCount,
      reminderSentAt: cart.reminderSentAt,
      items,
    };
  });
}