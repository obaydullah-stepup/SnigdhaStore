"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { getDistricts } from "@/constants/bangladesh";
import { fieldErrorsFromIssues, localized as authLocalized } from "@/validators/auth";

type ActionResult = {
  ok: boolean;
  error?: { en: string; bn: string };
  fieldErrors?: Record<string, { en: string; bn: string }>;
};

const addressSchema = z.object({
  name: z.string().trim().min(2, "Please enter a full name.").max(80),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => /^\+?[0-9][0-9\s-]{9,14}$/.test(v),
      "Please enter a valid phone number."
    ),
  division: z.string().min(1, "Select a division."),
  district: z.string().min(1, "Select a district."),
  area: z.string().trim().min(2, "Enter an area or upazila.").max(120),
  addressLine: z.string().trim().min(5, "Enter your street address.").max(300),
  postalCode: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || /^\d{4}$/.test(v), "Postal code must be 4 digits."),
  isDefault: z
    .enum(["on", "off"])
    .optional()
    .transform((v) => v === "on"),
});

function toFieldErrors(issues: z.ZodIssue[]): ActionResult {
  return { ok: false, fieldErrors: fieldErrorsFromIssues(issues) };
}

export async function upsertAddressAction(
  prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = addressSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    division: formData.get("division"),
    district: formData.get("district"),
    area: formData.get("area"),
    addressLine: formData.get("addressLine"),
    postalCode: formData.get("postalCode"),
    isDefault: formData.get("isDefault"),
  });

  if (!parsed.success) return toFieldErrors(parsed.error.issues);

  const data = parsed.data;
  if (!getDistricts(data.division).includes(data.district)) {
    return { ok: false, error: { en: "Invalid district.", bn: "জেলা সঠিক নয়।" } };
  }

  const addressId = formData.get("addressId");
  const id = typeof addressId === "string" && addressId ? addressId : undefined;

  if (id) {
    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return { ok: false, error: authLocalized.generic };
    }
  }

  await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }
    if (id) {
      await tx.address.update({ where: { id }, data });
    } else {
      const count = await tx.address.count({ where: { userId: user.id } });
      await tx.address.create({
        data: { ...data, userId: user.id, isDefault: data.isDefault || count === 0 },
      });
    }
  });

  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function setDefaultAddressAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("addressId");
  if (typeof id !== "string" || !id) return;

  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== user.id) return;

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/account/addresses");
}

export async function deleteAddressAction(addressId: string): Promise<void> {
  const user = await requireUser();
  if (!addressId) return;

  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== user.id) return;

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: addressId } });
    if (address.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });

  revalidatePath("/account/addresses");
}
