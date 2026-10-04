import "server-only";
import { prisma } from "@/lib/prisma";
import { resolveActiveCartId } from "@/lib/cart";

export type CartSnapshotLine = {
  id: string;
  quantity: number;
  price: number;
  savedForLater: boolean;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
  variantId: string | null;
  variantName: string | null;
  availableStock: number;
  available: boolean;
};

export type CartSnapshot = {
  cartId: string;
  items: CartSnapshotLine[];
  subtotal: number;
  count: number;
};

export async function getCartSnapshot(): Promise<CartSnapshot | null> {
  const cartId = await resolveActiveCartId();
  if (!cartId) return null;

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              sku: true,
              price: true,
              stock: true,
              published: true,
              status: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
            },
          },
          variant: { select: { id: true, name: true, price: true, stock: true } },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0)
    return { cartId, items: [], subtotal: 0, count: 0 };

  const items: CartSnapshotLine[] = cart.items.map((item) => {
    const unitPrice = item.variant?.price ?? item.product.price;
    const availableStock = item.variant
      ? item.variant.stock > 0
        ? item.variant.stock
        : item.product.stock
      : item.product.stock;
    return {
      id: item.id,
      quantity: item.quantity,
      price: unitPrice,
      savedForLater: item.savedForLater,
      productId: item.product.id,
      slug: item.product.slug,
      name: item.product.name,
      sku: item.variant?.name ?? item.product.sku,
      image: item.product.images[0]?.url ?? null,
      variantId: item.variant?.id ?? null,
      variantName: item.variant?.name ?? null,
      availableStock,
      available:
        item.product.published &&
        item.product.status === "ACTIVE" &&
        (availableStock <= 0 || item.quantity <= availableStock),
    };
  });

  const subtotal = items
    .filter((i) => !i.savedForLater)
    .reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    cartId,
    items,
    subtotal,
    count: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}
