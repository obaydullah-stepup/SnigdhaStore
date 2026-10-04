import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import type { ProductSummary } from "@/lib/data/products";
import type { ShopParams } from "@/lib/shop-url";
import { getTranslations } from "@/lib/i18n";

export async function Pagination({
  page,
  pageCount,
  current,
  shopUrlBuilder,
}: {
  page: number;
  pageCount: number;
  current: ShopParams;
  shopUrlBuilder: (current: ShopParams, overrides?: ShopParams) => string;
}) {
  const { t } = await getTranslations();
  if (pageCount <= 1) return null;

  const pagesToShow: (number | "…")[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) {
      pagesToShow.push(i);
    } else if (pagesToShow[pagesToShow.length - 1] !== "…") {
      pagesToShow.push("…");
    }
  }

  return (
    <nav
      className="mt-10 flex items-center justify-center gap-1.5"
      aria-label={t("shop.paginationAria")}
    >
      {page > 1 && (
        <Link
          href={shopUrlBuilder(current, { page: String(page - 1) })}
          aria-label={t("shop.prevPage")}
          className="border-input text-foreground/80 hover:border-primary hover:text-primary flex size-9 items-center justify-center rounded-md border transition-colors"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      )}
      {pagesToShow.map((p, i) =>
        p === "…" ? (
          <span key={`dots-${i}`} className="text-muted-foreground px-1 text-sm">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={shopUrlBuilder(current, { page: p === 1 ? undefined : String(p) })}
            aria-current={p === page ? "page" : undefined}
            className={
              p === page
                ? "bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md text-sm font-medium"
                : "border-input text-foreground/80 hover:border-primary hover:text-primary flex size-9 items-center justify-center rounded-md border text-sm transition-colors"
            }
          >
            {p}
          </Link>
        )
      )}
      {page < pageCount && (
        <Link
          href={shopUrlBuilder(current, { page: String(page + 1) })}
          aria-label={t("shop.nextPage")}
          className="border-input text-foreground/80 hover:border-primary hover:text-primary flex size-9 items-center justify-center rounded-md border transition-colors"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}

export async function EmptyState({ onClearHref }: { onClearHref: string }) {
  const { t } = await getTranslations();
  return (
    <div className="border-border flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-20 text-center">
      <PackageSearch className="text-muted-foreground size-10" aria-hidden="true" />
      <div>
        <h2 className="font-heading text-lg font-semibold">{t("shop.noProductsTitle")}</h2>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          {t("shop.noProductsText")}
        </p>
      </div>
      <Link href={onClearHref}>
        <Button variant="secondary" size="sm">
          {t("shop.clearFilters")}
        </Button>
      </Link>
    </div>
  );
}

export async function ProductGrid({
  items,
  total,
  current,
  page,
  pageCount,
  shopUrlBuilder,
}: {
  items: ProductSummary[];
  total: number;
  current: ShopParams;
  page: number;
  pageCount: number;
  shopUrlBuilder: (current: ShopParams, overrides?: ShopParams) => string;
}) {
  const { t } = await getTranslations();
  if (total === 0) {
    return <EmptyState onClearHref="/shop" />;
  }

  const labels = {
    featured: t("productCard.featured"),
    soldOut: t("productCard.soldOut"),
    noImage: t("productCard.noImage"),
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} labels={labels} />
        ))}
      </div>
      <Pagination
        page={page}
        pageCount={pageCount}
        current={current}
        shopUrlBuilder={shopUrlBuilder}
      />
    </>
  );
}
