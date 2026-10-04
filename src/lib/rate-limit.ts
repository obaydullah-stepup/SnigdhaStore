type Bucket = {
  count: number;
  resetAt: number;
};

const MAX_STORE_SIZE = 5_000;

const globalStore = globalThis as unknown as {
  __snigdhaRateLimitStore?: Map<string, Bucket>;
};
const store: Map<string, Bucket> = globalStore.__snigdhaRateLimitStore ?? new Map();
globalStore.__snigdhaRateLimitStore = store;

export type RateLimitResult =
  { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number };

function pruneExpired(now: number): void {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (store.size >= MAX_STORE_SIZE) pruneExpired(now);

  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count };
}

export function clientIp(headersValue: Headers): string {
  const forwarded = headersValue.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headersValue.get("x-real-ip") ?? "unknown";
}
