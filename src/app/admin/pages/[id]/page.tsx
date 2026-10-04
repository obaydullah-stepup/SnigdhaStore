import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ContentPageForm } from "@/components/admin/content-page-form";

export const metadata = { title: "Edit page" };

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  const page = await prisma.contentPage.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      content: true,
      html: true,
      css: true,
      js: true,
      useTailwindCdn: true,
    },
  });
  if (!page) notFound();

  // Editing landing markup (and especially its JS) is super-admin only. Text
  // pages stay editable by any admin.
  if (page.type === "LANDING" && user.role !== "SUPER_ADMIN") notFound();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Pages", href: "/admin/pages" },
            { label: "Edit" },
          ]}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {page.title}
          </h1>
          <Button
            variant="outline"
            render={
              <Link href={`/pages/${page.slug}`} target="_blank" rel="noreferrer" />
            }
          >
            <Eye className="size-4" aria-hidden="true" />
            Preview page
          </Button>
        </div>
      </div>
      <div className="border-border bg-card max-w-2xl rounded-xl border p-6">
        <ContentPageForm
          id={page.id}
          canCreateLanding={user.role === "SUPER_ADMIN"}
          initial={{
            slug: page.slug,
            title: page.title,
            type: page.type,
            content: page.content,
            html: page.html ?? "",
            css: page.css ?? "",
            js: page.js ?? "",
            useTailwindCdn: page.useTailwindCdn,
          }}
        />
      </div>
      <div>
        <Link
          href={`/pages/${page.slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-primary text-sm font-medium hover:underline"
        >
          View live page →
        </Link>
      </div>
    </div>
  );
}
