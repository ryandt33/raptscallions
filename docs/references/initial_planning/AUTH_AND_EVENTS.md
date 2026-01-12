# Raptscallions: Simplified Auth & Events Specification

**Version:** 2.0.0 (Simplified)  
**Status:** Revised Design Specification  
**Philosophy:** Use battle-tested libraries, write less custom code

---

## Table of Contents

1. [What Changed](#1-what-changed)
1. [Authentication with Lucia](#2-authentication-with-lucia)
1. [OAuth with Arctic](#3-oauth-with-arctic)
1. [Permissions with CASL](#4-permissions-with-casl)
1. [Events & Jobs with BullMQ](#5-events--jobs-with-bullmq)
1. [Workflows with Inngest](#6-workflows-with-inngest)
1. [Real-time with Socket.io](#7-real-time-with-socketio)
1. [Simplified Database Schema](#8-simplified-database-schema)
1. [Implementation Guide](#9-implementation-guide)

---

## 1. What Changed

### Before vs After

| Concern             | Original (Custom)             | Revised (Libraries)     | Lines Saved |
| ------------------- | ----------------------------- | ----------------------- | ----------- |
| **Auth & Sessions** | Custom JWT + refresh rotation | **Lucia Auth**          | ~400 lines  |
| **OAuth Flows**     | Custom OAuth2 implementation  | **Arctic**              | ~300 lines  |
| **Rate Limiting**   | Custom Redis counters         | **@fastify/rate-limit** | ~50 lines   |
| **Permissions**     | Custom role checker           | **CASL**                | ~150 lines  |
| **Event Bus**       | Custom pub/sub + persistence  | **BullMQ**              | ~300 lines  |
| **Workflows**       | Custom workflow engine        | **Inngest**             | ~400 lines  |
| **Real-time**       | Custom Redis pub/sub          | **Socket.io**           | ~100 lines  |
| **EAV Tables**      | 3 custom tables               | **Removed** (use JSONB) | ~200 lines  |

**Total: ~1,900 lines of custom code eliminated**

### Removed Complexity

- ❌ Custom JWT rotation logic
- ❌ Manual refresh token hashing
- ❌ Custom OAuth state management
- ❌ EAV tables for events (just use JSONB)
- ❌ Custom event bus with subscriptions
- ❌ Custom workflow execution engine
- ❌ Table partitioning (premature optimization)

---

## 2. Authentication with Lucia

[Lucia](https://lucia-auth.com/) is a modern, TypeScript-first auth library that handles sessions, password hashing, and integrates directly with Drizzle.

### Installation

```bash
pnpm add lucia @lucia-auth/adapter-drizzle arctic
pnpm add @node-rs/argon2  # For password hashing
```

### Database Schema (Lucia-compatible)

```sql
-- packages/db/src/migrations/0002_auth.sql

-- Lucia requires specific column names
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Optional: device tracking
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);

-- OAuth account linking
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_accounts_user ON oauth_accounts(user_id);

-- Password reset (simple version)
CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Lucia Configuration

```typescript
// packages/auth/src/lucia.ts
import { Lucia, TimeSpan } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "@raptscallions/db";
import { users, authSessions } from "@raptscallions/db/schema";

const adapter = new DrizzlePostgreSQLAdapter(db, authSessions, users);

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: new TimeSpan(7, "d"), // 7 days
  sessionCookie: {
    name: "session",
    expires: false, // Session cookie
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      domain: process.env.COOKIE_DOMAIN,
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
    isSystemAdmin: attributes.is_system_admin,
  }),
});

// Type augmentation for TypeScript
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      name: string;
      is_system_admin: boolean;
    };
  }
}
```

### Auth Service (Simplified)

```typescript
// packages/auth/src/auth.service.ts
import { lucia } from "./lucia";
import { hash, verify } from "@node-rs/argon2";
import { db } from "@raptscallions/db";
import { users } from "@raptscallions/db/schema";
import { eq } from "drizzle-orm";

export class AuthService {
  // Password hashing options (OWASP recommended)
  private hashOptions = {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  };

  async register(email: string, password: string, name: string) {
    // Check existing
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    if (existing) {
      throw new Error("Email already registered");
    }

    // Hash password
    const passwordHash = await hash(password, this.hashOptions);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        name,
        passwordHash,
        status: "active",
      })
      .returning();

    // Create session
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    return { user, sessionCookie };
  }

  async login(email: string, password: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    const valid = await verify(user.passwordHash, password, this.hashOptions);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    if (user.status !== "active") {
      throw new Error("Account is not active");
    }

    // Create session
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return { user, sessionCookie };
  }

  async logout(sessionId: string) {
    await lucia.invalidateSession(sessionId);
    return lucia.createBlankSessionCookie();
  }

  async logoutAllDevices(userId: string) {
    await lucia.invalidateUserSessions(userId);
  }

  async validateSession(sessionId: string) {
    return lucia.validateSession(sessionId);
  }

  async resetPassword(userId: string, newPassword: string) {
    const passwordHash = await hash(newPassword, this.hashOptions);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Invalidate all sessions
    await lucia.invalidateUserSessions(userId);
  }
}

export const authService = new AuthService();
```

### Fastify Middleware

```typescript
// apps/api/src/middleware/auth.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { lucia } from "@raptscallions/auth";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      name: string;
      isSystemAdmin: boolean;
    } | null;
    session: { id: string } | null;
  }
}

