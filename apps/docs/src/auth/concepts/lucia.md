---
title: Lucia Configuration
description: Lucia v3 setup, Drizzle adapter, and TypeScript type augmentation
related_code:
  - packages/auth/src/lucia.ts
  - packages/auth/src/types.ts
  - packages/db/src/schema/sessions.ts
last_verified: 2026-01-14
---

# Lucia Configuration

Lucia v3 is the session management library for RaptScallions. It handles session ID generation, cookie management, and database storage via the Drizzle adapter.

## Why Lucia

| Feature | Lucia | Passport |
|---------|-------|----------|
| TypeScript | First-class support | Bolt-on types |
| Session storage | Database-backed | Memory default |
| Modern API | Async/await | Callback-based |
| Framework agnostic | Yes | Express-focused |
| Maintenance | Active | Sporadic |

Lucia was chosen for its modern TypeScript API, proper session handling, and excellent documentation.

## Installation

Lucia and its adapter are installed in the `@raptscallions/auth` package:

```bash
pnpm add lucia @lucia-auth/adapter-drizzle
```

## Core Configuration

```typescript
// packages/auth/src/lucia.ts
import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "@raptscallions/db";
import { sessions, users } from "@raptscallions/db/schema";

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: "rapt_session",
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
  getSessionAttributes: (attributes) => ({
    context: attributes.context,
    lastActivityAt: attributes.last_activity_at,
  }),
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
    status: attributes.status,
  }),
});
```

### Configuration Options

| Option | Value | Purpose |
|--------|-------|---------|
| `sessionCookie.name` | `rapt_session` | Cookie name for easy identification |
| `sessionCookie.expires` | `false` | Session cookie (cleared when browser closes) |
| `secure` | `true` in production | HTTPS-only cookies |
| `sameSite` | `lax` | CSRF protection while allowing navigation |

## Database Adapter

The Drizzle adapter connects Lucia to PostgreSQL:

```typescript
const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);
```

**Parameters:**
1. `db` — Drizzle database instance
2. `sessions` — Sessions table schema
3. `users` — Users table schema

The adapter handles all CRUD operations for sessions automatically.

## Type Augmentation

Lucia uses TypeScript module augmentation to provide type-safe access to custom attributes:

```typescript
// packages/auth/src/lucia.ts
interface DatabaseUserAttributes {
  email: string;
  name: string;
  status: "active" | "suspended" | "pending_verification";
}

interface DatabaseSessionAttributes {
  context: string;
  last_activity_at: Date;
}

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
  }
}
```

After augmentation:
- `request.user.email` is typed as `string`
- `request.session.context` is typed as `string`
- TypeScript catches typos and missing properties

## Attribute Mapping

### User Attributes

Map database columns to the user object available on requests:

```typescript
getUserAttributes: (attributes: DatabaseUserAttributes) => {
  return {
    email: attributes.email,
    name: attributes.name,
    status: attributes.status,
  };
}
```

**Available on `request.user`:**
- `id` — User ID (always included by Lucia)
- `email` — User email address
- `name` — User display name
- `status` — Account status

### Session Attributes

Map database columns to the session object:

```typescript
getSessionAttributes: (attributes: DatabaseSessionAttributes) => {
  return {
    context: attributes.context,
    lastActivityAt: attributes.last_activity_at,
  };
}
```

**Available on `request.session`:**
- `id` — Session ID (always included)
- `userId` — User ID (always included)
- `expiresAt` — Expiration time (always included)
- `context` — How session was created
- `lastActivityAt` — Last activity timestamp

## Sessions Table Schema

The sessions table is defined with Drizzle:

```typescript
// packages/db/src/schema/sessions.ts
export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  context: varchar("context", { length: 50 }).notNull().default("unknown"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
```

**Key points:**
- `id` is a 255-character string (Lucia's session ID format)
- `userId` cascades on delete (deleting a user deletes their sessions)
- `context` tracks the authentication method
- Indexes on `userId` and `expiresAt` for query performance

## Core API

### Creating Sessions

```typescript
const session = await lucia.createSession(userId, {
  context: "password",
  last_activity_at: new Date(),
});
```

### Validating Sessions

```typescript
const { session, user } = await lucia.validateSession(sessionId);

if (!session) {
  // Session is invalid or expired
}

if (session.fresh) {
  // Session was extended - set new cookie
}
```

### Invalidating Sessions

```typescript
// Single session
await lucia.invalidateSession(sessionId);

// All user sessions
await lucia.invalidateUserSessions(userId);
```

### Cookie Helpers

```typescript
// Create cookie for valid session
const cookie = lucia.createSessionCookie(session.id);

// Create blank cookie (for logout)
const blankCookie = lucia.createBlankSessionCookie();
```

## Session Service Wrapper

The `SessionService` class wraps Lucia with application-specific logic:

```typescript
// packages/auth/src/session.service.ts
export class SessionService {
  async validate(sessionId: string): Promise<SessionValidationResult> {
    try {
      return await lucia.validateSession(sessionId);
    } catch (error) {
      throw new UnauthorizedError("Invalid session");
    }
  }

  async create(userId: string, context: string = "unknown"): Promise<Session> {
    return await lucia.createSession(userId, {
      context,
      last_activity_at: new Date(),
    });
  }

  async invalidate(sessionId: string): Promise<void> {
    await lucia.invalidateSession(sessionId);
  }
}

export const sessionService = new SessionService();
```

::: tip Use the Service
The `sessionService` singleton is exported from `@raptscallions/auth`. Prefer it over accessing `lucia` directly for consistent error handling.
:::

## Fastify Integration

The session middleware integrates Lucia with Fastify:

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

  // Handle fresh sessions and expired sessions...

  request.user = user;
  request.session = session;
});
```

## Fastify Type Augmentation

Request types are augmented to include session data:

```typescript
// packages/auth/src/types.ts
declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
    session: Session | null;
    ability: AppAbility;
  }
}
```

This enables type-safe access in route handlers:

```typescript
app.get("/me", async (request, reply) => {
  if (!request.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  // TypeScript knows user is not null here
  return { email: request.user.email };
});
```

## Related Pages

- [Session Lifecycle](/auth/concepts/sessions) — How sessions flow through the system
- [OAuth Providers](/auth/concepts/oauth) — OAuth session creation
- [Authentication Guards](/auth/patterns/guards) — Protecting routes with sessions
