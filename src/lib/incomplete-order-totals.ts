import "server-only";
import { prisma } from "@/lib/prisma";
import {
  deliveryFeeForZone,
  getShippingConfig,
  getShippingZones,
  type ShippingConfig,
} from "@/lib/shipping";
import { resolveDeliveryZone, type ZoneMatch } from "@/lib/delivery-zones";
import {
  itemCountOf,
  snapshotFromCartItems,
  subtotalOf,
  type IncompleteItemSnapshot,
} from "@/lib/incomplete-orders";

export type LeadPricingInput = {
  cartId: string;
  deliveryZone: string | null;
  addressLine: string | null;
  /** Reused as stored; re-validating a coupon per lead is not worth the queries. */
  discount: number;
};

export type PricedLead = {
  lines: IncompleteItemSnapshot[];
  itemCount: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  zone: ZoneMatch | null;
};

const EMPTY: PricedLead = {
  lines: [],
  itemCount: 0,
  subtotal: 0,
  discount: 0,
  deliveryFee: 0,
  total: 0,
  zone: null,
};

function price(
  input: LeadPricingInput,
  lines: IncompleteItemSnapshot[],
  zones: ZoneMatch[],
  config: ShippingConfig
): PricedLead {
  const subtotal = subtotalOf(lines);
  const zone = resolveDeliveryZone(input.deliveryZone, input.addressLine, zones);
  const deliveryFee = deliveryFeeForZone(zone, subtotal, config);
  const discount = input.discount;
  return {
    lines,
    itemCount: itemCountOf(lines),
    subtotal,
    discount,
    deliveryFee,
    total: subtotal - discount + deliveryFee,
    zone,
  };
}

/**
 * Price one lead from its live cart. Used by the admin editor so the figure it
 * saves, and the figure conversion charges, come from the same rule.
 */
export async function priceLead(input: LeadPricingInput): Promise<PricedLead> {
  const [items, zones, config] = await Promise.all([
    liveCartItems([input.cartId]),
    getShippingZones(),
    getShippingConfig(),
  ]);
  return price(input, snapshotFromCartItems(items.get(input.cartId) ?? []), zones, config);
}

/**
 * Price a page of leads with a single cart query. The queue renders 20 rows at
 * a time, so per-row queries showed up as noticeable latency.
 */
export async function priceLeads(
  inputs: LeadPricingInput[]
): Promise<Map<string, PricedLead>> {
  const [itemGroups, zones, config] = await Promise.all([
    liveCartItems(inputs.map((i) => i.cartId)),
    getShippingZones(),
    getShippingConfig(),
  ]);
  const result = new Map<string, PricedLead>();
  for (const input of inputs) {
    const lines = snapshotFromCartItems(itemGroups.get(input.cartId) ?? []);
    result.set(input.cartId, price(input, lines, zones, config));
  }
  return result;
}

/** Fall back to the empty pricing when a lead's cart has been consumed. */
export function pricedFallback(input: LeadPricingInput): PricedLead {
  return { ...EMPTY, discount: input.discount };
}

async function liveCartItems(cartIds: string[]) {
  const groups = new Map<string, CartLine[]>();
  if (cartIds.length === 0) return groups;
  const rows = await prisma.cartItem.findMany({
    where: { cartId: { in: cartIds }, savedForLater: false },
    select: {
      cartId: true,
      quantity: true,
      product: { select: { id: true, name: true, sku: true, price: true } },
      variant: { select: { id: true, name: true, sku: true, price: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  for (const row of rows) {
    const list = groups.get(row.cartId);
    if (list) list.push(row);
    else groups.set(row.cartId, [row]);
  }
  return groups;
}

type CartLine = {
  quantity: number;
  product: { id: string; name: string; sku: string; price: number };
  variant: { id: string; name: string; sku: string; price: number | null } | null;
};
