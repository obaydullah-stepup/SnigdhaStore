"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCouponAction, toggleCouponActiveAction } from "@/actions/admin/coupons";
import { Button } from "@/components/ui/button";

export function CouponRowActions({
  id,
  checked,
  checkedLabel,
  editHref,
}: {
  id: string;
  checked: boolean;
  checkedLabel: string;
  editHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function toggle() {
    startTransition(async () => {
      try {
        await toggleCouponActiveAction(id, !checked);
      } catch {
        toast.error("Action failed.");
      }
      router.refresh();
    });
  }

  function remove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    startTransition(async () => {
      try {
        const res = await deleteCouponAction(id);
        if (res.ok) toast.success("Coupon deleted.");
        else toast.error("Could not delete.");
      } catch {
        toast.error("Could not delete.");
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          checked={checked}
          onChange={toggle}
          disabled={isPending}
          className="size-3.5"
        />
        {checkedLabel}
      </label>
      <Link
        href={editHref}
        className="border-border text-muted-foreground hover:text-foreground rounded-md border p-1.5"
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Edit</span>
      </Link>
      <Button
        type="button"
        variant={confirming ? "destructive" : "ghost"}
        size="sm"
        onClick={remove}
        disabled={isPending}
        className="px-1.5"
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <>
            <Trash2 className="size-3.5" aria-hidden="true" />
            {confirming && <span className="text-[11px]">Sure?</span>}
          </>
        )}
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  );
}
