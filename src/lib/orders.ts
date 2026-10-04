import { Prisma } from "@/generated/prisma/client";

const pad = (n: number, width: number) => String(n).padStart(width, "0");

export function dateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}`;
}

export function orderNumberPrefix(date: Date = new Date()): string {
  return `SNG-${dateKey(date)}-`;
}

/**
 * Returns the next order number for today, e.g. SNG-20260922-0001.
 * The caller is expected to run this inside (or immediately before) a
 * transaction; a unique-conflict retry loop handles concurrent orders.
 */
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  date: Date = new Date()
): Promise<string> {
  const prefix = orderNumberPrefix(date);
  const last = await tx.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  });
  let seq = 0;
  if (last) {
    const parsed = Number.parseInt(last.orderNumber.slice(prefix.length), 10);
    if (Number.isFinite(parsed)) seq = parsed;
  }
  return `${prefix}${pad(seq + 1, 4)}`;
}
