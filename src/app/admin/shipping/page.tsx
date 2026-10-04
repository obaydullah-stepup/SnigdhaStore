import Link from "next/link";
import { Pencil, Plus, Truck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { ShippingZoneForm, ZoneRowActions } from "@/components/admin/shipping-zones";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Shipping zones" };

export default async function AdminShippingPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const zones = await prisma.shippingZone.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const editing = sp.edit ? zones.find((z) => z.id === sp.edit) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Shipping" }]} />
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
          Shipping zones
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Set division-based delivery fees. The fee is picked by the customer&apos;s
          division at checkout; if no zone matches, the global settings fee is used.
        </p>
      </div>

      <div className="border-border bg-card rounded-xl border">
        <ul className="divide-border divide-y">
          {zones.map((zone) => (
            <li
              key={zone.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 px-5 py-4",
                !zone.isActive && "opacity-60"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="border-border bg-muted flex size-9 shrink-0 items-center justify-center rounded-full border">
                  <Truck className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {zone.name}
                    {zone.matchesAll && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        All divisions
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground line-clamp-1 text-xs">
                    {zone.description ?? zone.divisions.join(", ")}
                  </p>
                </div>
              </div>
              <div className="text-muted-foreground shrink-0 text-xs">
                std {zone.standardFee} · exp {zone.expressFee}
                {zone.freeShippingThreshold != null
                  ? ` · free ≥ ${zone.freeShippingThreshold}`
                  : ""}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/admin/shipping?edit=${zone.id}`}
                  className="border-border text-muted-foreground hover:text-foreground rounded-md border p-1.5"
                  aria-label={`Edit ${zone.name}`}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </Link>
                <ZoneRowActions
                  id={zone.id}
                  isActive={zone.isActive}
                  canDelete={zones.length > 1}
                />
              </div>
            </li>
          ))}
          {zones.length === 0 && (
            <li className="text-muted-foreground px-5 py-6 text-sm">
              No zones yet — add one to override global fees per division.
            </li>
          )}
        </ul>
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <ShippingZoneForm zone={editing} />
          <Link href="/admin/shipping">
            <Button variant="secondary">
              <Plus className="size-4" aria-hidden="true" />
              Add another zone
            </Button>
          </Link>
        </div>
      ) : (
        <ShippingZoneForm />
      )}
    </div>
  );
}