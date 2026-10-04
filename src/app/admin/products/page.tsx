import Image from "next/image";
import Link from "next/link";
import { PackagePlus, Search } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { formatPrice } from "@/lib/utils";
import {
  getAdminCategories,
  getAdminProductList,
  parsePage,
  parseProductSort,
  parseProductStatus,
  PRODUCT_SORT_OPTIONS,
  PRODUCT_STATUS_FILTERS,
  type ProductStatusFilter,
} from "@/lib/data/admin/products";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/admin/filter-select";
import {
  BulkHeaderCheckbox,
  BulkProvider,
  BulkRowCheckbox,
} from "@/components/admin/product-bulk";
import { ProductRowActions } from "@/components/admin/product-row-actions";

export const metadata = { title: "Products" };

const STATUS_LABELS: Record<ProductStatusFilter, string> = {
  ALL: "All",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  UNPUBLISHED: "Unpublished",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; sort?: string; page?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = parseProductStatus(sp.status);
  const category = sp.category ?? "";
  const sort = parseProductSort(sp.sort);
  const page = parsePage(sp.page);

  const [categories, { rows, pageCount }] = await Promise.all([
    getAdminCategories(),
    getAdminProductList({ q, status, category, sort, page }),
  ]);

  function link(extra: Record<string, string>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "ALL") params.set("status", status);
    if (category) params.set("category", category);
    if (sort !== "newest") params.set("sort", sort);
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    const s = params.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Breadcrumbs
            items={[{ label: "Admin", href: "/admin" }, { label: "Products" }]}
          />
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
            Products
          </h1>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <PackagePlus className="size-4" aria-hidden="true" />
            Add product
          </Button>
        </Link>
      </div>

      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
        <form action="/admin/products" className="relative flex-1">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, SKU or slug…"
            className="pl-9"
          />
        </form>
        <div className="flex flex-wrap gap-1">
          {PRODUCT_STATUS_FILTERS.map((value) => (
            <Link
              key={value}
              href={link({ status: value === "ALL" ? "" : value })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                status === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {STATUS_LABELS[value]}
            </Link>
          ))}
        </div>
        <FilterSelect
          value={category}
          label="Filter by category"
          options={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c.slug, label: c.name })),
          ]}
          hrefs={Object.fromEntries(
            [
              { value: "", label: "" },
              ...categories.map((c) => ({ value: c.slug, label: c.name })),
            ].map((c) => [c.value, link({ category: c.value })])
          )}
        />
        <FilterSelect
          value={sort}
          label="Sort products"
          options={PRODUCT_SORT_OPTIONS.map((s) => ({
            value: s,
            label: s[0].toUpperCase() + s.slice(1),
          }))}
          hrefs={Object.fromEntries(
            PRODUCT_SORT_OPTIONS.map((s) => [s, link({ sort: s === "newest" ? "" : s })])
          )}
        />
      </div>

      {rows.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <p className="text-muted-foreground text-sm">No products match your filters.</p>
          <Link href="/admin/products">
            <Button variant="secondary">Clear filters</Button>
          </Link>
        </div>
      ) : (
        <BulkProvider ids={rows.map((p) => p.id)}>
          <div className="border-border bg-card overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left text-xs uppercase">
                  <th className="w-10 p-3">
                    <BulkHeaderCheckbox />
                  </th>
                  <th className="p-3 font-medium">Product</th>
                  <th className="p-3 font-medium">SKU</th>
                  <th className="hidden p-3 font-medium md:table-cell">Category</th>
                  <th className="p-3 text-right font-medium">Price</th>
                  <th className="hidden p-3 text-right font-medium sm:table-cell">Stock</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-border/60 border-t">
                    <td className="p-3">
                      <BulkRowCheckbox id={p.id} />
                    </td>
                    <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-md">
                        {p.images[0] ? (
                          <Image
                            src={p.images[0].url}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-muted-foreground flex h-full items-center justify-center text-[9px]">
                            —
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/product/${p.slug}`}
                          className="line-clamp-1 font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        <p className="text-muted-foreground text-xs">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-xs">{p.sku}</td>
                  <td className="text-muted-foreground hidden p-3 md:table-cell">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="p-3 text-right font-semibold whitespace-nowrap">
                    {formatPrice(p.price)}
                  </td>
                  <td
                    className={`hidden p-3 text-right sm:table-cell ${p.stock <= 5 ? "text-destructive font-semibold" : ""}`}
                  >
                    {p.stock}
                  </td>
                  <td className="p-3">
                    <ProductRowActions
                      id={p.id}
                      published={p.published}
                      featured={p.featured}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </BulkProvider>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={link({ page: p === 1 ? "" : String(p) })}
              className={`size-9 rounded-md text-sm font-medium ${
                page === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="flex h-full items-center justify-center">{p}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
