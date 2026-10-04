"use client";

import Image from "next/image";
import { useActionState, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImagePlus, Loader2, X, CircleQuestionMark } from "lucide-react";
import { toast } from "sonner";
import { saveSettingsAction } from "@/actions/admin/settings";
import { createProductImageUploadAction } from "@/actions/admin/upload";
import { isValidMetaPixelId } from "@/lib/analytics";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { FooterPreview, HeaderPreview } from "@/components/admin/settings-preview";

type TabKey = "general" | "shipping" | "promo" | "header" | "footer" | "tracking";

function isTabKey(value: string | null): value is TabKey {
  return (
    value === "general" ||
    value === "shipping" ||
    value === "promo" ||
    value === "header" ||
    value === "footer" ||
    value === "tracking"
  );
}

type SettingsInitial = {
  storeName: string;
  storeCurrency: string;
  standardFee: number;
  expressFee: number;
  freeShippingThreshold: number;
  promoEnabled: boolean;
  promoBadge: string;
  promoTitle: string;
  promoCode: string;
  promoDescription: string;
  promoCtaLabel: string;
  promoCtaUrl: string;
  promoImage: string;
  announceEnabled: boolean;
  announceLeft: string;
  announcePre: string;
  announceCode: string;
  announcePost: string;
  announceRight: string;
  navHome: string;
  navShop: string;
  navCategories: string;
  navArrivals: string;
  navBestSellers: string;
  footerDescription: string;
  footerPhone: string;
  footerFacebook: string;
  footerInstagram: string;
  footerNewsletter: string;
  footerTrust1Title: string;
  footerTrust1Text: string;
  footerTrust2Title: string;
  footerTrust2Text: string;
  footerTrust3Title: string;
  footerTrust3Text: string;
  footerTrust4Title: string;
  footerTrust4Text: string;
  footerRights: string;
  footerPayments: string;
  footerPaymentsMode: "text" | "image";
  footerPaymentsImage: string;
  headerLogo: string;
  footerLogo: string;
  metaPixelId: string;
  metaPixelEnabled: boolean;
  metaPixelSource: "admin" | "env" | "none";
  metaPixelActiveId: string;
  purchaseTrigger: "immediately" | "confirmed";
  consentMode: "required" | "informational" | "disabled";
  cookieSettingsLinkEnabled: boolean;
  metaCapiEnabled: boolean;
  metaCapiPixelId: string;
  metaCapiPixelIdSource: "admin" | "env" | "none";
  metaCapiAccessTokenConfigured: boolean;
  metaCapiAccessTokenSource: "admin" | "env" | "none";
};

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <>
      <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
        {title}
      </h2>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </>
  );
}

