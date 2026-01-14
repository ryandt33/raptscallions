---
title: Rate Limiting
description: Request throttling configuration and customization
related_code:
  - apps/api/src/middleware/rate-limit.middleware.ts
last_verified: 2026-01-14
---

# Rate Limiting

Rate limiting protects the API from abuse by throttling requests. The implementation uses `@fastify/rate-limit` with Redis for distributed state across multiple API instances.

## Overview

| Limit Type | Target | Max Requests | Time Window |
|------------|--------|--------------|-------------|
| API (authenticated) | User ID | 100 | 1 minute |
| API (anonymous) | IP address | 100 | 1 minute |
| Auth routes | IP address | 5 | 1 minute |

## How It Works

```
Request arrives
    ↓
Check if /auth route?
    ↓
Yes → Use IP-based auth limit (5/min)
No → Check if authenticated?
    ↓
Yes → Use user-based limit (100/min)
No → Use IP-based limit (100/min)
    ↓
Counter in Redis
    ↓
Under limit → Process request
Over limit → Return 429
```

## Configuration

Rate limits are configured via environment variables:

```bash
# .env
RATE_LIMIT_API_MAX=100        # Requests per window for API routes
RATE_LIMIT_AUTH_MAX=5         # Requests per window for auth routes
RATE_LIMIT_TIME_WINDOW=60000  # Time window in milliseconds (1 minute)
REDIS_URL=redis://localhost:6379
```

## Implementation

```typescript
// apps/api/src/middleware/rate-limit.middleware.ts
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";

const rateLimitPlugin: FastifyPluginAsync = async (app) => {
  const redis = new Redis(config.REDIS_URL, {
    connectionName: "rate-limit",
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
  });

  await app.register(rateLimit, {
    global: true,
    max: (request) => {
      if (request.url.startsWith("/auth")) {
        return config.RATE_LIMIT_AUTH_MAX;
      }
      return config.RATE_LIMIT_API_MAX;
    },
    timeWindow: config.RATE_LIMIT_TIME_WINDOW,
    redis,
    keyGenerator: (request) => {
      if (request.url.startsWith("/auth")) {
        return `auth:${request.ip}`;
      }
      if (request.user) {
        return `user:${request.user.id}`;
      }
      return `ip:${request.ip}`;
    },
    errorResponseBuilder,
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    nameSpace: "rapt:rl:",
  });
};
```

## Key Generation

The key generator determines how requests are grouped for rate limiting:

```typescript
keyGenerator: (request) => {
  // Auth routes: always use IP
  if (request.url.startsWith("/auth")) {
    return `auth:${request.ip}`;
  }

  // Authenticated users: use user ID
  if (request.user) {
    return `user:${request.user.id}`;
  }

  // Anonymous: use IP
  return `ip:${request.ip}`;
}
```

**Why user-based for authenticated requests?**

Schools and offices share IPs. Without user-based limiting:
- One heavy user could block everyone on the network
- Rate limits would be too restrictive per-user

With user-based limiting, each authenticated user gets their own quota.

## Response Headers

Every response includes rate limit headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed |
| `X-RateLimit-Remaining` | Requests remaining in window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `Retry-After` | Seconds until retry (on 429 only) |

