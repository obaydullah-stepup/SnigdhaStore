"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";

const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  email: z.string().trim().toLowerCase().email("A valid email is required."),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : null)),
  role: z.enum(["STAFF", "ADMIN"]),
  password: z.string().min(8, "Password must be at least 8 characters.").max(100),
});

export type TeamActionResult = { ok: boolean; error?: string };

export async function createTeamMemberAction(
  formData: FormData
): Promise<TeamActionResult> {
  await requireAdmin();
  const parsed = createTeamSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role") === "ADMIN" ? "ADMIN" : "STAFF",
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true },
  });
  if (existing) {
    return { ok: false, error: `A user already exists for ${parsed.data.email}.` };
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
      emailVerified: new Date(),
    },
  });

  void logAudit({
    action: "team.create",
    entityType: "user",
    entityId: user.id,
    metadata: { email: user.email, role: parsed.data.role },
  });
  revalidatePath("/admin/team");
  return { ok: true };
}

const roleSchema = z.enum(["STAFF", "ADMIN"]);

export async function setTeamMemberRoleAction(
  id: string,
  role: Role
): Promise<TeamActionResult> {
  await requireAdmin();
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return { ok: false, error: "Invalid role." };

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true } });
  if (!target) return { ok: false, error: "User not found." };

  await prisma.user.update({ where: { id }, data: { role: parsed.data } });

  void logAudit({
    action: "team.role",
    entityType: "user",
    entityId: id,
    metadata: { email: target.email, role: parsed.data },
  });
  revalidatePath("/admin/team");
  return { ok: true };
}

export async function removeTeamMemberAction(id: string): Promise<TeamActionResult> {
  await requireAdmin();
  const target = await prisma.user.findUnique({
    where: { id },
    select: { email: true, role: true },
  });
  if (!target) return { ok: false, error: "User not found." };
  if (target.role === "CUSTOMER")
    return { ok: false, error: "This user is not a team member." };

  await prisma.user.update({ where: { id }, data: { role: "CUSTOMER" } });

  void logAudit({
    action: "team.remove",
    entityType: "user",
    entityId: id,
    metadata: { email: target.email, previousRole: target.role },
  });
  revalidatePath("/admin/team");
  return { ok: true };
}