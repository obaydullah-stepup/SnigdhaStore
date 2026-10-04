import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ENV_META_PIXEL_ID, normalizeMetaPixelId } from "@/lib/analytics";
import { NAV_LINKS, siteConfig, resolveBrand, FALLBACK_STORE_NAME } from "@/config/site";

export const SETTINGS_CACHE_TAG = "store-settings";

/**
 * The live store name, sourced from the `store.name` setting. This is the only
 * value the UI, metadata and emails should use for the brand name.
 */
export async function getStoreName(): Promise<string> {
  const row = await prisma.setting.findUnique({
    where: { key: "store.name" },
    select: { value: true },
  });
  const value = row?.value?.trim();
  return value ? value : FALLBACK_STORE_NAME;
}

export const getCachedStoreName = unstable_cache(getStoreName, ["store-name"], {
  tags: [SETTINGS_CACHE_TAG],
  revalidate: 300,
});

export async function getStoreCurrency(): Promise<string> {
  const row = await prisma.setting.findUnique({
    where: { key: "store.currency" },
    select: { value: true },
  });
  return row?.value ?? "BDT";
}

export const getCachedStoreCurrency = unstable_cache(
  getStoreCurrency,
  ["store-currency"],
  {
    tags: [SETTINGS_CACHE_TAG],
    revalidate: 60,
  }
);

/**
 * Declared before LAYOUT_SETTING_KEYS, which includes it. The footer already
 * receives layout settings, so the link flag rides along with them.
 */
export const COOKIE_SETTINGS_LINK_KEY = "tracking.cookieSettingsLink";
export const COOKIE_SETTINGS_LINK_DEFAULT = "1";

export const LAYOUT_SETTING_KEYS = [
  "announce.enabled",
  "announce.left",
  "announce.pre",
  "announce.code",
  "announce.post",
  "announce.right",
  "nav.home",
  "nav.shop",
  "nav.categories",
  "nav.arrivals",
  "nav.bestsellers",
  "footer.description",
  "footer.phone",
  "footer.facebook",
  "footer.instagram",
  "footer.newsletter",
  "footer.trust1.title",
  "footer.trust1.text",
  "footer.trust2.title",
  "footer.trust2.text",
  "footer.trust3.title",
  "footer.trust3.text",
  "footer.trust4.title",
  "footer.trust4.text",
  "footer.rights",
  "footer.payments",
  "footer.paymentsMode",
  "footer.paymentsImage",
  "brand.headerLogo",
  "brand.footerLogo",
  COOKIE_SETTINGS_LINK_KEY,
] as const;

export const LAYOUT_SETTING_DEFAULTS: Record<string, string> = {
  "announce.enabled": "1",
  "announce.left": "Nationwide cash on delivery",
  "announce.pre": "Use code",
  "announce.code": "WELCOME10",
  "announce.post": "for 10% off your first order",
  "announce.right": "Free delivery on orders over ৳3,000",
  "nav.home": NAV_LINKS[0].label,
  "nav.shop": NAV_LINKS[1].label,
  "nav.categories": NAV_LINKS[2].label,
  "nav.arrivals": NAV_LINKS[3].label,
  "nav.bestsellers": NAV_LINKS[4].label,
  "footer.description": siteConfig.description,
  "footer.phone": siteConfig.phone,
  "footer.facebook": siteConfig.socials.facebook,
  "footer.instagram": siteConfig.socials.instagram,
  "footer.newsletter": "Get early access to new arrivals and members-only offers.",
  "footer.trust1.title": "Nationwide Delivery",
  "footer.trust1.text": "COD available across Bangladesh",
  "footer.trust2.title": "Easy Returns",
  "footer.trust2.text": "7-day hassle-free returns",
  "footer.trust3.title": "Secure Payments",
  "footer.trust3.text": "Safe & trusted checkout",
  "footer.trust4.title": "Friendly Support",
  "footer.trust4.text": "We reply within 24 hours",
  "footer.rights": "All rights reserved.",
  "footer.payments": "Cash on delivery · bKash · Nagad · Cards",
  "footer.paymentsMode": "text",
  "footer.paymentsImage": "",
  "brand.headerLogo": "",
  "brand.footerLogo": "",
  [COOKIE_SETTINGS_LINK_KEY]: COOKIE_SETTINGS_LINK_DEFAULT,
};

