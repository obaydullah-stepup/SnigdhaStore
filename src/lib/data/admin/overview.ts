import "server-only";
import { prisma } from "@/lib/prisma";
import { getLowStockThreshold } from "@/lib/inventory";

export type RangeKey = 7 | 30 | 90;

export function parseRange(raw: string | undefined): RangeKey {
  if (raw === "7" || raw === "30" || raw === "90") return Number(raw) as RangeKey;
  return 30;
}

export function rangeStart(
  days: RangeKey,
  now = new Date()
): {
  start: Date;
  end: Date;
} {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type OverviewStats = {
  range: RangeKey;
  revenue: number;
  orders: number;
  totalOrders: number;
  customers: number;
  products: number;
  lowStock: number;
  pendingOrders: number;
  revenueSeries: { date: string; label: string; revenue: number; orders: number }[];
  categorySales: { name: string; total: number }[];
  topProducts: { name: string; total: number; sold: number }[];
};

export async function getOverview(range: RangeKey): Promise<OverviewStats> {
  const { start, end } = rangeStart(range);
  const lowStockThreshold = await getLowStockThreshold();

  const [ordersInRange, totalOrders, customers, products, lowStock, pendingOrders] =
    await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: {
          createdAt: true,
          total: true,
          status: true,
          paymentStatus: true,
        },
      }),
      prisma.order.count({ where: { status: { notIn: ["CANCELLED", "RETURNED"] } } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count(),
      prisma.product.count({ where: { stock: { lte: lowStockThreshold } } }),
      prisma.order.count({ where: { status: "PENDING" } }),
    ]);

  const revenue = ordersInRange
    .filter((o) => o.status !== "CANCELLED" && o.status !== "RETURNED")
    .reduce((s, o) => s + o.total, 0);
  const orders = ordersInRange.length;

  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < range; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    byDay.set(dateKey(d), { revenue: 0, orders: 0 });
  }
  for (const o of ordersInRange) {
    const bucket = byDay.get(dateKey(o.createdAt));
    if (!bucket) continue;
    bucket.orders += 1;
    if (o.status !== "CANCELLED" && o.status !== "RETURNED") {
      bucket.revenue += o.total;
    }
  }
  const revenueSeries = [...byDay.entries()].map(([date, v]) => ({
    date,
    label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
    revenue: v.revenue,
    orders: v.orders,
  }));

  const orderItemRows = await prisma.orderItem.findMany({
    where: {
      order: {
        createdAt: { gte: start, lte: end },
        status: { notIn: ["CANCELLED", "RETURNED"] },
      },
    },
    select: {
      total: true,
      quantity: true,
      productName: true,
      product: { select: { name: true, category: { select: { name: true } } } },
    },
  });

  const byCategory = new Map<string, number>();
  const byProduct = new Map<string, { name: string; total: number; sold: number }>();
  for (const item of orderItemRows) {
    const cat = item.product?.category?.name ?? "Other";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + item.total);
    const pName = item.product?.name ?? item.productName;
    const cur = byProduct.get(pName) ?? { name: pName, total: 0, sold: 0 };
    cur.total += item.total;
    cur.sold += item.quantity;
    byProduct.set(pName, cur);
  }

  return {
    range,
    revenue,
    orders,
    totalOrders,
    customers,
    products,
    lowStock,
    pendingOrders,
    revenueSeries,
    categorySales: [...byCategory.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total),
    topProducts: [...byProduct.values()].sort((a, b) => b.total - a.total).slice(0, 5),
  };
}

export async function getRecentOrders(limit = 8) {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerPhone: true,
      status: true,
      paymentStatus: true,
      total: true,
      createdAt: true,
    },
  });
}

export type AdminOrderRow = Awaited<ReturnType<typeof getRecentOrders>>[number];
