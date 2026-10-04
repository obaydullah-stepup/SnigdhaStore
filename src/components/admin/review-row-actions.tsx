"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteReviewAction, setReviewApprovedAction } from "@/actions/admin/reviews";
import { Button } from "@/components/ui/button";

export function ReviewRowActions({ id, approved }: { id: string; approved: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function approve() {
    startTransition(async () => {
      await setReviewApprovedAction(id, true);
      toast.success("Review approved.");
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
      await deleteReviewAction(id);
      toast.success("Review deleted.");
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-2">
      {!approved && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={approve}
          disabled={isPending}
        >
          <Check className="size-3.5" aria-hidden="true" />
          Approve
        </Button>
      )}
      <Button
        type="button"
        variant={confirming ? "destructive" : "ghost"}
        size="sm"
        onClick={remove}
        disabled={isPending}
        className="px-2"
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
