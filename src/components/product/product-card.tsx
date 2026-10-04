import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ProductPrice } from "@/components/product/product-price";
import { RatingStars } from "@/components/product/rating-stars";
import type { ProductSummary } from "@/lib/data/products";

export type ProductCardLabels = {
  featured: string;
  soldOut: string;
  noImage: string;
};

const DEFAULT_LABELS: ProductCardLabels = {
  featured: "Featured",
  soldOut: "Sold out",
  noImage: "No image",
};

export function ProductCard({
  product,
  priority = false,
  labels = DEFAULT_LABELS,
}: {
  product: ProductSummary;
  priority?: boolean;
  labels?: ProductCardLabels;
}) {
  const soldOut = product.stock <= 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group border-border bg-card flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
    >
      <div className="bg-muted relative aspect-[4/5] w-full overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.imageAlt ?? product.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {labels.noImage}
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <Badge className="bg-destructive text-destructive-foreground">
              -
              {Math.round(
                ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
              )}
              %
            </Badge>
          )}
          {product.featured && (
            <Badge className="bg-accent-solid text-accent-foreground">
              {labels.featured}
            </Badge>
          )}
        </div>
        {soldOut && (
          <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
            <span className="bg-foreground/90 text-background rounded-full px-3 py-1 text-xs font-semibold">
              {labels.soldOut}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-muted-foreground text-xs">
          {product.categoryName ?? product.brand}
        </p>
        <h3 className="text-foreground line-clamp-2 text-sm font-medium">
          {product.name}
        </h3>
        <RatingStars value={product.rating} count={product.reviewCount} />
        <ProductPrice
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          size="sm"
          className="mt-auto pt-1"
        />
      </div>
    </Link>
  );
}
