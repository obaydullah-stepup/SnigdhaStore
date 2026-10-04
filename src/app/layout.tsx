import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans_Bengali } from "next/font/google";
import { siteConfig, resolveBrand } from "@/config/site";
import { setCurrency } from "@/lib/currency";
import {
  getCachedAnalyticsSettings,
  getCachedStoreCurrency,
  getCachedStoreName,
  getConsentSettings,
} from "@/lib/settings";
import { getLocale } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@/components/analytics/analytics";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { CurrencySymbolInit } from "@/components/currency-symbol-init";
import { buildOrganizationJsonLd, formatJsonLd } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansBengali = Noto_Sans_Bengali({
  variable: "--font-noto-sans-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
});

/**
 * Reads the store name from the database rather than `siteConfig`, so a rename
 * in Admin > Settings is reflected in the tab title, social cards and
 * `applicationName`. A static `export const metadata` cannot do this: it is
 * evaluated at build time and has no access to the database.
 *
 * The cache tag is invalidated by the settings action, so saving the settings
 * form updates these without a rebuild.
 */
export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getCachedStoreName();
  const description = resolveBrand(siteConfig.description, storeName);

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${storeName} — ${siteConfig.tagline}`,
      template: `%s | ${storeName}`,
    },
    description,
    applicationName: storeName,
    authors: [{ name: storeName }],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url: siteConfig.url,
      siteName: storeName,
      title: `${storeName} — ${siteConfig.tagline}`,
      description,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${storeName} — ${siteConfig.tagline}`,
      description,
      images: [siteConfig.ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [storeCurrency, lang, storeName, analyticsSettings, consent] = await Promise.all([
    getCachedStoreCurrency(),
    getLocale(),
    getCachedStoreName(),
    getCachedAnalyticsSettings(),
    getConsentSettings(),
  ]);
  setCurrency(storeCurrency);

  return (
    <html
      lang={lang === "bn" ? "bn" : "en"}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansBengali.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <meta name="store-currency" content={storeCurrency} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: formatJsonLd(buildOrganizationJsonLd(storeName)),
          }}
        />
        <LocaleProvider initialLang={lang} storeName={storeName}>
          <CurrencySymbolInit>{children}</CurrencySymbolInit>
          <Analytics
            metaPixelId={
              analyticsSettings.metaPixelEnabled ? analyticsSettings.metaPixelId : ""
            }
            consentMode={consent.consentMode}
          />
          <ConsentBanner mode={consent.consentMode} />
        </LocaleProvider>
        <Toaster position="top-center" closeButton />
      </body>
    </html>
  );
}