async function authPlugin(app: FastifyInstance) {
  app.decorateRequest("user", null);
  app.decorateRequest("session", null);

  // Parse session on every request
  app.addHook("preHandler", async (request) => {
    const sessionId = request.cookies.session;
    if (!sessionId) return;

    const { session, user } = await lucia.validateSession(sessionId);
    if (session && user) {
      request.session = session;
      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        isSystemAdmin: user.isSystemAdmin,
      };

      // Extend session if needed
      if (session.fresh) {
        const cookie = lucia.createSessionCookie(session.id);
        request.raw.res?.setHeader("Set-Cookie", cookie.serialize());
      }
    }
  });

  // Auth guard decorator
  app.decorate(
    "requireAuth",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }
  );

  app.decorate(
    "requireAdmin",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user?.isSystemAdmin) {
        return reply.status(403).send({ error: "Admin required" });
      }
    }
  );
}

export default fp(authPlugin, { name: "auth" });
```

---

## 3. OAuth with Arctic

[Arctic](https://arctic.js.org/) is a lightweight OAuth 2.0 library from the Lucia team.

### Configuration

```typescript
// packages/auth/src/oauth.ts
import { Google, MicrosoftEntraId } from "arctic";

export const google = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!
);

export const microsoft = new MicrosoftEntraId(
  process.env.MICROSOFT_TENANT_ID || "common",
  process.env.MICROSOFT_CLIENT_ID!,
  process.env.MICROSOFT_CLIENT_SECRET!,
  process.env.MICROSOFT_REDIRECT_URI!
);

// Clever (custom implementation - Arctic doesn't have it built-in)
export class Clever {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  createAuthorizationURL(state: string): URL {
    const url = new URL("https://clever.com/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "read:user_id read:sis");
    return url;
  }

