import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Truck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";
import type { HomeData } from "@/lib/data/home";

const HERO_FALLBACK = "https://picsum.photos/seed/snigdha-hero/1200/1500";

export async function Hero({
  bestSeller,
  threshold,
}: {
  bestSeller: HomeData["bestSellers"][0];
  threshold: number;
}) {
  const { t } = await getTranslations();
  const heroImage = bestSeller?.image ?? HERO_FALLBACK;

  return (
    <section className="bg-primary text-primary-foreground relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
      >
        <Image
          src={heroImage ?? HERO_FALLBACK}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
        <div className="max-w-xl">
          <p className="bg-primary-light/30 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {t("hero.eyebrow")}
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="text-primary-foreground/80 mt-4 text-base leading-7">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/shop">
              <Button size="lg" variant="secondary" className="font-medium">
                {t("hero.shopNow")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </Link>
            {bestSeller && (
              <Link href={`/product/${bestSeller.slug}`}>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-primary-foreground hover:text-primary-foreground border-white/30 bg-transparent hover:bg-white/10"
                >
                  {t("hero.shopBestSeller")}
                </Button>
              </Link>
            )}
          </div>
          <div className="text-primary-foreground/80 mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <Truck className="size-4" aria-hidden="true" />
              {t("hero.freeDeliveryOver", { n: formatPrice(threshold) })}
            </span>
            <span className="inline-flex items-center gap-2">
              {t("hero.nationwideCod")}
            </span>
            <span className="inline-flex items-center gap-2">
              {t("hero.easyReturns7")}
            </span>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/20">
            <Image
              src={heroImage ?? HERO_FALLBACK}
              alt={bestSeller?.name ?? siteConfig.tagline}
              fill
              sizes="(min-width: 1024px) 40vw"
              className="object-cover"
              priority
            />
          </div>
          <div className="bg-background text-foreground absolute -bottom-5 -left-7 rounded-xl px-5 py-4 shadow-lg">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {t("hero.bestSeller")}
            </p>
            <p className="mt-0.5 line-clamp-1 max-w-[200px] text-sm font-medium">
              {bestSeller?.name ?? siteConfig.tagline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
