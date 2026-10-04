import "server-only";
import { prisma } from "@/lib/prisma";

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "order.status": "Order status changed",
  "order.payment": "Payment status changed",
  "order.note": "Internal note saved",
  "product.create": "Product created",
  "product.update": "Product updated",
  "product.delete": "Product deleted",
  "product.duplicate": "Product duplicated",
  "product.bulk": "Bulk product action",
  "category.create": "Category created",
  "category.update": "Category updated",
  "category.delete": "Category deleted",
  "coupon.create": "Coupon created",
  "coupon.update": "Coupon updated",
  "coupon.delete": "Coupon deleted",
  "settings.update": "Settings updated",
  "inventory.adjust": "Stock adjusted",
  "inventory.threshold": "Low-stock threshold changed",
  "page.create": "Page created",
  "page.update": "Page updated",
  "page.delete": "Page deleted",
  "newsletter.delete": "Newsletter subscriber removed",
  "reminder.send": "Abandoned cart reminder sent",
  "incomplete.convert": "Incomplete order converted to order",
  "incomplete.dismiss": "Incomplete order dismissed",
  "incomplete.details": "Incomplete order details updated",
  "review.approve": "Review approved/unapproved",
  "review.delete": "Review deleted",
  "shipping.create": "Shipping zone created",
  "shipping.update": "Shipping zone updated",
  "shipping.delete": "Shipping zone deleted",
  "team.create": "Team member added",
  "team.role": "Team member role changed",
  "team.remove": "Team member removed",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/\./g, " ");
}

export async function getAuditLogs(limit = 250) {
  return prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
}