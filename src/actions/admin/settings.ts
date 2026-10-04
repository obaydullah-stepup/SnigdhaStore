"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { storage } from "@/lib/storage";
import { SETTINGS_CACHE_TAG } from "@/lib/settings";
import { META_PIXEL_ID_PATTERN } from "@/lib/analytics";
import { FALLBACK_STORE_NAME } from "@/config/site";

const settingsSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(1, "Store name is required.")
    .max(60)
    .nullish()
    .transform((v) => v ?? null),
  storeCurrency: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .nullish()
    .transform((v) => v ?? null),
  standardFee: z.coerce.number().int().min(0, "Fee cannot be negative."),
  expressFee: z.coerce.number().int().min(0, "Fee cannot be negative."),
  freeShippingThreshold: z.coerce.number().int().min(0, "Threshold cannot be negative."),
  promoEnabled: z
    .union([z.literal("1"), z.literal("0")])
    .nullish()
    .transform((v) => (v === "1" ? "1" : "0")),
  promoBadge: z
    .string()
    .trim()
    .max(60)
    .nullish()
    .transform((v) => (v ? v : "")),
  promoTitle: z
    .string()
    .trim()
    .max(80)
    .nullish()
    .transform((v) => (v ? v : "")),
  promoCode: z
    .string()
    .trim()
    .max(40)
    .nullish()
    .transform((v) => (v ? v : "")),
  promoDescription: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v ? v : "")),
  promoCtaLabel: z
    .string()
    .trim()
    .max(40)
    .nullish()
    .transform((v) => (v ? v : "")),
  promoCtaUrl: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => (v ? v : "")),
  promoImage: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v ? v : "")),
  announceEnabled: z
    .union([z.literal("1"), z.literal("0")])
    .nullish()
    .transform((v) => (v === "1" ? "1" : "0")),
  announceLeft: textField(120),
  announcePre: textField(60),
  announceCode: textField(30),
  announcePost: textField(60),
  announceRight: textField(120),
  navHome: textField(30),
  navShop: textField(30),
  navCategories: textField(30),
  navArrivals: textField(30),
  navBestSellers: textField(30),
  footerDescription: textField(300),
  footerPhone: textField(40),
  footerFacebook: textField(200),
  footerInstagram: textField(200),
  footerNewsletter: textField(160),
  footerTrust1Title: textField(40),
  footerTrust1Text: textField(200),
  footerTrust2Title: textField(40),
  footerTrust2Text: textField(200),
  footerTrust3Title: textField(40),
  footerTrust3Text: textField(200),
  footerTrust4Title: textField(40),
  footerTrust4Text: textField(200),
  footerRights: textField(80),
  footerPayments: textField(120),
  footerPaymentsMode: z
    .union([z.literal("text"), z.literal("image")])
    .nullish()
    .transform((v) => (v === "image" ? "image" : "text")),
  footerPaymentsImage: textField(500),
  headerLogo: textField(500),
  footerLogo: textField(500),
  metaPixelId: z
    .string()
    .trim()
    .nullish()
    .transform((v) => v ?? "")
    .refine((v) => v === "" || META_PIXEL_ID_PATTERN.test(v), {
      message: "Meta Pixel ID must be 10-20 digits.",
    }),
  metaPixelEnabled: z
    .union([z.literal("1"), z.literal("0")])
    .nullish()
    .transform((v) => (v === "1" ? "1" : "0")),
  purchaseTrigger: z
    .union([z.literal("immediately"), z.literal("confirmed")])
    .nullish()
    .transform((v) => (v === "confirmed" ? "confirmed" : "immediately")),
  consentMode: z
    .union([z.literal("required"), z.literal("informational"), z.literal("disabled")])
    .nullish()
    .transform((v) =>
      v === "informational" || v === "disabled" ? v : "required"
    ),
  cookieSettingsLink: z
    .union([z.literal("1"), z.literal("0")])
    .nullish()
    .transform((v) => (v === "1" ? "1" : "0")),
  metaCapiEnabled: z
    .union([z.literal("1"), z.literal("0")])
    .nullish()
    .transform((v) => (v === "1" ? "1" : "0")),
  metaCapiPixelId: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((v) => v ?? ""),
  // Write-only: a blank submission keeps whatever is already stored, so an
  // admin can toggle other settings without ever re-entering the secret.
  metaCapiAccessToken: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v ?? ""),
});

function textField(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : ""));
}

export type SettingsFormState = { ok: boolean; error?: string };

