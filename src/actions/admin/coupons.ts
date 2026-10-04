"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";

const couponSchema = z.object({
  id: z.string().optional(),
  code: z
    .string()
    .trim()
    .min(2, "Code is required.")
    .max(30)
    .transform((v) => v.toUpperCase().replace(/\s+/g, "")),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.coerce.number().int().min(1, "Value must be at least 1."),
  minimumOrder: z.coerce.number().int().min(0).default(0),
  maximumDiscount: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return null;
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    }),
  usageLimit: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return null;
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  startsAt: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  expiresAt: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  isActive: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export type CouponFormState = { ok: boolean; error?: string };

export async function saveCouponAction(
  prevState: CouponFormState,
  formData: FormData
): Promise<CouponFormState> {
  await requireAdmin();
  const parsed = couponSchema.safeParse({
    id: formData.get("id") || undefined,
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    minimumOrder: formData.get("minimumOrder"),
    maximumDiscount: formData.get("maximumDiscount"),
    usageLimit: formData.get("usageLimit"),
    startsAt: formData.get("startsAt"),
    expiresAt: formData.get("expiresAt"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const data = parsed.data;
  if (data.type === "PERCENTAGE" && data.value > 100) {
    return { ok: false, error: "Percentage value cannot exceed 100." };
  }
  if (data.expiresAt && data.startsAt && data.expiresAt <= data.startsAt) {
    return { ok: false, error: "Expiry must be after the start date." };
  }

  try {
    if (data.id) {
      const existing = await prisma.coupon.findUnique({ where: { id: data.id } });
      if (!existing) return { ok: false, error: "Coupon not found." };
      await prisma.coupon.update({
        where: { id: data.id },
        data: {
          code: data.code,
          type: data.type,
          value: data.value,
          minimumOrder: data.minimumOrder,
          maximumDiscount: data.maximumDiscount,
          usageLimit: data.usageLimit,
          startsAt: data.startsAt,
          expiresAt: data.expiresAt,
          isActive: data.isActive,
        },
      });
    } else {
      await prisma.coupon.create({
        data: {
          code: data.code,
          type: data.type,
          value: data.value,
          minimumOrder: data.minimumOrder,
          maximumDiscount: data.maximumDiscount,
          usageLimit: data.usageLimit,
          startsAt: data.startsAt,
          expiresAt: data.expiresAt,
          isActive: data.isActive,
        },
      });
    }
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2002") {
      return { ok: false, error: `Code "${data.code}" already exists.` };
    }
    return { ok: false, error: "Failed to save coupon." };
  }

  revalidatePath("/admin/coupons");
  void logAudit({
    action: data.id ? "coupon.update" : "coupon.create",
    entityType: "coupon",
    metadata: { code: data.code },
  });
  if (data.id) redirect(`/admin/coupons`);
  return { ok: true };
}

export async function toggleCouponActiveAction(
  id: string,
  isActive: boolean
): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.coupon.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function deleteCouponAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.coupon.delete({ where: { id } });
  void logAudit({ action: "coupon.delete", entityType: "coupon", entityId: id });
  revalidatePath("/admin/coupons");
  return { ok: true };
}
