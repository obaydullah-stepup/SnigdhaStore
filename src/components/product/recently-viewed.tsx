"use client";

import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import type { ProductSummary } from "@/lib/data/products";
import { useIntl } from "@/components/i18n/locale-provider";

const RECENT_KEY = "snigdha_recent";

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string" && s.length > 0)
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const { t } = useIntl();

  useEffect(() => {
    const slugs = [currentSlug, ...readRecent().filter((s) => s !== currentSlug)].slice(
      0,
      8
    );
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(slugs));
    } catch {
      /* ignore */
    }
    const others = slugs.filter((s) => s !== currentSlug);
    if (others.length === 0) return;
    fetch(`/api/products/recent?slugs=${encodeURIComponent(others.join(","))}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ProductSummary[] | null) => {
        if (Array.isArray(data) && data.length > 0) setProducts(data);
      })
      .catch(() => {
        /* ignore */
      });
  }, [currentSlug]);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12">
      <div className="flex items-center gap-2">
        <Link2 className="text-accent size-4" aria-hidden="true" />
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          {t("recentlyViewed.title")}
        </h2>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            labels={{
              featured: t("productCard.featured"),
              soldOut: t("productCard.soldOut"),
              noImage: t("productCard.noImage"),
            }}
          />
        ))}
      </div>
    </section>
  );
}
