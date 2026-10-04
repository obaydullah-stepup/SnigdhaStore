"use client";

import { useActionState, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { submitReviewAction } from "@/actions/reviews";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReviewForm({
  productId,
  orderId,
}: {
  productId: string;
  orderId?: string;
}) {
  const [rating, setRating] = useState(0);
  const [state, formAction, isPending] = useActionState(submitReviewAction, {
    ok: false,
  });

  return (
    <form
      action={formAction}
      noValidate
      className="border-border bg-card rounded-xl border p-5"
    >
      <input type="hidden" name="productId" value={productId} />
      {orderId && <input type="hidden" name="orderId" value={orderId} />}
      <input type="hidden" name="rating" value={rating} />

      <Label htmlFor="rating" className="text-sm">
        Your rating
      </Label>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value !== 1 ? "s" : ""}`}
            onClick={() => setRating(value)}
            className={cn(
              "flex size-9 items-center justify-center rounded-md text-2xl transition-colors",
              value <= rating
                ? "text-amber-500"
                : "text-muted-foreground/30 hover:text-amber-400"
            )}
          >
            ★
          </button>
        ))}
      </div>
      {state.fieldErrors?.rating && (
        <p className="text-destructive mt-1 text-xs">{state.fieldErrors.rating.en}</p>
      )}

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="title">Summary (optional)</Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Beautiful craftsmanship"
          aria-invalid={!!state.fieldErrors?.title}
        />
        {state.fieldErrors?.title && (
          <p className="text-destructive text-xs">{state.fieldErrors.title.en}</p>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="comment">Your review</Label>
        <Textarea
          id="comment"
          name="comment"
          rows={4}
          placeholder="Share your experience with this product..."
          aria-invalid={!!state.fieldErrors?.comment}
        />
        {state.fieldErrors?.comment && (
          <p className="text-destructive text-xs">{state.fieldErrors.comment.en}</p>
        )}
      </div>

      {state.error && (
        <p
          className="text-destructive mt-4 rounded-md bg-red-50 p-3 text-sm"
          role="alert"
        >
          {state.error.en}
        </p>
      )}

      <div className="mt-5">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          <Send className="size-4" aria-hidden="true" />
          Submit review
        </Button>
        <p className="text-muted-foreground mt-2 text-xs">
          Reviews appear after approval by our team.
        </p>
      </div>
    </form>
  );
}
