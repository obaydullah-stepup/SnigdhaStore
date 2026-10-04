import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminRouteProgress } from "@/components/admin/admin-route-progress";
import { getCachedStoreName } from "@/lib/settings";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  const storeName = await getCachedStoreName();

  return (
    <div className="bg-background min-h-screen">
      <div className="border-border bg-card sticky top-0 z-20 border-b">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <span className="font-heading text-primary text-base font-semibold">
              {storeName} Admin
            </span>
          </div>
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-sm font-medium"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">View store</span>
          </Link>
        </div>
        <AdminRouteProgress />
      </div>

      <div className="mx-auto max-w-7xl md:flex md:gap-6">
        <aside className="md:w-48 md:shrink-0">
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