export const PURCHASE_TRIGGER_KEY = "tracking.purchaseTrigger";
export const PURCHASE_TRIGGER_DEFAULT = "immediately";

export const PURCHASE_TRIGGERS = ["immediately", "confirmed"] as const;
export type PurchaseTrigger = (typeof PURCHASE_TRIGGERS)[number];

export function isPurchaseTrigger(value: string | undefined | null): value is PurchaseTrigger {
  return value === "immediately" || value === "confirmed";
}

/**
 * Conversions API credentials, resolved exactly like the browser Pixel ID:
 * an Admin > Settings value wins, and the environment is used only until the
 * owner has saved the panel at least once.
 *
 * Unlike the Pixel ID, the access token is a write-capable credential for the
 * whole Meta Business account. It is never returned to the admin form — see
 * `getCapiConfigSummary` — so it cannot be read back out of the browser.
 */
export const CAPI_PIXEL_ID_KEY = "tracking.metaCapiPixelId";
export const CAPI_ACCESS_TOKEN_KEY = "tracking.metaCapiAccessToken";
export const CAPI_ENABLED_KEY = "tracking.metaCapiEnabled";



/** CAPI rows live in the same table but are read separately, for the token. */
export const CAPI_SETTING_KEYS = [
  CAPI_PIXEL_ID_KEY,
  CAPI_ACCESS_TOKEN_KEY,
  CAPI_ENABLED_KEY,
] as const;

export const CAPI_SETTING_DEFAULTS: Record<string, string> = {
  [CAPI_PIXEL_ID_KEY]: "",
  [CAPI_ACCESS_TOKEN_KEY]: "",
  [CAPI_ENABLED_KEY]: "1",
};

export type CapiSettings = {
  /** Resolved dataset ID for server-side events, or "" when unset. */
  pixelId: string;
  accessToken: string;
  /** Whether the owner has opted CAPI on. */
  enabled: boolean;
  pixelIdSource: "admin" | "env" | "none";
  accessTokenSource: "admin" | "env" | "none";
};

/**
 * Each field falls back to its environment variable independently, so leaving
 * a field blank in the panel means "use the environment" rather than "off".
 *
 * This differs from the browser Pixel, which treats the whole panel as one
 * block: there, a blank ID means no pixel at all. CAPI can afford the softer
 * rule because it has an explicit enable toggle, so "off" is always
 * expressible — which matters here, since saving the settings form for any
 * unrelated field would otherwise silently disable CAPI on an install that was
 * relying on the environment.
 *
 * Environment values are read per call rather than at module load, so a token
 * rotated into .env takes effect on the next send.
 */
export async function getCapiSettings(): Promise<CapiSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...CAPI_SETTING_KEYS] } },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const envPixelId = normalizeMetaPixelId(process.env.META_CAPI_PIXEL_ID);
  const envToken = process.env.META_CAPI_ACCESS_TOKEN?.trim() ?? "";

  const adminPixelId = normalizeMetaPixelId(map.get(CAPI_PIXEL_ID_KEY));
  const adminToken = map.get(CAPI_ACCESS_TOKEN_KEY)?.trim() ?? "";

  const pixelId = adminPixelId || envPixelId;
  const accessToken = adminToken || envToken;

  return {
    pixelId,
    accessToken,
    // Absent row means the panel has never been saved, so an env-configured
    // install starts enabled. Once the owner saves, the toggle is authoritative.
    enabled:
      map.get(CAPI_ENABLED_KEY) !== "0" && Boolean(pixelId && accessToken),
    pixelIdSource: adminPixelId ? "admin" : envPixelId ? "env" : "none",
    accessTokenSource: adminToken ? "admin" : envToken ? "env" : "none",
  };
}

export const getCachedCapiSettings = unstable_cache(
  getCapiSettings,
  ["capi-settings"],
  {
    tags: [SETTINGS_CACHE_TAG],
    revalidate: 300,
  }
);

export type CapiConfigSummary = Omit<CapiSettings, "accessToken"> & {
  /**
   * Whether a token is stored. The value itself stays on the server so it can
   * never be serialized into the admin page payload.
   */
  accessTokenConfigured: boolean;
};

/**
 * The shape the admin panel is allowed to see: it reports whether a token
 * exists and where it came from, but never the token itself.
 */
