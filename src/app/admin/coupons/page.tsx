import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { CouponForm } from "@/components/admin/coupon-form";
import { CouponRowActions } from "@/components/admin/coupon-row-actions";

export const metadata = { title: "Coupons" };

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const editingId = sp.edit;

  const [coupons, editing] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    editingId
      ? prisma.coupon.findUnique({ where: { id: editingId } })
      : Promise.resolve(null),
  ]);
  if (editingId && !editing) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Coupons" }]} />
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
          Coupons
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="border-border bg-card self-start rounded-xl border p-5">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            {editing ? `Edit — ${editing.code}` : "New coupon"}
          </h2>
          <div className="mt-4">
            <CouponForm
              key={editing?.id ?? "new"}
              initial={
                editing
                  ? {
                      id: editing.id,
                      code: editing.code,
                      type: editing.type,
                      value: editing.value,
                      minimumOrder: editing.minimumOrder,
                      maximumDiscount: editing.maximumDiscount,
                      usageLimit: editing.usageLimit,
                      startsAt: editing.startsAt,
                      expiresAt: editing.expiresAt,
                      isActive: editing.isActive,
                    }
                  : undefined
              }
            />
          </div>
        </div>

        <div className="border-border bg-card overflow-hidden rounded-xl border">
          {coupons.length === 0 ? (
            <p className="text-muted-foreground flex items-center justify-center p-10 text-sm">
              No coupons yet. Create your first discount code.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="p-3 font-medium">Code</th>
                  <th className="hidden p-3 font-medium sm:table-cell">Discount</th>
                  <th className="hidden p-3 font-medium md:table-cell">Min. order</th>
                  <th className="hidden p-3 font-medium md:table-cell">Window</th>
                  <th className="p-3 text-center font-medium">Used</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-border/60 border-t">
                    <td className="p-3">
                      <span className="font-mono text-xs font-bold">{c.code}</span>
                      {!c.isActive && (
                        <span className="text-muted-foreground block text-[11px]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="hidden p-3 sm:table-cell">
                      {c.type === "PERCENTAGE" ? `${c.value}% off` : formatPrice(c.value)}
                      {c.maximumDiscount ? (
                        <span className="text-muted-foreground text-xs">
                          {" "}
                          (max {formatPrice(c.maximumDiscount)})
                        </span>
                      ) : null}
                    </td>
                    <td className="text-muted-foreground hidden p-3 md:table-cell">
                      {c.minimumOrder > 0 ? formatPrice(c.minimumOrder) : "—"}
                    </td>
                    <td className="text-muted-foreground hidden p-3 md:table-cell">
                      {c.startsAt || c.expiresAt
                        ? `${c.startsAt ? c.startsAt.toISOString().slice(0, 10) : "∞"} → ${c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "∞"}`
                        : "Always"}
                    </td>
                    <td className="p-3 text-center text-xs">
                      {c.usedCount}
                      {c.usageLimit ? (
                        <span className="text-muted-foreground">/{c.usageLimit}</span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <CouponRowActions
                        id={c.id}
                        checked={c.isActive}
                        checkedLabel="Active"
                        editHref={`/admin/coupons?edit=${c.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
