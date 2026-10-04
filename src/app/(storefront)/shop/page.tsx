import type { Metadata } from "next";
import { getProductSummaries, type ProductSort } from "@/lib/data/products";
import { getActiveCategories } from "@/lib/data/categories";
import { shopUrl, stringParam, type ShopParams } from "@/lib/shop-url";
import { ProductGrid } from "@/components/shop/product-grid";
import { FiltersPanel } from "@/components/shop/filters-panel";
import { TopBar } from "@/components/shop/top-bar";
import { buildBreadcrumbJsonLd, formatJsonLd } from "@/lib/seo";
import { getTranslations } from "@/lib/i18n";
import { getCachedStoreName } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getCachedStoreName();
  return {
    title: "Shop all products",
    description: `Browse and filter the full ${storeName} collection — clothing, home, lifestyle and more, with nationwide delivery.`,
  };
}

const PER_PAGE = 12;

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const [params, { t }] = await Promise.all([searchParams, getTranslations()]);

  const current: ShopParams = {
    q: stringParam(params.q),
    category: stringParam(params.category),
    min: stringParam(params.min),
    max: stringParam(params.max),
    inStock: stringParam(params.inStock),
    rating: stringParam(params.rating),
    sort: stringParam(params.sort),
    page: stringParam(params.page),
  };

  const page = Math.max(1, parseInt(current.page ?? "1", 10) || 1);
  const min = current.min !== undefined ? parseInt(current.min, 10) : undefined;
  const max = current.max !== undefined ? parseInt(current.max, 10) : undefined;
  const ratingMin = current.rating ? parseInt(current.rating, 10) : undefined;

  const validSort: ProductSort = [
    "newest",
    "price-asc",
    "price-desc",
    "best-selling",
    "rating",
    "name-asc",
  ].includes(current.sort ?? "")
    ? (current.sort as ProductSort)
    : "newest";

  const [{ items, total, pageCount }, categories] = await Promise.all([
    getProductSummaries({
      q: current.q,
      categorySlug: current.category,
      minPrice: Number.isFinite(min) ? min : undefined,
      maxPrice: Number.isFinite(max) ? max : undefined,
      stockOnly: current.inStock === "1",
      ratingMin,
      sort: validSort,
      page,
      perPage: PER_PAGE,
    }),
    getActiveCategories(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: formatJsonLd(
            buildBreadcrumbJsonLd([{ name: "Home", href: "/" }, { name: "Shop" }])
          ),
        }}
      />

      <header className="flex flex-col gap-2">
        <p className="text-accent-text text-xs font-semibold tracking-[0.2em] uppercase">
          {t("shop.eyebrow")}
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {current.q
            ? t("shop.resultsFor", { q: current.q })
            : t("shop.allProductsTitle")}
        </h1>
      </header>

      <TopBar total={total} current={current} sort={validSort} categories={categories} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <FiltersPanel categories={categories} current={current} />
          </div>
        </aside>

        <div>
          <ProductGrid
            items={items}
            total={total}
            current={current}
            page={page}
            pageCount={pageCount}
            shopUrlBuilder={shopUrl}
          />
        </div>
      </div>
    </div>
  );
}
