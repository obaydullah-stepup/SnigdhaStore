import "server-only";
import { prisma } from "@/lib/prisma";

export type ReviewSummary = {
  count: number;
  average: number;
  distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
};

export async function getReviewSummary(productId: string): Promise<ReviewSummary> {
  const reviews = await prisma.review.findMany({
    where: { productId, isApproved: true },
    select: { rating: true },
  });
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    distribution[r.rating as keyof typeof distribution]++;
  }
  const count = reviews.length;
  const average = count === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / count;
  return { count, average, distribution };
}

export type ReviewItem = {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  createdAt: Date;
  userName: string;
};

export async function getApprovedReviews(productId: string): Promise<ReviewItem[]> {
  const rows = await prisma.review.findMany({
    where: { productId, isApproved: true },
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    createdAt: r.createdAt,
    userName: r.user.name,
  }));
}

export type Testimonial = {
  id: string;
  rating: number;
  comment: string;
  userName: string;
  productSlug: string;
  productName: string;
};

export async function getTestimonials(limit = 6): Promise<Testimonial[]> {
  const rows = await prisma.review.findMany({
    where: { isApproved: true },
    select: {
      id: true,
      rating: true,
      comment: true,
      user: { select: { name: true } },
      product: { select: { slug: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    userName: r.user.name,
    productSlug: r.product.slug,
    productName: r.product.name,
  }));
}
