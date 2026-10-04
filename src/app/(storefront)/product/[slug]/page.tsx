import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { Gallery } from "@/components/product/gallery";
import { AddToCart } from "@/components/product/add-to-cart";
import { ReviewsSection } from "@/components/product/reviews-section";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { ProductSection } from "@/components/home/product-section";
import { RatingStars } from "@/components/product/rating-stars";
import { ViewItemTracker } from "@/components/analytics/trackers";
import { buildBreadcrumbJsonLd, buildProductJsonLd, formatJsonLd } from "@/lib/seo";
import { getProductBySlug, getRelatedProducts } from "@/lib/data/products";
import { getReviewSummary, getApprovedReviews } from "@/lib/data/reviews";
import { getTranslations } from "@/lib/i18n";
import { getCachedStoreName } from "@/lib/settings";

function normalizeDescription(description: string | null | undefined): string[] {
  if (!description) return [];
  return description
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: PageProps<"/product/[slug]">): Promise<Metadata> {
  const [{ slug }, storeName] = await Promise.all([params, getCachedStoreName()]);
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const title = product.seoTitle ?? product.name;
  const description =
    product.seoDescription ??
    product.shortDescription ??
    `Shop ${product.name} at ${storeName}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [reviewSummary, reviews, related, { t }] = await Promise.all([
    getReviewSummary(product.id),
    getApprovedReviews(product.id),
    getRelatedProducts(product.slug, product.categoryId, 4),
    getTranslations(),
  ]);

  const categoryName = product.category?.name ?? "Shop";
  const categorySlug = product.category?.slug;
  const paragraphs = normalizeDescription(product.description).slice(0, 3);

  const categoryHref = categorySlug ? `/shop?category=${categorySlug}` : "/shop";

  const productJsonLd = buildProductJsonLd({
    name: product.name,
    slug: product.slug,
    description:
      product.seoDescription ?? product.shortDescription ?? product.description,
    sku: product.sku,
    brand: product.brand,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    image: product.images[0]?.url,
    categoryName: product.category?.name ?? null,
    inStock: product.stock > 0,
    rating: { value: reviewSummary.average, count: reviewSummary.count },
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("breadcrumb.home"), href: "/" },
    { name: t("breadcrumb.shop"), href: "/shop" },
    { name: categoryName, href: categorySlug ? categoryHref : undefined },
    { name: product.name },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: formatJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: formatJsonLd(breadcrumbJsonLd) }}
      />
      <ViewItemTracker
        item={{
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          quantity: 1,
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-4 pt-6">
        <Breadcrumbs
          items={[
            {
              label: categoryName,
              href: categorySlug ? categoryHref : "/shop",
            },
            { label: product.name },
          ]}
        />
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-8 lg:grid-cols-2 lg:gap-14">
        <Gallery
          images={product.images.map((img) => ({
            url: img.url,
            alt: img.alt ?? product.name,
          }))}
        />

        <div className="flex flex-col gap-5">
          {product.category && (
            <Link
              href={`/shop?category=${product.category.slug}`}
              className="text-accent-text text-xs font-semibold tracking-[0.2em] uppercase hover:underline"
            >
              {categoryName}
            </Link>
          )}
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {product.name}
          </h1>

          <RatingStars
            value={reviewSummary.average}
            count={reviewSummary.count}
            size="default"
          />

          {product.shortDescription && (
            <p className="text-muted-foreground text-sm leading-6">
              {product.shortDescription}
            </p>
          )}

          <div className="bg-border h-px" />

          <AddToCart
            productId={product.id}
            productName={product.name}
            productStock={product.stock}
            productPrice={product.price}
            variants={product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
              stock: v.stock,
            }))}
          />

          <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
            {product.brand && (
              <Badge variant="secondary">
                {t("product.brand")}: {product.brand}
              </Badge>
            )}
            <Badge variant="secondary">SKU: {product.sku}</Badge>
            {product.soldCount > 10 && (
              <Badge variant="secondary">
                {t("product.soldCount", { n: product.soldCount })}
              </Badge>
            )}
          </div>

          {paragraphs.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
                {t("product.description")}
              </h2>
              {paragraphs.map((paragraph, i) => (
                <p key={i} className="text-foreground/85 text-sm leading-6">
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          <div className="border-border bg-secondary/50 text-muted-foreground rounded-xl border p-4 text-xs leading-6">
            <p>• {t("product.codBullet")}</p>
            <p>• {t("product.freeDeliveryBullet")}</p>
            <p>• {t("product.returnsBullet")}</p>
          </div>
        </div>
      </div>

      <ReviewsSection summary={reviewSummary} reviews={reviews} />

      {related.length > 0 && (
        <div className="border-border border-t">
          <ProductSection
            eyebrow={t("related.eyebrow")}
            title={t("related.title")}
            products={related}
            viewAllHref={categorySlug ? `/shop?category=${categorySlug}` : "/shop"}
          />
        </div>
      )}

      <RecentlyViewed currentSlug={product.slug} />
    </div>
  );
}
