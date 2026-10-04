"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "Orders", icon: Package, exact: false },
  { href: "/account/addresses", label: "Addresses", icon: MapPin, exact: true },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart, exact: true },
  { href: "/account/reviews", label: "Reviews", icon: Star, exact: true },
  { href: "/account/profile", label: "Profile", icon: Settings, exact: true },
  { href: "/account/password", label: "Password", icon: KeyRound, exact: true },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Account navigation"
      className="border-border bg-card border-b md:border-r md:border-b-0"
    >
      <ul className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "hover:bg-muted flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
                  active && "bg-primary/10 text-primary"
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
