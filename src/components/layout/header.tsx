import Link from "next/link";
import Image from "next/image";
import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";
import { NAV_LINKS } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/guards";
import { getGuestId } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n";
import type { LayoutSettings } from "@/lib/settings";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

function IconLink({
  href,
  label,
  badge,
  children,
}: {
  href: string;
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="text-foreground hover:bg-muted hover:text-primary relative flex size-9 items-center justify-center rounded-full transition-colors"
    >
      {children}
      {badge != null && badge > 0 && (
        <span
          className="bg-accent-solid text-accent-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
          aria-hidden="true"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export async function Header({ settings }: { settings: LayoutSettings }) {
  const [{ t }, user, guestId] = await Promise.all([
    getTranslations(),
    getCurrentUser(),
    getGuestId(),
  ]);

  let cartCount = 0;
  const cart = await prisma.cart.findFirst({
    where: user
      ? { userId: user.id }
      : guestId
        ? { userId: null, sessionId: guestId }
        : { userId: null, sessionId: "__none__" },
    select: { items: { select: { quantity: true } } },
  });
  if (cart) {
    cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  const nav = [
    { href: NAV_LINKS[0].href, label: settings.nav.home || t("nav.home") },
    { href: NAV_LINKS[1].href, label: settings.nav.shop || t("nav.shop") },
    { href: NAV_LINKS[2].href, label: settings.nav.categories || t("nav.categories") },
    { href: NAV_LINKS[3].href, label: settings.nav.arrivals || t("nav.arrivals") },
    { href: NAV_LINKS[4].href, label: settings.nav.bestSellers || t("nav.bestSellers") },
  ];

  return (
    <header className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4">
        <div className="flex items-center gap-2 md:hidden">
          <MobileNav nav={nav} />
        </div>

        <Link href="/" className="flex shrink-0 items-center gap-2">
          {settings.headerLogo ? (
            <Image
              src={settings.headerLogo}
              alt=""
              width={180}
              height={45}
              quality={100}
              className="h-9 w-auto object-contain"
            />
          ) : (
            <span className="font-heading text-primary text-lg font-semibold tracking-tight">
              {settings.storeName}
            </span>
          )}
        </Link>

        <nav
          className="mx-auto hidden items-center gap-6 md:flex"
          aria-label={t("aria.mainNav")}
        >
          {nav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground/80 hover:text-primary text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-2">
          <LanguageSwitcher />
          <IconLink href="/search" label={t("aria.search")}>
            <Search className="size-5" aria-hidden="true" />
          </IconLink>
          <IconLink href={user ? "/account" : "/login"} label={t("aria.account")}>
            <UserRound className="size-5" aria-hidden="true" />
          </IconLink>
          <IconLink href={user ? "/account" : "/login"} label={t("aria.wishlist")}>
            <Heart className="size-5" aria-hidden="true" />
          </IconLink>
          <IconLink href="/cart" label={t("aria.cart")} badge={cartCount}>
            <ShoppingBag className="size-5" aria-hidden="true" />
          </IconLink>
        </div>
      </div>
    </header>
  );
}
