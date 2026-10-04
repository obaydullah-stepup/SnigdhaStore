import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import {
  getAnalyticsSettings,
  getCapiConfigSummary,
  getConsentSettings,
  getLayoutSettings,
} from "@/lib/settings";
import { FALLBACK_STORE_NAME } from "@/config/site";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [rows, layout, analytics, consent, capi] = await Promise.all([
    prisma.setting.findMany({
      where: {
        key: {
          in: [
            "store.name",
            "store.currency",
            "shipping.standardFee",
            "shipping.expressFee",
            "shipping.freeShippingThreshold",
            "promo.enabled",
            "promo.badge",
            "promo.title",
            "promo.code",
            "promo.description",
            "promo.ctaLabel",
            "promo.ctaUrl",
            "promo.image",
            "tracking.metaPixelId",
            "tracking.metaPixelEnabled",
          ],
        },
      },
    }),
    getLayoutSettings(),
    getAnalyticsSettings(),
    getConsentSettings(),
    // Read through the summary, so the token itself never reaches the client.
    getCapiConfigSummary(),
  ]);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const num = (key: string, fallback: number) => {
    const raw = map.get(key);
    const parsed = raw ? Number.parseFloat(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const initial = {
    storeName: map.get("store.name") ?? FALLBACK_STORE_NAME,
    storeCurrency: map.get("store.currency") ?? "BDT",
    standardFee: num("shipping.standardFee", 60),
    expressFee: num("shipping.expressFee", 120),
    freeShippingThreshold: num("shipping.freeShippingThreshold", 3000),
    promoEnabled: map.get("promo.enabled") === "1",
    promoBadge: map.get("promo.badge") ?? "Limited offer",
    promoTitle: map.get("promo.title") ?? "10% off your first order with",
    promoCode: map.get("promo.code") ?? "WELCOME10",
    promoDescription:
      map.get("promo.description") ??
      "Plus free nationwide delivery when you spend over ৳3,000 — every order is backed by easy returns.",
    promoCtaLabel: map.get("promo.ctaLabel") ?? "Browse the collection",
    promoCtaUrl: map.get("promo.ctaUrl") ?? "/shop",
    promoImage:
      map.get("promo.image") ??
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1600&auto=format&fit=crop",
    announceEnabled: layout.announceEnabled,
    announceLeft: layout.announceLeft,
    announcePre: layout.announcePre,
    announceCode: layout.announceCode,
    announcePost: layout.announcePost,
    announceRight: layout.announceRight,
    navHome: layout.nav.home,
    navShop: layout.nav.shop,
    navCategories: layout.nav.categories,
    navArrivals: layout.nav.arrivals,
    navBestSellers: layout.nav.bestSellers,
    footerDescription: layout.footerDescription,
    footerPhone: layout.footerPhone,
    footerFacebook: layout.footerFacebook,
    footerInstagram: layout.footerInstagram,
    footerNewsletter: layout.footerNewsletter,
    footerTrust1Title: layout.trust[0].title,
    footerTrust1Text: layout.trust[0].text,
    footerTrust2Title: layout.trust[1].title,
    footerTrust2Text: layout.trust[1].text,
    footerTrust3Title: layout.trust[2].title,
    footerTrust3Text: layout.trust[2].text,
    footerTrust4Title: layout.trust[3].title,
    footerTrust4Text: layout.trust[3].text,
    footerRights: layout.footerRights,
    footerPayments: layout.footerPayments,
    footerPaymentsMode: layout.footerPaymentsMode,
    footerPaymentsImage: layout.footerPaymentsImage,
    headerLogo: layout.headerLogo,
    footerLogo: layout.footerLogo,
    // The input holds only the admin-saved value, so the .env fallback stays a
    // fallback: showing the resolved ID here would silently promote it to an
    // admin override the first time any unrelated setting was saved.
    metaPixelId: map.get("tracking.metaPixelId") ?? "",
    metaPixelEnabled: analytics.metaPixelEnabled,
    metaPixelSource: analytics.metaPixelSource,
    metaPixelActiveId: analytics.metaPixelId,
    purchaseTrigger: analytics.purchaseTrigger,
    consentMode: consent.consentMode,
    cookieSettingsLinkEnabled: consent.cookieSettingsLinkEnabled,
    // The token is intentionally absent: the form only learns whether one
    // exists, and stays blank so an empty submit keeps the stored value.
    metaCapiEnabled: capi.enabled,
    metaCapiPixelId: capi.pixelIdSource === "admin" ? capi.pixelId : "",
    metaCapiPixelIdSource: capi.pixelIdSource,
    metaCapiAccessTokenConfigured: capi.accessTokenConfigured,
    metaCapiAccessTokenSource: capi.accessTokenSource,
  };

  return (
    <div className="max-w-2xl">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Settings" }]} />
      <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
        Settings
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Store identity and delivery pricing used across the storefront.
      </p>
      <div className="mt-6">
        <SettingsForm initial={initial} />
      </div>
    </div>
  );
}
