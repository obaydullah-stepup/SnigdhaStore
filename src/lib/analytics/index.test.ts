import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isValidMetaPixelId,
  normalizeMetaPixelId,
  track,
  type TrackName,
} from "@/lib/analytics";

const ALL_EVENTS: TrackName[] = [
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "purchase",
  "search",
  "add_to_wishlist",
  "apply_coupon",
];

describe("track (server-safe stub)", () => {
  it("is a no-op that never throws", () => {
    expect(() => track("view_item", { item_id: "abc", price: 100 })).not.toThrow();
  });

  it("handles every TrackName with and without payloads", () => {
    for (const name of ALL_EVENTS) {
      expect(() => track(name)).not.toThrow();
      expect(() => track(name, { note: "x" })).not.toThrow();
    }
  });
});

describe("Meta Pixel ID validation", () => {
  it("accepts real 10-20 digit pixel IDs", () => {
    expect(isValidMetaPixelId("1234567890123456")).toBe(true);
    expect(isValidMetaPixelId("1234567890")).toBe(true);
    expect(isValidMetaPixelId("12345678901234567890")).toBe(true);
  });

  it("rejects malformed values", () => {
    expect(isValidMetaPixelId("")).toBe(false);
    expect(isValidMetaPixelId("12345")).toBe(false);
    expect(isValidMetaPixelId("123456789012345678901")).toBe(false);
    expect(isValidMetaPixelId("123456789012345a")).toBe(false);
    expect(isValidMetaPixelId("1234 5678 9012 3456")).toBe(false);
    expect(isValidMetaPixelId("1234567890123456\nalert(1)")).toBe(false);
  });

  it("normalises to empty when invalid, trimming whitespace when valid", () => {
    expect(normalizeMetaPixelId("  1234567890123456  ")).toBe("1234567890123456");
    expect(normalizeMetaPixelId("not-a-pixel")).toBe("");
    expect(normalizeMetaPixelId(undefined)).toBe("");
    expect(normalizeMetaPixelId(null)).toBe("");
  });
});

describe("env-gated analytics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is a no-op when no tracking IDs are configured", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "");
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "");

    const mod = await import("@/lib/analytics");
    expect(mod.GA_MEASUREMENT_ID).toBeFalsy();
    expect(mod.GTM_ID).toBeFalsy();
    expect(mod.ENV_META_PIXEL_ID).toBeFalsy();
    expect(mod.hasAnalytics).toBe(false);
  });

  it("enables analytics when any ID is present", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");

    const mod = await import("@/lib/analytics");
    expect(mod.GA_MEASUREMENT_ID).toBe("G-TEST123");
    expect(mod.hasAnalytics).toBe(true);
  });

  it("exposes the env pixel ID as the fallback default", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "1234567890123456");

    const mod = await import("@/lib/analytics");
    expect(mod.ENV_META_PIXEL_ID).toBe("1234567890123456");
  });
});
