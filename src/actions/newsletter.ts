"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { sendNewsletterWelcomeEmail } from "@/lib/email/emails";
import { getCachedStoreName } from "@/lib/settings";

const SubscribePayload = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export type SubscribeResult = {
  status: "success" | "error";
  message: { en: string; bn: string };
};

export async function subscribeNewsletterAction(
  _prev: SubscribeResult | null,
  formData: FormData
): Promise<SubscribeResult> {
  const parsed = SubscribePayload.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      status: "error",
      message: {
        en: "Please enter a valid email address.",
        bn: "একটি বৈধ ইমেইল ঠিকানা লিখুন।",
      },
    };
  }

  const exists = await prisma.newsletterSubscriber.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (!exists) {
    await prisma.newsletterSubscriber.create({
      data: { email: parsed.data.email },
    });
    sendNewsletterWelcomeEmail(parsed.data.email).catch((err) => {
      console.error("[email] newsletter welcome failed", err);
    });
  }

  const storeName = await getCachedStoreName();
  return {
    status: "success",
    message: {
      en: `Thanks! You're subscribed to the ${storeName} newsletter.`,
      bn: "ধন্যবাদ! আপনি নিউজলেটারে সাবস্ক্রাইব করেছেন।",
    },
  };
}

export async function unsubscribeNewsletterAction(
  _prev: SubscribeResult | null,
  formData: FormData
): Promise<SubscribeResult> {
  const parsed = SubscribePayload.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      status: "error",
      message: {
        en: "Please enter a valid email address.",
        bn: "একটি বৈধ ইমেইল ঠিকানা লিখুন।",
      },
    };
  }

  await prisma.newsletterSubscriber.deleteMany({
    where: { email: parsed.data.email },
  });

  return {
    status: "success",
    message: {
      en: "You've been unsubscribed. Sorry to see you go!",
      bn: "আপনাকে আনসাবস্ক্রাইব করা হয়েছে।",
    },
  };
}

export async function deleteNewsletterSubscriberAction(id: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  await requireAdmin();
  const sub = await prisma.newsletterSubscriber.findUnique({
    where: { id },
    select: { email: true },
  });
  await prisma.newsletterSubscriber.delete({ where: { id } });
  void logAudit({
    action: "newsletter.delete",
    entityType: "newsletter_subscriber",
    entityId: id,
    metadata: { email: sub?.email },
  });
  revalidatePath("/admin/newsletter");
  return { ok: true };
}
