import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { formatPrice } from "@/lib/utils";
import {
  PAYMENT_STATUS,
  paymentStatusLabel,
  paymentStatusTone,
  statusLabel,
  statusTone,
} from "@/lib/order-status";
import {
  getAdminOrderList,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  parsePage,
} from "@/lib/data/admin/orders";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/admin/filter-select";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; payment?: string; page?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = sp.status ?? "ALL";
  const payment = sp.payment ?? "ALL";
  const page = parsePage(sp.page);

  const { rows, total, pageCount } = await getAdminOrderList({
    q,
    status,
    payment,
    page,
  });

  function link(extra: Record<string, string>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "ALL") params.set("status", status);
    if (payment !== "ALL") params.set("payment", payment);
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return `/admin/orders${params.size ? `?${params}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Orders" }]} />
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
          Orders{" "}
          <span className="text-muted-foreground text-base font-normal">({total})</span>
        </h1>
      </div>

      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-3 lg:flex-row lg:items-center">
        <form action="/admin/orders" className="relative flex-1">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search order #, name, email or phone…"
            className="pl-9"
          />
        </form>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/admin/orders/export${q ? `?q=${encodeURIComponent(q)}` : ""}`}
            className="border-border bg-card hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Export CSV
          </Link>
          <FilterSelect
            value={status}
            label="Filter by order status"
            options={[
              { value: "ALL", label: "All statuses" },
              ...ORDER_STATUSES.map((s) => ({
                value: s,
                label: s[0] + s.slice(1).toLowerCase(),
              })),
            ]}
            hrefs={Object.fromEntries(
              ["ALL", ...ORDER_STATUSES].map((v) => [
                v,
                link({ status: v === "ALL" ? "" : v }),
              ])
            )}
          />
          <FilterSelect
            value={payment}
            label="Filter by payment status"
            options={[
              { value: "ALL", label: "All payments" },
              ...PAYMENT_STATUSES.map((s) => ({
                value: s,
                label: PAYMENT_STATUS[s].label,
              })),
            ]}
            hrefs={Object.fromEntries(
              ["ALL", ...PAYMENT_STATUSES].map((v) => [
                v,
                link({ payment: v === "ALL" ? "" : v }),
              ])
            )}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <p className="text-muted-foreground text-sm">No orders match your filters.</p>
          <Link href="/admin/orders">
            <span className="text-primary text-sm font-medium hover:underline">
              Clear filters
            </span>
          </Link>
        </div>
      ) : (
        <div className="border-border bg-card overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs uppercase">
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="hidden p-3 font-medium md:table-cell">Placed</th>
                <th className="p-3 font-medium">Status</th>
                <th className="hidden p-3 font-medium sm:table-cell">Payment</th>
                <th className="p-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-border/60 border-t">
                  <td className="p-3">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-mono text-xs font-semibold hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({o._count.items})
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="line-clamp-1 font-medium">{o.customerName}</span>
                    <span className="text-muted-foreground block text-xs">
                      {o.customerPhone}
                    </span>
                  </td>
                  <td className="text-muted-foreground hidden p-3 md:table-cell">
                    {o.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(o.status)}`}
                    >
                      {statusLabel(o.status)}
                    </span>
                  </td>
                  <td className="hidden p-3 sm:table-cell">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${paymentStatusTone(o.paymentStatus)}`}
                    >
                      {paymentStatusLabel(o.paymentStatus)}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold whitespace-nowrap">
                    {formatPrice(o.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={link({ page: p === 1 ? "" : String(p) })}
              className={`flex size-9 items-center justify-center rounded-md text-sm font-medium ${
                page === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