**Example headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705247400
```

## Error Response

When rate limit is exceeded, a 429 response is returned:

```typescript
const errorResponseBuilder = (request, context) => {
  const resetAt = new Date(Date.now() + context.ttl);
  const isAuthRoute = request.url.startsWith("/auth");

  const message = isAuthRoute
    ? `For security, login attempts are limited to ${context.max} per minute. Please wait ${context.after} seconds.`
    : `You've reached the request limit of ${context.max} per minute. Please wait ${context.after} seconds.`;

  return {
    statusCode: 429,
    error: "Too many requests, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
    details: {
      limit: context.max,
      remaining: 0,
      resetAt: resetAt.toISOString(),
      retryAfter: context.after,
      message,
    },
  };
};
```

**Response body:**

```json
{
  "statusCode": 429,
  "error": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "remaining": 0,
    "resetAt": "2026-01-14T12:00:00.000Z",
    "retryAfter": "45",
    "message": "You've reached the request limit of 100 per minute. Please wait 45 seconds."
  }
}
```

## Route-Specific Limits

Override limits for specific routes using route config:

```typescript
app.post("/expensive-operation", {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: "1 hour"
    }
  }
}, handler);
```

This route allows only 10 requests per hour, regardless of the global limit.

## Auth Route Strategy

Auth routes use stricter IP-based limiting:

| Route | Limit | Reason |
|-------|-------|--------|
| `/auth/login` | 5/min per IP | Prevent brute force |
| `/auth/register` | 5/min per IP | Prevent spam registration |
| `/auth/google` | 5/min per IP | Prevent OAuth spam |
| `/auth/microsoft` | 5/min per IP | Prevent OAuth spam |

::: warning Why IP-Based for Auth?
Auth routes can't use user-based limiting because the user isn't authenticated yet. IP-based limiting prevents distributed brute force attacks.
:::

## Redis Storage

Rate limit counters are stored in Redis for:
- **Distributed state**: Multiple API instances share the same limits
- **Performance**: Fast increment and TTL operations
- **Persistence**: Counters survive process restarts

**Redis key format:**

```
rapt:rl:user:abc-123-def      # Authenticated user
rapt:rl:ip:192.168.1.1        # Anonymous IP
rapt:rl:auth:192.168.1.1      # Auth route
```

### Connection Handling

```typescript
redis.on("error", (error) => {
  logger.error({ error }, "Redis connection error");
});

redis.on("connect", () => {
  logger.info("Redis connected for rate limiting");
});
```

::: info Redis Failure Mode
If Redis becomes unavailable, rate limiting will fail open (allow requests) rather than blocking all traffic. This prevents Redis issues from causing complete API outages.
:::

## Testing Rate Limits

```bash
# Test API rate limit (should fail after 100 requests)
for i in {1..110}; do curl http://localhost:3000/api/health; done

# Test auth rate limit (should fail after 5 requests)
for i in {1..10}; do curl http://localhost:3000/auth/login; done
```

## Monitoring

Log rate limit events for monitoring:

```typescript
// The plugin automatically logs when limits are exceeded
// Configure alerting on RATE_LIMIT_EXCEEDED error code
```

**Key metrics to track:**
- Rate limit hit rate by endpoint
- Rate limit exceeded events by user/IP
- Redis connection health
- Auth route brute force attempts

## Best Practices

### Set Appropriate Limits

Consider:
- Normal usage patterns
- Peak traffic expectations
- Attack mitigation needs

```typescript
// Example: different limits for different use cases
RATE_LIMIT_API_MAX=100      // Normal API access
RATE_LIMIT_AUTH_MAX=5       // Auth (brute force prevention)
// Consider: RATE_LIMIT_AI_MAX=20 for AI endpoints (expensive)
```

### Handle 429 Errors in Clients

```typescript
// Client-side handling
async function fetchWithRetry(url: string, options: RequestInit) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = parseInt(data.details.retryAfter, 10);

    await sleep(retryAfter * 1000);
    return fetchWithRetry(url, options);
  }

  return response;
}
```

### Use Route-Specific Limits

Expensive operations should have tighter limits:

```typescript
app.post("/ai/generate", {
  config: {
    rateLimit: { max: 20, timeWindow: "1 minute" }
  }
}, handler);

app.get("/reports/export", {
  config: {
    rateLimit: { max: 5, timeWindow: "1 hour" }
  }
}, handler);
```

## Related Pages

- [Authentication Guards](/auth/patterns/guards) — Combining rate limits with auth
- [Session Lifecycle](/auth/concepts/sessions) — How sessions enable user-based limiting
