import { ScrollText } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { getAuditLogs, auditActionLabel } from "@/lib/data/admin/audit-log";
import { Breadcrumbs } from "@/components/product/breadcrumbs";

export const metadata = { title: "Audit log" };

export default async function AdminAuditLogPage() {
  await requireAdmin();
  const logs = await getAuditLogs();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Audit log" }]} />
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The {logs.length} most recent actions taken by team members.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="border-border flex items-center justify-center rounded-xl border border-dashed px-6 py-16">
          <p className="text-muted-foreground text-sm">No recorded actions yet.</p>
        </div>
      ) : (
        <div className="border-border bg-card overflow-x-auto rounded-xl border">
          <ul className="divide-border divide-y">
            {logs.map((log) => {
              const meta = log.metadata as Record<string, unknown> | null;
              return (
                <li key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="border-border bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border">
                    <ScrollText className="size-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{auditActionLabel(log.action)}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {log.actor ? log.actor.email : "System"}
                      {log.entityId ? ` · ${log.entityType}:${log.entityId}` : ` · ${log.entityType}`}
                      {meta && Object.keys(meta).length > 0
                        ? ` · ${JSON.stringify(meta)}`
                        : ""}
                    </p>
                  </div>
                  <p className="text-muted-foreground shrink-0 text-xs">
                    {log.createdAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}