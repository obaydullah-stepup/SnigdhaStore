import { describe, expect, it } from "vitest";
import { generateOpaqueToken, hashToken } from "@/lib/auth/token";

describe("opaque tokens", () => {
  it("returns a URL-safe token of the requested length", () => {
    const token = generateOpaqueToken(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThan(20);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateOpaqueToken()));
    expect(tokens.size).toBe(100);
  });

  it("hashes tokens deterministically to a 64-char hex digest", () => {
    const token = generateOpaqueToken();
    const first = hashToken(token);
    const second = hashToken(token);
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});
