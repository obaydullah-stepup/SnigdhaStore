import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SETTINGS_CACHE_TAG } from "@/lib/settings";

export const LOW_STOCK_THRESHOLD_KEY = "inventory.lowStockThreshold";
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

async function readLowStockThreshold(): Promise<number> {
  const row = await prisma.setting.findUnique({
    where: { key: LOW_STOCK_THRESHOLD_KEY },
    select: { value: true },
  });
  const n = Number(row?.value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_LOW_STOCK_THRESHOLD;
}

export const getLowStockThreshold = unstable_cache(
  readLowStockThreshold,
  ["low-stock-threshold"],
  { tags: [SETTINGS_CACHE_TAG], revalidate: 60 }
);

export function meetsAlertThreshold(stock: number, threshold: number): boolean {
  return stock <= threshold;
}