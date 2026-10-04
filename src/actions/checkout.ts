"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveActiveCartId } from "@/lib/cart";
import { getSessionUser } from "@/lib/auth/session";
import {
  getAppliedCouponCode,
  setAppliedCouponCode,
  clearAppliedCoupon,
} from "@/lib/coupon-cookie";
import { setLastOrderNumber } from "@/lib/order-cookie";
import { validateCoupon } from "@/lib/coupons";
import {
  DEFAULT_ZONE_ID,
  deliveryFeeForZone,
  getShippingConfig,
  getShippingZones,
} from "@/lib/shipping";
import { nextOrderNumber } from "@/lib/orders";
import { triggerPurchaseIfDue } from "@/lib/meta/trigger";
import { getPaymentProvider } from "@/lib/payments/provider";
import { paymentMethodLabel } from "@/lib/payments/labels";
import { sendOrderConfirmationEmail } from "@/lib/email/emails";
import { detectDivision } from "@/lib/division";
import {
  Prisma,
  type InventoryChangeReason,
  type OrderStatus,
} from "@/generated/prisma/client";

export type CouponFormAction = {
  status: "success" | "error";
  message: { en: string; bn: string };
  discount?: number;
};

export async function applyCouponAction(
  _prev: CouponFormAction | null,
  formData: FormData
): Promise<CouponFormAction> {
  const code = z.string().trim().toUpperCase().max(40).safeParse(formData.get("code"));

  if (!code.success) {
    return {
      status: "error",
      message: { en: "Enter a coupon code.", bn: "কুপন কোড লিখুন।" },
    };
  }

  const subtotal = await orderSubtotal();
  const result = await validateCoupon(code.data, subtotal);
  if (!result.ok) {
    return { status: "error", message: { en: result.error, bn: result.error } };
  }
  await setAppliedCouponCode(result.coupon.code);
  return {
    status: "success",
    discount: result.discount,
    message: {
      en: `Coupon ${result.coupon.code} applied.`,
      bn: `কুপন ${result.coupon.code} প্রযোজ্য।`,
    },
  };
}

export async function removeCouponAction(): Promise<CouponFormAction> {
  await clearAppliedCoupon();
  return {
    status: "success",
    message: { en: "Coupon removed.", bn: "কুপন সরানো হয়েছে।" },
  };
}

