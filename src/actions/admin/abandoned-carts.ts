"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { sendAbandonedCartEmail } from "@/lib/email/emails";
import { getAbandonedCarts } from "@/lib/data/admin/abandoned-carts";

export type ActionResult = { ok: boolean; error?: string };

export async function sendAbandonedCartReminderAction(
  cartId: string
): Promise<ActionResult> {
  await requireAdmin();

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    select: {
      id: true,
      reminderCount: true,
      user: { select: { name: true, email: true } },
      items: {
        where: { quantity: { gt: 0 } },
        include: { product: { select: { name: true } }, variant: { select: { name: true } } },
      },
    },
  });

  const email = cart?.user?.email;
  if (!cart || !email) return { ok: false, error: "Cart not found." };
  if (cart.items.length === 0) return { ok: false, error: "Cart is empty." };

  const items = cart.items.map((item) => ({
    productName: item.product.name,
    variantName: item.variant?.name ?? null,
    quantity: item.quantity,
    total: item.price * item.quantity,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  await sendAbandonedCartEmail(email, { items, subtotal }).catch((err) => {
    console.error("Abandoned cart reminder email failed:", err);
  });

  await prisma.cart.update({
    where: { id: cart.id },
    data: { reminderSentAt: new Date(), reminderCount: { increment: 1 } },
  });

  void logAudit({
    action: "reminder.send",
    entityType: "cart",
    entityId: cart.id,
    metadata: { email, reminderCount: cart.reminderCount + 1 },
  });
  revalidatePath("/admin/abandoned-carts");
  return { ok: true };
}

export async function sendAllAbandonedCartRemindersAction(): Promise<
  ActionResult & { sent?: number }
> {
  await requireAdmin();

  const carts = await getAbandonedCarts();
  let sent = 0;

  for (const cart of carts) {
    await sendAbandonedCartEmail(cart.customerEmail, {
      items: cart.items,
      subtotal: cart.subtotal,
    }).catch((err) => {
      console.error(`Abandoned cart reminder for ${cart.id} failed:`, err);
      return;
    });
    await prisma.cart.update({
      where: { id: cart.id },
      data: { reminderSentAt: new Date(), reminderCount: { increment: 1 } },
    });
    sent += 1;
  }

  revalidatePath("/admin/abandoned-carts");
  return { ok: true, sent };
}