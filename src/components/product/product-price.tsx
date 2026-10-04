import { cn, formatPrice } from "@/lib/utils";

export function ProductPrice({
  price,
  compareAtPrice,
  size = "default",
  className,
}: {
  price: number;
  compareAtPrice?: number | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const hasDiscount = compareAtPrice != null && compareAtPrice > price;
  const discountPercent =
    hasDiscount && compareAtPrice
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span
        className={cn(
          "text-foreground font-medium",
          size === "sm" && "text-sm",
          size === "default" && "text-base",
          size === "lg" && "text-xl sm:text-2xl"
        )}
      >
        {formatPrice(price)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-muted-foreground text-sm line-through">
            {formatPrice(compareAtPrice!)}
          </span>
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
            -{discountPercent}%
          </span>
        </>
      )}
    </div>
  );
}
