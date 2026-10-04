"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { fieldErrorsFromIssues, type LocalizedMessage } from "@/validators/auth";

export type AccountActionResult = {
  ok: boolean;
  message?: LocalizedMessage;
  error?: LocalizedMessage;
  fieldErrors?: Record<string, LocalizedMessage>;
};

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your full name (at least 2 characters).")
    .max(80, "Name is too long."),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine(
      (v) => v === undefined || /^\+?[0-9][0-9\s-]{9,14}$/.test(v),
      "Please enter a valid phone number."
    ),
});

export async function updateProfileAction(
  _prev: AccountActionResult,
  formData: FormData
): Promise<AccountActionResult> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone },
  });

  revalidatePath("/account/profile");
  return {
    ok: true,
    message: { en: "Profile updated.", bn: "প্রোফাইল আপডেট হয়েছে।" },
  };
}

const changePasswordSchema = z.object({
  currentPassword: z.string().trim().min(1, "Please enter your current password."),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters.")
    .max(72, "New password is too long."),
});

export async function changePasswordAction(
  _prev: AccountActionResult,
  formData: FormData
): Promise<AccountActionResult> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!dbUser?.passwordHash) {
    return {
      ok: false,
      error: {
        en: "This account has no password set.",
        bn: "এই অ্যাকাউন্টে পাসওয়ার্ড নেই।",
      },
    };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) {
    return {
      ok: false,
      error: {
        en: "Current password is incorrect.",
        bn: "বর্তমান পাসওয়ার্ড সঠিক নয়।",
      },
    };
  }

  const hash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

  return {
    ok: true,
    message: { en: "Password changed successfully.", bn: "পাসওয়ার্ড পরিবর্তন হয়েছে।" },
  };
}
