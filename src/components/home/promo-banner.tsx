import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PromoSettings } from "@/lib/data/home";
import { getTranslations } from "@/lib/i18n";

export async function PromoBanner({ promo }: { promo: PromoSettings }) {
  const { t } = await getTranslations();
  const ready = promo.enabled && promo.badge && promo.title && promo.code && promo.image;
  if (!ready) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="bg-secondary relative overflow-hidden rounded-2xl">
        <div className="grid items-center gap-6 px-6 py-10 sm:px-10 md:grid-cols-2">
          <div>
            <p className="bg-accent/15 text-foreground inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
              <Tag className="text-accent size-3.5" aria-hidden="true" />
              {promo.badge}
            </p>
            <h2 className="font-heading mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {promo.title} <span className="text-primary">{promo.code}</span>
            </h2>
            {promo.description && (
              <p className="text-muted-foreground mt-3 max-w-md text-sm leading-6">
                {promo.description}
              </p>
            )}
            {promo.ctaLabel && (
              <Link href={promo.ctaUrl} className="mt-6 inline-block">
                <Button size="lg" className="font-medium">
                  {promo.ctaLabel}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </Link>
            )}
          </div>
          <div className="relative hidden aspect-[16/10] overflow-hidden rounded-xl md:block">
            <Image
              src={promo.image}
              alt={t("promo.imageAlt")}
              fill
              sizes="(min-width: 768px) 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
