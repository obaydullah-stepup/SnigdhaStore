/**
 * Delivery fee arithmetic, free of `server-only` so the admin editor can show
 * staff the exact charge for each zone before saving, and so the rule is unit
 * tested independently of the database.
 */

export type ShippingConfig = {
  standardFee: number;
  expressFee: number;
  freeShippingThreshold: number;
};

export function deliveryFreeEligible(subtotal: number, cfg: ShippingConfig): boolean {
  return subtotal >= cfg.freeShippingThreshold;
}

export type ZoneFee = { freeShippingThreshold?: number | null; standardFee: number };

/**
 * Delivery fee for a customer-selected delivery zone. A null zone means "no
 * zones configured" — fall back to the base config fees.
 */
export function deliveryFeeForZone(
  zone: ZoneFee | null,
  subtotal: number,
  cfg: ShippingConfig
): number {
  const threshold = zone?.freeShippingThreshold ?? cfg.freeShippingThreshold;
  if (subtotal >= threshold) return 0;
  return zone ? zone.standardFee : cfg.standardFee;
}
