"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

const LookupPayload = z.object({
  orderNumber: z.string().trim().min(3, "Enter your order number."),
  email: z
    .union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email.")])
    .optional()
    .default(""),
  phone: z.string().trim().optional().default(""),
});

export type TrackedOrder = {
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  createdAt: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode: string | null;
  items: {
    id: string;
    productName: string;
    variantName: string | null;
    price: number;
    quantity: number;
    total: number;
    productSlug: string | null;
    imageUrl: string | null;
    imageAlt: string | null;
  }[];
  timeline: { status: OrderStatus; note: string | null; createdAt: string }[];
  shippingAddress: {
    name?: string;
    phone?: string;
    division?: string;
    district?: string;
    area?: string;
    addressLine?: string;
    postalCode?: string | null;
  } | null;
};

export type TrackOrderResult =
  | { ok: true; order: TrackedOrder }
  | { ok: false; error: string };

export async function lookupOrderAction(
  _prev: TrackOrderResult | null,
  formData: FormData
): Promise<TrackOrderResult> {
  const parsed = LookupPayload.safeParse({
    orderNumber: formData.get("orderNumber"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { orderNumber, email, phone } = parsed.data;
  if (!email && !phone) {
    return { ok: false, error: "Enter either your email or phone to find your order." };
  }

  const order = await prisma.order.findFirst({
    where: {
      orderNumber: { equals: orderNumber, mode: "insensitive" as const },
      OR: [
        ...(email ? [{ customerEmail: { equals: email, mode: "insensitive" as const } }] : []),
        ...(phone ? [{ customerPhone: phone }] : []),
      ],
    },
    select: {
      orderNumber: true,
      customerName: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      createdAt: true,
      subtotal: true,
      discount: true,
      deliveryFee: true,
      total: true,
      couponCode: true,
      customerPhone: true,
      shippingAddress: true,
      items: {
        select: {
          id: true,
          productName: true,
          price: true,
          quantity: true,
          total: true,
          variant: { select: { name: true } },
          product: {
            select: {
              slug: true,
              images: {
                select: { url: true, alt: true },
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
            },
          },
        },
      },
      timeline: {
        select: { status: true, note: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    return {
      ok: false,
      error: "No order found. Double-check the order number and email/phone.",
    };
  }

  const address = (order.shippingAddress ?? null) as TrackedOrder["shippingAddress"];
  const customerPhone = order.customerPhone ?? undefined;

  return {
    ok: true,
    order: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt.toISOString(),
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryFee: order.deliveryFee,
      total: order.total,
      couponCode: order.couponCode,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        variantName: item.variant?.name ?? null,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
        productSlug: item.product?.slug ?? null,
        imageUrl: item.product?.images[0]?.url ?? null,
        imageAlt: item.product?.images[0]?.alt ?? item.productName,
      })),
      timeline: order.timeline.map((e) => ({
        status: e.status,
        note: e.note,
        createdAt: e.createdAt.toISOString(),
      })),
      shippingAddress: address ? { ...address, phone: customerPhone } : null,
    },
  };
}