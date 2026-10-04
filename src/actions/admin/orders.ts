"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { canTransition } from "@/lib/order-status";
import { triggerPurchaseOnConfirmation } from "@/lib/meta/trigger";
import { logAudit } from "@/lib/audit";
import { sendOrderPaymentEmail, sendOrderStatusEmail } from "@/lib/email/emails";

const orderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
]);
const paymentStatusSchema = z.enum(["UNPAID", "PAID", "FAILED", "REFUNDED"]);

const RESTOCKS_STOCK = new Set<OrderStatus>(["CANCELLED", "RETURNED"]);

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<{ ok: boolean; error?: string }> {
  await requireStaff();
  const parsed = orderStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      customerEmail: true,
      items: {
        select: { productId: true, variantId: true, quantity: true },
      },
    },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (!canTransition(order.status, parsed.data)) {
    return {
      ok: false,
      error: `Cannot change order from "${order.status}" to "${parsed.data}".`,
    };
  }

  const restockOnCancelOrReturn =
    RESTOCKS_STOCK.has(parsed.data) && !RESTOCKS_STOCK.has(order.status);

  const statusNote = note?.trim() ? note.trim() : "";

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: parsed.data } });
    await tx.orderTimelineEvent.create({
      data: {
        orderId,
        status: parsed.data,
        note: statusNote || "Status updated by admin.",
      },
    });

    if (restockOnCancelOrReturn) {
      await Promise.all(
        order.items.map(async (item) => {
          if (!item.productId) return;
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
          // Reversing the sale count keeps it paired with the stock increment
          // that checkout applied, so a cancel or return cannot leave the
          // product permanently over-counted.
          await tx.product.updateMany({
            where: { id: item.productId },
            data: { soldCount: { decrement: item.quantity } },
          });
          // Reversing more than was ever counted would land below zero, which
          // would then read as "negative sales". Clamp in the same
          // transaction so the result is max(0, before - quantity).
          await tx.product.updateMany({
            where: { id: item.productId, soldCount: { lt: 0 } },
            data: { soldCount: 0 },
          });
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              variantId: item.variantId ?? null,
              quantityChange: item.quantity,
              reason: parsed.data === "RETURNED" ? "RETURN" : "RESTOCK",
              note: `Order ${order.orderNumber} ${parsed.data.toLowerCase()}`,
            },
          });
        })
      );
    }
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");

  // Fires Purchase for the "confirmed" trigger. Runs after the status
  // transaction so a failure cannot roll back the status change, and it
  // re-reads `metaPurchaseSent` atomically so repeated confirmations,
  // cancellations and returns never produce a second Purchase.
  if (parsed.data === "CONFIRMED" && order.status !== "CONFIRMED") {
    await triggerPurchaseOnConfirmation(orderId, order.status, parsed.data).catch((err) => {
      console.error("[meta] confirmation trigger failed", err);
    });
  }

  if (order.customerEmail) {
    void sendOrderStatusEmail(order.customerEmail, {
      orderNumber: order.orderNumber,
      status: parsed.data,
      note: statusNote || null,
    }).catch((err) => {
      console.error("[email] order status email failed", err);
    });
  }
  void logAudit({
    action: "order.status",
    entityType: "order",
    entityId: orderId,
    metadata: { from: order.status, to: parsed.data, note: statusNote || null },
  });
  return { ok: true };
}

export async function updatePaymentStatusAction(
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<{ ok: boolean; error?: string }> {
  await requireStaff();
  const parsed = paymentStatusSchema.safeParse(paymentStatus);
  if (!parsed.success) return { ok: false, error: "Invalid payment status." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, orderNumber: true, customerEmail: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { paymentStatus: parsed.data } }),
    prisma.orderTimelineEvent.create({
      data: {
        orderId,
        status: order.status,
        note: `Payment marked as ${parsed.data} by admin.`,
      },
    }),
  ]);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");

  if (order.customerEmail) {
    void sendOrderPaymentEmail(order.customerEmail, {
      orderNumber: order.orderNumber,
      paymentStatus: parsed.data,
    }).catch((err) => {
      console.error("[email] order payment email failed", err);
    });
  }
  void logAudit({
    action: "order.payment",
    entityType: "order",
    entityId: orderId,
    metadata: { paymentStatus: parsed.data },
  });
  return { ok: true };
}

export async function saveInternalNoteAction(
  orderId: string,
  note: string
): Promise<{ ok: boolean }> {
  await requireStaff();
  await prisma.order.update({ where: { id: orderId }, data: { internalNote: note } });
  void logAudit({
    action: "order.note",
    entityType: "order",
    entityId: orderId,
    metadata: { truncated: note.length > 80 ? `${note.slice(0, 80)}…` : note },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}
