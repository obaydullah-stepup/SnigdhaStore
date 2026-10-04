"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveCouponAction } from "@/actions/admin/coupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function CouponForm({
  initial,
}: {
  initial?: {
    id: string;
    code: string;
    type: "PERCENTAGE" | "FIXED";
    value: number;
    minimumOrder: number;
    maximumDiscount: number | null;
    usageLimit: number | null;
    startsAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean;
  };
}) {
  const [state, formAction, isPending] = useActionState(saveCouponAction, { ok: false });

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state.error && (
        <p className="text-destructive rounded-md bg-red-50 p-3 text-sm" role="alert">
          {state.error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            name="code"
            defaultValue={initial?.code}
            placeholder="WELCOME10"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            defaultValue={initial?.type ?? "PERCENTAGE"}
            className="border-border bg-card w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed (BDT)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="value">Value</Label>
          <Input
            id="value"
            name="value"
            type="number"
            min={1}
            defaultValue={initial?.value ?? 10}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minimumOrder">Minimum order (BDT)</Label>
          <Input
            id="minimumOrder"
            name="minimumOrder"
            type="number"
            min={0}
            defaultValue={initial?.minimumOrder ?? 0}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maximumDiscount">Maximum discount (BDT, optional)</Label>
          <Input
            id="maximumDiscount"
            name="maximumDiscount"
            type="number"
            min={0}
            defaultValue={initial?.maximumDiscount ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="usageLimit">Usage limit (optional)</Label>
          <Input
            id="usageLimit"
            name="usageLimit"
            type="number"
            min={1}
            defaultValue={initial?.usageLimit ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startsAt">Valid from</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="date"
            defaultValue={toDateInputValue(initial?.startsAt ?? null)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expiresAt">Expires</Label>
          <Input
            id="expiresAt"
            name="expiresAt"
            type="date"
            defaultValue={toDateInputValue(initial?.expiresAt ?? null)}
          />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="size-4"
        />
        Active
      </label>
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {initial ? "Save changes" : "Create coupon"}
        </Button>
      </div>
    </form>
  );
}