async function orderSubtotal(): Promise<number> {
  const cartId = await resolveActiveCartId();
  if (!cartId) return 0;
  const items = await prisma.cartItem.findMany({
    where: { cartId, savedForLater: false },
    select: { price: true, quantity: true },
  });
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

const CheckoutFields = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^01[3-9][0-9]{8}$/, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .max(120)
    .optional()
    .or(z.literal("")),
  address: z.string().trim().min(10, "Enter your full address.").max(400),
  deliveryZone: z.string().trim().min(1, "Choose a delivery zone."),
  paymentMethod: z.enum(["COD"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  saveAddress: z.enum(["true", "on", "false", ""]).optional(),
});

// Best-effort division detection for shipping zones, since customers now enter
// a single free-text address instead of picking a division. See @/lib/division.

export type PlaceOrderResult = {
  ok: boolean;
  orderNumber?: string;
  error?: { en: string; bn: string };
};

export async function placeOrderAction(
  _prev: PlaceOrderResult | null,
  formData: FormData
): Promise<PlaceOrderResult> {
  const parsed = CheckoutFields.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    address: formData.get("address"),
    deliveryZone: formData.get("deliveryZone"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") || undefined,
    saveAddress: formData.get("saveAddress") || undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: {
        en: issue?.message ?? "Please check the form and try again.",
        bn: "ফর্ম ঠিক করে আবার চেষ্টা করুন।",
      },
    };
  }
  const data = parsed.data;
  const shouldSaveAddress = data.saveAddress === "true" || data.saveAddress === "on";
  const detectedDivision = detectDivision(data.address);

  if (!getPaymentProvider(data.paymentMethod)) {
    return {
      ok: false,
      error: { en: "Please choose a payment method.", bn: "পেমেন্ট পদ্ধতি বাছাই করুন।" },
    };
  }

  const [user, shippingConfig, zones] = await Promise.all([
    getSessionUser(),
    getShippingConfig(),
    getShippingZones(),
  ]);

  const deliveryZone =
    data.deliveryZone === DEFAULT_ZONE_ID
      ? null
      : (zones.find((z) => z.id === data.deliveryZone) ?? null);
  if (data.deliveryZone !== DEFAULT_ZONE_ID && !deliveryZone) {
    return {
      ok: false,
      error: { en: "Please choose a delivery zone.", bn: "ডেলিভারি জোন বাছাই করুন।" },
    };
  }

  const cartId = await resolveActiveCartId();
  if (!cartId) {
    return { ok: false, error: { en: "Your cart is empty.", bn: "কার্ট খালি আছে।" } };
  }

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        where: { savedForLater: false },
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              sku: true,
              price: true,
              stock: true,
              soldCount: true,
              published: true,
              status: true,
              images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
            },
          },
          variant: {
            select: { id: true, sku: true, name: true, price: true, stock: true },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return { ok: false, error: { en: "Your cart is empty.", bn: "কার্ট খালি আছে।" } };
  }

  // Re-validate every line server-side; never trust stored prices or client amounts.
  const subtotal = cart.items.reduce((sum, item) => {
    const unitPrice = item.variant?.price ?? item.product.price;
    return sum + unitPrice * item.quantity;
  }, 0);

  for (const item of cart.items) {
    if (!item.product.published || item.product.status !== "ACTIVE") {
      return {
        ok: false,
        error: {
          en: `${item.product.name} is no longer available.`,
          bn: `${item.product.name} আর পাওয়া যাচ্ছে না।`,
        },
      };
    }
    const available = item.variant ? item.variant.stock : item.product.stock;
    if (available <= 0) {
      return {
        ok: false,
        error: {
          en: `${item.product.name} is currently out of stock.`,
          bn: `${item.product.name} বর্তমানে স্টকে নেই।`,
        },
      };
    }
    if (item.quantity > available) {
      return {
        ok: false,
        error: {
          en: `Only ${available} × ${item.product.name} available.`,
          bn: `স্টকে কেবল ${available} × ${item.product.name} আছে।`,
        },
      };
    }
  }

  // Coupon — re-validated server-side (never trust client state).
  const couponCode = await getAppliedCouponCode();
  const couponValidation = couponCode ? await validateCoupon(couponCode, subtotal) : null;
  const discount = couponValidation?.ok ? couponValidation.discount : 0;
  const appliedCoupon = couponValidation?.ok ? couponValidation.coupon : null;

  const deliveryFee = deliveryFeeForZone(deliveryZone, subtotal, shippingConfig);
  const total = subtotal - discount + deliveryFee;

  const shippingAddress = {
    name: data.fullName,
    phone: data.phone,
    email: data.email || null,
    addressLine: data.address,
    division: detectedDivision || undefined,
  };

  const MAX_RETRIES = 3;
  let order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string | null;
    paymentMethod: string;
    createdAt: Date;
  } | null = null;
  try {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        order = await prisma.$transaction(async (tx) => {
          const orderNumber = await nextOrderNumber(tx);

          const created = await tx.order.create({
            data: {
              orderNumber,
              userId: user?.id ?? null,
              status: "PENDING",
              paymentStatus: "UNPAID",
              paymentMethod: getPaymentProvider(data.paymentMethod)!.method,
              subtotal,
              discount,
              deliveryFee,
              total,
              couponCode: appliedCoupon?.code ?? null,
              customerName: data.fullName,
              customerPhone: data.phone,
              customerEmail: data.email || null,
              shippingAddress,
              notes: data.notes || null,
            },
          });

          await Promise.all(
            cart.items.map((item) =>
              tx.orderItem.create({
                data: {
                  orderId: created.id,
                  productId: item.product.id,
                  variantId: item.variant?.id ?? null,
                  productName: item.product.name,
                  sku: item.variant?.sku ?? item.product.sku,
                  quantity: item.quantity,
                  price: item.variant?.price ?? item.product.price,
                  total: (item.variant?.price ?? item.product.price) * item.quantity,
                },
              })
            )
          );

          // Atomic stock decrement + inventory history
          await Promise.all(
            cart.items.map((item) => {
              const ops: Promise<unknown>[] = [];
              if (item.variant) {
                ops.push(
                  tx.productVariant.update({
                    where: { id: item.variant.id },
                    data: { stock: { decrement: item.quantity } },
                  })
                );
              } else {
                ops.push(
                  tx.product.update({
                    where: { id: item.product.id },
                    data: {
                      stock: { decrement: item.quantity },
                    },
                  })
                );
              }
              ops.push(
                tx.product.update({
                  where: { id: item.product.id },
                  data: { soldCount: { increment: item.quantity } },
                })
              );
              ops.push(
                tx.inventoryTransaction.create({
                  data: {
                    productId: item.product.id,
                    variantId: item.variant?.id ?? null,
                    quantityChange: -item.quantity,
                    reason: "ORDER" as InventoryChangeReason,
                    note: `Order ${orderNumber}`,
                  },
                })
              );
              return Promise.all(ops);
            })
          );

          await tx.orderTimelineEvent.create({
            data: {
              orderId: created.id,
              status: "PENDING" as OrderStatus,
              note: "Order placed",
            },
          });

          if (appliedCoupon) {
            await tx.coupon.update({
              where: { id: appliedCoupon.id },
              data: { usedCount: { increment: 1 } },
            });
          }

          if (user && shouldSaveAddress) {
            const addressCount = await tx.address.count({ where: { userId: user.id } });
            await tx.address.create({
              data: {
                userId: user.id,
                name: data.fullName,
                phone: data.phone,
                division: detectedDivision,
                district: "",
                area: "",
                addressLine: data.address,
                postalCode: null,
                isDefault: addressCount === 0,
              },
            });
          }

          // The customer completed checkout on their own, so any captured
          // IncompleteOrder for this cart is now a real order, not a lead.
          await tx.incompleteOrder.updateMany({
            where: { cartId: cart.id, status: "OPEN" },
            data: {
              status: "CONVERTED",
              convertedOrderId: created.id,
              convertedAt: new Date(),
            },
          });

          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          await tx.cart.delete({ where: { id: cart.id } });

          return created;
        });
        break;
      } catch (err) {
        if (
          attempt >= MAX_RETRIES ||
          !(err instanceof Prisma.PrismaClientKnownRequestError) ||
          err.code !== "P2002"
        ) {
          throw err;
        }
      }
    }
    await Promise.all([clearAppliedCoupon(), setLastOrderNumber(order!.orderNumber)]);

    // After the order is committed, never inside the transaction, so a slow
    // Meta call can neither hold a transaction open nor roll back a real order.
    // No-ops unless the trigger is set to "immediately".
    await triggerPurchaseIfDue(order!.id).catch((err) => {
      console.error("[meta] purchase trigger failed", err);
    });

    if (order?.customerEmail) {
      await sendOrderConfirmationEmail(order.customerEmail, {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        items: cart.items.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          total: (item.variant?.price ?? item.product.price) * item.quantity,
        })),
        subtotal,
        discount,
        deliveryFee,
        total,
        paymentMethod: paymentMethodLabel(order.paymentMethod),
        shippingAddress: [data.address].filter(Boolean).join("\n"),
        createdAt: order.createdAt,
      }).catch((err) => {
        console.error("[email] order confirmation failed", err);
      });
    }
  } catch (err) {
    console.error("placeOrderAction failed:", err);
    return {
      ok: false,
      error: {
        en: "We couldn't place your order. Please try again.",
        bn: "অর্ডার করা যাচ্ছেনি। আবার চেষ্টা করুন।",
      },
    };
  }

  redirect(`/order-success/${order!.orderNumber}`);
}
