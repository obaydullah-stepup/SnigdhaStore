import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCapiSettings } from "@/lib/settings";
import { purchaseEventId } from "@/lib/meta/purchase-id";

const GRAPH_API_VERSION = "v21.0";

export type PurchaseItem = {
  id: string;
  quantity: number;
  price: number;
};

/** Meta requires normalised, lowercase PII before hashing. */
export function hashForMeta(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * Meta requires +880 for Bangladeshi numbers. The storefront stores them as
 * 01XXXXXXXXX, which Meta rejects as malformed.
 */
export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+880${digits.slice(1)}`;
  return `+${digits}`;
}

export function buildPurchasePayload(input: {
  orderNumber: string;
  eventId: string;
  total: number;
  deliveryFee: number;
  couponCode: string | null;
  customerEmail: string | null;
  customerPhone: string;
  items: PurchaseItem[];
  /** Matched to the browser pixel event's fbclid/fbp cookie where available. */
  fbc?: string | null;
  fbp?: string | null;
}) {
  const userData: Record<string, unknown> = {
    ph: hashForMeta(normalizeBdPhone(input.customerPhone)),
  };
  if (input.customerEmail) {
    userData.em = hashForMeta(input.customerEmail);
  }

  return {
    data: {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      action_source: "website",
      event_source_url: `/order-success/${input.orderNumber}`,
      user_data: userData,
      custom_data: {
        currency: "BDT",
        // Integer taka are minor units in Meta's model, so divide by 100.
        value: input.total / 100,
        content_ids: input.items.map((i) => i.id),
        contents: input.items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          item_price: i.price / 100,
        })),
        num_items: input.items.reduce((sum, i) => sum + i.quantity, 0),
        order_id: input.orderNumber,
        ...(input.couponCode ? { coupon: input.couponCode } : {}),
        ...(input.fbc ? { fbc: input.fbc } : {}),
        ...(input.fbp ? { fbp: input.fbp } : {}),
      },
    },
  };
}

export type CapiResult = { ok: true } | { ok: false; error: string };

/**
 * Posts a Purchase to Meta's Conversions API. Returns an error rather than
 * throwing, so the caller can leave the event retryable.
 */
export async function sendCapiPurchase(
  body: unknown,
  opts: { accessToken: string; pixelId: string }
): Promise<CapiResult> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${opts.pixelId}/events?access_token=${encodeURIComponent(opts.accessToken)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `CAPI HTTP ${res.status}: ${text.slice(0, 300)}` };
    }
    let json: { error?: { message?: string } } = {};
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      return { ok: false, error: `CAPI returned non-JSON: ${text.slice(0, 200)}` };
    }
    if (json.error) {
      return { ok: false, error: `CAPI rejected: ${json.error.message ?? "unknown error"}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `CAPI request failed: ${message}` };
  }
}

export type PurchaseSendOutcome =
  | "sent"
  | "already-sent"
  | "skipped-not-configured"
  | "failed";

/**
 * Sends a Purchase for the order via CAPI, at most once.
 *
 * Deduping uses a conditional update rather than a read-then-write: two
 * concurrent triggers (an admin confirming while a retry runs, say) cannot both
 * observe `metaPurchaseSent === false` and proceed. The claim is recorded
 * before the network call and, on failure, the order is left unsent so the
 * event stays retryable with the same event ID.
 */
export async function sendPurchaseCapi(orderId: string): Promise<PurchaseSendOutcome> {
  // Read uncached: this runs once per Purchase send, not per page render, and a
// fresh read means rotating the token takes effect on the next order rather
// than after the cache window. Caching here would also tie the send path to a
// Next request context.
const { accessToken, pixelId, enabled } = await getCapiSettings();
  if (!enabled || !accessToken || !pixelId) return "skipped-not-configured";

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      deliveryFee: true,
      couponCode: true,
      customerEmail: true,
      customerPhone: true,
      metaPurchaseSent: true,
      metaPurchaseEventId: true,
      items: { select: { productId: true, sku: true, quantity: true, price: true } },
    },
  });
  if (!order) return "skipped-not-configured";
  if (order.metaPurchaseSent) return "already-sent";

  // Claim before sending. `updateMany` with a `metaPurchaseSent: false` filter
  // is the atomic gate: exactly one concurrent caller can match.
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, metaPurchaseSent: false },
    data: {
      metaPurchaseAttempts: { increment: 1 },
      metaPurchaseError: null,
      ...(order.metaPurchaseEventId ? {} : { metaPurchaseEventId: purchaseEventId(order.orderNumber) }),
    },
  });
  if (claimed.count === 0) return "already-sent";

  const eventId = order.metaPurchaseEventId ?? purchaseEventId(order.orderNumber);

  const result = await sendCapiPurchase(
    buildPurchasePayload({
      orderNumber: order.orderNumber,
      eventId,
      total: order.total,
      deliveryFee: order.deliveryFee,
      couponCode: order.couponCode,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      items: order.items.map((i) => ({
        id: i.productId ?? i.sku,
        quantity: i.quantity,
        price: i.price,
      })),
    }),
    { accessToken, pixelId }
  );

  if (!result.ok) {
    await prisma.order.update({
      where: { id: orderId },
      data: { metaPurchaseError: result.error.slice(0, 500) },
    });
    console.error(`[meta-capi] Purchase failed for ${order.orderNumber}: ${result.error}`);
    return "failed";
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      metaPurchaseSent: true,
      metaPurchaseSentAt: new Date(),
      metaPurchaseError: null,
      metaPurchaseEventId: eventId,
    },
  });
  return "sent";
}