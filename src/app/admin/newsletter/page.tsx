import Link from "next/link";
import { Download, Mail } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { SubscriberRowActions } from "@/components/admin/subscriber-row-actions";

export const metadata = { title: "Newsletter" };

export default async function AdminNewsletterPage() {
  await requireAdmin();

  const [subscribers, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      select: { id: true, email: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.newsletterSubscriber.count(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Newsletter" }]} />
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
            Newsletter subscribers
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {total} {total === 1 ? "person" : "people"} subscribed.
          </p>
        </div>
        <Link
          href="/admin/newsletter/export"
          className="border-border bg-card hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
        >
          <Download className="size-4" aria-hidden="true" />
          Export CSV
        </Link>
      </div>

      {subscribers.length === 0 ? (
        <div className="border-border flex items-center justify-center rounded-xl border border-dashed px-6 py-16">
          <p className="text-muted-foreground text-sm">No subscribers yet.</p>
        </div>
      ) : (
        <div className="border-border bg-card rounded-xl border">
          <ul className="divide-border divide-y">
            {subscribers.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="border-border bg-muted flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <Mail className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.email}</p>
                    <p className="text-muted-foreground text-xs">
                      Subscribed{" "}
                      {s.createdAt.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <SubscriberRowActions id={s.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}