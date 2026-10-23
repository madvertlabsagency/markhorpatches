import "server-only";

/**
 * Fixed-window in-memory rate limiter. Good enough for a single instance;
 * swap `store` for Redis/Upstash when running multiple instances.
 */
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 10_000) for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
    return { ok: true, retryAfterMs: 0 };
  }
  b.count++;
  return b.count > limit ? { ok: false, retryAfterMs: b.resetAt - now } : { ok: true, retryAfterMs: 0 };
}

export const LIMITS = {
  login: { limit: 8, windowMs: 15 * 60_000 },
  form: { limit: 10, windowMs: 10 * 60_000 },
  upload: { limit: 30, windowMs: 10 * 60_000 },
  tracking: { limit: 20, windowMs: 10 * 60_000 },
  api: { limit: 120, windowMs: 60_000 },
} as const;
