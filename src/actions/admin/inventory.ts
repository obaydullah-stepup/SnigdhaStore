"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { LOW_STOCK_THRESHOLD_KEY } from "@/lib/inventory";
import { SETTINGS_CACHE_TAG } from "@/lib/settings";

const adjustSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  quantityChange: z.coerce
    .number()
    .int()
    .refine((v) => v !== 0, "Change cannot be zero."),
  reason: z.enum(["RESTOCK", "ADJUSTMENT", "ORDER", "RETURN"]),
  note: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => (v ? v : null)),
});

export type AdjustStockState = { ok: boolean; error?: string };

class InsufficientStockError extends Error {}

export async function adjustStockAction(
  prevState: AdjustStockState,
  formData: FormData
): Promise<AdjustStockState> {
  await requireStaff();
  const parsed = adjustSchema.safeParse({
    productId: formData.get("productId"),
    variantId: formData.get("variantId") || null,
    quantityChange: formData.get("quantityChange"),
    reason: formData.get("reason"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { productId, variantId, quantityChange, reason, note } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { select: { id: true, stock: true } } },
  });
  if (!product) return { ok: false, error: "Product not found." };

  const variant = variantId
    ? product.variants.find((v) => v.id === variantId)
    : undefined;
  if (variantId && !variant) return { ok: false, error: "Variant not found." };

  try {
    await prisma.$transaction(async (tx) => {
      // A conditional increment, not a precomputed absolute `stock` value.
      // The `gte` bound makes the floor check part of the same statement, so
      // two concurrent adjustments both apply instead of overwriting each
      // other, and stock cannot be driven negative by a stale read.
      const updated = variantId
        ? await tx.productVariant.updateMany({
            where: { id: variantId, stock: { gte: -quantityChange } },
            data: { stock: { increment: quantityChange } },
          })
        : await tx.product.updateMany({
            where: { id: productId, stock: { gte: -quantityChange } },
            data: { stock: { increment: quantityChange } },
          });

      if (updated.count !== 1) {
        throw new InsufficientStockError();
      }

      await tx.inventoryTransaction.create({
        data: { productId, variantId, quantityChange, reason, note },
      });
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { ok: false, error: "Stock cannot go below zero." };
    }
    throw error;
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/", "layout");
  void logAudit({
    action: "inventory.adjust",
    entityType: "product",
    entityId: productId,
    metadata: { variantId: variantId ?? null, quantityChange, reason },
  });
  return { ok: true };
}

const thresholdSchema = z.coerce.number().int().min(1).max(999);

export async function setLowStockThresholdAction(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  await requireStaff();
  const parsed = thresholdSchema.safeParse(formData.get("threshold"));
  if (!parsed.success) {
    return { ok: false, error: "Threshold must be a number between 1 and 999." };
  }

  const value = String(parsed.data);
  const existing = await prisma.setting.findUnique({
    where: { key: LOW_STOCK_THRESHOLD_KEY },
    select: { id: true },
  });

  if (existing) {
    await prisma.setting.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.setting.create({ data: { key: LOW_STOCK_THRESHOLD_KEY, value } });
  }

  revalidateTag(SETTINGS_CACHE_TAG, { expire: 0 });
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  void logAudit({
    action: "inventory.threshold",
    entityType: "setting",
    metadata: { threshold: parsed.data },
  });
  return { ok: true };
}
