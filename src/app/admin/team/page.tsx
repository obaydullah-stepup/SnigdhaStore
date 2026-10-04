import { UserRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { InviteTeamForm, TeamMemberActions } from "@/components/admin/team-manage";

export const metadata = { title: "Team" };

const ROLE_LABELS: Record<string, string> = {
  STAFF: "Staff",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};

export default async function AdminTeamPage() {
  await requireAdmin();
  const me = await getSessionUser();

  const members = await prisma.user.findMany({
    where: { role: { in: ["STAFF", "ADMIN", "SUPER_ADMIN"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Team" }]} />
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {members.length} member{members.length === 1 ? "" : "s"} with admin access.
          Staff can manage orders, products, inventory and reviews; admins get full access.
        </p>
      </div>

      <div className="border-border bg-card rounded-xl border">
        <ul className="divide-border divide-y">
          {members.map((m) => {
            const isSelf = m.id === me?.id;
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="border-border bg-muted flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <UserRound className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.name}
                      {isSelf && (
                        <span className="text-muted-foreground ml-2 text-xs font-normal">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {m.email} · {ROLE_LABELS[m.role] ?? m.role}
                    </p>
                  </div>
                </div>
                {m.role === "SUPER_ADMIN" ? (
                  <span className="text-muted-foreground text-xs">Super admin</span>
                ) : (
                  <TeamMemberActions id={m.id} role={m.role} isSelf={isSelf} />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <InviteTeamForm />
    </div>
  );
}