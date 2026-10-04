import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getActiveCategories } from "@/lib/data/categories";
import { getCachedStoreName } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getCachedStoreName();
  return {
    title: "All categories",
    description: `Browse every ${storeName} category with product counts and fast nationwide delivery.`,
  };
}

export default async function CategoriesPage() {
  const categories = await getActiveCategories();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
      <p className="text-accent-text text-xs font-semibold tracking-[0.2em] uppercase">
        Collections
      </p>
      <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">
        Browse all categories
      </h1>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="group bg-muted relative block aspect-[4/3] overflow-hidden rounded-xl"
          >
            {category.image ? (
              <Image
                src={category.image}
                alt={category.name}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center">
                {category.name}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-2">
              <div>
                <h2 className="font-medium text-white">{category.name}</h2>
                <p className="text-xs text-white/80">
                  {category.productCount} {category.productCount === 1 ? "item" : "items"}
                </p>
              </div>
              <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-white opacity-0 transition group-hover:opacity-100">
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
