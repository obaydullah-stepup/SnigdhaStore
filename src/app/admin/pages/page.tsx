import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import {
  ContentPageRowActions,
  DefaultPagesButton,
} from "@/components/admin/content-page-row-actions";

export const metadata = { title: "Pages" };

export default async function AdminPagesPage() {
  await requireAdmin();
  const pages = await prisma.contentPage.findMany({
    select: { id: true, slug: true, title: true, type: true, updatedAt: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Pages" }]} />
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
            Pages
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Static info pages like About, Contact and FAQ, plus custom landing pages. Live
            at /pages/&lt;slug&gt;.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DefaultPagesButton />
          <Link
            href="/admin/pages/new"
            className="border-border bg-card hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
          >
            <Plus className="size-4" aria-hidden="true" />
            New page
          </Link>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="border-border flex items-center justify-center rounded-xl border border-dashed px-6 py-16">
          <p className="text-muted-foreground text-sm">
            No pages yet. Create your first one.
          </p>
        </div>
      ) : (
        <div className="border-border bg-card rounded-xl border">
          <ul className="divide-border divide-y">
            {pages.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {p.title}
                    <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                      {p.type === "LANDING" ? "Landing" : "Text"}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    <span className="font-mono">/pages/{p.slug}</span> · Updated{" "}
                    {p.updatedAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <ContentPageRowActions
                  id={p.id}
                  href={`/admin/pages/${p.id}`}
                  viewHref={`/pages/${p.slug}`}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
