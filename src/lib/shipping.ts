import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DELIVERY_METHODS } from "@/constants/bangladesh";
import { type ShippingConfig } from "@/lib/delivery-fees";

// Fee arithmetic lives in a pure module so the admin editor can preview the
// charge for each zone. Re-exported here to keep the existing import sites.
export { deliveryFeeForZone, deliveryFreeEligible, type ShippingConfig } from "@/lib/delivery-fees";

const DEFAULTS: ShippingConfig = {
  standardFee: 60,
  expressFee: 120,
  freeShippingThreshold: 3000,
};

export type ShippingZoneRow = {
  id: string;
  name: string;
  description: string | null;
  divisions: string[];
  matchesAll: boolean;
  standardFee: number;
  expressFee: number;
  freeShippingThreshold: number | null;
  isActive: boolean;
  sortOrder: number;
};

export async function getShippingConfig(): Promise<ShippingConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: "shipping." } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const num = (key: string, fallback: number) => {
    const raw = map.get(key);
    const parsed = raw ? Number.parseFloat(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    standardFee: num("shipping.standardFee", DEFAULTS.standardFee),
    expressFee: num("shipping.expressFee", DEFAULTS.expressFee),
    freeShippingThreshold: num(
      "shipping.freeShippingThreshold",
      DEFAULTS.freeShippingThreshold
    ),
  };
}

export type DeliveryMethodId = "standard" | "express";

export const DEFAULT_ZONE_ID = "default";

const zonesCache = unstable_cache(
  async (): Promise<ShippingZoneRow[]> => {
    return prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },
  ["shipping-zones"],
  { revalidate: 60, tags: ["shipping-zones"] }
);

export async function getShippingZones(): Promise<ShippingZoneRow[]> {
  return zonesCache();
}

export function getDeliveryMethodLabel(
  id: string
): (typeof DELIVERY_METHODS)[number] | null {
  return DELIVERY_METHODS.find((m) => m.id === id) ?? null;
}
