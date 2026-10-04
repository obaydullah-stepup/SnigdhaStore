import Link from "next/link";
import { Inbox, Search } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { formatPrice } from "@/lib/utils";
import {
  getIncompleteOrderCounts,
  getIncompleteOrderList,
} from "@/lib/data/admin/incomplete-orders";
import { parsePage } from "@/lib/data/admin/orders";
import { getShippingConfig, getShippingZones } from "@/lib/shipping";
import { describeItems, isExpired, stageLabel } from "@/lib/incomplete-orders";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/admin/filter-select";
import {
  ConvertToOrderButton,
  DismissIncompleteOrderButton,
  IncompleteOrderDetailsEditor,
} from "@/components/admin/incomplete-order-buttons";

export const metadata = { title: "Incomplete orders" };

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "CONVERTED", label: "Converted" },
  { value: "DISMISSED", label: "Dismissed" },
  { value: "ALL", label: "All statuses" },
];

export default async function AdminIncompleteOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = sp.status ?? "OPEN";
  const page = parsePage(sp.page);

  const [{ rows, total, pageCount }, counts, shipping, zones] = await Promise.all([
    getIncompleteOrderList({ q, status, page }),
    getIncompleteOrderCounts(),
    getShippingConfig(),
    getShippingZones(),
  ]);
  const zoneOptions = zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    standardFee: zone.standardFee,
    expressFee: zone.expressFee,
    divisions: zone.divisions,
    matchesAll: zone.matchesAll,
    freeShippingThreshold: zone.freeShippingThreshold,
    sortOrder: zone.sortOrder,
  }));

  const openValue = rows
    .filter((row) => row.status === "OPEN")
    .reduce((sum, row) => sum + row.total, 0);

  function link(extra: Record<string, string>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "OPEN") params.set("status", status);
    // Drop empty values: `?status=` would read as "" and fall through to ALL.
    Object.entries(extra).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return `/admin/incomplete-orders${params.size ? `?${params}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Breadcrumbs
            items={[{ label: "Admin", href: "/admin" }, { label: "Incomplete orders" }]}
          />
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
            Incomplete orders
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Checkouts where a customer left their name and phone but never submitted.{" "}
            {total} record{total === 1 ? "" : "s"} · {counts.open} open
            {counts.open > 0 ? ` · worth ${formatPrice(openValue)} on this page` : ""}.
          </p>
        </div>
      </div>

      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-3 lg:flex-row lg:items-center">
        <form action="/admin/incomplete-orders" className="relative flex-1">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, phone or email…"
            className="pl-9"
          />
        </form>
        <FilterSelect
          value={status}
          label="Filter by status"
          options={STATUS_OPTIONS}
          hrefs={Object.fromEntries(
            STATUS_OPTIONS.map((o) => [
              o.value,
              link({ status: o.value === "OPEN" ? "" : o.value }),
            ])
          )}
        />
      </div>

      {rows.length === 0 ? (
        <div className="border-border flex items-center justify-center rounded-xl border border-dashed px-6 py-16">
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Inbox className="size-4" aria-hidden="true" />
            No incomplete orders match your filters.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const expired = isExpired(row.updatedAt);
            const hasAddress = Boolean(row.addressLine && row.addressLine.trim().length >= 10);
            const cartEmpty = row.cartItemCount === 0;
            const disabledReason = !hasAddress
              ? "Add the delivery address above to enable conversion."
              : cartEmpty
                ? "The cart is empty now, so there is nothing to convert."
                : "";
            const canConvert = row.status === "OPEN" && !disabledReason;

            return (
              <li
                key={row.id}
                className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{row.customerName}</p>
                    <span className="border-border bg-muted rounded-full border px-2 py-0.5 text-[11px] font-medium">
                      {stageLabel(row.stage)}
                    </span>
                    {expired && row.status === "OPEN" ? (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                        Stale
                      </span>
                    ) : null}
                    {row.couponCode ? (
                      <span className="text-muted-foreground text-[11px]">
                        coupon {row.couponCode}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-muted-foreground mt-1 text-xs">
                    <a href={`tel:${row.customerPhone}`} className="hover:underline">
                      {row.customerPhone}
                    </a>
                    {row.customerEmail ? ` · ${row.customerEmail}` : ""}
                    {row.user ? " · signed in" : " · guest"}
                  </p>

                  {row.addressLine ? (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {row.addressLine}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-600">
                      No address captured yet.
                    </p>
                  )}

                  <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs">
                    {describeItems(row.items) || "Cart no longer has items."}
                  </p>

                  <p className="text-muted-foreground mt-1.5 text-[11px]">
                    Left{" "}
                    {row.updatedAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {row.updatedAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-sm font-semibold">{formatPrice(row.total)}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {row.itemCount} items · {row.cartItemCount} still in cart
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Delivery {formatPrice(row.deliveryFee)}
                    {row.zoneName ? ` · ${row.zoneName}` : ""}
                    {row.deliveryFee === 0 && row.zoneName ? " (free)" : ""}
                  </p>
                  {!row.pricedLive && row.status === "OPEN" ? (
                    <p className="text-muted-foreground max-w-56 text-right text-[11px]">
                      Cart is empty, so these are the figures captured at checkout.
                    </p>
                  ) : null}

                  {row.status === "OPEN" ? (
                    <IncompleteOrderDetailsEditor
                      id={row.id}
                      initial={{
                        customerName: row.customerName,
                        customerPhone: row.customerPhone,
                        customerEmail: row.customerEmail ?? "",
                        address: row.addressLine ?? "",
                        deliveryZoneId: row.deliveryZone ?? "",
                      }}
                      subtotal={row.subtotal}
                      discount={row.discount}
                      zones={zoneOptions}
                      baseFee={shipping.standardFee}
                      freeShippingThreshold={shipping.freeShippingThreshold}
                      open={!hasAddress}
                    />
                  ) : null}

                  {row.status === "CONVERTED" && row.convertedOrder ? (
                    <Link
                      href={`/admin/orders/${row.convertedOrder.id}`}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      {row.convertedOrder.orderNumber}
                    </Link>
                  ) : row.status === "DISMISSED" ? (
                    <span className="text-muted-foreground text-sm">Dismissed</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ConvertToOrderButton
                        id={row.id}
                        disabled={!canConvert}
                        disabledReason={disabledReason}
                      />
                      <DismissIncompleteOrderButton id={row.id} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={link({ page: p === 1 ? "" : String(p) })}
              className={`flex size-9 items-center justify-center rounded-md text-sm font-medium ${
                p === page
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
