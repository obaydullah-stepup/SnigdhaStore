"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteReviewAction } from "@/actions/reviews";
import { Button } from "@/components/ui/button";

export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function remove() {
    startTransition(async () => {
      await deleteReviewAction(reviewId);
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" aria-hidden="true" />
        Remove
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs">Are you sure?</span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={remove}
        disabled={isPending}
      >
        {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
        Confirm
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </span>
  );
}
