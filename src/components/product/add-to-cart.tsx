"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart, Loader2, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { addToCartAction, toggleWishlistAction } from "@/actions/cart";
import { trackAnalytics } from "@/components/analytics/analytics";
import { useIntl } from "@/components/i18n/locale-provider";

type VariantOption = {
  id: string;
  name: string;
  price: number | null;
  stock: number;
};

export function AddToCart({
  productId,
  productName,
  productStock,
  productPrice,
  variants,
}: {
  productId: string;
  productName: string;
  productStock: number;
  productPrice: number;
  variants: VariantOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useIntl();
  const [isPending, startTransition] = useTransition();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants.length > 0 ? (variants[0]?.id ?? null) : null
  );
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
  const unitPrice = selectedVariant?.price ?? productPrice;
  const stock = selectedVariant
    ? selectedVariant.stock > 0
      ? selectedVariant.stock
      : productStock
    : productStock;
  const soldOut = stock <= 0;
  const inStock = stock > 0;

  function buildFormData(): FormData {
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("variantId", selectedVariantId ?? "");
    formData.append("quantity", String(quantity));
    return formData;
  }

  function handleAdd(mode: "cart" | "now") {
    if (soldOut) return;
    startTransition(async () => {
      const result = await addToCartAction(null, buildFormData());
      if (result.ok) {
        trackAnalytics("add_to_cart", {
          currency: "BDT",
          value: unitPrice * quantity,
          items: [
            {
              item_id: productId,
              item_name: productName,
              price: unitPrice,
              quantity,
            },
          ],
        });
        if (mode === "now") {
          router.push("/cart");
          return;
        }
        router.refresh();
        toast.success(result.message?.en ?? t("addToCart.added"));
      } else {
        toast.error(result.message?.en ?? t("addToCart.addError"));
      }
    });
  }

  function handleWishlist() {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("productId", productId);
      formData.append("variantId", selectedVariantId ?? "");
      const result = await toggleWishlistAction(null, formData);
      if (result.needsLogin) {
        toast(t("addToCart.loginWishlist"));
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (result.ok) {
        toast.success(
          result.added ? t("addToCart.wishlistAdded") : t("addToCart.wishlistRemoved")
        );
        if (result.added) {
          trackAnalytics("add_to_wishlist", {
            currency: "BDT",
            value: unitPrice,
            item_id: productId,
            item_name: productName,
          });
        }
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-foreground text-2xl font-semibold">{formatPrice(unitPrice)}</p>
        <p
          className={cn(
            "text-sm font-medium",
            soldOut
              ? "text-destructive"
              : inStock
                ? "text-success"
                : "text-muted-foreground"
          )}
        >
          {soldOut
            ? t("addToCart.soldOut")
            : stock <= 5
              ? t("addToCart.onlyLeft", { n: stock })
              : t("addToCart.inStock")}
        </p>
      </div>

      {variants.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-foreground text-sm font-medium">
            {t("addToCart.selectOption")}
            {selectedVariant && (
              <span className="text-muted-foreground ml-1">— {selectedVariant.name}</span>
            )}
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label={t("addToCart.optionsAria")}
          >
            {variants.map((variant) => {
              const selected = variant.id === selectedVariantId;
              const unavailable = variant.stock <= 0 && productStock <= 0;
              return (
                <button
                  key={variant.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={unavailable}
                  onClick={() => {
                    setSelectedVariantId(variant.id);
                    setQuantity(1);
                  }}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-foreground hover:border-primary",
                    unavailable && "cursor-not-allowed opacity-40"
                  )}
                >
                  {variant.name}
                  {variant.price != null && (
                    <span
                      className={cn(
                        "ml-1",
                        selected ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      · {formatPrice(variant.price)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="border-input inline-flex items-center rounded-lg border">
          <button
            type="button"
            aria-label={t("addToCart.decreaseQty")}
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="text-foreground flex size-10 items-center justify-center disabled:opacity-40"
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <span
            className="w-10 text-center text-sm font-medium tabular-nums"
            aria-live="polite"
          >
            {quantity}
          </span>
          <button
            type="button"
            aria-label={t("addToCart.increaseQty")}
            disabled={quantity >= 99}
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="text-foreground flex size-10 items-center justify-center disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>

        <Button
          size="lg"
          className="flex-1 font-medium"
          disabled={soldOut || isPending}
          onClick={() => handleAdd("cart")}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShoppingBag className="size-4" aria-hidden="true" />
          )}
          {soldOut ? t("addToCart.soldOut") : t("addToCart.add")}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="lg"
          variant="secondary"
          className="flex-1 font-medium"
          disabled={soldOut || isPending}
          onClick={() => handleAdd("now")}
        >
          <Zap className="size-4" aria-hidden="true" />
          {t("addToCart.buyNow")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="size-auto shrink-0 px-4"
          aria-label={t("addToCart.wishlistAria")}
          disabled={isPending}
          onClick={handleWishlist}
        >
          <Heart className="size-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
