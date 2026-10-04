import Link from "next/link";
import { Quote } from "lucide-react";
import { RatingStars } from "@/components/product/rating-stars";
import type { Testimonial } from "@/lib/data/reviews";
import { getTranslations } from "@/lib/i18n";

export async function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const { t } = await getTranslations();
  if (testimonials.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-accent-text text-xs font-semibold tracking-[0.2em] uppercase">
          {t("home.reviews.eyebrow")}
        </p>
        <h2 className="font-heading mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("home.reviews.title")}
        </h2>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <figure
            key={testimonial.id}
            className="border-border bg-card flex flex-col rounded-xl border p-5"
          >
            <Quote className="text-accent size-6" aria-hidden="true" />
            <blockquote className="text-foreground mt-3 line-clamp-4 text-sm leading-6">
              &ldquo;{testimonial.comment}&rdquo;
            </blockquote>
            <figcaption className="border-border mt-4 flex items-center justify-between gap-3 border-t pt-4">
              <span className="text-sm font-medium">{testimonial.userName}</span>
              <div className="flex flex-col items-end gap-0.5">
                <RatingStars value={testimonial.rating} showValue={false} />
                <Link
                  href={`/product/${testimonial.productSlug}`}
                  className="text-muted-foreground hover:text-primary text-xs"
                >
                  {testimonial.productName}
                </Link>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
