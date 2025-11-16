import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Redis } from '@upstash/redis';
import type { Env } from '../index';

export interface RateLimitConfig {
  max: number;      // Max requests
  window: number;   // Time window in seconds
}

export function createRateLimiter(config: RateLimitConfig) {
  return async function rateLimitMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
    const redis = Redis.fromEnv({
      UPSTASH_REDIS_REST_URL: c.env.REDIS_URL,
      UPSTASH_REDIS_REST_TOKEN: c.env.REDIS_URL.split('@')[0].split('//')[1],
    });

    // Use userId if authenticated, otherwise use IP
    const userId = c.get('userId');
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const identifier = userId || `ip:${ip}`;

    // Create rate limit key
    const endpoint = c.req.path;
    const key = `ratelimit:${identifier}:${endpoint}`;

    try {
      // Sliding window implementation
      const now = Date.now();
      const window = config.window * 1000; // Convert to ms
      const clearBefore = now - window;

      // Remove old entries
      await redis.zremrangebyscore(key, 0, clearBefore);

      // Count current requests
      const count = await redis.zcard(key);

      // Check if limit exceeded
      if (count >= config.max) {
        const oldestEntry = await redis.zrange(key, 0, 0, { withScores: true });
        const resetTime = oldestEntry.length > 0
          ? Math.ceil((Number(oldestEntry[1]) + window) / 1000)
          : Math.ceil((now + window) / 1000);

        // Set rate limit headers
        c.header('X-RateLimit-Limit', config.max.toString());
        c.header('X-RateLimit-Remaining', '0');
        c.header('X-RateLimit-Reset', resetTime.toString());

        throw new HTTPException(429, {
          message: `Rate limit exceeded. Try again in ${Math.ceil((resetTime * 1000 - now) / 1000)} seconds`,
        });
      }

      // Add current request
      await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });

      // Set expiration
      await redis.expire(key, config.window);

      // Set rate limit headers
      const remaining = Math.max(0, config.max - count - 1);
      const resetTime = Math.ceil((now + window) / 1000);

      c.header('X-RateLimit-Limit', config.max.toString());
      c.header('X-RateLimit-Remaining', remaining.toString());
      c.header('X-RateLimit-Reset', resetTime.toString());

      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      // If Redis fails, allow the request (fail open)
      console.error('Rate limiting error:', error);
      await next();
    }
  };
}

// Pre-configured rate limiters
export const rateLimits = {
  // Authentication endpoints
  auth: {
    register: createRateLimiter({ max: 5, window: 3600 }), // 5 per hour
    login: createRateLimiter({ max: 10, window: 900 }), // 10 per 15 min
    forgotPassword: createRateLimiter({ max: 3, window: 3600 }), // 3 per hour
    refreshToken: createRateLimiter({ max: 30, window: 3600 }), // 30 per hour
  },

  // Read operations
  read: {
    standard: createRateLimiter({ max: 100, window: 60 }), // 100 per minute
    feed: createRateLimiter({ max: 30, window: 60 }), // 30 per minute
    search: createRateLimiter({ max: 20, window: 60 }), // 20 per minute
  },

  // Write operations
  write: {
    post: createRateLimiter({ max: 10, window: 3600 }), // 10 per hour
    comment: createRateLimiter({ max: 30, window: 3600 }), // 30 per hour
    update: createRateLimiter({ max: 30, window: 3600 }), // 30 per hour
  },

  // Social interactions
  social: {
    like: createRateLimiter({ max: 100, window: 60 }), // 100 per minute
    follow: createRateLimiter({ max: 50, window: 3600 }), // 50 per hour
    share: createRateLimiter({ max: 30, window: 3600 }), // 30 per hour
  },

  // Media upload
  media: {
    upload: createRateLimiter({ max: 20, window: 3600 }), // 20 per hour
  },
};
