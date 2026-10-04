"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type PaymentMethod } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { validateCoupon } from "@/lib/coupons";
import { deliveryFeeForZone, getShippingConfig, getShippingZones } from "@/lib/shipping";
import { nextOrderNumber } from "@/lib/orders";
import { logAudit } from "@/lib/audit";
import { sendOrderConfirmationEmail } from "@/lib/email/emails";
import { detectDivision } from "@/lib/division";
import { resolveDeliveryZone } from "@/lib/delivery-zones";
import { priceLead } from "@/lib/incomplete-order-totals";
import { captureIncompleteOrder } from "@/lib/incomplete-orders-capture";
import { resolveStage, snapshotFromCartItems, subtotalOf } from "@/lib/incomplete-orders";
import { paymentMethodLabel } from "@/lib/payments/labels";

// ---------------------------------------------------------------- capture

export type CaptureIncompleteOrderResult = { ok: boolean };

/**
 * Storefront beacon: fired (debounced) from the checkout form once the
 * customer has given a name and phone, while the page is still alive. The
 * leaving-the-page case goes through `POST /api/incomplete-orders` instead,
 * because a normal fetch is aborted once the document is torn down.
 */
export async function captureIncompleteOrderAction(
  input: unknown
): Promise<CaptureIncompleteOrderResult> {
  return { ok: await captureIncompleteOrder(input) };
}

// ---------------------------------------------------------------- convert

export type ConvertIncompleteOrderResult = {
  ok: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
};

/** Another staff member converted (or dismissed) this lead first. */
class LeadConflictError extends Error {}

/** Stock ran out between the pre-flight check and the write. */
class OutOfStockError extends Error {
  constructor(readonly label: string) {
    super(`Out of stock: ${label}`);
  }
}

/**
 * One click: turn an IncompleteOrder into a real Order.
 *
 * Line items are re-read from the live cart and re-priced from current product
 * data, so the display snapshot can never influence what the customer is
 * charged. Stock is decremented here — never at capture time — inside the same
 * transaction that creates the order.
 */
