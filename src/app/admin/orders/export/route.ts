import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/generated/prisma/client";
import { paymentStatusLabel, statusLabel } from "@/lib/order-status";
import { paymentMethodLabel } from "@/lib/payments/labels";

function escapeCsv(value: string | null | undefined): string {
  const s = String(value ?? "").replace(/["\n\r]/g, (m) =>
    m === '"' ? '""' : " "
  );
  return `"${s}"`;
}

export async function GET(request: Request) {
  await requireStaff();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const q = searchParams.get("q")?.trim();

  const where = {
    ...(status && status !== "ALL" ? { status: status as OrderStatus } : {}),
    ...(from ? { createdAt: { gte: new Date(from) } } : {}),
    ...(to ? { createdAt: { lte: new Date(to) } } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
            { customerEmail: { contains: q, mode: "insensitive" as const } },
            { customerPhone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      couponCode: true,
      subtotal: true,
      discount: true,
      deliveryFee: true,
      total: true,
      shippingAddress: true,
      _count: { select: { items: true } },
    },
  });

  const header = [
    "order_number",
    "placed_at",
    "customer_name",
    "phone",
    "email",
    "item_count",
    "subtotal",
    "discount",
    "delivery_fee",
    "total",
    "status",
    "payment_status",
    "payment_method",
    "coupon_code",
    "shipping_address",
  ].join(",");

  const rows = orders.map((o) => {
    const address = (o.shippingAddress ?? {}) as {
      addressLine?: string;
      area?: string;
      district?: string;
      division?: string;
      postalCode?: string | null;
    };
    return [
      o.orderNumber,
      o.createdAt.toISOString(),
      o.customerName,
      o.customerPhone,
      o.customerEmail,
      o._count.items,
      o.subtotal,
      o.discount,
      o.deliveryFee,
      o.total,
      statusLabel(o.status),
      paymentStatusLabel(o.paymentStatus),
      paymentMethodLabel(o.paymentMethod),
      o.couponCode,
      [
        address.addressLine,
        address.area,
        address.district,
        address.division,
        address.postalCode,
      ]
        .filter(Boolean)
        .join(", "),
    ]
      .map((v) => escapeCsv(typeof v === "number" ? String(v) : (v as string)))
      .join(",");
  });

  return new NextResponse("\uFEFF" + [header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}