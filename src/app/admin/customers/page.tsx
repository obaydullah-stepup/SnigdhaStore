import Link from "next/link";
import { Search } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Customers" };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const perPage = 20;

  const where = q
    ? {
        role: "CUSTOMER" as const,
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : { role: "CUSTOMER" as const };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: { select: { total: true } },
      },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Breadcrumbs
          items={[{ label: "Admin", href: "/admin" }, { label: "Customers" }]}
        />
        <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
          Customers{" "}
          <span className="text-muted-foreground text-base font-normal">({total})</span>
        </h1>
      </div>

      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-3 lg:flex-row lg:items-center">
        <form action="/admin/customers" className="relative flex-1">
          <Search
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, email or phone…"
            className="pl-9"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="border-border flex items-center justify-center rounded-xl border border-dashed px-6 py-16">
          <p className="text-muted-foreground text-sm">No customers found.</p>
        </div>
      ) : (
        <div className="border-border bg-card overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left text-xs uppercase">
                <th className="p-3 font-medium">Customer</th>
                <th className="hidden p-3 font-medium md:table-cell">Joined</th>
                <th className="p-3 text-center font-medium">Orders</th>
                <th className="hidden p-3 text-right font-medium sm:table-cell">
                  Total spent
                </th>
                <th className="p-3 text-right font-medium">View</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const spent = c.orders.reduce((sum, o) => sum + o.total, 0);
                return (
                  <tr key={c.id} className="border-border/60 border-t">
                    <td className="p-3">
                      <span className="block font-medium">{c.name ?? "Unnamed"}</span>
                      <span className="text-muted-foreground block text-xs">
                        {c.email}
                      </span>
                      {c.phone && (
                        <span className="text-muted-foreground block text-xs">
                          {c.phone}
                        </span>
                      )}
                    </td>
                    <td className="text-muted-foreground hidden p-3 md:table-cell">
                      {c.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3 text-center">{c._count.orders}</td>
                    <td className="hidden p-3 text-right font-semibold sm:table-cell">
                      {formatPrice(spent)}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: Math.min(pageCount, 10) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/customers?q=${encodeURIComponent(q ?? "")}&page=${p === 1 ? "" : p}`}
              className={`flex size-9 items-center justify-center rounded-md text-sm font-medium ${
                page === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
