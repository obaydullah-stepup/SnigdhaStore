import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import type { ProductSummary } from "@/lib/data/products";
import { getTranslations } from "@/lib/i18n";

export async function ProductSection({
  eyebrow,
  title,
  description,
  products,
  viewAllHref,
  priorityFirst = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  products: ProductSummary[];
  viewAllHref?: string;
  priorityFirst?: boolean;
}) {
  const { t } = await getTranslations();
  if (products.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-accent-text text-xs font-semibold tracking-[0.2em] uppercase">
            {eyebrow}
          </p>
          <h2 className="font-heading mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{description}</p>
          )}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-primary inline-flex shrink-0 items-center gap-1 text-sm font-medium hover:underline"
          >
            {t("section.viewAll")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={priorityFirst && i === 0}
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
