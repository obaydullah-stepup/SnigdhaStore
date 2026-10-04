import Link from "next/link";
import { Package } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { statusLabel, statusTone } from "@/lib/order-status";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { Button } from "@/components/ui/button";

export const metadata = { title: "My orders" };

export default async function OrdersPage() {
  const user = await requireUser();

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Account", href: "/account" }, { label: "Orders" }]}
      />
      <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight">
        My orders
      </h1>

      {orders.length === 0 ? (
        <div className="border-border mt-8 flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <Package className="text-muted-foreground size-10" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">No orders yet</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              When you place an order it will show up here with live status tracking.
            </p>
          </div>
          <Link href="/shop">
            <Button variant="secondary">Explore the shop</Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.id}`}
                className="border-border bg-card hover:border-primary/50 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold">{order.orderNumber}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {order.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    {order._count.items} item{order._count.items !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatPrice(order.total)}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(order.status)}`}
                  >
                    {statusLabel(order.status)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
