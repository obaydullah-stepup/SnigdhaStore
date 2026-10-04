import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getProductSummaries } from "@/lib/data/products";
import { shopUrl, stringParam, type ShopParams } from "@/lib/shop-url";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { ProductGrid } from "@/components/shop/product-grid";
import { buildBreadcrumbJsonLd, formatJsonLd } from "@/lib/seo";
import { getTranslations } from "@/lib/i18n";
import { getCachedStoreName } from "@/lib/settings";

const PER_PAGE = 12;

export async function generateMetadata({
  params,
}: PageProps<"/category/[slug]">): Promise<Metadata> {
  const [{ slug }, storeName] = await Promise.all([params, getCachedStoreName()]);
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };

  return {
    title: `${category.name} — Shop`,
    description:
      category.description ??
      `Browse ${category.name} at ${storeName} with nationwide delivery.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const sp = await searchParams;
  const current: ShopParams = { category: slug, page: stringParam(sp.page) };
  const page = Math.max(1, parseInt(current.page ?? "1", 10) || 1);

  const { items, total, pageCount } = await getProductSummaries({
    categorySlug: slug,
    page,
    perPage: PER_PAGE,
    sort: "best-selling",
  });

  const [{ t }] = await Promise.all([getTranslations()]);

  const breadcrumbItems = [
    ...category.breadcrumb.slice(0, -1).map((c) => ({
      label: c.name,
      href: `/category/${c.slug}`,
    })),
    { label: category.name },
  ];

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("breadcrumb.home"), href: "/" },
    ...category.breadcrumb.slice(0, -1).map((c) => ({
      name: c.name,
      href: `/category/${c.slug}`,
    })),
    { name: category.name },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: formatJsonLd(breadcrumbJsonLd) }}
      />

      <div className="mx-auto w-full max-w-7xl px-4 pt-6">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <section className="mx-auto mt-4 w-full max-w-7xl px-4">
        <div className="bg-secondary relative overflow-hidden rounded-2xl">
          <div className="relative z-10 flex flex-col gap-3 px-6 py-12 sm:px-12">
            <p className="text-accent-text text-xs font-semibold tracking-[0.2em] uppercase">
              {t("category.eyebrow")}
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                {category.description}
              </p>
            )}
            {category.children.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {category.children.map((child) => (
                  <Link
                    key={child.slug}
                    href={`/category/${child.slug}`}
                    className="border-border bg-background text-foreground hover:border-primary hover:text-primary rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {category.image && (
            <Image
              src={category.image}
              alt=""
              fill
              sizes="100vw"
              className="absolute inset-0 object-cover opacity-25"
            />
          )}
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-10">
        <p className="text-muted-foreground text-sm">
          {total === 1
            ? t("shop.showingOne", { n: total })
            : t("shop.showingMany", { n: total })}
        </p>
        <div className="mt-6">
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