export async function getCapiConfigSummary(): Promise<CapiConfigSummary> {
  const { accessToken, ...rest } = await getCapiSettings();
  return { ...rest, accessTokenConfigured: accessToken.length > 0 };
}

/**
 * How the cookie consent banner behaves. This is separate from the Purchase
 * trigger, which only decides WHEN Purchase fires.
 *
 * - `required`: show the banner and gate marketing/analytics tracking on the
 *   visitor's answer. The default.
 * - `informational`: show the banner, but tracking runs regardless of the
 *   answer, so nothing is blocked.
 * - `disabled`: hide the banner entirely and apply no gating; the pixel and
 *   CAPI work normally.
 */
export const CONSENT_MODE_KEY = "tracking.consentMode";
export const CONSENT_MODE_DEFAULT = "required";

export const CONSENT_MODES = ["required", "informational", "disabled"] as const;
export type ConsentMode = (typeof CONSENT_MODES)[number];

export function isConsentMode(value: string | undefined | null): value is ConsentMode {
  return value === "required" || value === "informational" || value === "disabled";
}

export const ANALYTICS_SETTING_KEYS = [
  "tracking.metaPixelId",
  "tracking.metaPixelEnabled",
  PURCHASE_TRIGGER_KEY,
  CONSENT_MODE_KEY,
  COOKIE_SETTINGS_LINK_KEY,
] as const;

export const ANALYTICS_SETTING_DEFAULTS: Record<string, string> = {
  "tracking.metaPixelId": "",
  "tracking.metaPixelEnabled": "1",
  [PURCHASE_TRIGGER_KEY]: PURCHASE_TRIGGER_DEFAULT,
  [CONSENT_MODE_KEY]: CONSENT_MODE_DEFAULT,
  [COOKIE_SETTINGS_LINK_KEY]: COOKIE_SETTINGS_LINK_DEFAULT,
};

/**
 * When the Meta Purchase event fires.
 *
 * `immediately` fires when the order is created and uses both the browser pixel
 * and CAPI, sharing an event ID so Meta deduplicates them. `confirmed` fires
 * when an admin moves the order into CONFIRMED, and uses CAPI only, since the
 * customer is no longer on the site at that point.
 *
 * This controls only WHEN Purchase fires. It never replays historical orders,
 * and it never resets `metaPurchaseSent` on existing orders.
 */
export async function getPurchaseTrigger(): Promise<PurchaseTrigger> {
  const row = await prisma.setting.findUnique({
    where: { key: PURCHASE_TRIGGER_KEY },
    select: { value: true },
  });
  return isPurchaseTrigger(row?.value) ? row.value : PURCHASE_TRIGGER_DEFAULT;
}

export const getCachedPurchaseTrigger = unstable_cache(
  getPurchaseTrigger,
  ["purchase-trigger"],
  {
    tags: [SETTINGS_CACHE_TAG],
    revalidate: 300,
  }
);

export type AnalyticsSettings = {
  /** Resolved pixel ID, or "" when the pixel should not load. */
  metaPixelId: string;
  metaPixelEnabled: boolean;
  /** Where the resolved ID came from, for display in the admin panel. */
  metaPixelSource: "admin" | "env" | "none";
  purchaseTrigger: PurchaseTrigger;
};

/**
 * Resolves the Meta Pixel ID from Admin > Settings, falling back to
 * `NEXT_PUBLIC_META_PIXEL_ID` only when the setting has never been saved.
 *
 * Presence of the `tracking.metaPixelEnabled` row is what distinguishes "the
 * owner configured this" from "the admin form has simply never been saved".
 * Without it, saving the settings form from a fresh install would silently
 * disable an env-configured pixel, and a blank field could never mean "off".
 */
export async function getAnalyticsSettings(): Promise<AnalyticsSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...ANALYTICS_SETTING_KEYS] } },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const envId = normalizeMetaPixelId(ENV_META_PIXEL_ID);
  const savedId = map.get("tracking.metaPixelId");
  const configuredInAdmin = map.has("tracking.metaPixelEnabled");
  const purchaseTriggerRaw = map.get(PURCHASE_TRIGGER_KEY);
  const purchaseTrigger = isPurchaseTrigger(purchaseTriggerRaw)
    ? purchaseTriggerRaw
    : PURCHASE_TRIGGER_DEFAULT;

  if (!configuredInAdmin) {
    return {
      metaPixelId: envId,
      metaPixelEnabled: Boolean(envId),
      metaPixelSource: envId ? "env" : "none",
      purchaseTrigger,
    };
  }

  const metaPixelId = normalizeMetaPixelId(savedId);
  const enabled = map.get("tracking.metaPixelEnabled") === "1";
  return {
    metaPixelId,
    metaPixelEnabled: enabled && Boolean(metaPixelId),
    metaPixelSource: metaPixelId ? "admin" : "none",
    purchaseTrigger,
  };
}

