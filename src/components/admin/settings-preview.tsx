"use client";

import {
  Heart,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  Headphones,
} from "lucide-react";

export type AnnouncePreviewFields = {
  enabled: boolean;
  left: string;
  pre: string;
  code: string;
  post: string;
  right: string;
};

export type HeaderPreviewFields = {
  storeName: string;
  logo: string;
  nav: string[];
};

export function HeaderPreview({
  announce,
  header,
}: {
  announce: AnnouncePreviewFields;
  header: HeaderPreviewFields;
}) {
  const showCenter = announce.pre || announce.code || announce.post;
  return (
    <div className="rounded-lg border shadow-sm">
      <div className="overflow-hidden rounded-t-lg">
        {announce.enabled ? (
          <div className="bg-emerald-950 px-2 py-1 text-emerald-50">
            <div className="mx-auto flex items-center justify-center gap-3 text-[10px]">
              {announce.left && (
                <span className="hidden items-center gap-1 sm:flex">
                  <Truck className="size-3" aria-hidden="true" />
                  {announce.left}
                </span>
              )}
              {showCenter && (
                <span className="flex items-center gap-1">
                  {announce.pre && <span>{announce.pre}</span>}
                  {announce.code && <strong>{announce.code}</strong>}
                  {announce.post && <span>{announce.post}</span>}
                </span>
              )}
              {announce.right && (
                <span className="hidden items-center gap-1 md:flex">
                  <Truck className="size-3" aria-hidden="true" />
                  {announce.right}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground bg-muted/60 flex items-center justify-center gap-1 px-2 py-1 text-[10px] italic">
            Announcement bar hidden
          </div>
        )}
        <div className="bg-background flex h-9 items-center gap-2 border-b px-3">
          {header.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={header.logo} alt="" className="h-6 max-w-10 object-contain" />
          ) : (
            <span className="font-heading text-primary text-sm font-semibold">
              {header.storeName}
            </span>
          )}
          <nav className="mx-auto hidden items-center gap-3 text-[11px] font-medium md:flex">
            {header.nav.map((label, i) => (
              <span
                key={i}
                className="text-foreground/80 hover:text-primary transition-colors"
              >
                {label || <span className="text-destructive/70">empty</span>}
              </span>
            ))}
          </nav>
          <span className="text-muted-foreground ml-auto flex items-center gap-1.5">
            <Search className="size-3.5" aria-hidden="true" />
            <UserRound className="size-3.5" aria-hidden="true" />
            <Heart className="size-3.5" aria-hidden="true" />
            <ShoppingBag className="size-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </div>
  );
}

export type TrustPreviewField = { title: string; text: string };

export type FooterPreviewFields = {
  storeName: string;
  logo: string;
  description: string;
  phone: string;
  facebook: string;
  instagram: string;
  newsletter: string;
  trust: TrustPreviewField[];
  rights: string;
  payments: string;
  paymentsMode: "text" | "image";
  paymentsUrl: string;
};

const TRUST_ICONS = [Truck, RotateCcw, ShieldCheck, Headphones];

export function FooterPreview({ footer }: { footer: FooterPreviewFields }) {
  const socials = [footer.facebook, footer.instagram].filter(Boolean);
  const trust = footer.trust.filter((t) => t.title);
  const year = new Date().getFullYear();

  return (
    <div className="rounded-b-lg">
      <div className="bg-secondary/40 grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-1.5">
            {footer.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={footer.logo} alt="" className="h-6 max-w-10 object-contain" />
            ) : (
              <span className="font-heading text-primary text-sm font-semibold">
                {footer.storeName}
              </span>
            )}
          </div>
          {footer.description ? (
            <p className="text-muted-foreground mt-1.5 text-[11px] leading-4">
              {footer.description}
            </p>
          ) : (
            <p className="text-muted-foreground mt-1.5 text-[11px] italic">
              No description set
            </p>
          )}
          <div className="mt-2 flex items-center gap-1.5">
            {socials.map((s, i) => (
              <span
                key={i}
                className="border-border text-muted-foreground flex size-6 items-center justify-center rounded-full border text-[8px]"
              >
                {i === 0 ? "f" : "io"}
              </span>
            ))}
            {footer.phone && (
              <span className="text-muted-foreground text-[11px]">{footer.phone}</span>
            )}
          </div>
        </div>
        <div>
          <h3 className="font-heading text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Shop
          </h3>
          <ul className="text-muted-foreground mt-1.5 space-y-1 text-[11px]">
            <li>All Products</li>
            <li>New Arrivals</li>
            <li>Best Sellers</li>
            <li>Categories</li>
          </ul>
        </div>
        <div>
          <h3 className="font-heading text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Customer Care
          </h3>
          <ul className="text-muted-foreground mt-1.5 space-y-1 text-[11px]">
            <li>My Account</li>
            <li>Wishlist</li>
            <li>Order History</li>
            <li>Delivery & Returns</li>
          </ul>
        </div>
        <div>
          <h3 className="font-heading text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Stay in the loop
          </h3>
          <p className="text-muted-foreground mt-1.5 text-[11px]">
            {footer.newsletter || <span className="italic">No blurb set</span>}
          </p>
        </div>
      </div>

      {trust.length > 0 && (
        <div className="border-border grid grid-cols-2 gap-3 border-t px-4 py-3 md:grid-cols-4">
          {trust.map((t, i) => {
            const Icon = TRUST_ICONS[i] ?? Truck;
            return (
              <div key={t.title + i} className="flex items-start gap-2">
                <Icon className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-foreground text-[11px] font-medium">{t.title}</p>
                  <p className="text-muted-foreground text-[10px]">{t.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-border bg-background flex items-center justify-between gap-2 rounded-b-lg border-t px-4 py-2 text-[10px]">
        <p className="text-muted-foreground">
          © {year} {footer.storeName}. {footer.rights || "All rights reserved."}
        </p>
        {footer.paymentsMode === "image" && footer.paymentsUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={footer.paymentsUrl}
            alt="Accepted payment methods"
            className="max-h-4 w-auto object-contain"
          />
        ) : footer.payments ? (
          <p className="text-muted-foreground">{footer.payments}</p>
        ) : null}
      </div>
    </div>
  );
}
