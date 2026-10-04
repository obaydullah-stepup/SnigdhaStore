export const siteConfig = {
  /**
   * Deliberately no `name` here. The live store name lives in the `store.name`
   * database setting and must be read via `getCachedStoreName()` from
   * `@/lib/settings`, so that renaming in Admin > Settings propagates
   * everywhere. Use `resolveBrand()` for any default copy that mentions it.
   */
  tagline: "Elegant essentials, delivered across Bangladesh",
  description:
    "{brand} is a premium Bangladeshi online store for clothing, home & lifestyle, beauty, electronics, and more — with nationwide cash-on-delivery delivery.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: "en_BD",
  currency: "BDT",
  currencySymbol: "৳",
  ogImage: "/og.png",
  email: process.env.EMAIL_FROM ?? "support@example.com",
  phone: "+880 1XXX-XXXXXX",
  socials: {
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
  },
} as const;

/**
 * Last-resort brand name used only when the `store.name` setting row is
 * missing, so a fresh/unseeded database still renders. Configurable via env
 * rather than baked into the source.
 */
export const FALLBACK_STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "Our Store";

export type SiteConfig = typeof siteConfig;

/**
 * Substitutes the `{brand}` placeholder with the live store name. Any default
 * copy that mentions the brand should be written with this placeholder so a
 * rename in settings propagates everywhere.
 */
export function resolveBrand(template: string, storeName: string): string {
  // Replacer function, not a string: a store name containing `$&`, `$'`, `` $` ``
  // or `$1` would otherwise be interpreted as a replacement pattern.
  return template.replace(/\{brand\}/g, () => storeName);
}

export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/categories" },
  { label: "New Arrivals", href: "/shop?sort=newest" },
  { label: "Best Sellers", href: "/shop?sort=best-selling" },
] as const;
