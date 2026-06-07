import 'server-only';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

export interface RateLimitPolicy {
  max: number;
  windowMs: number;
  perIpMax?: number;
}

export const RATE_LIMITS: Record<string, RateLimitPolicy> = {
  'sign-in': { max: 5, windowMs: 5 * 60 * 1000, perIpMax: 20 },
  'sign-up': { max: 5, windowMs: 60 * 60 * 1000 },
  'forget-password': { max: 3, windowMs: 60 * 60 * 1000 },
  'magic-link': { max: 5, windowMs: 60 * 60 * 1000 },
  'sign-in/social': { max: 10, windowMs: 60 * 60 * 1000 },
  'two-factor': { max: 5, windowMs: 5 * 60 * 1000, perIpMax: 20 },
  'backup-code': { max: 5, windowMs: 5 * 60 * 1000 },
};

export class RedisRateLimiter implements RateLimiter {
  private redis: {
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    pttl(key: string): Promise<number>;
  };

  constructor(redisClient: {
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    pttl(key: string): Promise<number>;
  }) {
    this.redis = redisClient;
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const rlKey = `rl:${key}`;
    const count = await this.redis.incr(rlKey);

    if (count === 1) {
      await this.redis.expire(rlKey, Math.ceil(windowMs / 1000));
    }

    const ttl = await this.redis.pttl(rlKey);
    const reset = Date.now() + (ttl > 0 ? ttl : windowMs);
    const remaining = Math.max(0, limit - count);

    return {
      allowed: count <= limit,
      remaining,
      reset,
    };
  }
}

export class MemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; reset: number }>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of this.store) {
          if (now > entry.reset) this.store.delete(key);
        }
      }, 60_000);
    }
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.reset) {
      this.store.set(key, { count: 1, reset: now + windowMs });
      return { allowed: true, remaining: limit - 1, reset: now + windowMs };
    }

    entry.count++;
    const remaining = Math.max(0, limit - entry.count);

    return {
      allowed: entry.count <= limit,
      remaining,
      reset: entry.reset,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

let cachedLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (cachedLimiter) return cachedLimiter;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = require('@upstash/redis') as {
      Redis: new (config: { url: string; token: string }) => {
        incr(key: string): Promise<number>;
        expire(key: string, seconds: number): Promise<number>;
        pttl(key: string): Promise<number>;
      };
    };
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    cachedLimiter = new RedisRateLimiter(redis);
  } else {
    cachedLimiter = new MemoryRateLimiter();
  }

  return cachedLimiter;
}

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

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.reset) store.delete(key);
    }
  }, 60_000);
}