function LogoField({
  name,
  label,
  value,
  onChange,
  uploading,
  uploadHandler,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  uploading: boolean;
  uploadHandler: (
    folder: string,
    setUrl: (v: string) => void
  ) => (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm leading-none font-medium select-none">{label}</span>
      <input type="hidden" name={name} value={value} />
      {value ? (
        <div className="border-border bg-muted/40 relative h-14 max-w-md overflow-hidden rounded-lg border">
          <Image src={value} alt="" fill sizes="448px" className="object-contain p-1" />
          <span className="absolute top-1.5 right-1.5 flex gap-1">
            <label className="bg-background/80 hover:bg-background flex cursor-pointer items-center gap-1 rounded p-1.5 text-xs font-medium">
              <ImagePlus className="size-3.5" aria-hidden="true" />
              Replace
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                className="sr-only"
                onChange={uploadHandler("brand", onChange)}
                disabled={uploading}
              />
            </label>
            <button
              type="button"
              onClick={() => onChange("")}
              className="bg-destructive text-destructive-foreground rounded p-1.5 text-xs font-medium"
              aria-label="Remove image"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : (
        <label className="border-border text-muted-foreground hover:bg-muted flex h-14 max-w-md cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs">
          {uploading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-5" aria-hidden="true" />
          )}
          Upload image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className="sr-only"
            onChange={uploadHandler("brand", onChange)}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}

export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : "general";
  const [state, formAction, isPending] = useActionState(saveSettingsAction, {
    ok: false,
  });
  const [promoImage, setPromoImage] = useState(initial.promoImage);
  const [promoEnabled, setPromoEnabled] = useState(initial.promoEnabled);
  const [announceEnabled, setAnnounceEnabled] = useState(initial.announceEnabled);
  const [paymentsMode, setPaymentsMode] = useState<"text" | "image">(
    initial.footerPaymentsMode
  );
  const [paymentsImage, setPaymentsImage] = useState(initial.footerPaymentsImage);
  const [headerLogo, setHeaderLogo] = useState(initial.headerLogo);
  const [footerLogo, setFooterLogo] = useState(initial.footerLogo);
  const [metaPixelEnabled, setMetaPixelEnabled] = useState(initial.metaPixelEnabled);
  const [purchaseTrigger, setPurchaseTrigger] = useState(initial.purchaseTrigger);
  const [consentMode, setConsentMode] = useState(initial.consentMode);
  const [cookieSettingsLinkEnabled, setCookieSettingsLinkEnabled] = useState(
    initial.cookieSettingsLinkEnabled
  );
  const [metaCapiEnabled, setMetaCapiEnabled] = useState(initial.metaCapiEnabled);
  // The stored token is never sent to this component, so the field always
  // starts blank and blank means "keep what is stored".
  const [metaCapiAccessToken, setMetaCapiAccessToken] = useState("");
  const [uploading, setUploading] = useState(false);
  const [values, setValues] = useState({
    storeName: initial.storeName,
    storeCurrency: initial.storeCurrency,
    standardFee: String(initial.standardFee),
    expressFee: String(initial.expressFee),
    freeShippingThreshold: String(initial.freeShippingThreshold),
    promoBadge: initial.promoBadge,
    promoTitle: initial.promoTitle,
    promoCode: initial.promoCode,
    promoDescription: initial.promoDescription,
    promoCtaLabel: initial.promoCtaLabel,
    promoCtaUrl: initial.promoCtaUrl,
    announceLeft: initial.announceLeft,
    announcePre: initial.announcePre,
    announceCode: initial.announceCode,
    announcePost: initial.announcePost,
    announceRight: initial.announceRight,
    navHome: initial.navHome,
    navShop: initial.navShop,
    navCategories: initial.navCategories,
    navArrivals: initial.navArrivals,
    navBestSellers: initial.navBestSellers,
    footerDescription: initial.footerDescription,
    footerPhone: initial.footerPhone,
    footerFacebook: initial.footerFacebook,
    footerInstagram: initial.footerInstagram,
    footerNewsletter: initial.footerNewsletter,
    footerTrust1Title: initial.footerTrust1Title,
    footerTrust1Text: initial.footerTrust1Text,
    footerTrust2Title: initial.footerTrust2Title,
    footerTrust2Text: initial.footerTrust2Text,
    footerTrust3Title: initial.footerTrust3Title,
    footerTrust3Text: initial.footerTrust3Text,
    footerTrust4Title: initial.footerTrust4Title,
    footerTrust4Text: initial.footerTrust4Text,
    footerRights: initial.footerRights,
    footerPayments: initial.footerPayments,
    metaPixelId: initial.metaPixelId,
    metaCapiPixelId: initial.metaCapiPixelId,
  });

  // Whether CAPI can actually send, judged from the form's current values plus
  // whatever is already stored or in the environment. The stored token is not
  // available in this component, so "configured" is the only signal for it.
  const capiReady =
    metaCapiEnabled &&
    (metaCapiAccessToken.trim() !== "" ||
      initial.metaCapiAccessTokenConfigured ||
      initial.metaCapiAccessTokenSource === "env") &&
    (values.metaCapiPixelId.trim() !== "" ||
      initial.metaCapiPixelId !== "" ||
      initial.metaCapiPixelIdSource === "env");

  function changeValue(key: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  function changeTab(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "general") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(qs ? `/admin/settings?${qs}` : "/admin/settings", {
      scroll: false,
    });
  }

  function imageUploadHandler(folder: string, setUrl: (url: string) => void) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        toast.error(
          `Unsupported file type: ${file.type}. Use JPG, PNG, WebP, AVIF or GIF.`
        );
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Images must be 5 MB or smaller.");
        return;
      }
      setUploading(true);
      try {
        const ticket = await createProductImageUploadAction({
          filename: file.name,
          mime: file.type,
          folder,
        });
        if (!ticket.ok || !ticket.uploadUrl || !ticket.publicUrl) {
          toast.error(ticket.fieldErrors?.newImages?.en ?? "Upload failed.");
          return;
        }
        const res = await fetch(ticket.uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!res.ok) {
          toast.error("Upload failed. Please try again.");
          return;
        }
        setUrl(ticket.publicUrl!);
      } catch {
        toast.error("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    };
  }

  const announcePreview = {
    enabled: announceEnabled,
    left: values.announceLeft,
    pre: values.announcePre,
    code: values.announceCode,
    post: values.announcePost,
    right: values.announceRight,
  };
  const headerPreview = {
    storeName: values.storeName,
    logo: headerLogo,
    nav: [
      values.navHome,
      values.navShop,
      values.navCategories,
      values.navArrivals,
      values.navBestSellers,
    ],
  };
  const footerPreview = {
    storeName: values.storeName,
    logo: footerLogo,
    description: values.footerDescription,
    phone: values.footerPhone,
    facebook: values.footerFacebook,
    instagram: values.footerInstagram,
    newsletter: values.footerNewsletter,
    trust: [
      { title: values.footerTrust1Title, text: values.footerTrust1Text },
      { title: values.footerTrust2Title, text: values.footerTrust2Text },
      { title: values.footerTrust3Title, text: values.footerTrust3Text },
      { title: values.footerTrust4Title, text: values.footerTrust4Text },
    ],
    rights: values.footerRights,
    payments: values.footerPayments,
    paymentsMode: paymentsMode,
    paymentsUrl: paymentsImage,
  };

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      {state.error && (
        <p className="text-destructive rounded-md bg-red-50 p-3 text-sm" role="alert">
          {state.error}
        </p>
      )}

      <Tabs value={activeTab} onValueChange={changeTab}>
        <TabsList>
          <TabsTab value="general">General</TabsTab>
          <TabsTab value="shipping">Shipping</TabsTab>
          <TabsTab value="promo">Promo Banner</TabsTab>
          <TabsTab value="header">Header</TabsTab>
          <TabsTab value="footer">Footer</TabsTab>
          <TabsTab value="tracking">Tracking</TabsTab>
        </TabsList>

        <TabsPanel value="general" keepMounted className="mt-6">
          <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5">
            <SectionHeading title="Store" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="storeName">Store name</Label>
                <Input
                  id="storeName"
                  name="storeName"
                  value={values.storeName}
                  onChange={changeValue("storeName")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="storeCurrency">Currency code</Label>
                <Input
                  id="storeCurrency"
                  name="storeCurrency"
                  value={values.storeCurrency}
                  onChange={changeValue("storeCurrency")}
                  required
                />
              </div>
            </div>
          </div>
        </TabsPanel>

        <TabsPanel value="shipping" keepMounted className="mt-6">
          <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5">
            <SectionHeading title="Shipping" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="standardFee">Standard delivery fee (BDT)</Label>
                <Input
                  id="standardFee"
                  name="standardFee"
                  type="number"
                  min={0}
                  value={values.standardFee}
                  onChange={changeValue("standardFee")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expressFee">Express delivery fee (BDT)</Label>
                <Input
                  id="expressFee"
                  name="expressFee"
                  type="number"
                  min={0}
                  value={values.expressFee}
                  onChange={changeValue("expressFee")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="freeShippingThreshold">Free shipping over (BDT)</Label>
                <Input
                  id="freeShippingThreshold"
                  name="freeShippingThreshold"
                  type="number"
                  min={0}
                  value={values.freeShippingThreshold}
                  onChange={changeValue("freeShippingThreshold")}
                  required
                />
              </div>
            </div>
          </div>
        </TabsPanel>

        <TabsPanel value="promo" keepMounted className="mt-6">
          <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5">
            <SectionHeading
              title="Promo banner"
              hint="Shown on the homepage. Displayed only when enabled and all key fields are filled."
            />
            <label className="flex w-fit items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="promoEnabled"
                value="1"
                className="size-4 accent-[var(--category-primary)]"
                checked={promoEnabled}
                onChange={(e) => setPromoEnabled(e.target.checked)}
              />
              Show promo banner
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="promoBadge">Badge</Label>
                <Input
                  id="promoBadge"
                  name="promoBadge"
                  value={values.promoBadge}
                  onChange={changeValue("promoBadge")}
                  disabled={!promoEnabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promoCode">Discount code</Label>
                <Input
                  id="promoCode"
                  name="promoCode"
                  value={values.promoCode}
                  onChange={changeValue("promoCode")}
                  disabled={!promoEnabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promoTitle">Headline (before code)</Label>
                <Input
                  id="promoTitle"
                  name="promoTitle"
                  value={values.promoTitle}
                  onChange={changeValue("promoTitle")}
                  disabled={!promoEnabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promoCtaLabel">Button label</Label>
                <Input
                  id="promoCtaLabel"
                  name="promoCtaLabel"
                  value={values.promoCtaLabel}
                  onChange={changeValue("promoCtaLabel")}
                  disabled={!promoEnabled}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promoCtaUrl">Button link</Label>
                <Input
                  id="promoCtaUrl"
                  name="promoCtaUrl"
                  value={values.promoCtaUrl}
                  onChange={changeValue("promoCtaUrl")}
                  placeholder="/shop"
                  disabled={!promoEnabled}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promoDescription">Description</Label>
              <Textarea
                id="promoDescription"
                name="promoDescription"
                rows={3}
                value={values.promoDescription}
                onChange={changeValue("promoDescription")}
                disabled={!promoEnabled}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Banner image</Label>
              <input type="hidden" name="promoImage" value={promoImage} />
              {promoImage ? (
                <div className="border-border relative aspect-[16/10] max-w-md overflow-hidden rounded-lg border">
                  <Image
                    src={promoImage}
                    alt=""
                    fill
                    sizes="448px"
                    className="object-cover"
                  />
                  <span className="absolute top-2 right-2 flex gap-1">
                    <label className="bg-background/80 hover:bg-background flex cursor-pointer items-center gap-1 rounded p-1.5 text-xs font-medium">
                      <ImagePlus className="size-3.5" aria-hidden="true" />
                      Replace
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                        className="sr-only"
                        onChange={imageUploadHandler("promo", setPromoImage)}
                        disabled={uploading}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setPromoImage("")}
                      className="bg-destructive text-destructive-foreground rounded p-1.5 text-xs font-medium"
                      aria-label="Remove image"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                </div>
              ) : (
                <label className="border-border text-muted-foreground hover:bg-muted flex aspect-[16/10] max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-xs">
                  {uploading ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="size-5" aria-hidden="true" />
                  )}
                  Upload image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                    className="sr-only"
                    onChange={imageUploadHandler("promo", setPromoImage)}
                    disabled={uploading}
                  />
                </label>
              )}
              <p className="text-muted-foreground text-xs">
                JPG, PNG, WebP, AVIF or GIF up to 5 MB.
              </p>
            </div>
          </div>
        </TabsPanel>

        <TabsPanel value="header" keepMounted className="mt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <div>
                <SectionHeading title="Header preview" />
                <div className="mt-2">
                  <HeaderPreview announce={announcePreview} header={headerPreview} />
                </div>
              </div>

              <section className="border-border bg-card rounded-xl border p-5">
                <SectionHeading
                  title="Header logo"
                  hint="Shown in the header. When a logo isn't set, the store name is shown instead."
                />
                <div className="mt-4">
                  <LogoField
                    name="headerLogo"
                    label="Logo image"
                    value={headerLogo}
                    onChange={setHeaderLogo}
                    uploading={uploading}
                    uploadHandler={imageUploadHandler}
                  />
                </div>
                <p className="text-muted-foreground mt-3 text-xs">
                  JPG, PNG, WebP, AVIF or GIF up to 5 MB. For best sharpness, upload at
                  least 2× the size the logo appears on screen.
                </p>
              </section>

              <section className="border-border bg-card rounded-xl border p-5">
                <SectionHeading
                  title="Announcement bar"
                  hint="The dark strip above the header. Left and right messages appear on larger screens."
                />
                <label className="mt-4 flex w-fit items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="announceEnabled"
                    value="1"
                    className="size-4 accent-[var(--category-primary)]"
                    checked={announceEnabled}
                    onChange={(e) => setAnnounceEnabled(e.target.checked)}
                  />
                  Show announcement bar
                </label>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="announceLeft">Left message</Label>
                    <Input
                      id="announceLeft"
                      name="announceLeft"
                      value={values.announceLeft}
                      onChange={changeValue("announceLeft")}
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="announcePre">Text before code</Label>
                    <Input
                      id="announcePre"
                      name="announcePre"
                      value={values.announcePre}
                      onChange={changeValue("announcePre")}
                      maxLength={60}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="announceCode">Discount code</Label>
                    <Input
                      id="announceCode"
                      name="announceCode"
                      value={values.announceCode}
                      onChange={changeValue("announceCode")}
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="announcePost">Text after code</Label>
                    <Input
                      id="announcePost"
                      name="announcePost"
                      value={values.announcePost}
                      onChange={changeValue("announcePost")}
                      maxLength={60}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="announceRight">Right message</Label>
                    <Input
                      id="announceRight"
                      name="announceRight"
                      value={values.announceRight}
                      onChange={changeValue("announceRight")}
                      maxLength={120}
                    />
                  </div>
                </div>
              </section>

              <section className="border-border bg-card rounded-xl border p-5">
                <SectionHeading
                  title="Main navigation"
                  hint="Labels for the header menu. Their destinations stay fixed."
                />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="navHome">Home</Label>
                    <Input
                      id="navHome"
                      name="navHome"
                      value={values.navHome}
                      onChange={changeValue("navHome")}
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="navShop">Shop</Label>
                    <Input
                      id="navShop"
                      name="navShop"
                      value={values.navShop}
                      onChange={changeValue("navShop")}
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="navCategories">Categories</Label>
                    <Input
                      id="navCategories"
                      name="navCategories"
                      value={values.navCategories}
                      onChange={changeValue("navCategories")}
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="navArrivals">New arrivals link</Label>
                    <Input
                      id="navArrivals"
                      name="navArrivals"
                      value={values.navArrivals}
                      onChange={changeValue("navArrivals")}
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="navBestSellers">Best sellers link</Label>
                    <Input
                      id="navBestSellers"
                      name="navBestSellers"
                      value={values.navBestSellers}
                      onChange={changeValue("navBestSellers")}
                      maxLength={30}
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </TabsPanel>

        <TabsPanel value="footer" keepMounted className="mt-6">
          <div className="flex flex-col gap-4">
            <div>
              <SectionHeading title="Footer preview" />
              <div className="rounded-lg border shadow-sm">
                <FooterPreview footer={footerPreview} />
              </div>
            </div>

            <section className="border-border bg-card rounded-xl border p-5">
              <SectionHeading
                title="Footer logo"
                hint="Shown in the footer. When a logo isn't set, the store name is shown instead."
              />
              <div className="mt-4">
                <LogoField
                  name="footerLogo"
                  label="Logo image"
                  value={footerLogo}
                  onChange={setFooterLogo}
                  uploading={uploading}
                  uploadHandler={imageUploadHandler}
                />
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                JPG, PNG, WebP, AVIF or GIF up to 5 MB. For best sharpness, upload at
                least 2× the size the logo appears on screen.
              </p>
            </section>

            <section className="border-border bg-card rounded-xl border p-5">
              <SectionHeading title="Brand & contact" />
              <div className="mt-4 grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="footerDescription">Description</Label>
                  <Textarea
                    id="footerDescription"
                    name="footerDescription"
                    rows={3}
                    value={values.footerDescription}
                    onChange={changeValue("footerDescription")}
                    maxLength={300}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="footerPhone">Contact phone</Label>
                  <Input
                    id="footerPhone"
                    name="footerPhone"
                    value={values.footerPhone}
                    onChange={changeValue("footerPhone")}
                    maxLength={40}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="footerFacebook">Facebook URL</Label>
                  <Input
                    id="footerFacebook"
                    name="footerFacebook"
                    type="url"
                    value={values.footerFacebook}
                    onChange={changeValue("footerFacebook")}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="footerInstagram">Instagram URL</Label>
                  <Input
                    id="footerInstagram"
                    name="footerInstagram"
                    type="url"
                    value={values.footerInstagram}
                    onChange={changeValue("footerInstagram")}
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="footerNewsletter">Newsletter blurb</Label>
                  <Input
                    id="footerNewsletter"
                    name="footerNewsletter"
                    value={values.footerNewsletter}
                    onChange={changeValue("footerNewsletter")}
                    maxLength={160}
                  />
                </div>
              </div>
            </section>

            <section className="border-border bg-card rounded-xl border p-5">
              <SectionHeading
                title="Trust badges"
                hint="Shown above the copyright bar. Leave a title blank to hide that badge."
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="border-border rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs font-medium">Badge {i}</p>
                    <div className="mt-2 space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`footerTrust${i}Title`}>Title</Label>
                        <Input
                          id={`footerTrust${i}Title`}
                          name={`footerTrust${i}Title`}
                          value={values[`footerTrust${i}Title` as keyof typeof values]}
                          onChange={changeValue(
                            `footerTrust${i}Title` as keyof typeof values
                          )}
                          maxLength={40}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`footerTrust${i}Text`}>Text</Label>
                        <Input
                          id={`footerTrust${i}Text`}
                          name={`footerTrust${i}Text`}
                          value={values[`footerTrust${i}Text` as keyof typeof values]}
                          onChange={changeValue(
                            `footerTrust${i}Text` as keyof typeof values
                          )}
                          maxLength={200}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-border bg-card rounded-xl border p-5">
              <SectionHeading title="Legal strip" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="footerRights">Copyright suffix</Label>
                  <Input
                    id="footerRights"
                    name="footerRights"
                    value={values.footerRights}
                    onChange={changeValue("footerRights")}
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="footerPaymentsMode">Payment methods display</Label>
                  <Select
                    name="footerPaymentsMode"
                    value={paymentsMode}
                    onValueChange={(v) => setPaymentsMode(v as "text" | "image")}
                  >
                    <SelectTrigger id="footerPaymentsMode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {paymentsMode === "image" ? (
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-sm leading-none font-medium select-none">
                      Payment methods image
                    </span>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            aria-label="Ideal image ratio guidance"
                            className="text-muted-foreground hover:text-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-full transition-colors"
                          >
                            <CircleQuestionMark className="size-3.5" aria-hidden="true" />
                          </button>
                        }
                      />
                      <TooltipContent>
                        Best served wide and low — a banner-style image keeps payment
                        logos readable. It&apos;s shown about 20px tall in the footer and
                        is never cropped, so aim for roughly 4:1 to 8:1 and upload at 2×
                        resolution for a crisp finish.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <input type="hidden" name="footerPaymentsImage" value={paymentsImage} />
                  {paymentsImage ? (
                    <div className="border-border bg-muted/40 relative h-14 max-w-md overflow-hidden rounded-lg border">
                      <Image
                        src={paymentsImage}
                        alt=""
                        fill
                        sizes="448px"
                        className="object-contain p-1"
                      />
                      <span className="absolute top-1.5 right-1.5 flex gap-1">
                        <label className="bg-background/80 hover:bg-background flex cursor-pointer items-center gap-1 rounded p-1.5 text-xs font-medium">
                          <ImagePlus className="size-3.5" aria-hidden="true" />
                          Replace
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                            className="sr-only"
                            onChange={imageUploadHandler("footer", setPaymentsImage)}
                            disabled={uploading}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setPaymentsImage("")}
                          className="bg-destructive text-destructive-foreground rounded p-1.5 text-xs font-medium"
                          aria-label="Remove image"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                  ) : (
                    <label className="border-border text-muted-foreground hover:bg-muted flex h-14 max-w-md cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs">
                      {uploading ? (
                        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                      ) : (
                        <ImagePlus className="size-5" aria-hidden="true" />
                      )}
                      Upload image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                        className="sr-only"
                        onChange={imageUploadHandler("footer", setPaymentsImage)}
                        disabled={uploading}
                      />
                    </label>
                  )}
                  <p className="text-muted-foreground text-xs">
                    JPG, PNG, WebP, AVIF or GIF up to 5 MB. Shown in the footer&apos;s
                    legal strip.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor="footerPayments">Payment methods text</Label>
                  <Input
                    id="footerPayments"
                    name="footerPayments"
                    value={values.footerPayments}
                    onChange={changeValue("footerPayments")}
                    maxLength={120}
                  />
                </div>
              )}
            </section>
          </div>
        </TabsPanel>

        <TabsPanel value="tracking" keepMounted className="mt-6">
          <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5">
            <SectionHeading
              title="Meta Pixel"
              hint="Meta (Facebook) Pixel ID, 10-20 digits. Find it in Events Manager → Data Sources → Pixel → Settings."
            />

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="metaPixelEnabled"
                value="1"
                checked={metaPixelEnabled}
                onChange={(e) => setMetaPixelEnabled(e.target.checked)}
                className="mt-0.5 size-4 accent-emerald-700"
              />
              <span className="text-sm leading-snug">
                Enable the Meta Pixel
                <span className="text-muted-foreground block text-xs">
                  {consentMode === "required"
                    ? "Only loads for visitors who accept marketing cookies."
                    : consentMode === "informational"
                      ? "Loads for every visitor; the consent mode below does not block it."
                      : "Loads for every visitor."}
                </span>
              </span>
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="metaPixelId">Pixel ID</Label>
              <Input
                id="metaPixelId"
                name="metaPixelId"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="1234567890123456"
                value={values.metaPixelId}
                onChange={changeValue("metaPixelId")}
                maxLength={20}
                disabled={!metaPixelEnabled}
                aria-invalid={values.metaPixelId !== "" && !isValidMetaPixelId(values.metaPixelId)}
              />
              {values.metaPixelId !== "" && !isValidMetaPixelId(values.metaPixelId) && (
                <p className="text-destructive text-xs">
                  The Pixel ID must be 10-20 digits, with no spaces or letters.
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Leave blank to fall back to{" "}
                <code className="text-foreground">NEXT_PUBLIC_META_PIXEL_ID</code> from the
                server environment.
              </p>
            </div>

            <div className="border-border mt-4 flex flex-col gap-4 rounded-xl border p-4">
              <SectionHeading
                title="Conversions API (server-side)"
                hint="Sends Purchase events from the server, so they arrive even when ad blockers stop the browser pixel. Both fields fall back to the environment until you save here."
              />

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="metaCapiEnabled"
                  value="1"
                  checked={metaCapiEnabled}
                  onChange={(e) => setMetaCapiEnabled(e.target.checked)}
                  className="mt-0.5 size-4 accent-emerald-700"
                />
                <span className="text-sm leading-snug">
                  Enable the Conversions API
                  <span className="text-muted-foreground block text-xs">
                    Server-side events are never affected by cookie consent, since
                    there is no visitor in the request to ask.
                  </span>
                </span>
              </label>

              <div className="space-y-1.5">
                <Label htmlFor="metaCapiPixelId">Server dataset ID</Label>
                <Input
                  id="metaCapiPixelId"
                  name="metaCapiPixelId"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="1234567890123456"
                  value={values.metaCapiPixelId}
                  onChange={changeValue("metaCapiPixelId")}
                  maxLength={20}
                  disabled={!metaCapiEnabled}
                  aria-invalid={
                    values.metaCapiPixelId !== "" && !isValidMetaPixelId(values.metaCapiPixelId)
                  }
                />
                {values.metaCapiPixelId !== "" && !isValidMetaPixelId(values.metaCapiPixelId) && (
                  <p className="text-destructive text-xs">
                    The dataset ID must be 10-20 digits, with no spaces or letters.
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  Usually the same as the browser Pixel ID. Leave blank to fall back
                  to <code className="text-foreground">META_CAPI_PIXEL_ID</code>.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="metaCapiAccessToken">Access token</Label>
                <Input
                  id="metaCapiAccessToken"
                  name="metaCapiAccessToken"
                  type="password"
                  autoComplete="off"
                  placeholder={
                    initial.metaCapiAccessTokenConfigured
                      ? "•••••••• — leave blank to keep the stored token"
                      : "EAAB..."
                  }
                  value={metaCapiAccessToken}
                  onChange={(e) => setMetaCapiAccessToken(e.target.value)}
                  maxLength={500}
                  disabled={!metaCapiEnabled}
                />
                <p className="text-muted-foreground text-xs">
                  {initial.metaCapiAccessTokenConfigured ? (
                    <>
                      A token is stored
                      {initial.metaCapiAccessTokenSource === "env"
                        ? " (from the environment)"
                        : " in this panel"}
                      . It is never shown again once saved, so paste a new one only
                      to replace it. Leaving this blank keeps the current token.
                    </>
                  ) : (
                    <>
                      No token stored yet. Falls back to{" "}
                      <code className="text-foreground">META_CAPI_ACCESS_TOKEN</code> until
                      you save one here.
                    </>
                  )}
                </p>
              </div>

              <div className="border-border bg-muted/40 rounded-lg border p-3">
                <p className="text-xs font-medium">Currently active</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {!initial.metaCapiEnabled && <>CAPI is turned off. </>}
                  {initial.metaCapiPixelId ? (
                    <>
                      Dataset{" "}
                      <code className="text-foreground">{initial.metaCapiPixelId}</code>{" "}
                      from {initial.metaCapiPixelIdSource === "env" ? "the environment" : "this panel"}
                      , token from{" "}
                      {initial.metaCapiAccessTokenSource === "env"
                        ? "the environment"
                        : "this panel"}
                      .
                    </>
                  ) : (
                    <>No server dataset ID is configured, so Purchase events are sent from the browser only.</>
                  )}
                </p>
              </div>
            </div>

            <fieldset className="border-border mt-4 rounded-xl border p-4">
              <legend className="text-sm leading-none font-medium">
                Meta Purchase Event Trigger
              </legend>
              <p className="text-muted-foreground mt-1.5 text-xs">
                When the Purchase event is sent to Meta. Changing this applies to new
                triggering actions only &mdash; it never replays past orders.
              </p>

              <div className="mt-3 flex flex-col gap-3">
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="purchaseTrigger"
                    value="immediately"
                    checked={purchaseTrigger === "immediately"}
                    onChange={() => setPurchaseTrigger("immediately")}
                    className="mt-0.5 size-4 accent-emerald-700"
                  />
                  <span className="text-sm leading-snug">
                    Immediately
                    <span className="text-muted-foreground block text-xs">
                      Fire Purchase as soon as the customer places an order. Sent from
                      the browser and the server, matched by event ID so Meta counts it
                      once.
                    </span>
                  </span>
                </label>

                <label
                  className={`flex items-start gap-3 ${
                    capiReady ? "" : "opacity-60"
                  }`}
                >
                  <input
                    type="radio"
                    name="purchaseTrigger"
                    value="confirmed"
                    checked={purchaseTrigger === "confirmed"}
                    onChange={() => setPurchaseTrigger("confirmed")}
                    disabled={!capiReady}
                    className="mt-0.5 size-4 accent-emerald-700"
                  />
                  <span className="text-sm leading-snug">
                    Confirmed Only
                    <span className="text-muted-foreground block text-xs">
                      Fire Purchase only after an admin confirms the order. Sent from
                      the server only, since the customer has usually left the site by
                      then. Better reflects genuinely accepted COD orders.
                    </span>
                    {!capiReady && (
                      <span className="text-destructive block text-xs">
                        Needs the Conversions API. Add a dataset ID and access token
                        above, and enable CAPI, to use this.
                      </span>
                    )}
                  </span>
                </label>
              </div>
              {purchaseTrigger === "confirmed" && !capiReady && (
                <p className="text-destructive mt-1 text-xs">
                  Currently saved as Confirmed Only, but CAPI cannot send. Save a
                  token and dataset ID above, or switch back to Immediately.
                </p>
              )}
            </fieldset>

            <fieldset className="border-border mt-4 rounded-xl border p-4">
              <legend className="text-sm leading-none font-medium">
                Cookie Consent Mode
              </legend>
              <p className="text-muted-foreground mt-1.5 text-xs">
                Controls the consent banner and whether it gates tracking. Saved
                answers live in the visitor&rsquo;s browser, so switching modes
                never sends or deletes their choice.
              </p>

              <div className="mt-3 flex flex-col gap-3">
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="consentMode"
                    value="required"
                    checked={consentMode === "required"}
                    onChange={() => setConsentMode("required")}
                    className="mt-0.5 size-4 accent-emerald-700"
                  />
                  <span className="text-sm leading-snug">
                    Required
                    <span className="text-muted-foreground block text-xs">
                      Show the banner and hold back analytics and marketing tracking
                      until the visitor answers. Meta Pixel and CAPI wait with them.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="consentMode"
                    value="informational"
                    checked={consentMode === "informational"}
                    onChange={() => setConsentMode("informational")}
                    className="mt-0.5 size-4 accent-emerald-700"
                  />
                  <span className="text-sm leading-snug">
                    Informational
                    <span className="text-muted-foreground block text-xs">
                      Show the banner for transparency, but load tracking normally
                      and ignore the answer.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="consentMode"
                    value="disabled"
                    checked={consentMode === "disabled"}
                    onChange={() => setConsentMode("disabled")}
                    className="mt-0.5 size-4 accent-emerald-700"
                  />
                  <span className="text-sm leading-snug">
                    Disabled
                    <span className="text-muted-foreground block text-xs">
                      Hide the banner and apply no consent gating at all. Pixel and
                      CAPI run normally.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            <div className="border-border bg-muted/40 mt-4 rounded-lg border p-3">
              <label
                className={`flex items-start gap-3 ${
                  consentMode === "disabled" ? "opacity-60" : ""
                }`}
              >
                <input
                  type="checkbox"
                  name="cookieSettingsLink"
                  value="1"
                  checked={cookieSettingsLinkEnabled}
                  onChange={(e) => setCookieSettingsLinkEnabled(e.target.checked)}
                  disabled={consentMode === "disabled"}
                  className="mt-0.5 size-4 accent-emerald-700"
                />
                <span className="text-sm leading-snug">
                  Show &ldquo;Cookie settings&rdquo; link in the footer
                  <span className="text-muted-foreground block text-xs">
                    {consentMode === "disabled"
                      ? "Unavailable while the consent mode is Disabled, since there is no banner to reopen. Your choice is kept for when you switch back."
                      : "Lets visitors reopen the banner and change an answer they have already given."}
                  </span>
                </span>
              </label>
              {consentMode === "disabled" && (
                // A disabled input is not submitted, so without this the server
                // would read a missing value and write "0", clearing a choice the
                // owner never got to change.
                <input
                  type="hidden"
                  name="cookieSettingsLink"
                  value={cookieSettingsLinkEnabled ? "1" : "0"}
                />
              )}
            </div>

            <div className="border-border bg-muted/40 mt-4 rounded-lg border p-3">
              <p className="text-xs font-medium">Currently active</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {!initial.metaPixelEnabled && (
                  <>The pixel is turned off. </>
                )}
                {initial.metaPixelActiveId ? (
                  <>
                    Using{" "}
                    <code className="text-foreground">{initial.metaPixelActiveId}</code> from{" "}
                    {initial.metaPixelSource === "env"
                      ? "the environment (NEXT_PUBLIC_META_PIXEL_ID)"
                      : "this panel"}
                    .
                  </>
                ) : (
                  <>No Pixel ID is configured yet, so no Meta events are being sent.</>
                )}
              </p>
            </div>
          </div>
        </TabsPanel>
      </Tabs>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Save Changes
        </Button>
        {state.ok && (
          <p className="text-sm text-emerald-700" role="status">
            Settings saved.
          </p>
        )}
      </div>
    </form>
  );
}
