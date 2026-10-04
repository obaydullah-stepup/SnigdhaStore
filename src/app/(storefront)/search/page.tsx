import type { Metadata } from "next";
import { getProductSummaries } from "@/lib/data/products";
import { shopUrl, stringParam, type ShopParams } from "@/lib/shop-url";
import { SearchPanel } from "@/components/search/search-panel";
import { ProductGrid } from "@/components/shop/product-grid";
import { SearchTracker } from "@/components/analytics/trackers";
import { getTranslations } from "@/lib/i18n";
import { getCachedStoreName } from "@/lib/settings";

const PER_PAGE = 12;

export async function generateMetadata({
  searchParams,
}: PageProps<"/search">): Promise<Metadata> {
  const [sp, storeName] = await Promise.all([searchParams, getCachedStoreName()]);
  const q = stringParam(sp.q)?.trim();
  return {
    title: q ? `Search results for “${q}”` : "Search",
    description: `Search the ${storeName} catalog for clothing, home, lifestyle and more.`,
  };
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const [sp, { t }] = await Promise.all([searchParams, getTranslations()]);
  const q = stringParam(sp.q)?.trim() ?? "";
  const page = Math.max(1, parseInt(stringParam(sp.page) ?? "1", 10) || 1);

  const { items, total, pageCount } = q
    ? await getProductSummaries({ q, page, perPage: PER_PAGE, sort: "best-selling" })
    : { items: [], total: 0, pageCount: 1 };

  const current: ShopParams = { q: q || undefined, page: stringParam(sp.page) };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
      {q && <SearchTracker query={q} />}

      <div className="max-w-2xl">
        <p className="text-accent-text text-xs font-semibold tracking-[0.2em] uppercase">
          {t("search.eyebrow")}
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">
          {t("search.title")}
        </h1>
      </div>

      <div className="mt-6 max-w-2xl">
        <SearchPanel initialQuery={q} />
      </div>

      <div className="mt-10">
        {!q ? (
          <p className="text-muted-foreground text-sm">{t("search.hint")}</p>
        ) : total === 0 ? (
          <p className="text-muted-foreground text-sm">{t("search.noResults", { q })}</p>
        ) : (
          <>
            <p className="text-muted-foreground mb-6 text-sm">
              {total === 1
                ? t("search.resultOne", { n: total, q })
                : t("search.resultMany", { n: total, q })}
            </p>
            <ProductGrid
              items={items}
              total={total}
              current={current}
              page={page}
              pageCount={pageCount}
              shopUrlBuilder={shopUrl}
            />
          </>
        )}
      </div>
    </div>
  );
}
