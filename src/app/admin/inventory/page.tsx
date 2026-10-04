import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getLowStockThreshold } from "@/lib/inventory";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { AdjustStockForm, StockBadge } from "@/components/admin/adjust-stock-form";
import { LowStockThresholdForm } from "@/components/admin/low-stock-threshold-form";

export const metadata = { title: "Inventory" };

export default async function AdminInventoryPage() {
  await requireStaff();

  const [products, transactions, threshold] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      include: { variants: { select: { id: true, name: true, stock: true } } },
      orderBy: [{ stock: "asc" }, { name: "asc" }],
    }),
    prisma.inventoryTransaction.findMany({
      take: 40,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { id: true, name: true, slug: true } } },
    }),
    getLowStockThreshold(),
  ]);

  const lowStock = products.filter((p) => p.stock <= threshold);
  const outOfStock = products.filter((p) => p.stock === 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Breadcrumbs
            items={[{ label: "Admin", href: "/admin" }, { label: "Inventory" }]}
          />
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
            Inventory
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {outOfStock.length} out of stock · {lowStock.length} low stock ·{" "}
            {products.length} active products total
          </p>
        </div>
        <LowStockThresholdForm threshold={threshold} />
      </div>

      {lowStock.length > 0 && (
        <div className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center gap-2 rounded-xl border px-5 py-3.5">
          <AlertTriangle className="text-destructive size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm">
            <strong className="text-destructive">{lowStock.length}</strong>{" "}
            {lowStock.length === 1 ? "product is" : "products are"} at or below the{" "}
            {threshold} unit restock alert threshold.
          </p>
        </div>
      )}

      <div className="border-border bg-card overflow-x-auto rounded-xl border">
        {products.length === 0 ? (
          <p className="text-muted-foreground flex items-center justify-center p-10 text-sm">
            No active products found.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs uppercase">
                <th className="p-3 font-medium">Product</th>
                <th className="hidden p-3 font-medium sm:table-cell">Position</th>
                <th className="p-3 font-medium">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-border/60 border-t">
                  <td className="p-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="line-clamp-1 font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="mt-1">
                      <StockBadge stock={p.stock} threshold={threshold} />
                    </div>
                  </td>
                  <td className="hidden p-3 align-top sm:table-cell">
                    {p.variants.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {p.variants.map((v) => (
                          <li key={v.id} className="text-muted-foreground text-xs">
                            {v.name} —{" "}
                            <span
                              className={
                                v.stock === 0 ? "text-destructive font-medium" : ""
                              }
                            >
                              {v.stock}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground text-xs">Single unit</span>
                    )}
                  </td>
                  <td className="max-w-xs p-3">
                    <AdjustStockForm
                      productId={p.id}
                      variants={p.variants.map((v) => ({ id: v.id, name: v.name }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {transactions.length > 0 && (
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Recent transactions
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <Link
                    href={`/admin/products/${t.product.id}`}
                    className="line-clamp-1 font-medium hover:underline"
                  >
                    {t.product.name}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {t.reason}
                    {t.note ? ` — ${t.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {t.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span
                    className={`font-mono font-semibold ${t.quantityChange > 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {t.quantityChange > 0 ? `+${t.quantityChange}` : t.quantityChange}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-muted-foreground text-xs">
        Orders decrement stock automatically; this page is for manual adjustments,
        restocks and returns.
      </p>
    </div>
  );
}
