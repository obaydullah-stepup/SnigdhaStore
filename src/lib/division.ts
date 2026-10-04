import { BANGLADESH_DIVISIONS } from "@/constants/bangladesh";

/**
 * Best-effort division detection. Customers enter a single free-text address
 * instead of picking a division, so we sniff the address for a known division
 * name to pick the right shipping zone. Returns "" when nothing matches, in
 * which case the base delivery fee applies.
 */
export function detectDivision(address: string): string {
  const norm = address.toLowerCase();
  for (const division of BANGLADESH_DIVISIONS) {
    if (norm.includes(division.name.toLowerCase())) return division.name;
  }
  return "";
}
