import type { Role } from "@/generated/prisma/client";

export const ROLE_HIERARCHY: Record<Role, number> = {
  CUSTOMER: 1,
  STAFF: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function isAllowedRole(userRole: Role, required: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required];
}

export function safeRedirectPath(target: string | null | undefined): string {
  if (!target) return "/";
  if (!target.startsWith("/") || target.startsWith("//")) return "/";
  return target;
}
