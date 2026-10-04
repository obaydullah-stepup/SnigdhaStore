import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/generated/prisma/client";
import { parseRange, rangeStart, type RangeKey } from "@/lib/data/admin/overview";
import { ORDER_STATUS } from "@/lib/order-status";

export { parseRange };
export type { RangeKey };

export type ReportsData = {
  range: RangeKey;
  revenue: number;
  orders: number;
  itemsSold: number;
  avgOrderValue: number;
  refunded: number;
  statusBreakdown: { status: string; count: number; total: number }[];
  categorySales: { name: string; total: number; units: number }[];
  bestCustomers: { name: string; email: string | null; orders: number; total: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
};

export async function getReports(range: RangeKey): Promise<ReportsData> {
  const { start, end } = rangeStart(range);

  const validStatusFilter = { notIn: ["CANCELLED", "RETURNED"] as OrderStatus[] };

  const [orders, orderItems] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: {
        status: true,
        total: true,
        paymentMethod: true,
        customerName: true,
        customerEmail: true,
      },
    }),
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: start, lte: end }, status: validStatusFilter } },
      select: {
        quantity: true,
        total: true,
        productName: true,
        product: {
          select: { name: true, category: { select: { name: true } } },
        },
      },
    }),
  ]);

  const valid = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "RETURNED");
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const itemsSold = orderItems.reduce((s, i) => s + i.quantity, 0);
  const refunded = orders.reduce((s, o) => {
    if (o.status !== "RETURNED" && o.status !== "CANCELLED") return s;
    return s + (o.status === "RETURNED" ? o.total : 0);
  }, 0);

  const byStatus = new Map<string, { count: number; total: number }>();
  for (const o of orders) {
    const cur = byStatus.get(o.status) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += o.total;
    byStatus.set(o.status, cur);
  }
  const statusBreakdown = [...byStatus.entries()].map(([status, v]) => ({
    status,
    count: v.count,
    total: v.total,
  }));

  const byCategory = new Map<string, { total: number; units: number }>();
  for (const item of orderItems) {
    const cat = item.product?.category?.name ?? "Other";
    const cur = byCategory.get(cat) ?? { total: 0, units: 0 };
    cur.total += item.total;
    cur.units += item.quantity;
    byCategory.set(cat, cur);
  }
  const categorySales = [...byCategory.entries()].map(([name, v]) => ({
    name,
    total: v.total,
    units: v.units,
  }));

  const byCustomer = new Map<string, { name: string; email: string | null; orders: number; total: number }>();
  for (const o of valid) {
    const key = o.customerEmail ?? o.customerName;
    const cur = byCustomer.get(key) ?? {
      name: o.customerName,
      email: o.customerEmail,
      orders: 0,
      total: 0,
    };
    cur.orders += 1;
    cur.total += o.total;
    cur.name = o.customerName;
    cur.email = o.customerEmail ?? cur.email;
    byCustomer.set(key, cur);
  }
  const bestCustomers = [...byCustomer.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const byMethod = new Map<string, { count: number; total: number }>();
  for (const o of valid) {
    const method = o.paymentMethod ?? "UNKNOWN";
    const cur = byMethod.get(method) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += o.total;
    byMethod.set(method, cur);
  }
  const paymentMethods = [...byMethod.entries()].map(([method, v]) => ({
    method,
    count: v.count,
    total: v.total,
  }));

  return {
    range,
    revenue,
    orders: valid.length,
    itemsSold,
    avgOrderValue: valid.length > 0 ? revenue / valid.length : 0,
    refunded,
    statusBreakdown,
    categorySales: categorySales.sort((a, b) => b.total - a.total),
    bestCustomers,
    paymentMethods,
  };
}

export function statusName(status: string): string {
  return status in ORDER_STATUS ? ORDER_STATUS[status as keyof typeof ORDER_STATUS].label : status;
}