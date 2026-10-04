import type { Metadata } from "next";
import { siteConfig, resolveBrand } from "@/config/site";
import { getCachedStoreName } from "@/lib/settings";
import { getHomeData } from "@/lib/data/home";
import { getTranslations } from "@/lib/i18n";
import { Hero } from "@/components/home/hero";
import { CategoryShowcase } from "@/components/home/category-showcase";
import { ProductSection } from "@/components/home/product-section";
import { PromoBanner } from "@/components/home/promo-banner";
import { WhyChoose } from "@/components/home/why-choose";
import { Testimonials } from "@/components/home/testimonials";
import { InstagramStrip } from "@/components/home/instagram-strip";

export async function generateMetadata(): Promise<Metadata> {
  const storeName = await getCachedStoreName();
  return {
    title: `${storeName} — ${siteConfig.tagline}`,
    description: resolveBrand(siteConfig.description, storeName),
  };
}

export default async function HomePage() {
  const [{ t }, data] = await Promise.all([getTranslations(), getHomeData()]);
  const bestSeller = data.bestSellers[0];

  return (
    <>
      <Hero bestSeller={bestSeller} threshold={data.freeShippingThreshold} />
      <WhyChoose />
      <CategoryShowcase categories={data.categories} />
      <ProductSection
        eyebrow={t("home.featured.eyebrow")}
        title={t("home.featured.title")}
        description={t("home.featured.description")}
        products={data.featured}
        viewAllHref="/shop"
        priorityFirst
      />
      <ProductSection
        eyebrow={t("home.arrivals.eyebrow")}
        title={t("home.arrivals.title")}
        products={data.newest}
        viewAllHref="/shop?sort=newest"
      />
      <PromoBanner promo={data.promo} />
      <ProductSection
        eyebrow={t("home.trending.eyebrow")}
        title={t("home.trending.title")}
        products={data.bestSellers}
        viewAllHref="/shop?sort=best-selling"
      />
      <Testimonials testimonials={data.testimonials} />
      <InstagramStrip />
    </>
  );
}
