---
title: Session Lifecycle
description: How Lucia sessions are created, validated, extended, and expired
related_code:
  - packages/auth/src/session.service.ts
  - packages/auth/src/lucia.ts
  - apps/api/src/middleware/session.middleware.ts
last_verified: 2026-01-14
---

# Session Lifecycle

Sessions track authenticated users across requests. Lucia manages session IDs, expiration, and cookie handling automatically. This page explains how sessions flow through creation, validation, extension, and expiration.

## Session Flow

```
Login → Create Session → Set Cookie → Validate on Each Request → Extend if Fresh → Expire
```

## Session Creation

Sessions are created after successful authentication (login, registration, or OAuth callback).

```typescript
// packages/auth/src/session.service.ts
async create(userId: string, context: string = "unknown"): Promise<Session> {
  const session = await lucia.createSession(userId, {
    context,
    last_activity_at: new Date(),
  });
  return session;
}
```

**Key points:**

- Lucia generates a cryptographically random session ID
- Sessions are stored in the `sessions` table
- The `context` field tracks how the session was created (e.g., `oauth_google`, `password`, `unknown`)
- `last_activity_at` enables idle timeout detection

### Setting the Session Cookie

After creating a session, set the cookie on the response:

```typescript
// apps/api/src/routes/auth.routes.ts
const session = await lucia.createSession(user.id, {
  context: "unknown",
  last_activity_at: new Date(),
});

const sessionCookie = lucia.createSessionCookie(session.id);
reply.setCookie(
  sessionCookie.name,      // "rapt_session"
  sessionCookie.value,     // session ID
  sessionCookie.attributes // httpOnly, secure, sameSite
);
```

## Session Validation

Every request goes through session validation via the session middleware.

```typescript
// apps/api/src/middleware/session.middleware.ts
app.addHook("onRequest", async (request, reply) => {
  const sessionId = request.cookies[sessionService.sessionCookieName];

  if (!sessionId) {
    request.user = null;
    request.session = null;
    return;
  }

  const { session, user } = await sessionService.validate(sessionId);

  if (session?.fresh) {
    reply.setCookie(
      sessionService.sessionCookieName,
      session.id,
      sessionService.sessionCookieAttributes
    );
  }

  if (!session) {
    const blankCookie = sessionService.createBlankSessionCookie();
    reply.setCookie(blankCookie.name, blankCookie.value, blankCookie.attributes);
  }

  request.user = user;
  request.session = session;
});
```

**After middleware runs:**

- `request.user` is the authenticated user or `null`
- `request.session` is the session object or `null`

## Session Extension (Fresh Sessions)

Lucia automatically extends sessions that are "fresh" — less than 50% of their lifetime remaining.

When a session is fresh:
1. Lucia updates `expires_at` in the database
2. The middleware sets a new cookie with the extended expiration

This means active users never experience session expiration without warning.

::: tip Automatic Extension
Users don't need to re-login as long as they're actively using the application. A session with 30-day expiration that's accessed daily will effectively never expire.
:::

## Session Expiration

Sessions expire when:
1. **Time-based expiration**: The `expires_at` timestamp passes
2. **Explicit logout**: User logs out via `/auth/logout`
3. **User invalidation**: All user sessions invalidated (password change, account suspension)

### Handling Expired Sessions

When validation fails (session expired or invalid):

```typescript
// Session service returns null for invalid sessions
const { session, user } = await lucia.validateSession(sessionId);

if (!session) {
  // Session is invalid - clear the cookie
  const blankCookie = sessionService.createBlankSessionCookie();
  reply.setCookie(blankCookie.name, blankCookie.value, blankCookie.attributes);
}
```

### Logout

Logout invalidates the session and clears the cookie:

```typescript
// apps/api/src/routes/auth.routes.ts
app.post("/logout", async (request, reply) => {
  if (request.session) {
    await authService.logout(request.session.id);
  }

  const blankCookie = lucia.createBlankSessionCookie();
  reply.setCookie(blankCookie.name, blankCookie.value, blankCookie.attributes);

  return reply.status(204).send();
});
```

::: info Logout Without Authentication
The logout endpoint doesn't require authentication. This handles edge cases like expired sessions or race conditions where the session was already invalidated.
:::

### Invalidating All User Sessions

For password changes or security events:

```typescript
await sessionService.invalidateUserSessions(userId);
```

This logs the user out of all devices.

## Session Data

### Available on request.user

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | User ID (UUID) |
| `email` | `string` | User email address |
| `name` | `string` | User display name |
| `status` | `string` | Account status: `active`, `suspended`, `pending_verification` |

### Available on request.session

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Session ID |
| `userId` | `string` | User ID this session belongs to |
| `expiresAt` | `Date` | When the session expires |
| `context` | `string` | How session was created |
| `lastActivityAt` | `Date` | Last activity timestamp |
| `fresh` | `boolean` | Whether session was extended this request |

## Cookie Configuration

The session cookie (`rapt_session`) is configured with security best practices:

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `httpOnly` | `true` | Prevents JavaScript access (XSS protection) |
| `secure` | `true` (production) | HTTPS only in production |
| `sameSite` | `lax` | CSRF protection while allowing navigation |
| `path` | `/` | Available to entire application |

## Context-Aware Sessions

Sessions track their creation context for K-12 education environments:

| Context | Description |
|---------|-------------|
| `personal` | User's personal device |
| `shared` | Shared device (computer lab, classroom cart) |
| `oauth_google` | Created via Google OAuth |
| `oauth_microsoft` | Created via Microsoft OAuth |
| `unknown` | Context not specified |

This enables features like:
- Shorter expiration for shared device sessions
- Different session management policies per context
- Analytics on authentication methods

## Related Pages

- [Lucia Configuration](/auth/concepts/lucia) — How Lucia is set up and configured
- [OAuth Providers](/auth/concepts/oauth) — How OAuth sessions are created
- [Authentication Guards](/auth/patterns/guards) — Protecting routes with session requirements
