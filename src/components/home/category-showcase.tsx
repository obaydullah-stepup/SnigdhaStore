import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CategoryCard } from "@/lib/data/categories";
import { getTranslations } from "@/lib/i18n";

export async function CategoryShowcase({ categories }: { categories: CategoryCard[] }) {
  const { t } = await getTranslations();
  const visible = categories.slice(0, 6);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-accent-text text-xs font-semibold tracking-[0.2em] uppercase">
            {t("home.collections.eyebrow")}
          </p>
          <h2 className="font-heading mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("home.collections.title")}
          </h2>
        </div>
        <Link
          href="/categories"
          className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          {t("section.viewAll")}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
        {visible.map((category) => (
          <Link
            key={category.slug}
            href={`/shop?category=${category.slug}`}
            className="group bg-muted relative block aspect-[4/3] overflow-hidden rounded-xl"
          >
            {category.image ? (
              <Image
                src={category.image}
                alt={category.name}
                fill
                sizes="(min-width: 768px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center">
                {category.name}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
              <div>
                <h3 className="font-medium text-white">{category.name}</h3>
                <p className="text-xs text-white/80">
                  {category.productCount === 1
                    ? t("section.item", { n: category.productCount })
                    : t("section.items", { n: category.productCount })}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
