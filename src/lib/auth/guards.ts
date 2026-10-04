import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/session";
import { isAllowedRole } from "@/lib/auth/utils";
import type { Role } from "@/generated/prisma/client";

export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(required: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isAllowedRole(user.role, required)) notFound();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("ADMIN");
}

export async function requireStaff(): Promise<SessionUser> {
  return requireRole("STAFF");
}
