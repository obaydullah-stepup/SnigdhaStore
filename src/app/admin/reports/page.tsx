import Link from "next/link";
import { CreditCard, PackageSearch, Receipt, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { formatPrice } from "@/lib/utils";
import { getReports, parseRange, statusName } from "@/lib/data/admin/reports";
import { rangeStart } from "@/lib/data/admin/overview";
import { paymentMethodLabel } from "@/lib/payments/labels";
import { RangeFilter } from "@/components/admin/range-filter";
import { Breadcrumbs } from "@/components/product/breadcrumbs";

export const metadata = { title: "Reports" };

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Wallet;
  accent?: boolean;
}) {
  return (
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
      {sub ? <p className="text-muted-foreground mt-1 text-xs">{sub}</p> : null}
    </div>
  );
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireStaff();
  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  const data = await getReports(range);
  const { start, end } = rangeStart(range);

  const topCategories = data.categorySales.slice(0, 6);
  const maxCategory = topCategories[0]?.total ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Reports" }]} />
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} –{" "}
            {end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <RangeFilter current={range} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Revenue" value={formatPrice(data.revenue)} icon={Wallet} accent />
        <StatCard label="Orders" value={String(data.orders)} icon={ShoppingCart} />
        <StatCard label="Items sold" value={String(data.itemsSold)} icon={PackageSearch} />
        <StatCard
          label="Avg. order value"
          value={formatPrice(data.avgOrderValue)}
          icon={TrendingUp}
        />
        <StatCard
          label="Refunds"
          value={formatPrice(data.refunded)}
          icon={Receipt}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Orders by status
          </h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs uppercase">
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Orders</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.statusBreakdown
                .sort((a, b) => b.count - a.count)
                .map((s) => (
                  <tr key={s.status} className="border-border/60 border-t">
                    <td className="py-2.5 font-medium">{statusName(s.status)}</td>
                    <td className="py-2.5 text-right">{s.count}</td>
                    <td className="py-2.5 text-right font-semibold">
                      {formatPrice(s.total)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>

        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Sales by category
          </h2>
          {topCategories.length === 0 ? (
            <p className="text-muted-foreground mt-6 text-sm">
              No sales in this period yet.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {topCategories.map((c) => (
                <li key={c.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="line-clamp-1 pr-2 font-medium">{c.name}</span>
                    <span className="shrink-0 font-semibold">{formatPrice(c.total)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${Math.max(2, Math.round((c.total / maxCategory) * 100))}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {c.units} units
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Best customers
          </h2>
          {data.bestCustomers.length === 0 ? (
            <p className="text-muted-foreground mt-6 text-sm">No customers in this period.</p>
          ) : (
            <ul className="mt-2 flex flex-col">
              {data.bestCustomers.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-muted-foreground truncate text-xs">{c.email ?? "Guest"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{formatPrice(c.total)}</p>
                    <p className="text-muted-foreground text-xs">
                      {c.orders} {c.orders === 1 ? "order" : "orders"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Payment methods
          </h2>
          {data.paymentMethods.length === 0 ? (
            <p className="text-muted-foreground mt-6 text-sm">No payments this period.</p>
          ) : (
            <ul className="mt-2 flex flex-col">
              {data.paymentMethods.map((m) => (
                <li key={m.method} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="text-muted-foreground size-4" aria-hidden="true" />
                    {paymentMethodLabel(m.method)}
                  </span>
                  <span className="text-right">
                    <span className="text-sm font-semibold">{formatPrice(m.total)}</span>
                    <span className="text-muted-foreground block text-xs">
                      {m.count} {m.count === 1 ? "order" : "orders"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-muted-foreground text-xs">
        <Link href="/admin/orders" className="text-primary hover:underline">
          View all orders
        </Link>
      </p>
    </div>
  );
}