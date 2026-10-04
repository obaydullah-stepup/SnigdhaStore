import { MobileFiltersSheet } from "@/components/shop/filters-panel";
import { SortSelect } from "@/components/shop/sort-select";
import type { CategoryCard } from "@/lib/data/categories";
import type { ShopParams } from "@/lib/shop-url";
import { getTranslations } from "@/lib/i18n";

export async function TopBar({
  total,
  current,
  sort,
  categories,
}: {
  total: number;
  current: ShopParams;
  sort: string;
  categories?: CategoryCard[];
}) {
  const { t } = await getTranslations();
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        {total === 1
          ? t("shop.showingOne", { n: total })
          : t("shop.showingMany", { n: total })}
      </p>
      <div className="flex items-center gap-2">
        {categories && <MobileFiltersSheet categories={categories} current={current} />}
        <SortSelect current={current} value={sort} />
      </div>
    </div>
  );
}
