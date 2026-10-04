import { RatingStars } from "@/components/product/rating-stars";
import type { ReviewItem, ReviewSummary } from "@/lib/data/reviews";
import { getTranslations } from "@/lib/i18n";

const MAX_STARS = 5;

export async function RatingDistribution({ summary }: { summary: ReviewSummary }) {
  const { t } = await getTranslations();
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: MAX_STARS }, (_, i) => {
        const star = MAX_STARS - i;
        const count = summary.distribution[star as keyof ReviewSummary["distribution"]];
        const percent = summary.count === 0 ? 0 : (count / summary.count) * 100;
        return (
          <div key={star} className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-10 shrink-0">
              {star} {t("product.star")}
            </span>
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-accent h-full rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-muted-foreground w-8 shrink-0 text-right text-xs tabular-nums">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export async function ReviewsSection({
  summary,
  reviews,
}: {
  summary: ReviewSummary;
  reviews: ReviewItem[];
}) {
  const { t } = await getTranslations();
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12" id="reviews">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">
        {t("product.reviewsTitle")}
      </h2>

      {summary.count === 0 ? (
        <p className="text-muted-foreground mt-6">{t("product.noReviewsYet")}</p>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[280px_1fr]">
          <div className="border-border bg-card h-fit rounded-xl border p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold">{summary.average.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">/ 5</span>
            </div>
            <div className="mt-1.5">
              <RatingStars value={summary.average} showValue={false} size="default" />
              <p className="text-muted-foreground mt-1.5 text-xs">
                {summary.count === 1
                  ? t("product.basedOnOne")
                  : t("product.basedOnMany", { n: summary.count })}
              </p>
            </div>
            <div className="mt-5">
              <RatingDistribution summary={summary} />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {reviews.length === 0 && (
              <p className="text-muted-foreground">{t("product.noReviews")}</p>
            )}
            {reviews.map((review) => (
              <article
                key={review.id}
                className="border-border bg-card rounded-xl border p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full text-sm font-semibold">
                      {review.userName.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{review.userName}</p>
                      <RatingStars value={review.rating} showValue={false} />
                    </div>
                  </div>
                  <time
                    className="text-muted-foreground text-xs"
                    dateTime={review.createdAt.toISOString()}
                  >
                    {review.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </div>
                {review.title && (
                  <h3 className="text-foreground mt-3 font-medium">{review.title}</h3>
                )}
                <p className="text-foreground/85 mt-1.5 text-sm leading-6">
                  {review.comment}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
