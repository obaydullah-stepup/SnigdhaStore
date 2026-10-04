import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Package,
  ShoppingCart,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { formatPrice } from "@/lib/utils";
import { statusLabel, statusTone } from "@/lib/order-status";
import { getOverview, getRecentOrders, parseRange } from "@/lib/data/admin/overview";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { RangeFilter } from "@/components/admin/range-filter";

export const metadata = { title: "Admin overview" };

function StatCard({
  label,
  value,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  href?: string;
  icon: typeof Banknote;
  accent?: boolean;
}) {
  const body = (
    <div
      className={`border-border bg-card rounded-xl border p-4 ${
        accent ? "border-primary/40 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">{label}</p>
        <span className="text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="font-heading mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireStaff();
  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);

  const [stats, recentOrders] = await Promise.all([
    getOverview(range),
    getRecentOrders(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Overview</h1>
        <RangeFilter current={range} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Revenue"
          value={formatPrice(stats.revenue)}
          href="/admin/orders"
          icon={Wallet}
          accent
        />
        <StatCard
          label="Orders"
          value={String(stats.orders)}
          href="/admin/orders"
          icon={ShoppingCart}
        />
        <StatCard
          label="Customers"
          value={String(stats.customers)}
          href="/admin/customers"
          icon={Users}
        />
        <StatCard
          label="Products"
          value={String(stats.products)}
          href="/admin/products"
          icon={Package}
        />
        <StatCard
          label="Low stock"
          value={String(stats.lowStock)}
          href="/admin/inventory"
          icon={AlertTriangle}
        />
        <StatCard
          label="Pending"
          value={String(stats.pendingOrders)}
          href="/admin/orders?status=PENDING"
          icon={Star}
        />
      </div>

      <section className="border-border bg-card rounded-xl border p-5">
        <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
          Revenue & orders — last {range} days
        </h2>
        <div className="mt-4">
          <RevenueChart series={stats.revenueSeries} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="border-border bg-card rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
              Recent orders
            </h2>
            <Link href="/admin/orders" className="text-primary text-sm hover:underline">
              View all
            </Link>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs uppercase">
                <th className="pb-2 font-medium">Order</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="hidden pb-2 font-medium sm:table-cell">Status</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-border/60 border-t">
                  <td className="py-2.5">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-mono text-xs font-semibold hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <span className="line-clamp-1">{o.customerName}</span>
                  </td>
                  <td className="hidden py-2.5 sm:table-cell">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(o.status)}`}
                    >
                      {statusLabel(o.status)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-semibold">
                    {formatPrice(o.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {stats.topProducts.length > 0 && (
          <section className="border-border bg-card rounded-xl border p-5">
            <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
              Top products
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {stats.topProducts.map((p) => (
                <li key={p.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="line-clamp-1 pr-2 font-medium">{p.name}</span>
                    <span className="font-semibold">{formatPrice(p.total)}</span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {p.sold} sold
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
