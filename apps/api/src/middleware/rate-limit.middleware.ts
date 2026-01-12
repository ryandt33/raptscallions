import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";
import { config } from "../config.js";
import { RateLimitError } from "@raptscallions/core";
import { getLogger } from "@raptscallions/telemetry";

const logger = getLogger("rate-limit-middleware");

/**
 * Rate limiting middleware using Redis for distributed state.
 *
 * Provides two main strategies:
 * 1. Default API rate limiting (100 req/min per user, IP fallback)
 * 2. Auth route rate limiting (5 req/min per IP only)
 *
 * Routes can override limits via config:
 * ```typescript
 * app.post('/expensive', {
 *   config: {
 *     rateLimit: {
 *       max: 10,
 *       timeWindow: '1 hour'
 *     }
 *   }
 * }, handler);
 * ```
 */
const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  // Create Redis client for rate limit storage
  const redis = new Redis(config.REDIS_URL, {
    // Connection name for debugging
    connectionName: "rate-limit",
    // Retry strategy for resilience
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn({ times, delay }, "Redis connection retry");
      return delay;
    },
    // Max retries before failing
    maxRetriesPerRequest: 3,
  });

  // Handle Redis connection errors
  redis.on("error", (error: Error) => {
    logger.error({ error }, "Redis connection error");
  });

  redis.on("connect", () => {
    logger.info("Redis connected for rate limiting");
  });

  // Key generator function - determines how to identify requester
  const keyGenerator = (request: FastifyRequest): string => {
    // For authenticated users on non-auth routes, use user ID
    // This allows shared IPs (schools, offices) and prevents
    // one user from blocking others on the same network
    if (request.user) {
      return `user:${request.user.id}`;
    }

    // For anonymous requests and all auth routes, use IP
    // Auth routes always use IP to prevent distributed attacks
    return `ip:${request.ip}`;
  };

  // Error response builder - formats 429 errors
  const errorResponseBuilder = (
    request: FastifyRequest,
    context: { max: number; after: string; ttl: number }
  ) => {
    // Calculate reset timestamp
    const resetAt = new Date(Date.now() + context.ttl);

    // Determine if this is an auth route for context-aware messaging
    const isAuthRoute = request.url.startsWith("/auth");

    // Context-aware user message
    const message = isAuthRoute
      ? `For security, login attempts are limited to ${context.max} per minute. Please wait ${context.after} seconds.`
      : `You've reached the request limit of ${context.max} per minute. Please wait ${context.after} seconds.`;

    // Return plain error response object (not RateLimitError instance)
    // @fastify/rate-limit will handle setting status code and headers
    return {
      statusCode: 429,
      error: "Too many requests, please try again later",
      code: "RATE_LIMIT_EXCEEDED",
      details: {
        limit: context.max,
        remaining: 0,
        resetAt: resetAt.toISOString(),
        retryAfter: context.after,
        message, // Context-aware user-friendly message
      },
    };
  };

  // Auth route key generator - always uses IP
  const authKeyGenerator = (request: FastifyRequest): string => {
    return `auth:${request.ip}`;
  };

  // Register global rate limiter with dynamic limits based on route
  await app.register(rateLimit, {
    global: true,
    // Dynamic max based on route - auth routes get stricter limits
    max: (request: FastifyRequest) => {
      if (request.url.startsWith("/auth")) {
        return config.RATE_LIMIT_AUTH_MAX;
      }
      return config.RATE_LIMIT_API_MAX;
    },
    timeWindow: config.RATE_LIMIT_TIME_WINDOW,
    redis,
    // Dynamic key generator based on route
    keyGenerator: (request: FastifyRequest): string => {
      if (request.url.startsWith("/auth")) {
        // Auth routes use IP-based limiting with auth prefix
        return authKeyGenerator(request);
      }
      // Non-auth routes use user ID or IP
      return keyGenerator(request);
    },
    errorResponseBuilder,
    // Add rate limit headers to all responses
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    // Skip successful requests from logging (reduce noise)
    skipOnError: false,
    // Namespace for Redis keys to avoid collisions
    nameSpace: "rapt:rl:",
  });

  // Decorate app with helper for auth rate limiter (kept for API compatibility)
  // This is now a no-op since auth limiting is handled by the global limiter
  app.decorate("createAuthRateLimiter", () => {
    return async (_authApp: typeof app) => {
      // No-op - auth rate limiting is handled by the global rate limiter
      // with dynamic max based on request.url
    };
  });
};

// Export wrapped with fastify-plugin to skip encapsulation
export const rateLimitMiddleware = fp(rateLimitPlugin, {
  name: "rateLimitMiddleware",
  dependencies: ["@fastify/cookie"], // Requires cookies for session
});

// Augment Fastify instance with rate limit decorator
declare module "fastify" {
  interface FastifyInstance {
    createAuthRateLimiter: () => FastifyPluginAsync;
  }
}
