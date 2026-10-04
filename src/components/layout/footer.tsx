import Link from "next/link";
import { CookieSettingsButton } from "@/components/analytics/cookie-settings-button";
import Image from "next/image";
import { Truck, RotateCcw, ShieldCheck, Headphones } from "lucide-react";
import type { LayoutSettings } from "@/lib/settings";
import { getTranslations } from "@/lib/i18n";
import { NewsletterForm } from "@/components/layout/newsletter-form";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const TRUST_ICONS = [Truck, RotateCcw, ShieldCheck, Headphones];

export async function Footer({ settings }: { settings: LayoutSettings }) {
  // The settings already carry the live store name, so reuse it instead of
  // doing a second lookup.
  const { t } = await getTranslations(settings.storeName);

  const shopLinks = [
    { key: "footer.allProducts" as const, href: "/shop" },
    { key: "footer.newArrivals" as const, href: "/shop?sort=newest" },
    { key: "footer.bestSellers" as const, href: "/shop?sort=best-selling" },
    { key: "footer.categories" as const, href: "/categories" },
  ];

  const careLinks = [
    { key: "footer.trackOrder" as const, href: "/track-order" },
    { key: "footer.myAccount" as const, href: "/account" },
    { key: "footer.wishlist" as const, href: "/account/wishlist" },
    { key: "footer.orderHistory" as const, href: "/account/orders" },
    { key: "footer.deliveryReturns" as const, href: "/pages/delivery-returns" },
    { key: "footer.aboutUs" as const, href: "/pages/about" },
    { key: "footer.contact" as const, href: "/pages/contact" },
  ];

  const socials = [
    {
      href: settings.footerFacebook,
      label: t("footer.facebookAria"),
      Icon: FacebookIcon,
    },
    {
      href: settings.footerInstagram,
      label: t("footer.instagramAria"),
      Icon: InstagramIcon,
    },
  ].filter((s) => s.href);

  const trustItems = settings.trust
    .map((t, i) => ({ icon: TRUST_ICONS[i] ?? Truck, ...t }))
    .filter((t) => t.title);

  return (
    <footer className="border-border bg-secondary/40 border-t">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2">
            {settings.footerLogo ? (
              <Image
                src={settings.footerLogo}
                alt=""
                width={140}
                height={35}
                quality={100}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span className="font-heading text-primary text-lg font-semibold">
                {settings.storeName}
              </span>
            )}
          </Link>
          {settings.footerDescription && (
            <p className="text-muted-foreground mt-3 text-sm">
              {settings.footerDescription}
            </p>
          )}
          <div className="mt-4 flex items-center gap-2">
            {socials.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="border-border text-muted-foreground hover:border-primary hover:text-primary flex size-9 items-center justify-center rounded-full border transition-colors"
              >
                <s.Icon className="size-4" />
              </Link>
            ))}
            {settings.footerPhone && (
              <span className="text-muted-foreground ml-1 text-sm">
                {settings.footerPhone}
              </span>
            )}
          </div>
        </div>

        <nav aria-label={t("aria.mainNav")}>
          <h2 className="font-heading text-foreground text-sm font-semibold tracking-wide uppercase">
            {t("footer.shop")}
          </h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            {shopLinks.map((link) => (
              <li key={link.href + link.key}>
                <Link
                  href={link.href}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("footer.customerCare")}>
          <h2 className="font-heading text-foreground text-sm font-semibold tracking-wide uppercase">
            {t("footer.customerCare")}
          </h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            {careLinks.map((link) => (
              <li key={link.href + link.key}>
                <Link
                  href={link.href}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-heading text-foreground text-sm font-semibold tracking-wide uppercase">
            {t("footer.stayInLoop")}
          </h2>
          {settings.footerNewsletter && (
            <p className="text-muted-foreground mt-3 text-sm">
              {settings.footerNewsletter}
            </p>
          )}
          <div className="mt-4">
            <NewsletterForm />
          </div>
        </div>
      </div>

      {trustItems.length > 0 && (
        <div className="border-border border-t">
          <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 sm:grid-cols-2 md:grid-cols-4">
            {trustItems.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <item.icon
                  className="text-accent mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-foreground text-sm font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-xs">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-border bg-background border-t py-4">
        <div className="text-muted-foreground mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs sm:flex-row">
          <p>
            © {new Date().getFullYear()} {settings.storeName}. {settings.footerRights}
          </p>
          <div className="flex items-center gap-4">
            {settings.cookieSettingsLinkEnabled && (
              <CookieSettingsButton label={t("footer.cookieSettings")} />
            )}
            {settings.footerPaymentsMode === "image" && settings.footerPaymentsImage ? (
              <Image
                src={settings.footerPaymentsImage}
                alt={t("footer.paymentsAlt")}
                width={200}
                height={28}
                className="h-5 w-auto object-contain"
              />
            ) : settings.footerPayments ? (
              <p>{settings.footerPayments}</p>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
