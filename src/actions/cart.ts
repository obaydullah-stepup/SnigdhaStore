"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateGuestId, parseQuantity, resolveActiveCartId } from "@/lib/cart";
import { getSessionUser } from "@/lib/auth/session";

export type CartActionResult = {
  ok: boolean;
  message?: { en: string; bn: string };
  cartCount?: number;
};

export async function addToCartAction(
  _prev: CartActionResult | null,
  formData: FormData
): Promise<CartActionResult> {
  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "") || null;
  const quantity = await parseQuantity(formData.get("quantity"));

  if (!productId) {
    return {
      ok: false,
      message: {
        en: "Something went wrong. Please try again.",
        bn: "দুঃখিত, আবার চেষ্টা করুন।",
      },
    };
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, published: true, status: "ACTIVE" },
    select: { id: true, price: true, stock: true },
  });
  if (!product) {
    return {
      ok: false,
      message: {
        en: "This product is no longer available.",
        bn: "পণ্যটি আর পাওয়া যাচ্ছে না।",
      },
    };
  }

  let unitPrice = product.price;
  let availableStock = product.stock;

  if (variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId: product.id },
      select: { id: true, price: true, stock: true },
    });
    if (!variant) {
      return {
        ok: false,
        message: {
          en: "Please choose a valid variant.",
          bn: "সঠিক ভ্যারিয়েন্ট বাছাই করুন।",
        },
      };
    }
    unitPrice = variant.price ?? product.price;
    availableStock = variant.stock;
  }

  if (availableStock <= 0) {
    return {
      ok: false,
      message: {
        en: "This item is currently out of stock.",
        bn: "আইটেমটি বর্তমানে স্টকে নেই।",
      },
    };
  }

  if (quantity > availableStock) {
    return {
      ok: false,
      message: {
        en: `Only ${availableStock} available in stock.`,
        bn: `স্টকে কেবল ${availableStock} টি আছে।`,
      },
    };
  }

  const user = await getSessionUser();

  const cart = await prisma.$transaction(async (tx) => {
    let cart;
    if (user) {
      cart = await tx.cart.findFirst({ where: { userId: user.id } });
      if (!cart) {
        cart = await tx.cart.create({ data: { userId: user.id } });
      }
    } else {
      const sessionId = await getOrCreateGuestId();
      cart = await tx.cart.findFirst({ where: { userId: null, sessionId } });
      if (!cart) {
        cart = await tx.cart.create({ data: { userId: null, sessionId } });
      }
    }

    const existing = await tx.cartItem.findFirst({
      where: { cartId: cart.id, productId: product.id, variantId },
    });

    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (availableStock > 0 && nextQuantity > availableStock) {
      return null;
    }

    if (existing) {
      await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQuantity, price: unitPrice },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          variantId,
          quantity,
          price: unitPrice,
        },
      });
    }
    return cart;
  });

  if (!cart) {
    return {
      ok: false,
      message: { en: "Not enough stock available.", bn: "পর্যাপ্ত স্টক নেই।" },
    };
  }

  const count = await prisma.cartItem.aggregate({
    where: { cartId: cart.id },
    _sum: { quantity: true },
  });

  return {
    ok: true,
    cartCount: count._sum.quantity ?? 0,
    message: {
      en: "Added to your cart.",
      bn: "কার্টে যোগ করা হয়েছে।",
    },
  };
}

export type WishlistActionResult = {
  ok: boolean;
  needsLogin?: boolean;
  added?: boolean;
  message?: { en: string; bn: string };
};

export async function moveWishlistToCartAction(
  productId: string,
  variantId?: string | null
): Promise<WishlistActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, needsLogin: true };
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, published: true, status: "ACTIVE" },
    select: { id: true, price: true, stock: true },
  });
  if (!product) {
    return {
      ok: false,
      message: {
        en: "This product is no longer available.",
        bn: "পণ্যটি আর পাওয়া যাচ্ছে না।",
      },
    };
  }

  const wishlistItem = await prisma.wishlistItem.findFirst({
    where: { userId: user.id, productId: product.id, variantId: variantId ?? null },
    select: { id: true },
  });
  if (!wishlistItem) {
    return {
      ok: false,
      message: { en: "Item not in wishlist.", bn: "আইটেমটি উইশলিস্টে নেই।" },
    };
  }

  const variant = variantId
    ? await prisma.productVariant.findFirst({
        where: { id: variantId, productId: product.id },
        select: { id: true, price: true, stock: true },
      })
    : null;
  if (variantId && !variant) {
    return {
      ok: false,
      message: { en: "Please choose a valid variant.", bn: "সঠিক ভ্যারিয়েন্ট বাছাই করুন।" },
    };
  }

  const availableStock = variant ? variant.stock : product.stock;
  if (availableStock <= 0) {
    return {
      ok: false,
      message: { en: "This item is currently out of stock.", bn: "আইটেমটি বর্তমানে স্টকে নেই।" },
    };
  }

  const cart = await resolveActiveCartId();
  if (!cart) {
    return { ok: false, message: { en: "Please try again.", bn: "আবার চেষ্টা করুন।" } };
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.cartItem.findFirst({
      where: { cartId: cart, productId: product.id, variantId: variant?.id ?? null },
    });
    const nextQuantity = (existing?.quantity ?? 0) + 1;
    if (nextQuantity > availableStock) {
      throw new Error("STOCK_LIMIT");
    }
    if (existing) {
      await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQuantity, price: variant?.price ?? product.price },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId: cart,
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity: 1,
          price: variant?.price ?? product.price,
        },
      });
    }
    await tx.wishlistItem.delete({ where: { id: wishlistItem.id } });
  });

  revalidatePath("/account/wishlist");
  revalidatePath("/cart");
  return {
    ok: true,
    message: { en: "Moved to your cart.", bn: "কার্টে নেওয়া হয়েছে।" },
  };
}

