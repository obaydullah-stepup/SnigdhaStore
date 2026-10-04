import Link from "next/link";
import { LogOut, TriangleAlert, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { logoutAction } from "@/actions/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { statusLabel, statusTone } from "@/lib/order-status";
import { Button } from "@/components/ui/button";
import { ResendVerifyButton } from "@/components/account/resend-verify-button";

export default async function AccountPage() {
  const user = await requireUser();

  const [
    orderCount,
    wishlistCount,
    reviewCount,
    totalSpent,
    recentOrder,
    defaultAddress,
  ] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
    prisma.review.count({ where: { userId: user.id } }),
    prisma.order.aggregate({ where: { userId: user.id }, _sum: { total: true } }),
    prisma.order.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
    }),
    prisma.address.findFirst({
      where: { userId: user.id, isDefault: true },
      select: {
        id: true,
        name: true,
        phone: true,
        addressLine: true,
        area: true,
        district: true,
        division: true,
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-border flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-3">
          <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-full">
            <UserRound className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-heading text-lg font-semibold">{user.name}</p>
            <p className="text-muted-foreground text-sm">
              {user.email}
              {!user.emailVerified ? " · email not verified" : ""}
            </p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">
            <LogOut className="mr-2 size-4" aria-hidden="true" />
            Sign out
          </Button>
        </form>
      </div>

      {!user.emailVerified && (
        <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm">
          <span className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-amber-500" aria-hidden="true" />
            Please verify your email to unlock order updates and reviews.
          </span>
          <ResendVerifyButton />
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border-border bg-card rounded-xl border p-4">
          <dt className="text-muted-foreground text-xs">Orders</dt>
          <dd className="font-heading mt-1 text-2xl font-semibold">{orderCount}</dd>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <dt className="text-muted-foreground text-xs">Total spent</dt>
          <dd className="font-heading mt-1 text-2xl font-semibold">
            {formatPrice(totalSpent._sum.total ?? 0)}
          </dd>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <dt className="text-muted-foreground text-xs">Wishlist items</dt>
          <dd className="font-heading mt-1 text-2xl font-semibold">{wishlistCount}</dd>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <dt className="text-muted-foreground text-xs">Reviews</dt>
          <dd className="font-heading mt-1 text-2xl font-semibold">{reviewCount}</dd>
        </div>
      </dl>

      <section className="border-border bg-card rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Latest order
          </h2>
          {orderCount > 0 && (
            <Link href="/account/orders" className="text-primary text-sm hover:underline">
              View all
            </Link>
          )}
        </div>
        {recentOrder ? (
          <Link
            href={`/account/orders/${recentOrder.id}`}
            className="mt-3 flex items-center justify-between gap-4 text-sm"
          >
            <span className="font-mono font-medium">{recentOrder.orderNumber}</span>
            <span className="text-muted-foreground hidden sm:block">
              {recentOrder.createdAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="font-semibold">{formatPrice(recentOrder.total)}</span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(recentOrder.status)}`}
            >
              {statusLabel(recentOrder.status)}
            </span>
          </Link>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">
            You haven&apos;t placed an order yet.{" "}
            <Link href="/shop" className="text-primary hover:underline">
              Start shopping
            </Link>
          </p>
        )}
      </section>

      <section className="border-border bg-card rounded-xl border p-5">
        <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
          Default address
        </h2>
        {defaultAddress ? (
          <div className="mt-3 text-sm">
            <p className="font-medium">{defaultAddress.name}</p>
            <p className="text-muted-foreground">
              {defaultAddress.addressLine}, {defaultAddress.area},{" "}
              {defaultAddress.district}, {defaultAddress.division}
            </p>
            <Link
              href="/account/addresses"
              className="text-primary mt-2 inline-block text-sm hover:underline"
            >
              Manage addresses
            </Link>
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">
            No default address set.{" "}
            <Link href="/account/addresses" className="text-primary hover:underline">
              Add one
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