export async function saveSettingsAction(
  prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    storeName: formData.get("storeName"),
    storeCurrency: formData.get("storeCurrency"),
    standardFee: formData.get("standardFee"),
    expressFee: formData.get("expressFee"),
    freeShippingThreshold: formData.get("freeShippingThreshold"),
    promoEnabled: formData.get("promoEnabled"),
    promoBadge: formData.get("promoBadge"),
    promoTitle: formData.get("promoTitle"),
    promoCode: formData.get("promoCode"),
    promoDescription: formData.get("promoDescription"),
    promoCtaLabel: formData.get("promoCtaLabel"),
    promoCtaUrl: formData.get("promoCtaUrl"),
    promoImage: formData.get("promoImage"),
    announceEnabled: formData.get("announceEnabled"),
    announceLeft: formData.get("announceLeft"),
    announcePre: formData.get("announcePre"),
    announceCode: formData.get("announceCode"),
    announcePost: formData.get("announcePost"),
    announceRight: formData.get("announceRight"),
    navHome: formData.get("navHome"),
    navShop: formData.get("navShop"),
    navCategories: formData.get("navCategories"),
    navArrivals: formData.get("navArrivals"),
    navBestSellers: formData.get("navBestSellers"),
    footerDescription: formData.get("footerDescription"),
    footerPhone: formData.get("footerPhone"),
    footerFacebook: formData.get("footerFacebook"),
    footerInstagram: formData.get("footerInstagram"),
    footerNewsletter: formData.get("footerNewsletter"),
    footerTrust1Title: formData.get("footerTrust1Title"),
    footerTrust1Text: formData.get("footerTrust1Text"),
    footerTrust2Title: formData.get("footerTrust2Title"),
    footerTrust2Text: formData.get("footerTrust2Text"),
    footerTrust3Title: formData.get("footerTrust3Title"),
    footerTrust3Text: formData.get("footerTrust3Text"),
    footerTrust4Title: formData.get("footerTrust4Title"),
    footerTrust4Text: formData.get("footerTrust4Text"),
    footerRights: formData.get("footerRights"),
    footerPayments: formData.get("footerPayments"),
    footerPaymentsMode: formData.get("footerPaymentsMode"),
    footerPaymentsImage: formData.get("footerPaymentsImage"),
    headerLogo: formData.get("headerLogo"),
    footerLogo: formData.get("footerLogo"),
    metaPixelId: formData.get("metaPixelId"),
    metaPixelEnabled: formData.get("metaPixelEnabled"),
    purchaseTrigger: formData.get("purchaseTrigger"),
    consentMode: formData.get("consentMode"),
    cookieSettingsLink: formData.get("cookieSettingsLink"),
    metaCapiEnabled: formData.get("metaCapiEnabled"),
    metaCapiPixelId: formData.get("metaCapiPixelId"),
    metaCapiAccessToken: formData.get("metaCapiAccessToken"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const {
    storeName,
    storeCurrency,
    standardFee,
    expressFee,
    freeShippingThreshold,
    promoEnabled,
    promoBadge,
    promoTitle,
    promoCode,
    promoDescription,
    promoCtaLabel,
    promoCtaUrl,
    promoImage,
    announceEnabled,
    announceLeft,
    announcePre,
    announceCode,
    announcePost,
    announceRight,
    navHome,
    navShop,
    navCategories,
    navArrivals,
    navBestSellers,
    footerDescription,
    footerPhone,
    footerFacebook,
    footerInstagram,
    footerNewsletter,
    footerTrust1Title,
    footerTrust1Text,
    footerTrust2Title,
    footerTrust2Text,
    footerTrust3Title,
    footerTrust3Text,
    footerTrust4Title,
    footerTrust4Text,
    footerRights,
    footerPayments,
    footerPaymentsMode,
    footerPaymentsImage,
    headerLogo,
    footerLogo,
    metaPixelId,
    metaPixelEnabled,
    purchaseTrigger,
    consentMode,
    cookieSettingsLink,
    metaCapiEnabled,
    metaCapiPixelId,
    metaCapiAccessToken,
  } = parsed.data;

  const existingRows = await prisma.setting.findMany({
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
          "footer.paymentsImage",
          "brand.logo",
          "brand.headerLogo",
          "brand.footerLogo",
          "tracking.metaCapiPixelId",
          "tracking.metaCapiAccessToken",
        ],
      },
    },
  });
  const existing = new Map(existingRows.map((r) => [r.key, r.value]));

  // "Confirmed Only" sends exclusively over CAPI, so with no token or dataset
  // it would silently never report anything. Reject the save rather than
  // accepting a trigger that cannot fire.
  if (purchaseTrigger === "confirmed") {
    const resolvedToken =
      metaCapiAccessToken ||
      (existing.get("tracking.metaCapiAccessToken") ?? "") ||
      (process.env.META_CAPI_ACCESS_TOKEN ?? "");
    const resolvedPixelId =
      metaCapiPixelId ||
      (existing.get("tracking.metaCapiPixelId") ?? "") ||
      (process.env.META_CAPI_PIXEL_ID ?? "");
    if (metaCapiEnabled !== "1" || !resolvedToken.trim() || !resolvedPixelId.trim()) {
      return {
        ok: false as const,
        error:
          "Confirmed Only needs the Conversions API. Add a dataset ID and access token, and enable CAPI, or keep the Immediately trigger.",
      };
    }
  }

  const oldPromoImage = existing.get("promo.image") ?? "";
  if (oldPromoImage && oldPromoImage !== promoImage) {
    await storage.deleteFiles([oldPromoImage]).catch(() => {});
  }

  const oldPaymentsImage = existing.get("footer.paymentsImage") ?? "";
  if (oldPaymentsImage && oldPaymentsImage !== footerPaymentsImage) {
    await storage.deleteFiles([oldPaymentsImage]).catch(() => {});
  }

  const oldBrandLogo = existing.get("brand.logo") ?? "";
  if (oldBrandLogo && oldBrandLogo !== headerLogo && oldBrandLogo !== footerLogo) {
    await storage.deleteFiles([oldBrandLogo]).catch(() => {});
  }

  const oldHeaderLogo = existing.get("brand.headerLogo") ?? "";
  if (oldHeaderLogo && oldHeaderLogo !== headerLogo) {
    await storage.deleteFiles([oldHeaderLogo]).catch(() => {});
  }

  const oldFooterLogo = existing.get("brand.footerLogo") ?? "";
  if (oldFooterLogo && oldFooterLogo !== footerLogo) {
    await storage.deleteFiles([oldFooterLogo]).catch(() => {});
  }

  if (existing.get("brand.logo") !== undefined) {
    await prisma.setting.deleteMany({ where: { key: "brand.logo" } });
  }

  const entries = new Map([
    ["store.name", storeName ?? existing.get("store.name") ?? FALLBACK_STORE_NAME],
    ["store.currency", storeCurrency ?? existing.get("store.currency") ?? "BDT"],
    ["shipping.standardFee", String(standardFee)],
    ["shipping.expressFee", String(expressFee)],
    ["shipping.freeShippingThreshold", String(freeShippingThreshold)],
    ["promo.enabled", promoEnabled],
    ["promo.badge", promoBadge],
    ["promo.title", promoTitle],
    ["promo.code", promoCode],
    ["promo.description", promoDescription],
    ["promo.ctaLabel", promoCtaLabel],
    ["promo.ctaUrl", promoCtaUrl],
    ["promo.image", promoImage],
    ["announce.enabled", announceEnabled],
    ["announce.left", announceLeft],
    ["announce.pre", announcePre],
    ["announce.code", announceCode],
    ["announce.post", announcePost],
    ["announce.right", announceRight],
    ["nav.home", navHome],
    ["nav.shop", navShop],
    ["nav.categories", navCategories],
    ["nav.arrivals", navArrivals],
    ["nav.bestsellers", navBestSellers],
    ["footer.description", footerDescription],
    ["footer.phone", footerPhone],
    ["footer.facebook", footerFacebook],
    ["footer.instagram", footerInstagram],
    ["footer.newsletter", footerNewsletter],
    ["footer.trust1.title", footerTrust1Title],
    ["footer.trust1.text", footerTrust1Text],
    ["footer.trust2.title", footerTrust2Title],
    ["footer.trust2.text", footerTrust2Text],
    ["footer.trust3.title", footerTrust3Title],
    ["footer.trust3.text", footerTrust3Text],
    ["footer.trust4.title", footerTrust4Title],
    ["footer.trust4.text", footerTrust4Text],
    ["footer.rights", footerRights],
    ["footer.payments", footerPayments],
    ["footer.paymentsMode", footerPaymentsMode],
    ["footer.paymentsImage", footerPaymentsImage],
    ["brand.headerLogo", headerLogo],
    ["brand.footerLogo", footerLogo],
    ["tracking.metaPixelId", metaPixelId],
    ["tracking.metaPixelEnabled", metaPixelEnabled],
    ["tracking.purchaseTrigger", purchaseTrigger],
    ["tracking.consentMode", consentMode],
    ["tracking.cookieSettingsLink", cookieSettingsLink],
    ["tracking.metaCapiEnabled", metaCapiEnabled],
    ["tracking.metaCapiPixelId", metaCapiPixelId],
    // Blank means "keep the stored token". Writing an empty string here would
    // silently disable CAPI the next time an admin saved an unrelated field.
    [
      "tracking.metaCapiAccessToken",
      metaCapiAccessToken || (existing.get("tracking.metaCapiAccessToken") ?? ""),
    ],
  ]);

  await Promise.all(
    Array.from(entries).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidateTag(SETTINGS_CACHE_TAG, { expire: 0 });
  void logAudit({ action: "settings.update", entityType: "setting" });
  return { ok: true };
}
