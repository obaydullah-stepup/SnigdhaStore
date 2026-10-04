"use client";

import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { shopUrl, type ShopParams } from "@/lib/shop-url";
import { useIntl } from "@/components/i18n/locale-provider";

const OPTIONS = [
  { value: "newest", key: "sort.newest" },
  { value: "best-selling", key: "sort.bestSelling" },
  { value: "price-asc", key: "sort.priceAsc" },
  { value: "price-desc", key: "sort.priceDesc" },
  { value: "rating", key: "sort.topRated" },
  { value: "name-asc", key: "sort.nameAsc" },
] as const;

export function SortSelect({ current, value }: { current: ShopParams; value: string }) {
  const router = useRouter();
  const { t } = useIntl();

  return (
    <label className="relative inline-flex items-center">
      <ArrowUpDown className="text-muted-foreground pointer-events-none absolute left-3 size-4" />
      <span className="sr-only">{t("shop.sortAria")}</span>
      <select
        value={value}
        onChange={(e) =>
          router.replace(shopUrl(current, { sort: e.target.value, page: undefined }), {
            scroll: false,
          })
        }
        className="border-input bg-background h-9 appearance-none rounded-md border pr-8 pl-9 text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--ring)"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.key)}
          </option>
        ))}
      </select>
    </label>
  );
}