export async function convertIncompleteOrderAction(
  incompleteOrderId: string
): Promise<ConvertIncompleteOrderResult> {
  const staff = await requireStaff();

  const record = await prisma.incompleteOrder.findUnique({
    where: { id: incompleteOrderId },
  });
  if (!record) return { ok: false, error: "Incomplete order not found." };
  if (record.status !== "OPEN") {
    return { ok: false, error: "This incomplete order is no longer open." };
  }
  if (!record.addressLine || record.addressLine.trim().length < 10) {
    return {
      ok: false,
      error: "No address was captured. Confirm the address with the customer first.",
    };
  }

  const cart = await prisma.cart.findUnique({
    where: { id: record.cartId },
    include: {
      items: {
        where: { savedForLater: false },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              stock: true,
              published: true,
              status: true,
            },
          },
          variant: {
            select: { id: true, name: true, sku: true, price: true, stock: true },
          },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    return {
      ok: false,
      error: "This cart is empty now, so there is nothing left to convert.",
    };
  }

  // Stock is only reserved at conversion, so it has to be checked here.
  const shortfalls = cart.items.flatMap((item) => {
    const available = item.variant ? item.variant.stock : item.product.stock;
    if (available >= item.quantity) return [];
    const label = item.variant?.name ?? item.product.name;
    return [`${label} (need ${item.quantity}, ${available} left)`];
  });
  if (shortfalls.length > 0) {
    return { ok: false, error: `Not enough stock: ${shortfalls.join("; ")}.` };
  }

  const unavailable = cart.items.filter(
    (item) => !item.product.published || item.product.status !== "ACTIVE"
  );
  if (unavailable.length > 0) {
    return {
      ok: false,
      error: `Unavailable product: ${unavailable[0].product.name}. Re-check with the customer.`,
    };
  }

  const [shippingConfig, zones] = await Promise.all([
    getShippingConfig(),
    getShippingZones(),
  ]);

  const lines = snapshotFromCartItems(cart.items);
  const subtotal = subtotalOf(lines);
  const coupon = record.couponCode
    ? await validateCoupon(record.couponCode, subtotal)
    : null;
  const discount = coupon?.ok ? coupon.discount : 0;
  // An explicit zone (chosen at checkout or corrected by staff) wins, else
  // detect it from the address. A lead captured with only a name and phone has
  // no stored zone, and falling straight through to the base config fee would
  // silently charge an outside-Dhaka customer the Inside Dhaka rate.
  const zone = resolveDeliveryZone(record.deliveryZone, record.addressLine, zones);
  const deliveryFee = deliveryFeeForZone(zone, subtotal, shippingConfig);
  const total = subtotal - discount + deliveryFee;

  const addressLine = record.addressLine.trim();
  const division = detectDivision(addressLine);
  const note = `Converted from incomplete order by ${staff.name}.`;

  const MAX_RETRIES = 3;
  let order: {
    id: string;
    orderNumber: string;
    createdAt: Date;
    paymentMethod: PaymentMethod;
  } | null = null;
  try {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        order = await prisma.$transaction(async (tx) => {
          // Claim the lead first. The conditional UPDATE serialises concurrent
          // clicks: the second transaction re-reads the row after the lock is
          // released, matches nothing and aborts instead of placing a second
          // order. Nothing outside this transaction can observe the interim
          // state, and a failure below rolls the claim back.
          const claim = await tx.incompleteOrder.updateMany({
            where: { id: record.id, status: "OPEN" },
            data: { status: "CONVERTED", convertedAt: new Date() },
          });
          if (claim.count !== 1) throw new LeadConflictError();

          const orderNumber = await nextOrderNumber(tx);

          const created = await tx.order.create({
            data: {
              orderNumber,
              userId: record.userId,
              status: "PENDING",
              paymentStatus: "UNPAID",
              paymentMethod: "CASH_ON_DELIVERY",
              subtotal,
              discount,
              deliveryFee,
              total,
              couponCode: coupon?.ok ? coupon.coupon.code : null,
              customerName: record.customerName,
              customerPhone: record.customerPhone,
              customerEmail: record.customerEmail,
              shippingAddress: {
                name: record.customerName,
                phone: record.customerPhone,
                email: record.customerEmail,
                addressLine,
                division: division || undefined,
              },
            },
          });

          await Promise.all(
            lines.map((line) =>
              tx.orderItem.create({
                data: {
                  orderId: created.id,
                  productId: line.productId,
                  variantId: line.variantId,
                  productName: line.name,
                  sku: line.sku,
                  quantity: line.quantity,
                  price: line.price,
                  total: line.price * line.quantity,
                },
              })
            )
          );

          await Promise.all(
            lines.map((line) => {
              const ops: Promise<unknown>[] = [];
              // Guarded decrement: the `stock >= quantity` predicate makes the
              // check-and-write atomic, so two concurrent conversions can
              // never drive stock below zero. The earlier pre-flight check is
              // only there to fail fast with a friendlier message.
              const guard = (label: string) => (result: { count: number }) => {
                if (result.count === 0) throw new OutOfStockError(label);
              };
              if (line.variantId) {
                ops.push(
                  tx.productVariant
                    .updateMany({
                      where: { id: line.variantId, stock: { gte: line.quantity } },
                      data: { stock: { decrement: line.quantity } },
                    })
                    .then(guard(line.variantName ?? line.name))
                );
              } else {
                ops.push(
                  tx.product
                    .updateMany({
                      where: { id: line.productId, stock: { gte: line.quantity } },
                      data: { stock: { decrement: line.quantity } },
                    })
                    .then(guard(line.name))
                );
              }
              ops.push(
                tx.product.update({
                  where: { id: line.productId },
                  data: { soldCount: { increment: line.quantity } },
                })
              );
              ops.push(
                tx.inventoryTransaction.create({
                  data: {
                    productId: line.productId,
                    variantId: line.variantId,
                    quantityChange: -line.quantity,
                    reason: "ORDER" as const,
                    note: `Order ${orderNumber} (converted from incomplete order)`,
                  },
                })
              );
              return Promise.all(ops);
            })
          );

          await tx.orderTimelineEvent.create({
            data: { orderId: created.id, status: "PENDING", note },
          });

          if (coupon?.ok) {
            await tx.coupon.update({
              where: { id: coupon.coupon.id },
              data: { usedCount: { increment: 1 } },
            });
          }

          await tx.incompleteOrder.update({
            where: { id: record.id },
            data: {
              convertedOrderId: created.id,
              subtotal,
              discount,
              deliveryFee,
              total,
              itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
              items: lines.map((line) => ({ ...line, total: line.price * line.quantity })) as unknown as Prisma.InputJsonValue,
            },
          });

          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          await tx.cart.delete({ where: { id: cart.id } });

          return {
            id: created.id,
            orderNumber: created.orderNumber,
            createdAt: created.createdAt,
            paymentMethod: created.paymentMethod,
          };
        },
        // The default interactive timeout is 5s, which the Supabase pooler
        // blows through on a cold connection mid-checkout. Claim, order, stock
        // and cart teardown have to be one atomic unit, so give it room.
        { maxWait: 10_000, timeout: 30_000 }
        );
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
  } catch (err) {
    if (err instanceof LeadConflictError) {
      return {
        ok: false,
        error: "Someone else already handled this incomplete order.",
      };
    }
    if (err instanceof OutOfStockError) {
      return { ok: false, error: `Not enough stock: ${err.label}.` };
    }
    console.error("convertIncompleteOrderAction failed:", err);
    return { ok: false, error: "We couldn't create the order. Please try again." };
  }

  revalidatePath("/admin/incomplete-orders");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order!.id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");

  if (record.customerEmail) {
    void sendOrderConfirmationEmail(record.customerEmail, {
      orderNumber: order!.orderNumber,
      customerName: record.customerName,
      items: lines.map((line) => ({
        productName: line.name,
        quantity: line.quantity,
        total: line.price * line.quantity,
      })),
      subtotal,
      discount,
      deliveryFee,
      total,
      paymentMethod: paymentMethodLabel(order!.paymentMethod),
      shippingAddress: addressLine,
      createdAt: order!.createdAt,
    }).catch((err) => {
      console.error("[email] converted order confirmation failed", err);
    });
  }

  void logAudit({
    action: "incomplete.convert",
    entityType: "incompleteOrder",
    entityId: record.id,
    metadata: {
      orderId: order!.id,
      orderNumber: order!.orderNumber,
      cartId: record.cartId,
      customerPhone: record.customerPhone,
      total,
    },
  });

  return { ok: true, orderId: order!.id, orderNumber: order!.orderNumber };
}

export async function dismissIncompleteOrderAction(
  incompleteOrderId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireStaff();

  const record = await prisma.incompleteOrder.findUnique({
    where: { id: incompleteOrderId },
    select: { id: true, status: true },
  });
  if (!record) return { ok: false, error: "Incomplete order not found." };
  if (record.status === "CONVERTED") {
    return { ok: false, error: "Converted orders cannot be dismissed." };
  }

  await prisma.incompleteOrder.update({
    where: { id: record.id },
    data: { status: "DISMISSED" },
  });

  revalidatePath("/admin/incomplete-orders");
  void logAudit({
    action: "incomplete.dismiss",
    entityType: "incompleteOrder",
    entityId: record.id,
  });
  return { ok: true };
}

const DetailsSchema = z.object({
  customerName: z.string().trim().min(2, "Name is required").max(80),
  customerPhone: z
    .string()
    .trim()
    .regex(/^01[3-9][0-9]{8}$/, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)."),
  customerEmail: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .max(120)
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(400, "Address is too long").default(""),
  deliveryZoneId: z.string().trim().max(80).optional().or(z.literal("")),
});

/**
 * Record the details a customer gave over the phone.
 *
 * A lead captured from just a name and phone has no address, so one-click
 * conversion is blocked until staff supply one. Staff are also the only chance
 * to correct the delivery charge: a customer who abandoned before picking a
 * zone carries none, and the base config fee would quietly bill an
 * outside-Dhaka customer the Inside Dhaka rate. Everything is editable inline
 * in the queue row, then conversion charges exactly what is shown.
 */
export async function updateIncompleteOrderDetailsAction(
  incompleteOrderId: string,
  input: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    address: string;
    deliveryZoneId?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();

  const parsed = DetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const record = await prisma.incompleteOrder.findUnique({
    where: { id: incompleteOrderId },
    select: {
      id: true,
      cartId: true,
      status: true,
      stage: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      addressLine: true,
      deliveryZone: true,
      discount: true,
    },
  });
  if (!record) return { ok: false, error: "Incomplete order not found." };
  if (record.status === "CONVERTED") {
    return { ok: false, error: "This lead has already been converted into an order." };
  }

  const addressLine = parsed.data.address || null;
  const stage = resolveStage(addressLine);

  // Re-price from the live cart so the stored figures match what conversion
  // will actually charge, and resolve the zone the same way conversion will.
  const priced = await priceLead({
    cartId: record.cartId,
    deliveryZone: parsed.data.deliveryZoneId || null,
    addressLine,
    discount: record.discount,
  });

  await prisma.incompleteOrder.update({
    where: { id: record.id },
    data: {
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      customerEmail: parsed.data.customerEmail || null,
      addressLine,
      stage,
      deliveryZone: priced.zone?.id ?? null,
      items: priced.lines as unknown as Prisma.InputJsonValue,
      itemCount: priced.itemCount,
      subtotal: priced.subtotal,
      deliveryFee: priced.deliveryFee,
      total: priced.total,
    },
  });

  revalidatePath("/admin/incomplete-orders");
  if (
    record.addressLine !== addressLine ||
    record.deliveryZone !== (priced.zone?.id ?? null) ||
    record.customerName !== parsed.data.customerName ||
    record.customerPhone !== parsed.data.customerPhone ||
    record.customerEmail !== (parsed.data.customerEmail || null)
  ) {
    void logAudit({
      action: "incomplete.details",
      entityType: "incompleteOrder",
      entityId: record.id,
      metadata: {
        by: staff.name,
        from: record.stage,
        to: stage,
        zone: priced.zone?.name ?? null,
      },
    });
  }
  return { ok: true };
}

export async function saveIncompleteOrderNoteAction(
  incompleteOrderId: string,
  note: string
): Promise<{ ok: boolean; error?: string }> {
  await requireStaff();
  const trimmed = note.trim().slice(0, 1000);
  await prisma.incompleteOrder.update({
    where: { id: incompleteOrderId },
    data: { internalNote: trimmed || null },
  });
  revalidatePath("/admin/incomplete-orders");
  return { ok: true };
}
