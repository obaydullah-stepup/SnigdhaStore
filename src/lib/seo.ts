import { siteConfig, resolveBrand } from "@/config/site";
import { getCurrencyCode } from "@/lib/currency";

const BASE_URL = siteConfig.url.replace(/\/$/, "");

function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * `storeName` must be passed in (from `getCachedStoreName`) so the Organization
 * node reflects the name set in Admin > Settings rather than the bootstrap
 * default baked into `siteConfig`.
 */
export function buildOrganizationJsonLd(storeName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeName,
    url: siteConfig.url,
    logo: absoluteUrl("/opengraph-image"),
    description: resolveBrand(siteConfig.description, storeName),
    email: siteConfig.email,
    telephone: siteConfig.phone,
    address: {
      "@type": "PostalAddress",
      addressCountry: "BD",
    },
    sameAs: [siteConfig.socials.facebook, siteConfig.socials.instagram],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.phone,
      contactType: "customer service",
      areaServed: "BD",
      availableLanguage: ["en", "bn"],
    },
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

export type ProductJsonLdInput = {
  name: string;
  slug: string;
  description: string | null | undefined;
  sku: string;
  brand: string | null;
  price: number;
  compareAtPrice: number | null;
  image: string | undefined;
  categoryName: string | null;
  inStock: boolean;
  rating: { value: number; count: number };
};

export function buildProductJsonLd(product: ProductJsonLdInput) {
  const productUrl = absoluteUrl(`/product/${product.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description
      ? String(product.description).slice(0, 320)
      : undefined,
    sku: product.sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    url: productUrl,
    image: product.image ? [absoluteUrl(product.image)] : undefined,
    category: product.categoryName ?? undefined,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: getCurrencyCode(),
      price: product.price,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    aggregateRating:
      product.rating.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating.value,
            reviewCount: product.rating.count,
          }
        : undefined,
  };
}

export function formatJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
