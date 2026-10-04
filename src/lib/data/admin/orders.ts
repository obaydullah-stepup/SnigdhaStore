import "server-only";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/order-status";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

export { ORDER_STATUSES, PAYMENT_STATUSES };

export function parsePage(raw?: string | null): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function getAdminOrderList(params: {
  q?: string;
  status?: string;
  payment?: string;
  page: number;
  perPage?: number;
}) {
  const { q, status, payment, page } = params;
  const perPage = params.perPage ?? 20;

  const where = {
    AND: [
      q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" as const } },
              { customerName: { contains: q, mode: "insensitive" as const } },
              { customerEmail: { contains: q, mode: "insensitive" as const } },
              { customerPhone: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
      status && status !== "ALL" ? { status: status as OrderStatus } : {},
      payment && payment !== "ALL" ? { paymentStatus: payment as PaymentStatus } : {},
    ],
  };

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        userId: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getAdminOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" } },
            },
          },
          variant: { select: { name: true } },
        },
      },
      timeline: { orderBy: { createdAt: "asc" } },
      user: {
        select: { id: true, name: true, email: true, phone: true, createdAt: true },
      },
    },
  });
}
