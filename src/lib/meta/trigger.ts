import "server-only";
import { prisma } from "@/lib/prisma";
import { getCachedPurchaseTrigger, getCachedAnalyticsSettings } from "@/lib/settings";
import { sendPurchaseCapi } from "@/lib/meta/purchase";
import { purchaseEventId } from "@/lib/meta/purchase-id";
import { canTransition } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/client";

/**
 * Fires the Meta Purchase event for an order, if the configured trigger says it
 * is due. Safe to call from any trigger point: it is idempotent, so calling it
 * for an already-sent order is a no-op.
 *
 * In `immediately` mode the browser pixel also fires Purchase (see
 * `PurchaseTracker`), sharing this order's event ID so Meta deduplicates the
 * two. In `confirmed` mode only CAPI is used, because the customer is no longer
 * on the site when an admin confirms the order.
 */
export async function triggerPurchaseIfDue(orderId: string): Promise<void> {
  const [trigger, settings] = await Promise.all([
    getCachedPurchaseTrigger(),
    getCachedAnalyticsSettings(),
  ]);
  if (trigger !== "immediately") return;
  if (!settings.metaPixelEnabled) return;

  // Persist the event ID up front so the browser pixel and CAPI always agree,
  // even if one of them sends first.
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, metaPurchaseEventId: true },
  });
  if (!order) return;

  if (!order.metaPurchaseEventId) {
    await prisma.order.update({
      where: { id: orderId },
      data: { metaPurchaseEventId: purchaseEventId(order.orderNumber) },
    });
  }

  await sendPurchaseCapi(orderId);
}

/**
 * Fires Purchase when an order moves into CONFIRMED.
 *
 * Any valid transition into CONFIRMED counts, not just PENDING -> CONFIRMED:
 * ORDER_TRANSITIONS also allows PROCESSING -> CONFIRMED, so an order that
 * bounces through Processing first would otherwise never be reported.
 */
export async function triggerPurchaseOnConfirmation(
  orderId: string,
  previousStatus: OrderStatus,
  nextStatus: OrderStatus
): Promise<void> {
  // Re-check the transition against the shared map rather than hard-coding the
  // edges, so Purchase fires for every valid route into CONFIRMED (PENDING and
  // PROCESSING can both reach it).
  if (nextStatus !== "CONFIRMED") return;
  if (previousStatus === nextStatus) return;
  if (!canTransition(previousStatus, nextStatus)) return;

  const trigger = await getCachedPurchaseTrigger();
  if (trigger !== "confirmed") return;

  await sendPurchaseCapi(orderId);
}