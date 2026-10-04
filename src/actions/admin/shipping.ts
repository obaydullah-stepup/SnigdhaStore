"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";

const zoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Zone name is required.").max(80),
  description: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? v : null)),
  divisions: z
    .array(z.string().trim().min(1))
    .optional()
    .transform((v) => v ?? []),
  standardFee: z.coerce.number("Enter a valid fee.").int().min(0, "Fee cannot be negative."),
  expressFee: z.coerce.number("Enter a valid fee.").int().min(0, "Fee cannot be negative."),
  freeShippingThreshold: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .transform((v) => (v ? v : null)),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type ShippingZoneFormState = { ok: boolean; error?: string };

export async function saveShippingZoneAction(
  _prev: ShippingZoneFormState,
  formData: FormData
): Promise<ShippingZoneFormState> {
  await requireAdmin();

  const rawDivisions = formData.getAll("divisions").map((v) => String(v).trim());
  const parsed = zoneSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    divisions: rawDivisions,
    standardFee: formData.get("standardFee"),
    expressFee: formData.get("expressFee"),
    freeShippingThreshold: formData.get("freeShippingThreshold"),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { id, ...data } = parsed.data;
  const isActive = formData.get("isActive") === "on";
  const matchesAll = formData.get("matchesAll") === "on";

  if (!matchesAll && data.divisions.length === 0) {
    return { ok: false, error: "Select at least one division, or enable “All divisions”." };
  }

  if (id) {
    await prisma.shippingZone.update({
      where: { id },
      data: { ...data, divisions: data.divisions, matchesAll, isActive },
    });
  } else {
    await prisma.shippingZone.create({
      data: { ...data, divisions: data.divisions, matchesAll, isActive },
    });
  }

  revalidateTag("shipping-zones", { expire: 0 });
  revalidatePath("/admin/shipping");
  void logAudit({
    action: id ? "shipping.update" : "shipping.create",
    entityType: "shipping_zone",
    entityId: id,
    metadata: { name: data.name, matchesAll },
  });
  return { ok: true };
}

export async function toggleShippingZoneActiveAction(
  id: string,
  isActive: boolean
): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.shippingZone.update({ where: { id }, data: { isActive } });
  revalidateTag("shipping-zones", { expire: 0 });
  revalidatePath("/admin/shipping");
  return { ok: true };
}

export async function deleteShippingZoneAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const zone = await prisma.shippingZone.findUnique({
    where: { id },
    select: { name: true },
  });
  await prisma.shippingZone.delete({ where: { id } });
  revalidateTag("shipping-zones", { expire: 0 });
  revalidatePath("/admin/shipping");
  void logAudit({
    action: "shipping.delete",
    entityType: "shipping_zone",
    entityId: id,
    metadata: { name: zone?.name },
  });
  return { ok: true };
}