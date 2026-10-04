"use client";

import { useTransition } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { moveWishlistToCartAction, toggleWishlistAction } from "@/actions/cart";
import { Button } from "@/components/ui/button";

export function WishlistActions({
  productId,
  variantId,
}: {
  productId: string;
  variantId?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleMove() {
    startTransition(async () => {
      const res = await moveWishlistToCartAction(productId, variantId);
      if (res.ok) {
        toast.success("Moved to your cart.");
      } else if (res.needsLogin) {
        router.push("/login?next=/account/wishlist");
      } else {
        toast.error(res.message?.en ?? "Something went wrong.");
      }
      router.refresh();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("productId", productId);
      await toggleWishlistAction(null, fd);
      router.refresh();
      toast.info("Removed from wishlist.");
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" onClick={handleMove} disabled={isPending}>
        <ShoppingCart className="size-4" aria-hidden="true" />
        Move to cart
      </Button>
      <Button size="sm" variant="ghost" onClick={handleRemove} disabled={isPending}>
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
