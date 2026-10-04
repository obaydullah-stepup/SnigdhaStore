"use client";

import { useRouter } from "next/navigation";
import { Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { shopUrl, clearParam, type ShopParams } from "@/lib/shop-url";
import type { CategoryCard } from "@/lib/data/categories";
import { useIntl } from "@/components/i18n/locale-provider";

function FilterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-heading text-foreground text-sm font-semibold tracking-wide">
      {children}
    </h2>
  );
}

export function FiltersPanel({
  categories,
  current,
}: {
  categories: CategoryCard[];
  current: ShopParams;
}) {
  const router = useRouter();
  const { t } = useIntl();
  const hasActive =
    current.category || current.min || current.max || current.inStock || current.rating;

  function navigate(next: ShopParams) {
    router.replace(shopUrl(current, next), { scroll: false });
  }

  function submitPrice(formData: FormData) {
    const minVal = String(formData.get("min") ?? "").trim();
    const maxVal = String(formData.get("max") ?? "").trim();
    navigate({ min: minVal || undefined, max: maxVal || undefined, page: undefined });
  }

  const ratingOptions = [
    { value: "4", label: t("shop.starsUp", { n: 4 }) },
    { value: "3", label: t("shop.starsUp", { n: 3 }) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <FilterHeading>{t("shop.filters")}</FilterHeading>
        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() =>
              navigate(
                clearParam(current, [
                  "category",
                  "min",
                  "max",
                  "inStock",
                  "rating",
                  "page",
                ])
              )
            }
          >
            {t("shop.clearAll")}
          </Button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <FilterHeading>{t("shop.category")}</FilterHeading>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch lg:gap-1">
            {categories.map((category) => {
              const active = current.category === category.slug;
              const href = shopUrl(current, {
                category: active ? undefined : category.slug,
                page: undefined,
              });
              return (
                <a
                  key={category.slug}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate({
                      category: active ? undefined : category.slug,
                      page: undefined,
                    });
                  }}
                  aria-current={active ? "page" : undefined}
                  className="text-foreground/80 hover:bg-muted hover:text-primary flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {active && (
                      <Check className="text-primary size-3.5" aria-hidden="true" />
                    )}
                    {category.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {category.productCount}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      <div className="flex flex-col gap-3">
        <FilterHeading>{t("shop.rating")}</FilterHeading>
        <label className="text-foreground/80 flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="rating"
            checked={!current.rating}
            onChange={() => navigate({ rating: undefined, page: undefined })}
            className="size-4 accent-[var(--category-primary)]"
          />
          {t("shop.anyRating")}
        </label>
        {ratingOptions.map((option) => (
          <label
            key={option.value}
            className="text-foreground/80 flex items-center gap-2 text-sm"
          >
            <input
              type="radio"
              name="rating"
              checked={current.rating === option.value}
              onChange={() => navigate({ rating: option.value, page: undefined })}
              className="size-4 accent-[var(--category-primary)]"
            />
            {option.label}
          </label>
        ))}
      </div>

      <Separator />

      <label className="text-foreground/80 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.inStock === "1"}
          onChange={(e) =>
            navigate({ inStock: e.target.checked ? "1" : undefined, page: undefined })
          }
          className="size-4 accent-[var(--category-primary)]"
        />
        {t("shop.onlyInStock")}
      </label>

      <Separator />

      <form action={submitPrice} className="flex flex-col gap-3">
        <FilterHeading>{t("shop.price")} (৳)</FilterHeading>
        <div className="flex items-center gap-2">
          <Input
            key={`min:${current.min ?? ""}`}
            name="min"
            type="number"
            min={0}
            defaultValue={current.min}
            placeholder={t("shop.min")}
            aria-label={t("shop.minAria")}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            key={`max:${current.max ?? ""}`}
            name="max"
            type="number"
            min={0}
            defaultValue={current.max}
            placeholder={t("shop.max")}
            aria-label={t("shop.maxAria")}
          />
        </div>
        <Button type="submit" size="sm" variant="secondary">
          {t("shop.apply")}
        </Button>
      </form>
    </div>
  );
}

export function MobileFiltersSheet({
  categories,
  current,
}: {
  categories: CategoryCard[];
  current: ShopParams;
}) {
  const { t } = useIntl();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="lg:hidden">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {t("shop.filters")}
          </Button>
        }
      />
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>{t("shop.filters")}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-4">
          <FiltersPanel categories={categories} current={current} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
