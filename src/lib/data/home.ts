import "server-only";
import { prisma } from "@/lib/prisma";
import { getProductSummaries, type ProductSummary } from "@/lib/data/products";
import { getActiveCategories, type CategoryCard } from "@/lib/data/categories";
import { getTestimonials, type Testimonial } from "@/lib/data/reviews";

export type PromoSettings = {
  enabled: boolean;
  badge: string;
  title: string;
  code: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  image: string;
};

export type HomeData = {
  categories: CategoryCard[];
  featured: ProductSummary[];
  newest: ProductSummary[];
  bestSellers: ProductSummary[];
  testimonials: Testimonial[];
  freeShippingThreshold: number;
  promo: PromoSettings;
};

export async function getHomeData(): Promise<HomeData> {
  const [categories, testimonials, storeSettings] = await Promise.all([
    getActiveCategories(),
    getTestimonials(),
    prisma.setting.findMany({
      where: {
        key: {
          in: [
            "shipping.freeShippingThreshold",
            "store.currency",
            "promo.enabled",
            "promo.badge",
            "promo.title",
            "promo.code",
            "promo.description",
            "promo.ctaLabel",
            "promo.ctaUrl",
            "promo.image",
          ],
        },
      },
    }),
  ]);

  const [featured, newest, bestSellers] = await Promise.all([
    getProductSummaries({ perPage: 8, featuredOnly: true }),
    getProductSummaries({ perPage: 8, sort: "newest" }),
    getProductSummaries({ perPage: 8, sort: "best-selling" }),
  ]);
  const featuredItems = featured.items;
  const newestItems = newest.items;
  const bestSellersItems = bestSellers.items;

  const setting = (key: string) => storeSettings.find((s) => s.key === key)?.value;
  const thresholdRow = storeSettings.find(
    (s) => s.key === "shipping.freeShippingThreshold"
  );

  return {
    categories,
    featured: featuredItems,
    newest: newestItems,
    bestSellers: bestSellersItems,
    testimonials,
    freeShippingThreshold: thresholdRow ? Number(thresholdRow.value) : 3000,
    promo: {
      enabled: setting("promo.enabled") === "1",
      badge: setting("promo.badge") || "Limited offer",
      title: setting("promo.title") || "10% off your first order with",
      code: setting("promo.code") || "WELCOME10",
      description:
        setting("promo.description") ||
        "Plus free nationwide delivery when you spend over ৳3,000 — every order is backed by easy returns.",
      ctaLabel: setting("promo.ctaLabel") || "Browse the collection",
      ctaUrl: setting("promo.ctaUrl") || "/shop",
      image:
        setting("promo.image") ||
        "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1600&auto=format&fit=crop",
    },
  };
}
