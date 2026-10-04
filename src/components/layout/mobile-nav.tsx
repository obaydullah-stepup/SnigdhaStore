"use client";

import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIntl } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export function MobileNav({ nav }: { nav: { href: string; label: string }[] }) {
  const { t } = useIntl();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("aria.openMenu")}>
            <Menu className="size-5" aria-hidden="true" />
          </Button>
        }
      />
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>{t("menu.menu")}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-2" aria-label={t("aria.mobileNav")}>
          {nav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground hover:bg-muted hover:text-primary rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/search"
            className="text-foreground hover:bg-muted hover:text-primary mt-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          >
            <Search className="size-4" aria-hidden="true" />
            {t("menu.search")}
          </Link>
          <div className="mt-3 px-3">
            <LanguageSwitcher />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
