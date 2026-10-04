import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveActiveCartId } from "@/lib/cart";
import { getSessionUser } from "@/lib/auth/session";
import { getAppliedCouponCode } from "@/lib/coupon-cookie";
import { validateCoupon } from "@/lib/coupons";
import { deliveryFeeForZone, getShippingConfig, getShippingZones } from "@/lib/shipping";
import { resolveDeliveryZone } from "@/lib/delivery-zones";
import {
  itemCountOf,
  mergeCapturedContact,
  snapshotFromCartItems,
  subtotalOf,
} from "@/lib/incomplete-orders";

export const CaptureSchema = z.object({
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
  address: z.string().trim().max(400).optional().or(z.literal("")),
  deliveryZone: z.string().trim().max(80).optional().or(z.literal("")),
});

export type CapturePayload = z.infer<typeof CaptureSchema>;

/**
 * Record checkout intent for the admin queue.
 *
 * Shared by the debounced server action (customer lingers on the page) and the
 * `navigator.sendBeacon` route (customer is already leaving, so an ordinary
 * fetch would be aborted by the browser). Upserted on cartId, so repeat visits
 * update one row instead of creating a lead per visit, and re-sending the same
 * payload is a harmless no-op. No stock is touched and no order number is
 * allocated.
 */
export async function captureIncompleteOrder(input: unknown): Promise<boolean> {
  const parsed = CaptureSchema.safeParse(input);
  if (!parsed.success) return false;

  const { fullName, phone } = parsed.data;
  const addressLine = parsed.data.address || null;
  const requestedZone = parsed.data.deliveryZone || null;

  const cartId = await resolveActiveCartId();
  if (!cartId) return false;

  // A customer can trigger several captures in quick succession (blur on one
  // field, then the next) and beacons are not delivered in order. Merge rather
  // than overwrite so a payload that happens to arrive late can never erase
  // detail we already hold.
  const existing = await prisma.incompleteOrder.findUnique({
    where: { cartId },
    select: { id: true, addressLine: true, customerEmail: true },
  });
  const { addressLine: mergedAddress, customerEmail: email, stage } = mergeCapturedContact(
    existing,
    {
      addressLine,
      customerEmail: parsed.data.email || null,
    }
  );

  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        where: { savedForLater: false },
        include: {
          product: { select: { id: true, name: true, sku: true, price: true } },
          variant: { select: { id: true, name: true, sku: true, price: true } },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) return false;

  const [user, shippingConfig, zones, couponCode] = await Promise.all([
    getSessionUser(),
    getShippingConfig(),
    getShippingZones(),
    getAppliedCouponCode(),
  ]);

  const items = snapshotFromCartItems(cart.items);

  const subtotal = subtotalOf(items);
  const coupon = couponCode ? await validateCoupon(couponCode, subtotal) : null;
  const discount = coupon?.ok ? coupon.discount : 0;
  const zone = resolveDeliveryZone(requestedZone, mergedAddress, zones);
  const deliveryFee = deliveryFeeForZone(zone, subtotal, shippingConfig);
  const total = subtotal - discount + deliveryFee;

  const data = {
    customerName: fullName,
    customerPhone: phone,
    customerEmail: email,
    addressLine: mergedAddress,
    stage,
    deliveryZone: zone?.id ?? null,
    items: items as unknown as Prisma.InputJsonValue,
    itemCount: itemCountOf(items),
    subtotal,
    discount,
    couponCode: coupon?.ok ? coupon.coupon.code : couponCode,
    deliveryFee,
    total,
    userId: user?.id ?? null,
  };

  if (existing) {
    // Never resurrect a converted or dismissed record: `data` deliberately
    // leaves `status` alone, and a cart id is only reused while the cart
    // still exists.
    await prisma.incompleteOrder.update({ where: { id: existing.id }, data });
  } else {
    try {
      await prisma.incompleteOrder.create({ data: { cartId, ...data } });
    } catch (error) {
      // Two beacons for the same cart can race the create, and cartId is
      // unique. Re-read before falling back: the winner may have landed a
      // richer payload than the one we merged against a row that did not
      // exist yet, and we must not overwrite it with our staler view.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const current = await prisma.incompleteOrder.findUnique({
          where: { cartId },
          select: { id: true, addressLine: true, customerEmail: true },
        });
        if (!current) throw error;
        const remerged = mergeCapturedContact(current, {
          addressLine,
          customerEmail: parsed.data.email || null,
        });
        await prisma.incompleteOrder.update({
          where: { id: current.id },
          data: {
            ...data,
            addressLine: remerged.addressLine,
            customerEmail: remerged.customerEmail,
            stage: remerged.stage,
          },
        });
      } else {
        throw error;
      }
    }
  }

  return true;
}
