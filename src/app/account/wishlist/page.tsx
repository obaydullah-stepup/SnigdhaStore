import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { Breadcrumbs } from "@/components/product/breadcrumbs";
import { Button } from "@/components/ui/button";
import { WishlistActions } from "@/components/account/wishlist-actions";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await requireUser();

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" } },
          price: true,
          compareAtPrice: true,
          stock: true,
        },
      },
      variant: { select: { id: true, name: true, price: true, stock: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Account", href: "/account" }, { label: "Wishlist" }]}
      />
      <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight">
        Wishlist
      </h1>

      {items.length === 0 ? (
        <div className="border-border mt-8 flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <Heart className="text-muted-foreground size-10" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">Your wishlist is empty</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Tap the heart on any product to save it here for later.
            </p>
          </div>
          <Link href="/shop">
            <Button variant="secondary">Browse products</Button>
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ product, variant }) => {
            const soldOut = (variant?.stock ?? product.stock) <= 0;
            const image = product.images[0];
            const unitPrice = variant?.price ?? product.price;
            const discount =
              product.compareAtPrice && product.compareAtPrice > unitPrice
                ? Math.round(
                    ((product.compareAtPrice - unitPrice) / product.compareAtPrice) * 100
                  )
                : 0;
            return (
              <li
                key={`${product.id}:${variant?.id ?? ""}`}
                className="border-border bg-card flex flex-col overflow-hidden rounded-xl border"
              >
                <Link
                  href={`/product/${product.slug}`}
                  className="bg-muted relative block aspect-[4/5]"
                >
                  {image ? (
                    <Image
                      src={image.url}
                      alt={image.alt ?? product.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-muted-foreground flex h-full items-center justify-center text-sm">
                      No image
                    </span>
                  )}
                  {soldOut && (
                    <span className="bg-background/60 absolute inset-0 flex items-center justify-center text-xs font-semibold">
                      Sold out
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="bg-destructive text-destructive-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold">
                      -{discount}%
                    </span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <Link
                    href={`/product/${product.slug}`}
                    className="line-clamp-2 text-sm font-medium hover:underline"
                  >
                    {product.name}
                  </Link>
                  {variant && (
                    <p className="text-muted-foreground text-xs">{variant.name}</p>
                  )}
                  <p className="text-sm font-semibold">{formatPrice(unitPrice)}</p>
                  <div className="mt-auto pt-2">
                    <WishlistActions productId={product.id} variantId={variant?.id} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
