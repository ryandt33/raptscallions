---
title: Auth Patterns
description: Reusable implementation patterns for authentication and authorization
---

# Auth Patterns

Practical patterns for implementing authentication and authorization in routes and services.

## Topics

- [Authentication Guards](/auth/patterns/guards) — Route-level access control with Fastify preHandlers
- [Rate Limiting](/auth/patterns/rate-limiting) — Request throttling configuration and customization

## Quick Reference

| Pattern | Key File | Purpose |
|---------|----------|---------|
| Guards | `apps/api/src/middleware/auth.middleware.ts` | Route-level auth checks |
| Rate Limiting | `apps/api/src/middleware/rate-limit.middleware.ts` | Request throttling |

## Common Usage

### Basic Protected Route

```typescript
app.get("/profile", {
  preHandler: [app.requireAuth]
}, handler);
```

### Role-Based Protection

```typescript
app.post("/admin/settings", {
  preHandler: [app.requireAuth, app.requireRole("system_admin")]
}, handler);
```

### Permission-Based Protection

```typescript
app.post("/tools", {
  preHandler: [app.requireAuth, app.requirePermission("create", "Tool")]
}, handler);
```

## Related

- [Auth Concepts](/auth/concepts/) — Understanding how auth works
- [Auth Troubleshooting](/auth/troubleshooting/) — Common issues and solutions
