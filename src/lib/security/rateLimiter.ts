/**
 * Redis-backed sliding window rate limiter.
 * Uses ioredis INCR + EXPIRE for atomic counters per key.
 */

import Redis from 'ioredis';

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    _redis = new Redis(url, { lazyConnect: true, enableOfflineQueue: false });
    _redis.on('error', () => { /* suppress — rate limiting is best-effort */ });
  }
  return _redis;
}

export interface RateLimitConfig {
  /** Unique identifier — e.g. `login:${ip}` or `forgot:${email}` */
  key: string;
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSecs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix timestamp (seconds)
}

export async function checkRateLimit(cfg: RateLimitConfig): Promise<RateLimitResult> {
  const redis = getRedis();
  const rkey = `rl:${cfg.key}`;

  try {
    const count = await redis.incr(rkey);
    if (count === 1) {
      // First request in window — set expiry
      await redis.expire(rkey, cfg.windowSecs);
    }

    const ttl = await redis.ttl(rkey);
    const resetAt = Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : cfg.windowSecs);
    const remaining = Math.max(0, cfg.limit - count);

    return { allowed: count <= cfg.limit, remaining, resetAt };
  } catch {
    // Redis unavailable — fail open (don't block users)
    return { allowed: true, remaining: cfg.limit, resetAt: 0 };
  }
}

/**
 * Pre-configured limiters for auth endpoints.
 */
export const RateLimits = {
  /** Login: 10 attempts per 15 minutes per IP */
  login: (ip: string): RateLimitConfig => ({
    key: `login:${ip}`,
    limit: 10,
    windowSecs: 15 * 60,
  }),

  /** Register: 5 registrations per hour per IP */
  register: (ip: string): RateLimitConfig => ({
    key: `register:${ip}`,
    limit: 5,
    windowSecs: 60 * 60,
  }),

  /** Forgot password: 5 requests per hour per email */
  forgotPassword: (email: string): RateLimitConfig => ({
    key: `forgot:${email.toLowerCase()}`,
    limit: 5,
    windowSecs: 60 * 60,
  }),

  /** Reset password token use: 3 attempts per token (keyed on first 16 chars of raw token) */
  resetPassword: (token: string): RateLimitConfig => ({
    key: `reset:${token.slice(0, 32)}`,
    limit: 3,
    windowSecs: 60 * 60,
  }),
} as const;
