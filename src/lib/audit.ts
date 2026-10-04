import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";

export type AuditAction =
  | "order.status"
  | "order.payment"
  | "order.note"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.duplicate"
  | "product.bulk"
  | "category.create"
  | "category.update"
  | "category.delete"
  | "coupon.create"
  | "coupon.update"
  | "coupon.delete"
  | "settings.update"
  | "inventory.adjust"
  | "inventory.threshold"
  | "page.create"
  | "page.update"
  | "page.delete"
  | "newsletter.delete"
  | "reminder.send"
  | "incomplete.convert"
  | "incomplete.dismiss"
  | "incomplete.details"
  | "review.approve"
  | "review.delete"
  | "shipping.create"
  | "shipping.update"
  | "shipping.delete"
  | "team.create"
  | "team.role"
  | "team.remove";

export async function logAudit(input: {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const actor = await getSessionUser();
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}