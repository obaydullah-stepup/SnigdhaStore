import { describe, expect, it } from "vitest";
import {
  describeItems,
  INCOMPLETE_TTL_DAYS,
  isExpired,
  itemCountOf,
  mergeCapturedContact,
  parseItemSnapshot,
  resolveStage,
  stageLabel,
  subtotalOf,
  type IncompleteItemSnapshot,
} from "@/lib/incomplete-orders";

function item(overrides: Partial<IncompleteItemSnapshot> = {}): IncompleteItemSnapshot {
  return {
    productId: "p1",
    variantId: null,
    name: "Linen Palazzo Set",
    variantName: null,
    sku: "SNG-1",
    quantity: 2,
    price: 1500,
    total: 3000,
    ...overrides,
  };
}

describe("resolveStage", () => {
  it("is CONTACT without an address", () => {
    expect(resolveStage(null)).toBe("CONTACT");
    expect(resolveStage(undefined)).toBe("CONTACT");
    expect(resolveStage("")).toBe("CONTACT");
  });

  it("is CONTACT when the address is too short to fulfil", () => {
    expect(resolveStage("House 4")).toBe("CONTACT");
  });

  it("is DETAILS once a usable address exists", () => {
    expect(resolveStage("House 4, Road 7, Dhaka 1209")).toBe("DETAILS");
  });

  it("ignores surrounding whitespace", () => {
    expect(resolveStage("   House 4, Road 7, Dhaka   ")).toBe("DETAILS");
  });

  it("labels both stages", () => {
    expect(stageLabel("CONTACT")).toBe("Contact captured");
    expect(stageLabel("DETAILS")).toBe("Address captured");
  });
});

describe("totals", () => {
  it("sums quantities", () => {
    expect(itemCountOf([item(), item({ quantity: 1 })])).toBe(3);
  });

  it("sums price times quantity rather than trusting a stale total field", () => {
    const items = [item({ quantity: 2, price: 1500, total: 0 })];
    expect(subtotalOf(items)).toBe(3000);
  });

  it("is zero for an empty snapshot", () => {
    expect(itemCountOf([])).toBe(0);
    expect(subtotalOf([])).toBe(0);
  });
});

describe("parseItemSnapshot", () => {
  it("round-trips a valid snapshot", () => {
    const parsed = parseItemSnapshot([item()]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].productId).toBe("p1");
    expect(parsed[0].price).toBe(1500);
  });

  it("returns an empty list for non-array JSON", () => {
    expect(parseItemSnapshot(null)).toEqual([]);
    expect(parseItemSnapshot("nope")).toEqual([]);
    expect(parseItemSnapshot({ productId: "p1" })).toEqual([]);
  });

  it("drops entries missing required fields", () => {
    const parsed = parseItemSnapshot([
      null,
      "string",
      { name: "No product id" },
      { productId: "p1" },
      { productId: "p1", name: "No quantity" },
    ]);
    expect(parsed).toEqual([]);
  });

  it("rejects non-positive quantities and negative prices", () => {
    expect(
      parseItemSnapshot([{ productId: "p1", name: "X", quantity: 0, price: 10 }])
    ).toEqual([]);
    expect(
      parseItemSnapshot([{ productId: "p1", name: "X", quantity: 1, price: -5 }])
    ).toEqual([]);
  });

  it("normalises missing variant fields to null and bad numbers away", () => {
    const parsed = parseItemSnapshot([
      { productId: "p1", name: "X", quantity: 1, price: 100, variantId: 42 },
    ]);
    expect(parsed[0].variantId).toBeNull();
    expect(parsed[0].variantName).toBeNull();
  });

  it("drops NaN quantities rather than emitting them", () => {
    expect(
      parseItemSnapshot([{ productId: "p1", name: "X", quantity: "abc", price: 100 }])
    ).toEqual([]);
  });
});

describe("isExpired", () => {
  const now = new Date("2026-09-30T12:00:00.000Z");

  it("is false for a recent update", () => {
    expect(isExpired(new Date("2026-09-30T11:00:00.000Z"), now)).toBe(false);
  });

  it("is false exactly at the ttl boundary", () => {
    const boundary = new Date(now.getTime() - INCOMPLETE_TTL_DAYS * 86_400_000);
    expect(isExpired(boundary, now)).toBe(false);
  });

  it("is true beyond the ttl", () => {
    const old = new Date(now.getTime() - INCOMPLETE_TTL_DAYS * 86_400_000 - 1000);
    expect(isExpired(old, now)).toBe(true);
  });
});

describe("describeItems", () => {
  it("includes quantity, name and variant", () => {
    expect(describeItems([item({ variantName: "Maroon", quantity: 1 })])).toBe(
      "1 × Linen Palazzo Set (Maroon)"
    );
  });

  it("joins multiple lines", () => {
    expect(describeItems([item({ quantity: 1 }), item({ name: "Kurta", quantity: 3 })])).toBe(
      "1 × Linen Palazzo Set, 3 × Kurta"
    );
  });

  it("is empty for no lines", () => {
    expect(describeItems([])).toBe("");
  });
});

describe("mergeCapturedContact", () => {
  it("keeps detail when a late payload carries less", () => {
    const merged = mergeCapturedContact(
      { addressLine: "House 12, Road 7, Dhanmondi, Dhaka 1206", customerEmail: "a@b.com" },
      { addressLine: null, customerEmail: null }
    );
    expect(merged).toEqual({
      addressLine: "House 12, Road 7, Dhanmondi, Dhaka 1206",
      customerEmail: "a@b.com",
      stage: "DETAILS",
    });
  });

  it("upgrades the stage as soon as an address arrives", () => {
    expect(
      mergeCapturedContact(
        { addressLine: null, customerEmail: "a@b.com" },
        { addressLine: "House 12, Road 7, Dhanmondi", customerEmail: "" }
      ).stage
    ).toBe("DETAILS");
  });

  it("falls back to a blank CONTACT record for a first capture", () => {
    expect(mergeCapturedContact(null, { addressLine: "", customerEmail: "" })).toEqual({
      addressLine: null,
      customerEmail: null,
      stage: "CONTACT",
    });
  });

  it("prefers the incoming value when both are present", () => {
    const merged = mergeCapturedContact(
      { addressLine: "Old address that is long enough", customerEmail: "old@b.com" },
      { addressLine: "New address that is long enough", customerEmail: "new@b.com" }
    );
    expect(merged.addressLine).toBe("New address that is long enough");
    expect(merged.customerEmail).toBe("new@b.com");
  });

  it("does not treat a too-short address as captured", () => {
    expect(mergeCapturedContact(null, { addressLine: "short", customerEmail: null }).stage).toBe(
      "CONTACT"
    );
  });
});
