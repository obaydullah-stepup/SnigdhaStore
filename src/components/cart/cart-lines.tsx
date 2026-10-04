"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Trash2, RefreshCcw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { CartSnapshotLine } from "@/lib/data/cart";
import {
  updateCartItemQuantityAction,
  removeCartItemAction,
  toggleSavedForLaterAction,
  type CartItemActionResult,
} from "@/actions/cart";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

type CartLinesProps = {
  active: CartSnapshotLine[];
  saved: CartSnapshotLine[];
};

type CartLineAction = (
  prev: CartItemActionResult | null,
  formData: FormData
) => Promise<CartItemActionResult>;

export function CartLines({ active, saved }: CartLinesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: CartLineAction, values: Record<string, string>) {
    startTransition(async () => {
      const formData = new FormData();
      for (const [k, v] of Object.entries(values)) formData.set(k, v);
      const res = await action(null, formData);
      if (!res.ok) {
        toast.error(res.message?.en ?? "Something went wrong.");
      }
      router.refresh();
    });
  }

  const changeQty = (id: string, quantity: number) =>
    run(updateCartItemQuantityAction, {
      itemId: id,
      quantity: String(Math.max(1, quantity)),
    });
  const remove = (id: string) => run(removeCartItemAction, { itemId: id });
  const toggleSaved = (id: string) => run(toggleSavedForLaterAction, { itemId: id });

  return (
    <div className="flex flex-col gap-6">
      <ul className="border-border bg-card divide-border flex flex-col divide-y rounded-xl border">
        {active.map((item) => (
          <li key={item.id} className="flex items-center gap-4 p-4 sm:gap-5">
            <Link
              href={`/product/${item.slug}`}
              className="bg-muted relative block aspect-square w-20 shrink-0 overflow-hidden rounded-lg"
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <ShoppingBag
                  className="text-muted-foreground size-6"
                  aria-hidden="true"
                />
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${item.slug}`}
                className="hover:text-primary line-clamp-2 text-sm font-medium"
              >
                {item.name}
              </Link>
              {item.variantName && (
                <p className="text-muted-foreground mt-0.5 text-xs">{item.variantName}</p>
              )}
              {!item.available && (
                <p className="text-destructive mt-1 text-xs font-medium">
                  This item is no longer available.
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="border-border inline-flex items-center rounded-lg border">
                  <button
                    type="button"
                    onClick={() => changeQty(item.id, item.quantity - 1)}
                    disabled={isPending || item.quantity <= 1}
                    className="hover:bg-muted px-2.5 py-1.5 disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span
                    role="status"
                    className="min-w-9 px-1 text-center text-sm font-medium tabular-nums"
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQty(item.id, item.quantity + 1)}
                    disabled={
                      isPending ||
                      (item.availableStock > 0 && item.quantity >= item.availableStock)
                    }
                    className="hover:bg-muted px-2.5 py-1.5 disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSaved(item.id)}
                  disabled={isPending}
                  className="hover:text-primary text-muted-foreground flex items-center gap-1 text-xs hover:underline"
                >
                  <RefreshCcw className="size-3.5" aria-hidden="true" />
                  Save for later
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={isPending}
                  className="hover:text-destructive text-muted-foreground flex items-center gap-1 text-xs hover:underline"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </div>

            <p className="shrink-0 text-sm font-semibold">
              {formatPrice(item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      {saved.length > 0 && (
        <section>
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">
            Saved for later
          </h2>
          <ul className="border-border bg-card divide-border mt-3 flex flex-col divide-y rounded-xl border">
            {saved.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <Link
                  href={`/product/${item.slug}`}
                  className="bg-muted relative block aspect-square w-16 shrink-0 overflow-hidden rounded-lg"
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <ShoppingBag
                      className="text-muted-foreground size-5"
                      aria-hidden="true"
                    />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.slug}`}
                    className="hover:text-primary line-clamp-2 text-sm font-medium"
                  >
                    {item.name}
                  </Link>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {formatPrice(item.price)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => toggleSaved(item.id)}
                  className="shrink-0"
                >
                  Move to cart
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isPending && (
        <p
          className="text-muted-foreground flex items-center gap-2 text-xs"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Updating…
        </p>
      )}
    </div>
  );
}
