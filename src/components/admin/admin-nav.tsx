"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Mail,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tag,
  Ticket,
  TimerReset,
  Truck,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/customers", label: "Customers", icon: Users, exact: false },
  { href: "/admin/categories", label: "Categories", icon: Tag, exact: false },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, exact: false },
  { href: "/admin/shipping", label: "Shipping", icon: Truck, exact: false },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, exact: false },
  { href: "/admin/reviews", label: "Reviews", icon: Star, exact: false },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket, exact: false },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail, exact: false },
  { href: "/admin/abandoned-carts", label: "Abandoned carts", icon: TimerReset, exact: false },
  {
    href: "/admin/incomplete-orders",
    label: "Incomplete orders",
    icon: ClipboardList,
    exact: false,
  },
  { href: "/admin/pages", label: "Pages", icon: FileText, exact: false },
  { href: "/admin/team", label: "Team", icon: UsersRound, exact: false },
  { href: "/admin/audit-log", label: "Audit log", icon: ShieldCheck, exact: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: true },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
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
