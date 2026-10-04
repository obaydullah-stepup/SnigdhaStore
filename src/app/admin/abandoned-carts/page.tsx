import { ShoppingCart } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { formatPrice } from "@/lib/utils";
import { getAbandonedCarts, ABANDONED_AFTER_MS } from "@/lib/data/admin/abandoned-carts";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import {
  CartReminderButton,
  SendAllRemindersButton,
} from "@/components/admin/cart-reminder-buttons";

export const metadata = { title: "Abandoned carts" };

export default async function AdminAbandonedCartsPage() {
  await requireAdmin();

  const carts = await getAbandonedCarts();
  const totalValue = carts.reduce((sum, cart) => sum + cart.subtotal, 0);
  const hours = Math.round(ABANDONED_AFTER_MS / (60 * 60 * 1000));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Breadcrumbs
            items={[{ label: "Admin", href: "/admin" }, { label: "Abandoned carts" }]}
          />
          <h1 className="font-heading mt-2 text-2xl font-semibold tracking-tight">
            Abandoned carts
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {carts.length} cart{carts.length === 1 ? "" : "s"} inactive for {hours}h+ with items ·
            {carts.length === 0 ? " " : " worth "}
            {carts.length === 0 ? "No recoverable value right now." : formatPrice(totalValue)}
          </p>
        </div>
        {carts.length > 0 && <SendAllRemindersButton />}
      </div>

      {carts.length === 0 ? (
        <div className="border-border flex items-center justify-center rounded-xl border border-dashed px-6 py-16">
          <p className="text-muted-foreground text-sm">
            No abandoned carts due for a reminder right now.
          </p>
        </div>
      ) : (
        <div className="border-border bg-card rounded-xl border">
          <ul className="divide-border divide-y">
            {carts.map((cart) => (
              <li key={cart.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="border-border bg-muted flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <ShoppingCart className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{cart.customerName}</p>
                    <p className="text-muted-foreground text-xs">{cart.customerEmail}</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted-foreground">
                    {cart.items.map((item) => item.productName).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{cart.itemCount} items · {formatPrice(cart.subtotal)}</span>
                  <span>
                    Last active{" "}
                    {cart.updatedAt.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {cart.reminderCount > 0
                      ? ` · reminded ×${cart.reminderCount}`
                      : ""}
                  </span>
                </div>
                <CartReminderButton id={cart.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}