"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { fieldErrorsFromIssues, type LocalizedMessage } from "@/validators/auth";

export type ReviewActionResult = {
  ok: boolean;
  error?: LocalizedMessage;
  fieldErrors?: Record<string, LocalizedMessage>;
};

const reviewSchema = z.object({
  productId: z.string().min(1, "Missing product."),
  orderId: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  rating: z
    .number()
    .int("Choose a rating.")
    .min(1, "Choose a rating.")
    .max(5, "Maximum rating is 5."),
  title: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v : undefined)),
  comment: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters.")
    .max(2000, "Comment is too long."),
});

export async function submitReviewAction(
  _prev: ReviewActionResult,
  formData: FormData
): Promise<ReviewActionResult> {
  const user = await requireUser();

  const ratingRaw = formData.get("rating");
  const parsed = reviewSchema.safeParse({
    productId: String(formData.get("productId") ?? ""),
    orderId: String(formData.get("orderId") ?? ""),
    rating: ratingRaw === null ? undefined : Number(ratingRaw),
    title: String(formData.get("title") ?? ""),
    comment: String(formData.get("comment") ?? ""),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  const { productId, orderId, rating, title, comment } = parsed.data;

  const deliveredOrder = await prisma.order.findFirst({
    where: {
      userId: user.id,
      status: "DELIVERED",
      items: { some: { productId } },
      ...(orderId ? { id: orderId } : {}),
    },
    select: { id: true },
  });

  if (!deliveredOrder) {
    return {
      ok: false,
      error: {
        en: "You can only review products you've purchased and received.",
        bn: "আপনি কেবল কেনা ও পাওয়া পণ্যের রিভিউ দিতে পারবেন।",
      },
    };
  }

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: {
        en: "You've already reviewed this product.",
        bn: "আপনি এই পণ্যের রিভিউ আগেই দিয়েছেন।",
      },
    };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return { ok: false, error: { en: "Product not found.", bn: "পণ্য পাওয়া যায়নি।" } };
  }

  await prisma.review.create({
    data: {
      userId: user.id,
      productId,
      orderId: deliveredOrder.id,
      rating,
      title,
      comment,
      isApproved: false,
    },
  });

  revalidatePath("/account/reviews");
  return { ok: true };
}

export async function deleteReviewAction(reviewId: string): Promise<void> {
  const user = await requireUser();
  if (!reviewId) return;

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.userId !== user.id) return;

  await prisma.review.delete({ where: { id: reviewId } });
  revalidatePath("/account/reviews");
}
