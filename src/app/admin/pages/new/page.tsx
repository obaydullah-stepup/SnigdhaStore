import { requireAdmin } from "@/lib/auth/guards";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { ContentPageForm } from "@/components/admin/content-page-form";

export const metadata = { title: "New page" };

export default async function NewContentPage() {
  const user = await requireAdmin();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumbs
          items={[{ label: "Admin", href: "/admin" }, { label: "Pages", href: "/admin/pages" }, { label: "New page" }]}
        />
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">New page</h1>
      </div>
      <div className="border-border bg-card max-w-2xl rounded-xl border p-6">
        <ContentPageForm canCreateLanding={user.role === "SUPER_ADMIN"} />
      </div>
    </div>
  );
}