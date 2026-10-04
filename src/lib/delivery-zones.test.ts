import { describe, expect, it } from "vitest";
import {
  catchAllZone,
  resolveDeliveryZone,
  zoneForAddress,
  zoneForDivision,
  type ZoneMatch,
} from "@/lib/delivery-zones";

/** Mirrors the seeded zones: Dhaka priced at 60, everything else at 120. */
const ZONES: ZoneMatch[] = [
  {
    id: "zone-dhaka",
    name: "Inside Dhaka",
    divisions: ["Dhaka"],
    matchesAll: false,
    standardFee: 60,
    expressFee: 120,
    freeShippingThreshold: null,
    sortOrder: 1,
  },
  {
    id: "zone-outside",
    name: "Outside Dhaka",
    divisions: [],
    matchesAll: true,
    standardFee: 120,
    expressFee: 140,
    freeShippingThreshold: null,
    sortOrder: 1,
  },
];

const nameOf = (zone: ZoneMatch | null) => zone?.name ?? null;

describe("zoneForDivision", () => {
  it("matches a zone that lists the division", () => {
    expect(nameOf(zoneForDivision("Dhaka", ZONES))).toBe("Inside Dhaka");
  });

  it("is case and whitespace insensitive", () => {
    expect(nameOf(zoneForDivision("  dhaka ", ZONES))).toBe("Inside Dhaka");
  });

  it("supports a zone listing several divisions", () => {
    const multi: ZoneMatch[] = [
      { ...ZONES[0], id: "z", name: "North", divisions: ["Dhaka", "Rajshahi"] },
      { ...ZONES[1], id: "o", matchesAll: true },
    ];
    expect(nameOf(zoneForDivision("Rajshahi", multi))).toBe("North");
  });

  it("returns null for a division no zone claims", () => {
    expect(zoneForDivision("Chattogram", ZONES)).toBeNull();
  });

  it("returns null for an empty division", () => {
    expect(zoneForDivision("", ZONES)).toBeNull();
    expect(zoneForDivision(undefined, ZONES)).toBeNull();
  });

  it("does not match the catch-all zone by division", () => {
    // "Outside Dhaka" lists no divisions; it matches by matchesAll only.
    expect(zoneForDivision("Chattogram", ZONES)).toBeNull();
  });
});

describe("catchAllZone", () => {
  it("finds the matchesAll zone", () => {
    expect(nameOf(catchAllZone(ZONES))).toBe("Outside Dhaka");
  });

  it("is null when no zone matches all", () => {
    expect(catchAllZone([ZONES[0]])).toBeNull();
  });
});

describe("zoneForAddress", () => {
  it("detects Dhaka from the address text", () => {
    expect(nameOf(zoneForAddress("House 7, Road 2, Dhanmondi, Dhaka", ZONES))).toBe(
      "Inside Dhaka"
    );
  });

  it("prices a known outside division at the catch-all rate, not the base fee", () => {
    // The bug this guards: an outside-Dhaka lead fell through to the base
    // config fee (60) instead of the Outside Dhaka fee (120).
    const zone = zoneForAddress("GEC Circle, Chattogram", ZONES);
    expect(nameOf(zone)).toBe("Outside Dhaka");
    expect(zone?.standardFee).toBe(120);
  });

  it("falls back to the catch-all zone for an unrecognisable address", () => {
    expect(nameOf(zoneForAddress("Some village road", ZONES))).toBe("Outside Dhaka");
  });

  it("returns null for an empty address so nothing is guessed", () => {
    expect(zoneForAddress("", ZONES)).toBeNull();
    expect(zoneForAddress("   ", ZONES)).toBeNull();
    expect(zoneForAddress(null, ZONES)).toBeNull();
  });

  it("returns null when no zones are configured", () => {
    expect(zoneForAddress("House 7, Dhaka", [])).toBeNull();
  });
});

describe("resolveDeliveryZone", () => {
  it("prefers an explicitly stored zone over the address", () => {
    // Staff correcting a lead by phone must win over text sniffing.
    expect(
      nameOf(resolveDeliveryZone("zone-outside", "House 7, Dhanmondi, Dhaka", ZONES))
    ).toBe("Outside Dhaka");
  });

  it("accepts a zone name as well as an id", () => {
    expect(nameOf(resolveDeliveryZone("Outside Dhaka", "Dhaka", ZONES))).toBe("Outside Dhaka");
  });

  it("ignores a stale zone id and re-detects from the address", () => {
    expect(nameOf(resolveDeliveryZone("zone-deleted", "Dhanmondi, Dhaka", ZONES))).toBe(
      "Inside Dhaka"
    );
  });

  it("detects from the address when no zone was stored", () => {
    expect(nameOf(resolveDeliveryZone(null, "Barisal", ZONES))).toBe("Outside Dhaka");
    expect(nameOf(resolveDeliveryZone(null, "Mirpur, Dhaka", ZONES))).toBe("Inside Dhaka");
  });

  it("is null when there is no zone and no address", () => {
    expect(resolveDeliveryZone(null, null, ZONES)).toBeNull();
  });
});
