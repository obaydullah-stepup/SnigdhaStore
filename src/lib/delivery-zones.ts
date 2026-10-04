import { detectDivision } from "@/lib/division";

/**
 * The parts of a shipping zone that decide *which* zone an order belongs to
 * and what it costs. Structurally a subset of `ShippingZoneRow`, kept separate
 * so this module stays free of `server-only` and can be unit tested.
 */
export type ZoneMatch = {
  id: string;
  name: string;
  divisions: string[];
  matchesAll: boolean;
  standardFee: number;
  expressFee: number;
  freeShippingThreshold: number | null;
  sortOrder: number;
};

const norm = (value: string) => value.trim().toLowerCase();

/**
 * The zone that explicitly claims a division, e.g. "Dhaka" -> "Inside Dhaka".
 * A zone may list several divisions, so this is a membership test rather than
 * an equality test.
 */
export function zoneForDivision(
  division: string | null | undefined,
  zones: ZoneMatch[]
): ZoneMatch | null {
  const target = norm(division ?? "");
  if (!target) return null;
  return (
    zones.find((zone) => (zone.divisions ?? []).some((d) => norm(d) === target)) ?? null
  );
}

/**
 * The catch-all zone. Stores use this for "everywhere else" (e.g. an
 * "Outside Dhaka" zone with `matchesAll`), so an address we cannot place in a
 * named division still lands on a deliberate, priced zone instead of silently
 * dropping to the base config fee.
 */
export function catchAllZone(zones: ZoneMatch[]): ZoneMatch | null {
  return zones.find((zone) => zone.matchesAll) ?? null;
}

/**
 * Resolve the delivery zone for a free-text address. Customers type one line
 * rather than picking a division, so sniff it for a known division name and
 * fall back to the catch-all zone.
 */
export function zoneForAddress(
  address: string | null | undefined,
  zones: ZoneMatch[]
): ZoneMatch | null {
  const trimmed = (address ?? "").trim();
  if (!trimmed) return null;
  return zoneForDivision(detectDivision(trimmed), zones) ?? catchAllZone(zones);
}

/**
 * Single entry point used by capture, the admin editor and conversion.
 *
 * An explicitly stored zone always wins — staff may have corrected it by
 * phone. Otherwise fall back to detecting it from the address, and finally to
 * the catch-all zone. Returns null only when nothing can be determined, which
 * leaves the caller on the base config fee.
 */
export function resolveDeliveryZone(
  zoneId: string | null | undefined,
  address: string | null | undefined,
  zones: ZoneMatch[]
): ZoneMatch | null {
  const explicit = norm(zoneId ?? "");
  if (explicit) {
    const found = zones.find((zone) => zone.id === zoneId || norm(zone.name) === explicit);
    if (found) return found;
  }
  return zoneForAddress(address, zones);
}