export async function toggleWishlistAction(
  _prev: WishlistActionResult | null,
  formData: FormData
): Promise<WishlistActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, needsLogin: true };
  }

  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "") || null;
  const product = await prisma.product.findFirst({
    where: { id: productId, published: true, status: "ACTIVE" },
    select: { id: true },
  });
  if (!product) {
    return {
      ok: false,
      message: { en: "Product not found.", bn: "পণ্যটি পাওয়া যায়নি।" },
    };
  }

  if (variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId: product.id },
      select: { id: true },
    });
    if (!variant) {
      return {
        ok: false,
        message: { en: "Please choose a valid variant.", bn: "সঠিক ভ্যারিয়েন্ট বাছাই করুন।" },
      };
    }
  }

  const existing = await prisma.wishlistItem.findFirst({
    where: { userId: user.id, productId: product.id, variantId },
    select: { id: true },
  });

  let added: boolean;
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    added = false;
  } else {
    await prisma.wishlistItem.create({
      data: { userId: user.id, productId: product.id, variantId },
    });
    added = true;
  }

  return {
    ok: true,
    added,
    message: {
      en: added ? "Saved to your wishlist." : "Removed from your wishlist.",
      bn: added ? "উইশলিস্টে যুক্ত হয়েছে।" : "উইশলিস্ট থেকে সরানো হয়েছে।",
    },
  };
}

export type CartItemActionResult = {
  ok: boolean;
  message?: { en: string; bn: string };
  cartCount?: number;
};

async function cartCountFor(cartId: string): Promise<number> {
  const agg = await prisma.cartItem.aggregate({
    where: { cartId },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export async function updateCartItemQuantityAction(
  _prev: CartItemActionResult | null,
  formData: FormData
): Promise<CartItemActionResult> {
  const cartId = await resolveActiveCartId();
  if (!cartId)
    return { ok: false, message: { en: "Your cart is empty.", bn: "কার্ট খালি আছে।" } };

  const itemId = String(formData.get("itemId") ?? "");
  const quantity = await parseQuantity(formData.get("quantity"));

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId },
    include: {
      product: { select: { stock: true, published: true, status: true } },
      variant: { select: { stock: true } },
    },
  });
  if (!item || !item.product.published || item.product.status !== "ACTIVE") {
    return { ok: false, message: { en: "Item not found.", bn: "আইটেম পাওয়া যায়নি।" } };
  }

  const available = item.variant ? item.variant.stock : item.product.stock;
  if (available <= 0) {
    return {
      ok: false,
      message: { en: "Item is out of stock.", bn: "আইটেমটি স্টকে নেই।" },
    };
  }
  if (quantity > available) {
    return {
      ok: false,
      message: {
        en: `Only ${available} available in stock.`,
        bn: `স্টকে কেবল ${available} টি আছে।`,
      },
    };
  }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  return { ok: true, cartCount: await cartCountFor(cartId) };
}

export async function removeCartItemAction(
  _prev: CartItemActionResult | null,
  formData: FormData
): Promise<CartItemActionResult> {
  const cartId = await resolveActiveCartId();
  if (!cartId) return { ok: false };

  const itemId = String(formData.get("itemId") ?? "");
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
  return { ok: true, cartCount: await cartCountFor(cartId) };
}

export async function toggleSavedForLaterAction(
  _prev: CartItemActionResult | null,
  formData: FormData
): Promise<CartItemActionResult> {
  const cartId = await resolveActiveCartId();
  if (!cartId) return { ok: false };

  const itemId = String(formData.get("itemId") ?? "");
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId },
    select: { id: true, savedForLater: true },
  });
  if (!item) return { ok: false };

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { savedForLater: !item.savedForLater },
  });
  return { ok: true, cartCount: await cartCountFor(cartId) };
}

export async function clearCartAction(): Promise<CartItemActionResult> {
  const cartId = await resolveActiveCartId();
  if (!cartId) return { ok: true, cartCount: 0 };
  await prisma.cartItem.deleteMany({ where: { cartId } });
  return { ok: true, cartCount: 0 };
}
