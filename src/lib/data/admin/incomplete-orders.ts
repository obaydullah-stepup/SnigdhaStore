import "server-only";
import { prisma } from "@/lib/prisma";
import type { IncompleteOrderStatus, OrderStatus } from "@/generated/prisma/client";
import { parseItemSnapshot, type IncompleteItemSnapshot } from "@/lib/incomplete-orders";
import { priceLeads } from "@/lib/incomplete-order-totals";

export type IncompleteOrderRow = {
  id: string;
  status: IncompleteOrderStatus;
  stage: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  addressLine: string | null;
  deliveryZone: string | null;
  items: IncompleteItemSnapshot[];
  itemCount: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode: string | null;
  internalNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  convertedAt: Date | null;
  convertedOrder: { id: string; orderNumber: string; status: OrderStatus } | null;
  user: { id: string; name: string; email: string } | null;
  cartItemCount: number;
  /** Live zone resolved from the stored zone or the address, null if undetermined. */
  zoneName: string | null;
  /** True when the live cart price the row total, i.e. what conversion will charge. */
  pricedLive: boolean;
};

export async function getIncompleteOrderList(params: {
  status?: string;
  q?: string;
  page: number;
  perPage?: number;
}) {
  const { status, q, page } = params;
  const perPage = params.perPage ?? 20;

  const where = {
    AND: [
      status && status !== "ALL" ? { status: status as IncompleteOrderStatus } : {},
      q
        ? {
            OR: [
              { customerName: { contains: q, mode: "insensitive" as const } },
              { customerPhone: { contains: q } },
              { customerEmail: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
    ],
  };

  const [total, rows] = await Promise.all([
    prisma.incompleteOrder.count({ where }),
    prisma.incompleteOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        user: { select: { id: true, name: true, email: true } },
        convertedOrder: { select: { id: true, orderNumber: true, status: true } },
      },
    }),
  ]);

  // One cart query for the whole page instead of one count query per row, and
  // price from those live lines so the delivery charge shown is the charge
  // conversion will apply — a lead with no stored zone must not quietly show
  // the base fee for an outside-Dhaka address.
  const priced = await priceLeads(
    rows.map((row) => ({
      cartId: row.cartId,
      deliveryZone: row.deliveryZone,
      addressLine: row.addressLine,
      discount: row.discount,
    }))
  );

  const result: IncompleteOrderRow[] = rows.map((row) => {
    const live = priced.get(row.cartId);
    const pricedLive = Boolean(live && live.lines.length > 0);
    return {
      id: row.id,
      status: row.status,
      stage: row.stage,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerEmail: row.customerEmail,
      addressLine: row.addressLine,
      deliveryZone: row.deliveryZone,
      items: parseItemSnapshot(row.items),
      itemCount: row.itemCount,
      subtotal: pricedLive && live ? live.subtotal : row.subtotal,
      discount: row.discount,
      deliveryFee: pricedLive && live ? live.deliveryFee : row.deliveryFee,
      total: pricedLive && live ? live.total : row.total,
      couponCode: row.couponCode,
      internalNote: row.internalNote,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      convertedAt: row.convertedAt,
      convertedOrder: row.convertedOrder,
      user: row.user,
      cartItemCount: live?.lines.length ?? 0,
      zoneName: live?.zone?.name ?? null,
      pricedLive,
    };
  });

  return { rows: result, total, page, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getIncompleteOrderCounts() {
  const [open, converted, dismissed] = await Promise.all([
    prisma.incompleteOrder.count({ where: { status: "OPEN" } }),
    prisma.incompleteOrder.count({ where: { status: "CONVERTED" } }),
    prisma.incompleteOrder.count({ where: { status: "DISMISSED" } }),
  ]);
  return { open, converted, dismissed };
}
