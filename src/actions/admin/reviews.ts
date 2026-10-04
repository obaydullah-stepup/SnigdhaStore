"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";

export async function setReviewApprovedAction(
  id: string,
  approved: boolean
): Promise<{ ok: boolean }> {
  await requireStaff();
  await prisma.review.update({ where: { id }, data: { isApproved: approved } });
  void logAudit({
    action: "review.approve",
    entityType: "review",
    entityId: id,
    metadata: { approved },
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteReviewAction(id: string): Promise<{ ok: boolean }> {
  await requireStaff();
  await prisma.review.delete({ where: { id } });
  void logAudit({ action: "review.delete", entityType: "review", entityId: id });
  revalidatePath("/admin/reviews");
  revalidatePath("/", "layout");
  return { ok: true };
}
