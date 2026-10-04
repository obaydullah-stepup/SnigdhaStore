export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

/**
 * Build-time default for the Meta Pixel ID. Admin > Settings > Tracking takes
 * precedence; this is only used when no pixel ID has been saved there.
 */
export const ENV_META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const hasAnalytics = Boolean(GA_MEASUREMENT_ID || GTM_ID || ENV_META_PIXEL_ID);

/**
 * Meta Pixel IDs are digits only. This is the single source of truth for the
 * format, shared by the settings action (validation) and the storefront
 * (defence in depth before interpolation into an inline script).
 */
export const META_PIXEL_ID_PATTERN = /^\d{10,20}$/;

export function isValidMetaPixelId(value: string): boolean {
  return META_PIXEL_ID_PATTERN.test(value);
}

export function normalizeMetaPixelId(value: string | undefined | null): string {
  const trimmed = value?.trim() ?? "";
  return isValidMetaPixelId(trimmed) ? trimmed : "";
}

export type TrackName =
  | "view_item"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase"
  | "search"
  | "add_to_wishlist"
  | "apply_coupon";

export type TrackPayload = Record<string, unknown>;

export function track(name: TrackName, data?: TrackPayload): void {
  // Server-safe no-op. Actual forwarding happens client-side in
  // `trackAnalytics` from @/components/analytics/analytics.
  void name;
  void data;
}
