"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteProductAction,
  duplicateProductAction,
  setProductFeaturedAction,
  setProductPublishedAction,
} from "@/actions/admin/products";
import { Button } from "@/components/ui/button";

export function ProductRowActions({
  id,
  published,
  featured,
}: {
  id: string;
  published: boolean;
  featured: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function togglePublished() {
    startTransition(async () => {
      await setProductPublishedAction(id, !published);
      router.refresh();
    });
  }

  function toggleFeatured() {
    startTransition(async () => {
      await setProductFeaturedAction(id, !featured);
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
      await deleteProductAction(id);
      toast.success("Product deleted.");
      router.refresh();
    });
  }

  function duplicate() {
    startTransition(async () => {
      const result = await duplicateProductAction(id);
      if (result.ok && result.id) {
        toast.success("Product duplicated.");
        router.push(`/admin/products/${result.id}`);
      } else {
        toast.error("Failed to duplicate product.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          checked={published}
          onChange={togglePublished}
          disabled={isPending}
          className="size-3.5"
        />
        Published
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          checked={featured}
          onChange={toggleFeatured}
          disabled={isPending}
          className="size-3.5"
        />
        Featured
      </label>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={duplicate}
        disabled={isPending}
        className="px-1.5"
        aria-label="Duplicate product"
      >
        <Copy className="size-3.5" aria-hidden="true" />
      </Button>
      <Link
        href={`/admin/products/${id}`}
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
