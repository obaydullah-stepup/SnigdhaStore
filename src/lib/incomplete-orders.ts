/**
 * An IncompleteOrder is a checkout the customer started (name + phone
 * captured) but never submitted. It is deliberately NOT an Order: it has no
 * order number, reserves no stock, and is not revenue. Staff convert it into a
 * real Order from the admin panel.
 *
 * The cart remains the source of truth for line items. The `items` snapshot is
 * only a display/reporting convenience — conversion always re-prices from live
 * product data, so a stale snapshot can never undercharge an order.
 */

/** How far the customer got before leaving. */
export type IncompleteStage = "CONTACT" | "DETAILS";

/** Display-only snapshot of one cart line at capture time. */
export type IncompleteItemSnapshot = {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  price: number;
  total: number;
};

/** Rows older than this stop being actionable. */
export const INCOMPLETE_TTL_DAYS = 30;

export function incompleteCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - INCOMPLETE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isExpired(updatedAt: Date, now: Date = new Date()): boolean {
  return updatedAt.getTime() < incompleteCutoff(now).getTime();
}

/**
 * CONTACT means we have enough to call the customer and take the order by
 * hand. DETAILS means they also gave an address, so one-click conversion can
 * fulfil without a follow-up call.
 */
export function resolveStage(address: string | null | undefined): IncompleteStage {
  return address && address.trim().length >= 10 ? "DETAILS" : "CONTACT";
}

export function stageLabel(stage: string): string {
  return stage === "DETAILS" ? "Address captured" : "Contact captured";
}

/**
 * A customer can trigger several captures in quick succession (leaving the
 * phone field, then the address field) and beacons are not delivered in
 * order, so a payload that captured only a name and phone can turn up after
 * one that also carried the address. Detail we already hold is never erased.
 */
export function mergeCapturedContact(
  existing: { addressLine?: string | null; customerEmail?: string | null } | null | undefined,
  incoming: { addressLine?: string | null; customerEmail?: string | null }
): { addressLine: string | null; customerEmail: string | null; stage: IncompleteStage } {
  const addressLine = incoming.addressLine || existing?.addressLine || null;
  const customerEmail = incoming.customerEmail || existing?.customerEmail || null;
  return { addressLine, customerEmail, stage: resolveStage(addressLine) };
}

export function itemCountOf(items: IncompleteItemSnapshot[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function subtotalOf(items: IncompleteItemSnapshot[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/** The shape `priceLead` needs from a cart row, without dragging Prisma types in. */
export type CartLineInput = {
  quantity: number;
  product: { id: string; name: string; sku: string; price: number };
  // A variant with no price of its own inherits the product price.
  variant: { id: string; name: string; sku: string; price: number | null } | null;
};

/**
 * Price live cart rows into a snapshot. Capture, the admin queue and conversion
 * all price from the current cart rather than the display-only snapshot stored
 * on the lead, so they share one rule for variant-vs-product pricing.
 */
export function snapshotFromCartItems(items: CartLineInput[]): IncompleteItemSnapshot[] {
  return items.map((item) => {
    const price = item.variant?.price ?? item.product.price;
    return {
      productId: item.product.id,
      variantId: item.variant?.id ?? null,
      name: item.product.name,
      variantName: item.variant?.name ?? null,
      sku: item.variant?.sku ?? item.product.sku,
      quantity: item.quantity,
      price,
      total: price * item.quantity,
    };
  });
}

/** Defensive parse for the JSONB `items` column, which admins can also edit by hand. */
export function parseItemSnapshot(raw: unknown): IncompleteItemSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const item = entry as Record<string, unknown>;
    const productId = typeof item.productId === "string" ? item.productId : null;
    const name = typeof item.name === "string" ? item.name : null;
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    if (!productId || !name) return [];
    if (!Number.isFinite(quantity) || quantity <= 0) return [];
    if (!Number.isFinite(price) || price < 0) return [];
    return [
      {
        productId,
        variantId: typeof item.variantId === "string" ? item.variantId : null,
        name,
        variantName: typeof item.variantName === "string" ? item.variantName : null,
        sku: typeof item.sku === "string" ? item.sku : "",
        quantity: Math.floor(quantity),
        price: Math.floor(price),
        total: typeof item.total === "number" ? item.total : 0,
      },
    ];
  });
}

/** Stable string for the admin list summary line, e.g. "2 × Linen Palazzo Set". */
export function describeItems(items: IncompleteItemSnapshot[]): string {
  return items
    .map((item) => `${item.quantity} × ${item.name}${item.variantName ? ` (${item.variantName})` : ""}`)
    .join(", ");
}
