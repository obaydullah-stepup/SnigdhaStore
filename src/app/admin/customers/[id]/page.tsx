import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { statusLabel, statusTone } from "@/lib/order-status";
import { Breadcrumbs } from "@/components/product/breadcrumbs";

export const metadata = { title: "Customer" };

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      orders: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { items: true } } },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { product: { select: { name: true, slug: true } } },
      },
    },
  });
  if (!user) notFound();

  const totalSpent = user.orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Customers", href: "/admin/customers" },
          { label: user.name ?? user.email },
        ]}
      />
      <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
        {user.name ?? "Unnamed customer"}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {user.email}
        {user.phone ? ` · ${user.phone}` : ""} · joined{" "}
        {user.createdAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Orders ({user.orders.length})
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {user.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-mono text-xs font-semibold hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {o.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    · {o._count.items} items
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatPrice(o.total)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(o.status)}`}
                  >
                    {statusLabel(o.status)}
                  </span>
                </div>
              </li>
            ))}
            {user.orders.length === 0 && (
              <p className="text-muted-foreground text-sm">No orders yet.</p>
            )}
          </ul>
          <p className="border-border mt-4 border-t pt-3 text-sm">
            Total spent: <span className="font-semibold">{formatPrice(totalSpent)}</span>
          </p>
        </section>

        <div className="flex flex-col gap-6">
          <section className="border-border bg-card rounded-xl border p-5">
            <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
              Addresses ({user.addresses.length})
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {user.addresses.map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="font-medium">
                    {a.name} · {a.phone}
                    {a.isDefault && (
                      <span className="text-primary ml-2 text-xs font-normal">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {a.addressLine}, {a.area}, {a.district}, {a.division}
                    {a.postalCode ? ` · ${a.postalCode}` : ""}
                  </p>
                </li>
              ))}
              {user.addresses.length === 0 && (
                <p className="text-muted-foreground text-sm">No saved addresses.</p>
              )}
            </ul>
          </section>

          <section className="border-border bg-card rounded-xl border p-5">
            <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
              Reviews ({user.reviews.length})
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {user.reviews.map((r) => (
                <li key={r.id} className="text-sm">
                  <p>
                    <span className="text-amber-500">{"★".repeat(r.rating)}</span>{" "}
                    <Link
                      href={`/product/${r.product.slug}`}
                      className="text-primary hover:underline"
                    >
                      {r.product.name}
                    </Link>
                  </p>
                  <p className="text-muted-foreground text-xs">{r.comment}</p>
                </li>
              ))}
              {user.reviews.length === 0 && (
                <p className="text-muted-foreground text-sm">No reviews.</p>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
