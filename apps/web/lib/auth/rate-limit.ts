// Phase 3 — Stream 3G: In-memory rate limiter for Next.js.
//
// Per-key counters with sliding window. Replaced by Convex-side
// rateLimits table in production (3G full).

const store = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }
  entry.count++;
  if (entry.count > max) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: max - entry.count };
}

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.reset) store.delete(key);
  }
}, 60_000);
