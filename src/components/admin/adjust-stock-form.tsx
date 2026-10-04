"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { adjustStockAction } from "@/actions/admin/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AdjustStockForm({
  productId,
  variants,
}: {
  productId: string;
  variants: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(adjustStockAction, { ok: false });
  const hasVariants = variants.length > 0;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-2">
      <input type="hidden" name="productId" value={productId} />
      {state.error && (
        <p
          className="text-destructive rounded-md bg-red-50 px-3 py-2 text-xs"
          role="alert"
        >
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {hasVariants ? (
          <select
            name="variantId"
            defaultValue={variants[0].id}
            className="border-border bg-card rounded-md border px-2 py-1.5 text-xs"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        ) : (
          <input type="hidden" name="variantId" value="" />
        )}
        <Input
          name="quantityChange"
          type="number"
          placeholder={hasVariants ? "Variant qty change" : "Qty change"}
          className="h-8 w-24 text-xs"
          aria-label="Quantity change"
        />
        <select
          name="reason"
          defaultValue="ADJUSTMENT"
          className="border-border bg-card rounded-md border px-2 py-1.5 text-xs"
        >
          <option value="RESTOCK">Restock</option>
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="RETURN">Return</option>
        </select>
        <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
      <Input name="note" placeholder="Note (optional)" className="h-8 text-xs" />
    </form>
  );
}

export function StockBadge({ stock, threshold = 5 }: { stock: number; threshold?: number }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
        stock === 0
          ? "bg-red-100 text-red-700"
          : stock <= threshold
            ? "bg-amber-100 text-amber-700"
            : "bg-emerald-100 text-emerald-700"
      )}
    >
      {stock} in stock
    </span>
  );
}