export const getCachedAnalyticsSettings = unstable_cache(
  getAnalyticsSettings,
  ["analytics-settings"],
  {
    tags: [SETTINGS_CACHE_TAG],
    revalidate: 300,
  }
);

/**
 * Reads the consent mode and whether the footer exposes the settings link.
 * Cached on the same tag as the other settings reads, so an admin save
 * invalidates every consumer at once.
 */
export const getConsentSettings = unstable_cache(
  async (): Promise<{
    consentMode: ConsentMode;
    cookieSettingsLinkEnabled: boolean;
  }> => {
    const rows = await prisma.setting.findMany({
      where: { key: { in: [CONSENT_MODE_KEY, COOKIE_SETTINGS_LINK_KEY] } },
      select: { key: true, value: true },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const mode = map.get(CONSENT_MODE_KEY);
    return {
      consentMode: isConsentMode(mode) ? mode : CONSENT_MODE_DEFAULT,
      // A stored "0" is an explicit choice; absence keeps the link visible.
      cookieSettingsLinkEnabled: map.get(COOKIE_SETTINGS_LINK_KEY) !== "0",
    };
  },
  ["consent-settings"],
  {
    tags: [SETTINGS_CACHE_TAG],
    revalidate: 300,
  }
);

export type LayoutSettings = {
  storeName: string;
  announceEnabled: boolean;
  announceLeft: string;
  announcePre: string;
  announceCode: string;
  announcePost: string;
  announceRight: string;
  nav: {
    home: string;
    shop: string;
    categories: string;
    arrivals: string;
    bestSellers: string;
  };
  footerDescription: string;
  footerPhone: string;
  footerFacebook: string;
  footerInstagram: string;
  footerNewsletter: string;
  trust: { title: string; text: string }[];
  footerRights: string;
  footerPayments: string;
  footerPaymentsMode: "text" | "image";
  footerPaymentsImage: string;
  headerLogo: string;
  footerLogo: string;
  cookieSettingsLinkEnabled: boolean;
  socials: { facebook: string; instagram: string };
};

export async function getLayoutSettings(): Promise<LayoutSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...LAYOUT_SETTING_KEYS, "store.name"] } },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const d = LAYOUT_SETTING_DEFAULTS;
  const s = (key: string) => map.get(key) ?? d[key] ?? "";
  const storeName = map.get("store.name")?.trim() || FALLBACK_STORE_NAME;

  return {
    storeName,
    announceEnabled: s("announce.enabled") === "1",
    announceLeft: s("announce.left"),
    announcePre: s("announce.pre"),
    announceCode: s("announce.code"),
    announcePost: s("announce.post"),
    announceRight: s("announce.right"),
    nav: {
      home: s("nav.home"),
      shop: s("nav.shop"),
      categories: s("nav.categories"),
      arrivals: s("nav.arrivals"),
      bestSellers: s("nav.bestsellers"),
    },
    footerDescription: resolveBrand(s("footer.description"), storeName),
    footerPhone: s("footer.phone"),
    footerFacebook: s("footer.facebook"),
    footerInstagram: s("footer.instagram"),
    footerNewsletter: s("footer.newsletter"),
    trust: [1, 2, 3, 4].map((i) => ({
      title: s(`footer.trust${i}.title`),
      text: s(`footer.trust${i}.text`),
    })),
    footerRights: s("footer.rights"),
    footerPayments: s("footer.payments"),
    footerPaymentsMode: s("footer.paymentsMode") === "image" ? "image" : "text",
    footerPaymentsImage: s("footer.paymentsImage"),
    headerLogo: s("brand.headerLogo"),
    footerLogo: s("brand.footerLogo"),
    cookieSettingsLinkEnabled: s(COOKIE_SETTINGS_LINK_KEY) !== "0",
    socials: {
      facebook: s("footer.facebook"),
      instagram: s("footer.instagram"),
    },
  };
}
