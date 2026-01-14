---
title: Authentication & Authorization
description: Lucia sessions, CASL permissions, OAuth providers, guards, and rate limiting
related_code:
  - packages/auth/src/**/*.ts
  - apps/api/src/middleware/auth.middleware.ts
  - apps/api/src/middleware/session.middleware.ts
  - apps/api/src/middleware/rate-limit.middleware.ts
last_verified: 2026-01-14
---

# Authentication & Authorization

RaptScallions uses a layered authentication and authorization system. Sessions are managed by Lucia v3, OAuth is handled by Arctic, and permissions are enforced through CASL. Rate limiting protects against abuse.

## Architecture Overview

| Layer | Library | Responsibility |
|-------|---------|----------------|
| Sessions | Lucia v3 | Cookie-based session management, validation, expiration |
| Passwords | Argon2id | Secure password hashing (OWASP recommendations) |
| OAuth | Arctic | Google and Microsoft authentication flows |
| Permissions | CASL | Attribute-based access control (ABAC) |
| Guards | Fastify decorators | Route-level authentication requirements |
| Rate Limiting | @fastify/rate-limit + Redis | Request throttling per user/IP |

## Request Flow

When a request arrives at the API, it flows through these middleware layers:

```
Request → Rate Limit → Session Validation → Permission Building → Route Handler
                              ↓                      ↓
                        request.user          request.ability
                        request.session
```

1. **Rate limiting** checks if the requester has exceeded their request quota
2. **Session middleware** validates the session cookie and attaches `request.user` and `request.session`
3. **Permission middleware** builds the user's CASL ability based on group memberships
4. **Route handlers** can use guards (`requireAuth`, `requireRole`) to enforce access

## Quick Start

### Checking Authentication

```typescript
// In any route handler
if (!request.user) {
  throw new UnauthorizedError("Authentication required");
}

// User is authenticated - access user info
console.log(request.user.email);
console.log(request.user.name);
```

### Using Guards

```typescript
// Require any authenticated user
app.get("/profile", {
  preHandler: [app.requireAuth]
}, handler);

// Require specific role(s)
app.post("/admin/settings", {
  preHandler: [app.requireAuth, app.requireRole("system_admin")]
}, handler);

// Require group membership
app.get("/groups/:groupId/members", {
  preHandler: [app.requireAuth, app.requireGroupFromParams()]
}, handler);
```

### Checking Permissions

```typescript
// Check if user can perform action
if (request.ability.can("create", "Tool")) {
  // User can create tools
}

// Check on specific resource
if (app.checkResourcePermission(request.ability, "delete", "Tool", tool)) {
  // User can delete this specific tool
}
```

## Key Files

| File | Purpose |
|------|---------|
| [packages/auth/src/lucia.ts](../../../packages/auth/src/lucia.ts) | Lucia configuration, session cookie settings |
| [packages/auth/src/session.service.ts](../../../packages/auth/src/session.service.ts) | Session CRUD operations |
| [packages/auth/src/abilities.ts](../../../packages/auth/src/abilities.ts) | CASL ability definitions by role |
| [packages/auth/src/permissions.ts](../../../packages/auth/src/permissions.ts) | Permission middleware plugin |
| [packages/auth/src/oauth.ts](../../../packages/auth/src/oauth.ts) | OAuth client configuration |
| [apps/api/src/middleware/session.middleware.ts](../../../apps/api/src/middleware/session.middleware.ts) | Session validation on each request |
| [apps/api/src/middleware/auth.middleware.ts](../../../apps/api/src/middleware/auth.middleware.ts) | Authentication guard decorators |
| [apps/api/src/middleware/rate-limit.middleware.ts](../../../apps/api/src/middleware/rate-limit.middleware.ts) | Rate limiting configuration |

## Concepts

- [Session Lifecycle](/auth/concepts/sessions) — How sessions are created, validated, extended, and expired
- [Lucia Configuration](/auth/concepts/lucia) — Lucia v3 setup, adapter, and type augmentation
- [OAuth Providers](/auth/concepts/oauth) — Google and Microsoft OAuth flows with PKCE
- [CASL Permissions](/auth/concepts/casl) — Role-based permission definitions and hierarchy

## Patterns

- [Authentication Guards](/auth/patterns/guards) — Route-level access control with preHandlers
- [Rate Limiting](/auth/patterns/rate-limiting) — Request throttling configuration and customization

## Troubleshooting

- [Session Issues](/auth/troubleshooting/session-issues) — Session not found, cookie problems, expiration

## Implementation Tasks

| Task | Description | Status |
|------|-------------|--------|
| E02-T002 | Sessions table and Lucia setup | Done |
| E02-T003 | Email/password authentication routes | Done |
| E02-T004 | OAuth integration with Arctic | Done |
| E02-T005 | CASL permission definitions | Done |
| E02-T006 | Authentication guards and decorators | Done |
| E02-T007 | Rate limiting middleware | Done |

## Related Domains

- [API](/api/) — Route handlers that use auth guards
- [Testing](/testing/) — Testing auth middleware and guards
