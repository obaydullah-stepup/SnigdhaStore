import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ShoppingBag, Star } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ReviewForm } from "@/components/account/review-form";
import { DeleteReviewButton } from "@/components/account/delete-review";

export const metadata = { title: "My reviews" };

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ review?: string }>;
}) {
  const user = await requireUser();
  const { review: reviewProductId } = await searchParams;

  const myReviews = await prisma.review.findMany({
    where: { userId: user.id },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const reviewedIds = new Set(myReviews.map((r) => r.productId));

  const purchasedRows = await prisma.orderItem.findMany({
    where: {
      order: { userId: user.id, status: "DELIVERED" },
      productId: { notIn: [...reviewedIds] },
    },
    select: { productId: true },
    distinct: ["productId"],
  });
  const eligibleIds = purchasedRows
    .map((r) => r.productId)
    .filter((id): id is string => Boolean(id));
  const eligible = eligibleIds.length
    ? await prisma.product.findMany({
        where: { id: { in: eligibleIds }, published: true, status: "ACTIVE" },
        select: {
          id: true,
          slug: true,
          name: true,
          images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" } },
        },
      })
    : [];

  const activeReviewProduct = eligible.find((p) => p.id === reviewProductId);

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Account", href: "/account" }, { label: "Reviews" }]}
      />
      <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight">
        My reviews
      </h1>

      {eligible.length > 0 && (
        <section className="mt-6">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Review your purchases
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {eligible.map((product) => {
              const image = product.images[0];
              return (
                <li key={product.id}>
                  {activeReviewProduct?.id === product.id ? (
                    <div className="space-y-3">
                      <ReviewForm productId={product.id} />
                      <Link
                        href="/account/reviews"
                        className="text-primary text-sm hover:underline"
                      >
                        Cancel
                      </Link>
                    </div>
                  ) : (
                    <div className="border-border bg-card flex items-center gap-4 rounded-xl border p-3">
                      <Link
                        href={`/product/${product.slug}`}
                        className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-md"
                      >
                        {image ? (
                          <Image
                            src={image.url}
                            alt={image.alt ?? product.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-muted-foreground flex h-full items-center justify-center text-[10px]">
                            No image
                          </span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/product/${product.slug}`}
                          className="line-clamp-2 text-sm font-medium hover:underline"
                        >
                          {product.name}
                        </Link>
                        <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                          <BadgeCheck
                            className="text-primary size-3.5"
                            aria-hidden="true"
                          />
                          Purchased & delivered
                        </p>
                      </div>
                      <Link href={`/account/reviews?review=${product.id}`}>
                        <Button variant="secondary" size="sm">
                          <Star className="size-4" aria-hidden="true" />
                          Write a review
                        </Button>
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
          Submitted
        </h2>
        {myReviews.length === 0 ? (
          <div className="border-border mt-3 flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-14 text-center">
            <ShoppingBag className="text-muted-foreground size-10" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold">No reviews yet</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Review items you&apos;ve received to help other shoppers.
              </p>
            </div>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {myReviews.map((review) => (
              <li key={review.id} className="border-border bg-card rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} aria-hidden="true">
                        {s <= review.rating ? "★" : "☆"}
                      </span>
                    ))}
                    <span className="text-muted-foreground ml-1 text-xs">
                      {new Date(review.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        review.isApproved
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                          : "bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium"
                      }
                    >
                      {review.isApproved ? "Approved" : "Pending approval"}
                    </span>
                    <DeleteReviewButton reviewId={review.id} />
                  </div>
                </div>
                {review.title && (
                  <p className="mt-2 text-sm font-semibold">{review.title}</p>
                )}
                <p className="text-muted-foreground mt-1 text-sm">{review.comment}</p>
                <Link
                  href={`/product/${review.product.slug}`}
                  className="text-primary mt-3 inline-block text-sm hover:underline"
                >
                  {review.product.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
