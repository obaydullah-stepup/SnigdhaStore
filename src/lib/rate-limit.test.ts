import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit, clientIp } from "@/lib/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    const key = "login:ip-1";
    expect(rateLimit(key, 3, 60_000)).toEqual({ ok: true, remaining: 2 });
    expect(rateLimit(key, 3, 60_000)).toEqual({ ok: true, remaining: 1 });
    expect(rateLimit(key, 3, 60_000)).toEqual({ ok: true, remaining: 0 });
  });

  it("blocks requests beyond the limit with a retry window", () => {
    const key = "login:ip-2";
    for (let i = 0; i < 2; i++) rateLimit(key, 2, 60_000);
    const result = rateLimit(key, 2, 60_000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("resets the window after it expires", () => {
    const key = "login:ip-3";
    rateLimit(key, 1, 60_000);
    expect(rateLimit(key, 1, 60_000).ok).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:01:00.500Z"));
    expect(rateLimit(key, 1, 60_000)).toEqual({ ok: true, remaining: 0 });
  });

  it("keeps keys isolated", () => {
    expect(rateLimit("a", 1, 60_000).ok).toBe(true);
    expect(rateLimit("b", 1, 60_000).ok).toBe(true);
    expect(rateLimit("a", 1, 60_000).ok).toBe(false);
    expect(rateLimit("b", 1, 60_000).ok).toBe(false);
  });
});

describe("clientIp", () => {
  const makeHeaders = (init?: Record<string, string>) => new Headers(init);

  it("prefers the first x-forwarded-for value", () => {
    const headersValue = makeHeaders({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });
    expect(clientIp(headersValue)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(makeHeaders({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("defaults to unknown when no headers are present", () => {
    expect(clientIp(makeHeaders())).toBe("unknown");
  });
});