  async validateAuthorizationCode(code: string) {
    const response = await fetch("https://clever.com/oauth/tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${this.clientId}:${this.clientSecret}`
        ).toString("base64")}`,
      },
      body: JSON.stringify({
        code,
        grant_type: "authorization_code",
        redirect_uri: this.redirectUri,
      }),
    });
    return response.json();
  }
}

export const clever = new Clever(
  process.env.CLEVER_CLIENT_ID!,
  process.env.CLEVER_CLIENT_SECRET!,
  process.env.CLEVER_REDIRECT_URI!
);
```

### OAuth Routes

```typescript
// apps/api/src/routes/oauth.routes.ts
import { FastifyInstance } from "fastify";
import { google, microsoft, clever } from "@raptscallions/auth/oauth";
import { lucia } from "@raptscallions/auth";
import { generateState, generateCodeVerifier } from "arctic";
import { db } from "@raptscallions/db";
import { users, oauthAccounts } from "@raptscallions/db/schema";
import { eq, and } from "drizzle-orm";

export async function oauthRoutes(app: FastifyInstance) {
  // Google
  app.get("/auth/google", async (request, reply) => {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = google.createAuthorizationURL(state, codeVerifier, [
      "openid",
      "email",
      "profile",
    ]);

    // Store state in cookie (short-lived)
    reply.setCookie("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });
    reply.setCookie("code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10,
      path: "/",
    });

    return reply.redirect(url.toString());
  });

  app.get("/auth/google/callback", async (request, reply) => {
    const { code, state } = request.query as { code: string; state: string };
    const storedState = request.cookies.oauth_state;
    const codeVerifier = request.cookies.code_verifier;

    if (!code || !state || state !== storedState || !codeVerifier) {
      return reply.status(400).send({ error: "Invalid OAuth callback" });
    }

    try {
      const tokens = await google.validateAuthorizationCode(code, codeVerifier);
      const googleUser = await fetchGoogleUser(tokens.accessToken());

      // Find or create user
      const { user, isNew } = await findOrCreateOAuthUser(
        "google",
        googleUser.sub,
        googleUser.email,
        googleUser.name
      );

      // Create session
      const session = await lucia.createSession(user.id, {});
      const cookie = lucia.createSessionCookie(session.id);

      reply.setCookie(cookie.name, cookie.value, cookie.attributes);

      // Redirect to app
      const redirectUrl = isNew
        ? `${process.env.FRONTEND_URL}/onboarding`
        : `${process.env.FRONTEND_URL}/dashboard`;
      return reply.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth error:", error);
      return reply.redirect(
        `${process.env.FRONTEND_URL}/login?error=oauth_failed`
      );
    }
  });

  // Similar routes for Microsoft and Clever...
}

async function fetchGoogleUser(accessToken: string) {
  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return response.json();
}

async function findOrCreateOAuthUser(
  provider: string,
  providerId: string,
  email: string,
  name: string
) {
  // Check for existing OAuth link
  const existingLink = await db.query.oauthAccounts.findFirst({
    where: and(
      eq(oauthAccounts.provider, provider),
      eq(oauthAccounts.providerUserId, providerId)
    ),
  });

  if (existingLink) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, existingLink.userId),
    });
    return { user: user!, isNew: false };
  }

  // Check for existing user by email
  let user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  let isNew = false;
  if (!user) {
    // Create new user
    [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        name,
        status: "active",
      })
      .returning();
    isNew = true;
  }

  // Link OAuth account
  await db.insert(oauthAccounts).values({
    userId: user.id,
    provider,
    providerUserId: providerId,
  });

  return { user, isNew };
}
```

---

## 4. Permissions with CASL

[CASL](https://casl.js.org/) is an isomorphic authorization library for JavaScript.

### Installation

```bash
pnpm add @casl/ability
```

### Define Abilities

```typescript
// packages/auth/src/permissions.ts
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from "@casl/ability";

// Define all possible actions
type Actions =
  | "manage" // wildcard for all actions
  | "create"
  | "read"
  | "update"
  | "delete"
  | "manage_members"
  | "manage_theme"
  | "view_usage"
  | "grade"
  | "view_submissions";

// Define all subjects
type Subjects =
  | "all" // wildcard for all subjects
  | "Group"
  | "Class"
  | "Tool"
  | "Assignment"
  | "Submission"
  | "Session"
  | "User"
  | "AIModel"
  | "OneRoster";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

interface UserContext {
  id: string;
  isSystemAdmin: boolean;
  groupMemberships: Array<{ groupId: string; role: "admin" | "member" }>;
  classMemberships: Array<{ classId: string; role: "teacher" | "student" }>;
}

export function defineAbilitiesFor(user: UserContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createMongoAbility
  );

  if (user.isSystemAdmin) {
    // System admins can do everything
    can("manage", "all");
    return build();
  }

  // Everyone can read their own data
  can("read", "Session", { userId: user.id });
  can("read", "Submission", { userId: user.id });

  // Group permissions
  for (const membership of user.groupMemberships) {
    if (membership.role === "admin") {
      can("manage", "Group", { id: membership.groupId });
      can("manage", "Class", { groupId: membership.groupId });
      can("manage", "Tool", { groupId: membership.groupId });
      can("view_usage", "Group", { id: membership.groupId });
      can("manage_theme", "Group", { id: membership.groupId });
    } else {
      can("read", "Group", { id: membership.groupId });
      can("read", "Tool", { groupId: membership.groupId });
    }
  }

  // Class permissions
  for (const membership of user.classMemberships) {
    can("read", "Class", { id: membership.classId });

    if (membership.role === "teacher") {
      can("update", "Class", { id: membership.classId });
      can("manage_members", "Class", { id: membership.classId });
      can("manage", "Assignment", { classId: membership.classId });
      can("view_submissions", "Assignment", { classId: membership.classId });
      can("grade", "Submission", { classId: membership.classId });
      can("read", "Session", { classId: membership.classId });
    } else {
      // Students
      can("read", "Assignment", { classId: membership.classId });
      can("create", "Session", { classId: membership.classId });
      can("create", "Submission", { classId: membership.classId });
    }
  }

  return build();
}
```

### Usage in Routes

```typescript
// apps/api/src/middleware/permissions.ts
import { FastifyRequest, FastifyReply } from "fastify";
import {
  defineAbilitiesFor,
  AppAbility,
} from "@raptscallions/auth/permissions";
import { ForbiddenError } from "@casl/ability";
import { db } from "@raptscallions/db";
import { groupMembers, classMembers } from "@raptscallions/db/schema";
import { eq } from "drizzle-orm";

declare module "fastify" {
  interface FastifyRequest {
    ability: AppAbility;
  }
}

export async function loadAbilities(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  // Load user's memberships (could be cached in Redis)
  const [groupMembershipsData, classMembershipsData] = await Promise.all([
    db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, request.user.id),
    }),
    db.query.classMembers.findMany({
      where: eq(classMembers.userId, request.user.id),
    }),
  ]);

  request.ability = defineAbilitiesFor({
    id: request.user.id,
    isSystemAdmin: request.user.isSystemAdmin,
    groupMemberships: groupMembershipsData.map((m) => ({
      groupId: m.groupId,
      role: m.role as "admin" | "member",
    })),
    classMemberships: classMembershipsData.map((m) => ({
      classId: m.classId,
      role: m.role as "teacher" | "student",
    })),
  });
}

// Usage in route
app.get(
  "/classes/:classId",
  {
    preHandler: [app.requireAuth, loadAbilities],
  },
  async (request, reply) => {
    const { classId } = request.params as { classId: string };

    // Check permission
    ForbiddenError.from(request.ability).throwUnlessCan("read", {
      __typename: "Class",
      id: classId,
    });

    // Fetch and return class...
  }
);
```

---

## 5. Events & Jobs with BullMQ

[BullMQ](https://docs.bullmq.io/) is a Redis-based queue for Node.js with built-in retry, rate limiting, and metrics.

### Installation

```bash
pnpm add bullmq
```

### Queue Setup

```typescript
// packages/events/src/queues.ts
import { Queue, Worker, QueueEvents } from "bullmq";
import { redis } from "@raptscallions/db/redis";

const connection = { connection: redis };

// Define queue names
export const QUEUES = {
  EVENTS: "events",
  NOTIFICATIONS: "notifications",
  ONEROSTER_SYNC: "oneroster-sync",
} as const;

// Create queues
export const eventsQueue = new Queue(QUEUES.EVENTS, connection);
export const notificationsQueue = new Queue(QUEUES.NOTIFICATIONS, connection);
export const oneRosterQueue = new Queue(QUEUES.ONEROSTER_SYNC, connection);

// Event types (discriminated union)
export type EventPayload =
  | { type: "behavior.misbehavior_detected"; data: MisbehaviorEventData }
  | { type: "learning.struggle_detected"; data: StruggleEventData }
  | { type: "session.completed"; data: SessionCompletedData }
  | { type: "assessment.recorded"; data: AssessmentEventData };

interface MisbehaviorEventData {
  sessionId: string;
  userId: string;
  classId?: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  evidence: string;
}

interface StruggleEventData {
  sessionId: string;
  userId: string;
  topic: string;
  indicators: string[];
  duration: number;
}

interface SessionCompletedData {
  sessionId: string;
  userId: string;
  summary: string;
  topicsCovered: string[];
}

interface AssessmentEventData {
  sessionId?: string;
  runId?: string;
  assignmentId: string;
  userId: string;
  scores: Array<{ criterion: string; score: number; maxScore: number }>;
  confidence: number;
}
```

### Emitting Events

```typescript
// packages/events/src/emit.ts
import { eventsQueue, EventPayload } from "./queues";
import { db } from "@raptscallions/db";
import { events } from "@raptscallions/db/schema";

export async function emit(
  event: EventPayload,
  options?: { priority?: number }
) {
  // Persist to database first (audit trail)
  const [saved] = await db
    .insert(events)
    .values({
      type: event.type,
      payload: event.data,
    })
    .returning();

  // Add to queue for processing
  await eventsQueue.add(
    event.type,
    {
      eventId: saved.id,
      ...event,
    },
    {
      priority: options?.priority,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );

  return saved.id;
}

// Usage in modules:
await emit({
  type: "behavior.misbehavior_detected",
  data: {
    sessionId: ctx.session.id,
    userId: ctx.user.id,
    classId: ctx.class?.id,
    category: "profanity",
    severity: "medium",
    evidence: "[redacted]",
  },
});
```

### Processing Events

```typescript
// apps/worker/src/processors/events.processor.ts
import { Worker, Job } from "bullmq";
import { QUEUES, EventPayload } from "@raptscallions/events/queues";
import { redis } from "@raptscallions/db/redis";
import { notificationsQueue } from "@raptscallions/events/queues";
import { db } from "@raptscallions/db";
import { events } from "@raptscallions/db/schema";
import { eq } from "drizzle-orm";

const worker = new Worker<EventPayload>(
  QUEUES.EVENTS,
  async (job: Job<EventPayload>) => {
    const { type, data } = job.data;

    switch (type) {
      case "behavior.misbehavior_detected":
        await handleMisbehavior(data);
        break;

      case "learning.struggle_detected":
        await handleStruggle(data);
        break;

      case "session.completed":
        await handleSessionCompleted(data);
        break;

      case "assessment.recorded":
        await handleAssessment(data);
        break;
    }

    // Mark as processed
    await db
      .update(events)
      .set({ processedAt: new Date() })
      .where(eq(events.id, job.data.eventId));
  },
  { connection: redis, concurrency: 10 }
);

async function handleMisbehavior(data: MisbehaviorEventData) {
  // Get class teachers to notify
  if (data.classId && data.severity !== "low") {
    const teachers = await getClassTeachers(data.classId);

    for (const teacher of teachers) {
      await notificationsQueue.add("send", {
        channel: "email",
        recipientId: teacher.id,
        template: "misbehavior_alert",
        data: {
          severity: data.severity,
          category: data.category,
          studentName: await getStudentName(data.userId),
        },
      });
    }
  }

  // Update dashboard counters (simple Redis increment)
  await redis.hincrby(
    `dashboard:${data.classId}:counters`,
    "misbehavior_incidents",
    1
  );
}

async function handleStruggle(data: StruggleEventData) {
  // Could trigger a workflow (see Inngest section)
  // Or just notify the teacher
}

async function handleSessionCompleted(data: SessionCompletedData) {
  // Update analytics
  // Generate summary for teacher dashboard
}

async function handleAssessment(data: AssessmentEventData) {
  // If low confidence, add to review queue
  if (data.confidence < 0.8) {
    await notificationsQueue.add("send", {
      channel: "in_app",
      template: "assessment_needs_review",
      data,
    });
  }
}

// Start worker
worker.on("completed", (job) => {
  console.log(`Event ${job.id} processed`);
});

worker.on("failed", (job, err) => {
  console.error(`Event ${job?.id} failed:`, err);
});

export { worker };
```

### Notifications Worker

```typescript
// apps/worker/src/processors/notifications.processor.ts
import { Worker } from "bullmq";
import { QUEUES } from "@raptscallions/events/queues";
import { redis } from "@raptscallions/db/redis";
import { Resend } from "resend"; // or your email provider

const resend = new Resend(process.env.RESEND_API_KEY);

interface NotificationJob {
  channel: "email" | "sms" | "push" | "in_app";
  recipientId?: string;
  recipientEmail?: string;
  template: string;
  data: Record<string, unknown>;
}

const worker = new Worker<NotificationJob>(
  QUEUES.NOTIFICATIONS,
  async (job) => {
    const { channel, template, data, recipientId, recipientEmail } = job.data;

    switch (channel) {
      case "email":
        const email = recipientEmail || (await getUserEmail(recipientId!));
        await resend.emails.send({
          from: "Raptscallions <notifications@raptscallions.org>",
          to: email,
          subject: getSubject(template, data),
          html: renderTemplate(template, data),
        });
        break;

      case "in_app":
        // Store in database for frontend to fetch
        await db.insert(notifications).values({
          userId: recipientId,
          template,
          data,
          read: false,
        });
        // Broadcast via Socket.io
        io.to(`user:${recipientId}`).emit("notification", { template, data });
        break;

      // SMS, push, etc.
    }
  },
  { connection: redis, concurrency: 5 }
);

export { worker };
```

---

## 6. Workflows with Inngest

[Inngest](https://www.inngest.com/) handles complex, multi-step workflows triggered by events. It’s perfect for “if X happens, then do Y, wait, then do Z” scenarios.

### Installation

```bash
pnpm add inngest
```

### Setup

```typescript
// packages/workflows/src/inngest.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "raptscallions",
  // Optional: self-host Inngest or use their cloud
  baseUrl: process.env.INNGEST_URL,
});
```

### Define Workflows

```typescript
// packages/workflows/src/functions/struggle-intervention.ts
import { inngest } from "../inngest";
import { db } from "@raptscallions/db";
import { aiService } from "@raptscallions/ai";

/**
 * When a student struggles, this workflow:
 * 1. Notifies the teacher immediately
 * 2. Waits 5 minutes
 * 3. If student is still struggling, triggers an AI intervention
 * 4. Logs the outcome
 */
export const struggleIntervention = inngest.createFunction(
  { id: "struggle-intervention" },
  { event: "learning/struggle.detected" },
  async ({ event, step }) => {
    const { sessionId, userId, topic, indicators } = event.data;

    // Step 1: Notify teacher
    await step.run("notify-teacher", async () => {
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
        with: { tool: true },
      });

      if (session?.tool?.classId) {
        await notifyTeacher(session.tool.classId, {
          type: "struggle_detected",
          studentId: userId,
          topic,
          indicators,
        });
      }
    });

    // Step 2: Wait 5 minutes
    await step.sleep("wait-for-recovery", "5m");

    // Step 3: Check if student recovered
    const stillStruggling = await step.run("check-status", async () => {
      const recentMessages = await getRecentMessages(sessionId, 5);
      return analyzeForStruggle(recentMessages);
    });

    if (stillStruggling) {
      // Step 4: Trigger AI intervention
      await step.run("ai-intervention", async () => {
        await aiService.injectMessage(sessionId, {
          role: "assistant",
          content: `I notice you might be finding this challenging. Let me try explaining ${topic} in a different way...`,
        });
      });
    }

    // Step 5: Log outcome
    await step.run("log-outcome", async () => {
      await db.insert(interventionLogs).values({
        sessionId,
        type: "struggle_intervention",
        triggered: stillStruggling,
        outcome: stillStruggling ? "ai_intervention" : "self_recovered",
      });
    });

    return { intervened: stillStruggling };
  }
);

/**
 * Safety concern escalation workflow
 */
export const safetyConcernEscalation = inngest.createFunction(
  { id: "safety-concern-escalation" },
  { event: "safety/concern.detected" },
  async ({ event, step }) => {
    const { userId, concernType, urgency, sessionId } = event.data;

    // Immediate notification based on urgency
    if (urgency === "immediate") {
      await step.run("immediate-alert", async () => {
        await Promise.all([
          alertCounselor(userId, concernType),
          alertAdmin(userId, concernType),
          pauseSession(sessionId),
        ]);
      });
      return { escalated: true, urgency: "immediate" };
    }

    // Same-day: alert counselor
    if (urgency === "same_day") {
      await step.run("counselor-alert", async () => {
        await alertCounselor(userId, concernType);
      });
    }

    // Monitor: schedule follow-up
    if (urgency === "monitor") {
      await step.run("schedule-followup", async () => {
        await scheduleFollowUp(userId, concernType, "24h");
      });
    }

    return { escalated: true, urgency };
  }
);
```

### Trigger Workflows from Events

```typescript
// In your event processor or directly in modules
import { inngest } from "@raptscallions/workflows";

// When emitting events, also send to Inngest
await inngest.send({
  name: "learning/struggle.detected",
  data: {
    sessionId: ctx.session.id,
    userId: ctx.user.id,
    topic: "quadratic equations",
    indicators: ["repeated_errors", "frustration_language"],
  },
});
```

### Serve Inngest Functions

```typescript
// apps/api/src/routes/inngest.routes.ts
import { serve } from "inngest/fastify";
import { inngest } from "@raptscallions/workflows";
import {
  struggleIntervention,
  safetyConcernEscalation,
} from "@raptscallions/workflows/functions";

export async function inngestRoutes(app: FastifyInstance) {
  app.register(
    serve({
      client: inngest,
      functions: [struggleIntervention, safetyConcernEscalation],
    })
  );
}
```

---

## 7. Real-time with Socket.io

### Setup

```typescript
// apps/api/src/socket.ts
import { Server } from "socket.io";
import { lucia } from "@raptscallions/auth";
import { redis } from "@raptscallions/db/redis";
import { createAdapter } from "@socket.io/redis-adapter";

export function setupSocket(httpServer: any) {
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
    adapter: createAdapter(pubClient, subClient),
  });

  // Auth middleware
  io.use(async (socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    if (!sessionId) {
      return next(new Error("Unauthorized"));
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return next(new Error("Unauthorized"));
    }

    socket.data.user = user;
    socket.data.session = session;
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;

    // Join user's personal room
    socket.join(`user:${user.id}`);

    // Join class rooms based on memberships
    // (You'd fetch this from DB)
    socket.on("join:class", async (classId: string) => {
      // Verify user is member of class
      const isMember = await checkClassMembership(user.id, classId);
      if (isMember) {
        socket.join(`class:${classId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${user.id} disconnected`);
    });
  });

  return io;
}

// Export for use in workers
export let io: Server;
export function setIO(server: Server) {
  io = server;
}
```

### Broadcast from Workers

```typescript
// In notification processor
import { io } from "../socket";

// Emit to specific user
io.to(`user:${userId}`).emit("notification", {
  type: "misbehavior_alert",
  message: "A student needs attention",
});

// Emit to class
io.to(`class:${classId}`).emit("dashboard_update", {
  type: "counter_increment",
  counter: "active_sessions",
  value: 1,
});
```

---

## 8. Simplified Database Schema

### Removed Tables

- ❌ `event_type_definitions` - Not needed, types are in TypeScript
- ❌ `event_attribute_categories` - EAV not needed
- ❌ `event_attribute_definitions` - EAV not needed
- ❌ `event_attributes` - EAV not needed
- ❌ `dashboard_counters` - Use Redis instead
- ❌ `dashboard_recent_events` - Use Redis sorted sets
- ❌ `workflow_definitions` - Use Inngest instead
- ❌ `workflow_executions` - Inngest handles this

### Simplified Events Table

```sql
-- packages/db/src/migrations/0003_events.sql

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,

  -- Actor & scope in JSONB (simple, flexible)
  actor_id UUID REFERENCES users(id),
  scope JSONB NOT NULL DEFAULT '{}',
  -- scope: { groupId?, classId?, sessionId?, assignmentId?, toolId? }

  -- Event data
  payload JSONB NOT NULL,

  -- Processing state
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_events_type_created ON events(type, created_at DESC);
CREATE INDEX idx_events_actor ON events(actor_id, created_at DESC);
CREATE INDEX idx_events_scope ON events USING GIN (scope);
CREATE INDEX idx_events_unprocessed ON events(created_at) WHERE processed_at IS NULL;

-- Keep assessment traces for audit (this one stays)
CREATE TABLE assessment_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),

  -- Context
  session_id UUID REFERENCES sessions(id),
  run_id UUID REFERENCES runs(id),
  assignment_id UUID REFERENCES assignments(id),
  user_id UUID NOT NULL REFERENCES users(id),

  -- AI trace (for auditability)
  model_used TEXT NOT NULL,
  prompt_hash TEXT NOT NULL, -- SHA256 of prompt
  input_snapshot JSONB NOT NULL,
  raw_response TEXT NOT NULL,
  parsed_result JSONB NOT NULL,
  confidence NUMERIC NOT NULL,

  -- Tamper detection
  content_hash TEXT NOT NULL, -- SHA256 of input + response

  -- Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessment_traces_assignment ON assessment_traces(assignment_id, user_id);
CREATE INDEX idx_assessment_traces_unreviewed ON assessment_traces(assignment_id)
  WHERE reviewed_at IS NULL AND confidence < 0.8;

-- Simple notifications table (for in-app)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC)
  WHERE read = false;
```

---

## 9. Implementation Guide

### Package Structure

```
packages/
├── auth/
│   ├── src/
│   │   ├── lucia.ts        # Lucia setup
│   │   ├── oauth.ts        # Arctic OAuth providers
│   │   ├── auth.service.ts # Simple auth service (~100 lines)
│   │   └── permissions.ts  # CASL abilities (~80 lines)
│   └── package.json
├── events/
│   ├── src/
│   │   ├── queues.ts       # BullMQ queue definitions
│   │   ├── emit.ts         # Event emitter (~30 lines)
│   │   └── types.ts        # Event type definitions
│   └── package.json
├── workflows/
│   ├── src/
│   │   ├── inngest.ts      # Inngest client
│   │   └── functions/      # Workflow definitions
│   └── package.json
```

### Dependencies

```json
{
  "dependencies": {
    "lucia": "^3.0.0",
    "@lucia-auth/adapter-drizzle": "^1.0.0",
    "arctic": "^1.0.0",
    "@node-rs/argon2": "^1.0.0",
    "@casl/ability": "^6.0.0",
    "bullmq": "^5.0.0",
    "inngest": "^3.0.0",
    "socket.io": "^4.0.0",
    "@socket.io/redis-adapter": "^8.0.0",
    "@fastify/rate-limit": "^9.0.0"
  }
}
```

### Environment Variables (Simplified)

```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Auth
COOKIE_DOMAIN=.yourdomain.com

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/google/callback

MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=https://api.yourdomain.com/auth/microsoft/callback

CLEVER_CLIENT_ID=...
CLEVER_CLIENT_SECRET=...
CLEVER_REDIRECT_URI=https://api.yourdomain.com/auth/clever/callback

# Notifications
RESEND_API_KEY=...

# Inngest (optional - can self-host)
INNGEST_URL=https://api.inngest.com

# Frontend
FRONTEND_URL=https://app.yourdomain.com
```

---

## Summary

### What We Kept

- ✅ Drizzle ORM
- ✅ Fastify
- ✅ Redis for caching
- ✅ PostgreSQL with ltree for groups
- ✅ Assessment traces (audit requirement)
- ✅ Core tool/session/run model

### What We Replaced

| Before               | After     | Why                                     |
| -------------------- | --------- | --------------------------------------- |
| Custom JWT + refresh | Lucia     | Battle-tested, handles edge cases       |
| Custom OAuth         | Arctic    | Same team as Lucia, minimal             |
| Custom permissions   | CASL      | Industry standard, well-documented      |
| Custom event bus     | BullMQ    | Production-grade, has UI, metrics       |
| Custom workflows     | Inngest   | Purpose-built, handles retries/timeouts |
| Custom WebSocket     | Socket.io | Battle-tested, has Redis adapter        |
| EAV tables           | JSONB     | Simpler, PostgreSQL handles it well     |

### Lines of Code Comparison

| Component   | Original   | Simplified | Reduction |
| ----------- | ---------- | ---------- | --------- |
| Auth        | ~800       | ~200       | 75%       |
| Events      | ~600       | ~150       | 75%       |
| Workflows   | ~400       | ~100       | 75%       |
| Permissions | ~200       | ~80        | 60%       |
| **Total**   | **~2,000** | **~530**   | **73%**   |

### Trade-offs

| Library   | Pro                          | Con                                    |
| --------- | ---------------------------- | -------------------------------------- |
| Lucia     | Modern, TypeScript-first     | Newer, smaller community than Passport |
| CASL      | Very flexible                | Learning curve for complex rules       |
| BullMQ    | Feature-rich, has UI         | Redis dependency                       |
| Inngest   | Great DX, handles edge cases | External service (or self-host)        |
| Socket.io | Easy to use                  | Slightly larger bundle than ws         |

---

## Next Steps

1. **Start with auth** - Get Lucia + Arctic working
1. **Add BullMQ** - Replace custom event handling
1. **Evaluate Inngest** - Start with one workflow, see if it fits
1. **Keep it simple** - You can always add complexity later
