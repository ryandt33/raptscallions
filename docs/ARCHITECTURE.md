# Raptscallions Architecture

**Version:** 1.0.0  
**Status:** Canonical Reference  
**Last Updated:** January 2025

> This is the single source of truth for architectural decisions. All other design docs should be considered supporting detail.

---

## Executive Summary

Raptscallions is an open-source AI education platform designed for:

- **Extreme modularity** — Minimal core, everything else is a pluggable module
- **Two interface types** — Chat (multi-turn) and Product (single I/O)
- **Teacher as creator** — No preset tools, teachers build what they need
- **One-click deployment** — Heroku, Docker Compose, Kubernetes
- **OneRoster native** — SIS integration from day one

---

## Technology Stack (Canonical)

| Layer             | Technology      | Version | Notes                          |
| ----------------- | --------------- | ------- | ------------------------------ |
| **Runtime**       | Node.js         | 20 LTS  |                                |
| **Language**      | TypeScript      | 5.3+    | Strict mode enabled            |
| **API Framework** | Fastify         | 4.x     | NOT Express                    |
| **ORM**           | Drizzle         | 0.29+   | NOT Prisma                     |
| **Database**      | PostgreSQL      | 16      | With ltree extension           |
| **Cache/Queue**   | Redis           | 7       | Sessions, BullMQ, Socket.io    |
| **Validation**    | Zod             | 3.x     | Runtime + TypeScript inference |
| **Auth**          | Lucia           | 3.x     | With Arctic for OAuth          |
| **Permissions**   | CASL            | 6.x     | Attribute-based access control |
| **Queue**         | BullMQ          | 5.x     | Background jobs                |
| **Workflows**     | Inngest         | Latest  | Multi-step workflows           |
| **Real-time**     | Socket.io       | 4.x     | WebSocket with Redis adapter   |
| **Telemetry**     | OpenTelemetry   | 1.x     | Traces, metrics, logs          |
| **Testing**       | Vitest          | 1.1+    | Monorepo test runner           |
| **Frontend**      | React           | 18.x    | With Vite                      |
| **Routing**       | TanStack Router | Latest  | Type-safe file-based routing   |
| **Data Fetching** | TanStack Query  | 5.x     | Server state management        |
| **UI Components** | shadcn/ui       | Latest  | With Tailwind CSS              |
| **Documentation** | VitePress       | 1.5+    | Static site generator for KB   |
| **AI Gateway**    | OpenRouter      | —       | Unified model access           |

---

## Monorepo Structure

```
raptscallions/
├── apps/
│   ├── api/                    # Fastify API server
│   │   ├── src/
│   │   │   ├── routes/         # Route handlers by domain
│   │   │   ├── middleware/     # Request processing
│   │   │   ├── services/       # Business logic
│   │   │   └── utils/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── docs/                   # VitePress knowledge base
│   │   ├── src/                # Markdown documentation files
│   │   ├── .vitepress/
│   │   │   └── config.ts       # VitePress configuration
│   │   └── package.json
│   │
│   ├── worker/                 # BullMQ job processor
│   │   ├── src/
│   │   │   ├── jobs/           # Job handlers
│   │   │   └── queue.ts
│   │   └── package.json
│   │
│   └── web/                    # React frontend (Vite)
│       ├── src/
│       │   ├── routes/         # TanStack Router pages
│       │   ├── components/     # UI components
│       │   ├── lib/            # Utilities
│       │   └── hooks/          # Custom hooks
│       └── package.json
│
├── packages/
│   ├── core/                   # Shared types, schemas, and errors
│   │   ├── src/
│   │   │   ├── types/          # TypeScript interfaces (re-exports from schemas)
│   │   │   ├── schemas/        # Zod schemas with type inference
│   │   │   └── errors/         # Typed error classes (AppError, ValidationError, etc.)
│   │   └── package.json
│   │
│   ├── db/                     # Database package
│   │   ├── src/
│   │   │   ├── schema/         # Drizzle schema definitions
│   │   │   ├── migrations/     # SQL migrations
│   │   │   └── client.ts       # Database client
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── auth/                   # Authentication & Authorization package
│   │   ├── src/
│   │   │   ├── lucia.ts        # Lucia instance and configuration
│   │   │   ├── types.ts        # Session, user, and permission types
│   │   │   ├── session.service.ts  # Session CRUD operations
│   │   │   ├── abilities.ts    # CASL ability definitions and hierarchy helper
│   │   │   ├── permissions.ts  # CASL permission middleware for Fastify
│   │   │   └── index.ts        # Barrel exports
│   │   └── package.json
│   │
│   ├── ai/                     # AI Gateway client (OpenRouter)
│   │   ├── src/
│   │   │   ├── client.ts       # OpenRouterClient class
│   │   │   ├── types.ts        # TypeScript types
│   │   │   ├── errors.ts       # AI-specific error classes
│   │   │   ├── config.ts       # Environment config with Zod validation
│   │   │   ├── index.ts        # Barrel exports
│   │   │   └── __tests__/      # Unit tests
│   │   └── package.json
│   │
│   ├── modules/                # Module system
│   │   ├── src/
│   │   │   ├── supervisor.ts   # Worker thread manager
│   │   │   ├── sdk.ts          # Module SDK
│   │   │   └── built-in/       # Built-in modules
│   │   └── package.json
│   │
│   └── telemetry/              # Observability
│       ├── src/
│       │   ├── tracing.ts
│       │   ├── metrics.ts
│       │   └── logging.ts
│       └── package.json
│
├── modules/                    # User-installed modules
│   └── ...
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # This file
│   ├── CONVENTIONS.md          # Code style guide
│   └── tasks/                  # Task management
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json               # Base TypeScript config
└── .env.example
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL CLIENTS                                    │
│     Web App    │    Mobile Apps    │    CLI Tools    │    External APIs         │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY LAYER                                   │
│  • Rate limiting (per-user, per-endpoint)                                       │
│  • Request validation (Zod)                                                     │
│  • CORS handling                                                                │
│  • Request/response logging                                                     │
│  • Health checks (/health, /ready)                                              │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER                                   │
│                                                                                  │
│  Route Handlers                                                                 │
│  /auth/*  /users/*  /groups/*  /classes/*  /tools/*  /sessions/*  /admin/*     │
│                                                                                  │
│  Core Services                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │  Group   │ │  Class   │ │   Tool   │ │Assignment│ │  Theme   │              │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                           │
│  │    AI    │ │  Module  │ │  Chat    │ │ OneRoster│                           │
│  │ Gateway  │ │Supervisor│ │ Runtime  │ │ Service  │                           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                           │
│                                                                                  │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌──────────────────┐  ┌─────────────┐  ┌─────────────────────┐
│   PostgreSQL     │  │    Redis    │  │  External Services  │
│                  │  │             │  │                     │
│ • Users          │  │ • Sessions  │  │ • OpenRouter (AI)   │
│ • Groups (ltree) │  │ • Cache     │  │ • OTEL Collector    │
│ • Classes        │  │ • BullMQ    │  │ • Email (Resend)    │
│ • Tools          │  │ • Socket.io │  │                     │
│ • Chat Sessions  │  │             │  │                     │
│ • Messages       │  │             │  │                     │
└──────────────────┘  └─────────────┘  └─────────────────────┘
```

---

## Core Entities

### Users

**Status:** ✅ Implemented (E01-T004)

The foundational table for authentication and user identity:

- **Authentication**: Email/password (Argon2) or OAuth (Google, Microsoft, Clever)
- **Status**: `active`, `suspended`, or `pending_verification` (default)
- **Soft Delete**: Supports account deletion with `deleted_at` timestamp
- **Schema**: `packages/db/src/schema/users.ts`
- **Migration**: `0001_create_users.sql`

Key fields:
- `id` (UUID) - Primary key with automatic generation
- `email` (varchar 255) - Unique, not null
- `name` (varchar 100) - Display name
- `password_hash` (varchar 255) - Nullable for OAuth users
- `status` (user_status enum) - Account state
- `created_at`, `updated_at`, `deleted_at` - Audit timestamps

### Groups (Hierarchical with ltree)

**Status:** ✅ Implemented (E01-T005)

Organizational units with hierarchical structure using PostgreSQL's ltree extension:

- **Hierarchy**: Districts → Schools → Departments (arbitrary depth)
- **Settings**: Each group has custom settings, theme, enabled models
- **Membership**: Users are members of groups with roles (see group_members below)
- **Schema**: `packages/db/src/schema/groups.ts`
- **Migration**: `0002_create_groups.sql`

Key fields:
- `id` (UUID) - Primary key with automatic generation
- `name` (varchar 100) - Group name
- `path` (ltree) - Hierarchical path (e.g., `district_1.school_5.dept_12`)
- `type` (group_type enum) - `district`, `school`, `department`, or `custom`
- `settings` (jsonb) - Configuration and enabled features
- `created_at`, `updated_at`, `deleted_at` - Audit timestamps

### Group Membership (group_members)

**Status:** ✅ Implemented (E01-T006)

Join table associating users with groups and assigning roles for RBAC:

- **Many-to-Many**: Users can belong to multiple groups with different roles
- **Role-Based**: Each membership has a specific role determining permissions
- **Unique Constraint**: One role per user per group (prevents duplicate memberships)
- **CASCADE Delete**: Memberships removed when user or group is deleted
- **Schema**: `packages/db/src/schema/group-members.ts`
- **Migration**: `0003_create_group_members.sql`

Key fields:
- `id` (UUID) - Primary key with automatic generation
- `user_id` (UUID) - Foreign key to users(id) with CASCADE delete
- `group_id` (UUID) - Foreign key to groups(id) with CASCADE delete
- `role` (member_role enum) - Permission level: `system_admin`, `group_admin`, `teacher`, `student`
- `created_at`, `updated_at` - Audit timestamps (no soft delete)

Indexes:
- `group_members_user_id_idx` - Optimizes "get user's groups" queries
- `group_members_group_id_idx` - Optimizes "get group's members" queries
- Unique constraint on (user_id, group_id) automatically indexed

Relations:
- `groupMembers.user` - Many-to-one relation to users table
- `groupMembers.group` - Many-to-one relation to groups table
- `users.groupMembers` - One-to-many relation for user's memberships
- `groups.members` - One-to-many relation for group's members

### Sessions (Authentication)

**Status:** ✅ Implemented (E02-T002)

Session management for Lucia v3 authentication with support for shared device contexts:

- **Session Lifecycle**: 30-day expiration with automatic extension for fresh sessions (< 50% lifetime)
- **Cookie-Based**: Uses `rapt_session` httpOnly, secure cookies with SameSite protection
- **Context-Aware**: Supports `personal`, `shared`, and `unknown` device contexts
- **Activity Tracking**: Monitors `last_activity_at` for idle timeout detection
- **Automatic Cleanup**: Cascade delete when user is removed
- **Schema**: `packages/db/src/schema/sessions.ts`
- **Auth Package**: `packages/auth/` - Lucia configuration and session service

Key fields:
- `id` (varchar 255) - Primary key, cryptographically random 40-character string
- `user_id` (UUID) - Foreign key to users(id) with CASCADE delete
- `expires_at` (timestamptz) - Session expiration timestamp
- `context` (varchar 20) - Device context: `personal`, `shared`, or `unknown` (default)
- `last_activity_at` (timestamptz) - Last request timestamp for idle detection

Indexes:
- `sessions_user_id_idx` - Optimizes "get user sessions" queries
- `sessions_expires_at_idx` - Optimizes expired session cleanup

Relations:
- `sessions.user` - Many-to-one relation to users table

### Classes

**Status:** ✅ Implemented (E03-T001)

Teaching groups within schools/departments that represent specific classes (like "Period 3 Algebra I"):

- **Belongs to Group**: Each class belongs to one group (typically school or department level)
- **Roster Management**: Teachers and students are tracked in class_members join table
- **Co-Teaching Support**: Multiple teachers per class supported
- **Settings**: Extensible JSONB field for grading, themes, features, accessibility preferences
- **Soft Delete**: Supports archiving classes via `deleted_at` timestamp
- **Schema**: `packages/db/src/schema/classes.ts`
- **Migration**: `0005_create_classes.sql`

Key fields:
- `id` (UUID) - Primary key with automatic generation
- `group_id` (UUID) - Foreign key to groups(id) with CASCADE delete
- `name` (varchar 100) - Class display name (e.g., "Period 3 Algebra I")
- `settings` (jsonb) - Extensible configuration (grading, themes, features)
- `created_at`, `updated_at`, `deleted_at` - Audit timestamps with soft delete support

Indexes:
- `classes_group_id_idx` - Optimizes "get all classes in group" queries

Relations:
- `classes.group` - Many-to-one relation to groups table
- `classes.members` - One-to-many relation to class_members table
- `groups.classes` - One-to-many relation for group's classes

### Class Membership (class_members)

**Status:** ✅ Implemented (E03-T001)

Join table associating users with classes and assigning teaching/learning roles:

- **Many-to-Many**: Users can belong to multiple classes with different roles
- **Two Roles**: `teacher` (instructor) or `student` (learner)
- **Unique Constraint**: One role per user per class (prevents duplicate enrollments)
- **Role Changes**: Update existing record (don't create new) to change user's role in class
- **CASCADE Delete**: Memberships removed when user or class is deleted
- **No Soft Delete**: Hard delete only (audit trail handled separately)
- **Schema**: `packages/db/src/schema/class-members.ts`
- **Migration**: `0005_create_classes.sql` (same migration as classes table)

Key fields:
- `id` (UUID) - Primary key with automatic generation
- `class_id` (UUID) - Foreign key to classes(id) with CASCADE delete
- `user_id` (UUID) - Foreign key to users(id) with CASCADE delete
- `role` (class_role enum) - Either `teacher` or `student`
- `created_at` - Timestamp when user joined class (no updated_at)

Indexes:
- `class_members_class_id_idx` - Optimizes roster queries (very high frequency)
- `class_members_user_id_idx` - Optimizes "get user's schedule" queries
- Unique constraint on (class_id, user_id) automatically indexed

Relations:
- `classMembers.class` - Many-to-one relation to classes table
- `classMembers.user` - Many-to-one relation to users table
- `users.classMembers` - One-to-many relation for user's class memberships
- `classes.members` - One-to-many relation for class roster

### Tools

**Status:** ✅ Implemented (E03-T002)

YAML-defined AI interactions created by teachers that define AI-powered experiences:

- **Two Types**: Chat (multi-turn conversations) and Product (single input → output transformations)
- **YAML Storage**: Complete tool definition stored as text, parsing happens at service layer
- **Versioning**: Semantic versioning with unique constraint on (name, version) pairs
- **Group Scoping**: Tools can be system-wide (group_id = null) or scoped to specific groups
- **Ownership**: Each tool has a creator (created_by) for attribution and permissions
- **Soft Delete**: Supports archiving tools via `deleted_at` timestamp
- **Schema**: `packages/db/src/schema/tools.ts`
- **Migrations**: `0006_create_tools.sql`, `0009_add_tools_updated_at_trigger.sql` (remediation)

Key fields:
- `id` (UUID) - Primary key with automatic generation
- `type` (tool_type enum) - Tool type: 'chat' or 'product'
- `name` (varchar 100) - Human-readable tool name
- `version` (varchar 20) - Semantic version (default '1.0.0')
- `definition` (text) - Complete YAML definition as text
- `created_by` (UUID) - Foreign key to users(id) with CASCADE delete
- `group_id` (UUID) - Foreign key to groups(id) with CASCADE delete (nullable for system-wide)
- `created_at`, `updated_at`, `deleted_at` - Audit timestamps with soft delete support (updated_at automatically maintained via trigger)

Indexes:
- `tools_group_id_idx` - Optimizes "get tools in group" queries
- `tools_created_by_idx` - Optimizes "get my tools" queries
- Unique constraint on (name, version) automatically indexed for version lookups

Relations:
- `tools.creator` - Many-to-one relation to users table
- `tools.group` - Many-to-one relation to groups table (nullable for system-wide tools)
- `users.tools` - One-to-many relation for user's created tools
- `groups.tools` - One-to-many relation for group's scoped tools

### Chat Sessions

**Status:** ✅ Implemented (E04-T001)

Multi-turn conversation sessions between users and tools:

- **State Lifecycle**: Sessions progress through states: `active` (default) → `paused` (optional) → `completed`
- **Message History**: Each session contains ordered messages (see Messages below)
- **Tool Binding**: Sessions are bound to a specific tool and user
- **Timestamps**: Track start time (`started_at`) and optional end time (`ended_at`)
- **Foreign Key Behavior**:
  - `tool_id`: RESTRICT delete (prevents deletion of tools with active sessions)
  - `user_id`: CASCADE delete (removes sessions when user is deleted)
- **Schema**: `packages/db/src/schema/chat-sessions.ts`
- **Migration**: `0008_create_chat_sessions_messages.sql`

Key fields:
- `id` (UUID) - Primary key with automatic generation
- `tool_id` (UUID) - Foreign key to tools(id) with RESTRICT delete
- `user_id` (UUID) - Foreign key to users(id) with CASCADE delete
- `state` (session_state enum) - Session lifecycle: `active`, `paused`, or `completed` (default: `active`)
- `started_at` (timestamptz) - When session was created
- `ended_at` (timestamptz) - When session was completed (nullable)

Indexes:
- `chat_sessions_tool_id_idx` - Optimizes "get sessions for tool" queries
- `chat_sessions_user_id_idx` - Optimizes "get user's sessions" queries
- `chat_sessions_state_idx` - Optimizes filtering by session state

Relations:
- `chatSessions.tool` - Many-to-one relation to tools table
- `chatSessions.user` - Many-to-one relation to users table
- `chatSessions.messages` - One-to-many relation to messages table
- `tools.chatSessions` - One-to-many relation for tool's sessions
- `users.chatSessions` - One-to-many relation for user's sessions

### Messages

**Status:** ✅ Implemented (E04-T001)

Conversation history within chat sessions with ordered sequencing:

- **Role-Based**: Each message has a role: `user`, `assistant`, or `system`
- **Ordered Sequencing**: Messages ordered by `seq` field (starts at 1, increments per session)
- **Unique Constraint**: `(session_id, seq)` ensures no duplicate sequence numbers (prevents message ordering bugs)
- **Cascade Delete**: Messages automatically removed when parent session is deleted
- **Extensible Metadata**: JSONB `meta` field for tokens, model info, latency, extractions
- **Schema**: `packages/db/src/schema/messages.ts`
- **Migration**: `0008_create_chat_sessions_messages.sql`

Key fields:
- `id` (UUID) - Primary key with automatic generation
- `session_id` (UUID) - Foreign key to chat_sessions(id) with CASCADE delete
- `role` (message_role enum) - Who sent the message: `user`, `assistant`, or `system`
- `content` (text) - The message text content
- `seq` (integer) - Sequence number for ordering within session (starts at 1)
- `created_at` (timestamptz) - When message was created
- `meta` (jsonb) - Extensible metadata (tokens, model, latency, etc.) - defaults to `{}`

Indexes:
- `messages_session_seq_idx` - Composite index on (session_id, seq) for fast ordered retrieval

Constraints:
- `messages_session_seq_unique` - Unique constraint on (session_id, seq) prevents duplicate sequences

Relations:
- `messages.session` - Many-to-one relation to chat_sessions table
- `chatSessions.messages` - One-to-many relation for session's messages

Metadata examples:
```jsonb
{ "tokens": 150, "model": "claude-3-sonnet", "latency_ms": 432 }
{ "module_extractions": [...] }
```

### Runs (Product)

**Status:** 🚧 Planned

- Single input → output execution
- State: pending → processing → completed/failed

### Assignments

**Status:** 🚧 Planned

- Tool assigned to a class
- Has due date, instructions
- Tracks submissions

---

## Module System

Modules hook into defined lifecycle points:

| Hook                | When                   | Can Block  |
| ------------------- | ---------------------- | ---------- |
| `chat:before_ai`    | Before AI call         | Yes        |
| `chat:after_ai`     | After AI response      | Yes        |
| `chat:on_message`   | Any message            | No (async) |
| `session:start`     | Session created        | No         |
| `session:end`       | Session completed      | No         |
| `product:before_ai` | Before product AI call | Yes        |
| `product:after_ai`  | After product response | Yes        |
| `run:complete`      | Product run finished   | No         |

Modules run in isolated worker threads with:

- Sandboxed execution
- Memory limits
- Timeout enforcement
- Hot reload support

---

## Authentication & Authorization

### Authentication (Lucia)

**Status:** ✅ Partially Implemented (E02-T002, E02-T003)

Lucia v3 provides cookie-based session management with:

- **Sessions**: Cookie-based with 30-day expiration, automatic extension for fresh sessions
- **Cookie Security**: httpOnly, secure (production), SameSite: lax for CSRF protection
- **Cookie Name**: `rapt_session` (education-context specific)
- **Database Adapter**: DrizzlePostgreSQLAdapter for PostgreSQL storage
- **Type Safety**: Full TypeScript support with augmented types for user/session attributes
- **Package**: `@raptscallions/auth` - Lucia configuration and session service

Authentication methods:
- **Local**: ✅ Email/password with Argon2id (E02-T003)
  - Routes: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
  - Password hashing: Argon2id with OWASP-recommended parameters (memoryCost: 19456, timeCost: 2)
  - Security: Constant-time verification, generic error messages prevent timing attacks
  - Service: `apps/api/src/services/auth.service.ts`
  - Schemas: `packages/core/src/schemas/auth.schema.ts`
- **OAuth**: ✅ Google and Microsoft via Arctic (E02-T004)
  - Providers: Google OAuth 2.0, Microsoft Entra ID (Azure AD)
  - Routes: `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/microsoft`, `GET /auth/microsoft/callback`
  - Library: Arctic (Lucia companion library) for OAuth 2.0 flows
  - Security: CSRF protection via state parameter, email verification (Google), httpOnly cookies
  - Account Linking: Automatically links OAuth accounts to existing users by email
  - Service: `apps/api/src/services/oauth.service.ts` (functional pattern, not class-based)
  - Client Setup: `packages/auth/src/oauth.ts` - Eager initialization, conditional route registration
  - Schemas: `packages/core/src/schemas/oauth.schema.ts` - Zod validation for OAuth profiles
  - State Management: `packages/auth/src/oauth-state.ts` - Cryptographically secure state generation/validation

Session middleware (`apps/api/src/middleware/session.middleware.ts`):
- Runs on every request via Fastify's `onRequest` hook
- Validates session cookie and attaches `user` and `session` to request
- Automatically extends fresh sessions (< 50% lifetime remaining)
- Clears expired sessions and cookies

#### Authentication Guards

**Status:** ✅ Implemented (E02-T006)

The API provides reusable authentication guards as Fastify preHandler decorators for common authorization patterns:

| Guard | Purpose | Example |
|-------|---------|---------|
| `requireAuth` | Basic authentication check | `[app.requireAuth]` |
| `requireActiveUser` | Authentication + active status check | `[app.requireActiveUser]` |
| `requireRole` | Role-based authorization (any group) | `[app.requireAuth, app.requireRole('teacher')]` |
| `requireGroupMembership` | Static group membership check | `[app.requireAuth, app.requireGroupMembership(groupId)]` |
| `requireGroupFromParams` | Dynamic group membership from route params | `[app.requireAuth, app.requireGroupFromParams()]` |
| `requireGroupRole` | Group-scoped role authorization | `[app.requireAuth, app.requireGroupFromParams(), app.requireGroupRole('teacher')]` |

**Guard Characteristics:**
- **Composable**: Multiple guards can be used in preHandler arrays
- **Short-circuit**: Throw errors before route handler executes
- **Type-safe**: Full TypeScript support with Fastify augmentation
- **Debuggable**: Structured debug logging for troubleshooting
- **Security**: Query database on every request (no caching = immediate permission updates)

**Error Responses:**
- `UnauthorizedError` (401) - Not authenticated
- `ForbiddenError` (403) - Authenticated but insufficient permissions

**Guard Patterns:**

```typescript
// Simple authentication check
app.get('/me', {
  preHandler: [app.requireAuth]
}, async (request, reply) => {
  return { user: request.user };
});

// Role-based authorization (global - any group)
app.post('/admin/users', {
  preHandler: [app.requireAuth, app.requireRole('system_admin', 'group_admin')]
}, handler);

// Dynamic group membership from route params
app.get('/groups/:groupId/members', {
  preHandler: [app.requireAuth, app.requireGroupFromParams()]
}, handler);

// Group-scoped role check (must have role IN THIS GROUP)
app.post('/groups/:groupId/assignments', {
  preHandler: [
    app.requireAuth,
    app.requireGroupFromParams(),
    app.requireGroupRole('teacher', 'group_admin')
  ]
}, handler);
```

**Guard vs CASL Permissions:**

Use guards for:
- Simple role gates ("teachers only" endpoints)
- Group membership gates ("must be in this group")
- Binary checks (authenticated/not, member/not member)

Use CASL (`requirePermission`) for:
- Resource ownership checks (createdBy, ownership)
- Attribute-based permissions
- Complex conditional logic
- Hierarchy-based permissions

**Files:**
- `apps/api/src/middleware/auth.middleware.ts` - All guard implementations and decorators
- `apps/api/src/__tests__/middleware/auth.middleware.test.ts` - Unit tests (42 test cases)

### Authorization (CASL)

**Status:** ✅ Implemented (E02-T005)

CASL provides attribute-based access control with:

- **Package**: `@raptscallions/auth` - CASL ability definitions and permission middleware
- **Library**: CASL v6.x with MongoAbility for MongoDB-style query operators (`$in`, `$ne`, etc.)
- **Integration**: Fastify middleware with permission decorators
- **Hierarchy Support**: ltree-based group hierarchy permissions
- **Type Safety**: Full TypeScript support with compile-time permission checks

#### Permission System

The authorization system uses CASL's ability-based permissions with three levels of checks:

1. **Route-Level Checks**: Middleware blocks requests without basic permission
2. **Resource-Level Checks**: Validates permission on specific resource instances
3. **Hierarchy Checks**: Group admins can manage descendant groups via ltree paths

#### Ability Builder

Core function: `buildAbility({ user, memberships })` creates permission instance

- **Input**: User object and their group memberships
- **Output**: AppAbility instance with CASL rules
- **Caching**: Per-request (built in onRequest hook)
- **System Admin Bypass**: System admins get `manage all` permission

#### Permission Middleware

Fastify plugin (`permissionMiddleware`) provides:

- **Request Decorator**: `request.ability` - Available on all requests
- **Route Guard**: `app.requirePermission(action, subject)` - PreHandler factory
- **Resource Check**: `app.checkResourcePermission(ability, action, subject, resource)` - Helper for instance checks
- **Hierarchy Helper**: `app.getGroupPaths(groupIds)` - Fetch ltree paths for descendant checks

Example usage:

```typescript
// Route-level check
app.post('/tools', {
  preHandler: [app.requireAuth, app.requirePermission('create', 'Tool')]
}, async (request, reply) => {
  // Only users who can create Tools reach here
});

// Resource-level check
const tool = await db.query.tools.findFirst({ where: eq(tools.id, id) });
if (!app.checkResourcePermission(request.ability, 'delete', 'Tool', tool)) {
  throw new ForbiddenError('You cannot delete this tool');
}
```

#### Roles & Permissions

| Role           | Scope  | Capabilities                              |
| -------------- | ------ | ----------------------------------------- |
| `system_admin` | System | Everything (`manage all`)                 |
| `group_admin`  | Group  | Manage group, users, classes, assignments; read tools |
| `teacher`      | Group  | Create/manage own tools and assignments; read classes/users in group |
| `student`      | Class  | Read assigned tools/assignments; manage own sessions and runs |

Permission rules by role:

**System Admin:**
- `can('manage', 'all')` - Full access to all resources

**Group Admin** (for their groups):
- `can('manage', 'Group')` - Manage groups (including descendants via ltree)
- `can('manage', 'User')` - Manage users in their groups
- `can('manage', 'Class')` - Manage classes in their groups
- `can('read', 'Tool')` - Read all tools in their groups
- `can('manage', 'Assignment')` - Manage assignments in their groups

**Teacher** (for their groups):
- `can('create', 'Tool')` - Create tools in their groups
- `can('read', 'update', 'delete', 'Tool')` - Manage their own tools (createdBy check)
- `can('create', 'Assignment')` - Create assignments in their groups
- `can('read', 'update', 'delete', 'Assignment')` - Manage their own assignments
- `can('read', 'Class')` - Read classes in their groups
- `can('read', 'User')` - Read users in their groups
- `can('read', 'Session')` - Read sessions for their tools

**Student** (baseline for all users):
- `can('read', 'Tool')` - Read tools assigned to them
- `can('read', 'Assignment')` - Read assignments assigned to them
- `can('manage', 'Session')` - Full control over their own sessions
- `can('create', 'read', 'Run')` - Create and read their own product runs
- `can('read', 'update', 'User')` - Read and update their own profile

#### Group Hierarchy Permissions

Group admins can manage descendant groups using PostgreSQL ltree paths:

- **Function**: `canManageGroupHierarchy(ability, targetGroupId, userGroupPaths, targetGroupPath)`
- **Logic**: Checks if target group's path is a descendant of any admin group path
- **Example**: Admin of `district.school1` can manage `district.school1.dept_math`
- **Pattern**: String prefix matching (`targetPath.startsWith(adminPath + '.')`)

#### Files

- `packages/auth/src/abilities.ts` - Ability builder and hierarchy helper
- `packages/auth/src/permissions.ts` - Fastify middleware and decorators
- `packages/auth/src/types.ts` - Permission types and Fastify augmentation
- `apps/api/src/server.ts` - Middleware registration

### Rate Limiting

**Status:** ✅ Implemented (E02-T007)

The API implements two-tier rate limiting using `@fastify/rate-limit` with Redis for distributed state:

- **Package**: `@fastify/rate-limit` with `ioredis` backend
- **Storage**: Redis for distributed rate limit counters (enables horizontal scaling)
- **Strategy**: Tiered limits based on route type and user authentication
- **Headers**: Standard `X-RateLimit-*` and `Retry-After` headers on all responses

#### Rate Limit Tiers

| Tier | Routes | Limit | Key Strategy | Purpose |
|------|--------|-------|--------------|---------|
| **Auth** | `/auth/*` | 5 req/min | IP address | Prevents brute-force attacks |
| **API** | All other routes | 100 req/min | User ID (IP fallback) | Fair resource allocation |

#### Key Generation

- **Authenticated users**: `user:{userId}` - Allows shared IPs (schools, offices)
- **Anonymous users**: `ip:{address}` - IP-based for unauthenticated requests
- **Auth routes**: `auth:{address}` - Always IP-based for security

#### Configuration

Environment variables:

```bash
RATE_LIMIT_API_MAX=100          # Max requests per minute for API routes
RATE_LIMIT_AUTH_MAX=5           # Max requests per minute for auth routes
RATE_LIMIT_TIME_WINDOW="1 minute"  # Time window for rate limits
```

#### Error Response

Rate limited requests return HTTP 429 with context-aware messaging:

```json
{
  "statusCode": 429,
  "error": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 5,
    "remaining": 0,
    "resetAt": "2026-01-12T12:34:56Z",
    "retryAfter": "42",
    "message": "For security, login attempts are limited to 5 per minute. Please wait 42 seconds."
  }
}
```

#### Response Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705067890
Retry-After: 42  (only on 429 responses)
```

#### Custom Route Limits

Routes can override default limits:

```typescript
app.post('/expensive-operation', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 hour'
    }
  }
}, handler);

// Disable rate limiting (e.g., health checks)
app.get('/health', {
  config: { rateLimit: false }
}, handler);
```

#### Files

- `apps/api/src/middleware/rate-limit.middleware.ts` - Rate limit plugin and configuration
- `packages/core/src/errors/rate-limit.error.ts` - RateLimitError class
- `apps/api/src/config.ts` - Environment configuration

---

## AI Gateway Integration

### OpenRouter Client

**Status:** ✅ Implemented (E04-T002)

The `@raptscallions/ai` package provides a streaming-first OpenRouter client using the OpenAI SDK:

- **Package**: `@raptscallions/ai`
- **Client**: `OpenRouterClient` class with streaming and non-streaming methods
- **Provider**: OpenRouter API (unified gateway for multiple AI models)
- **SDK**: OpenAI SDK v4+ (OpenRouter API-compatible)
- **Streaming**: True streaming via async generators with chunked responses
- **Error Handling**: Typed errors for rate limits, timeouts, auth failures, and invalid responses

#### Configuration

Environment variables (validated with Zod):

```bash
AI_GATEWAY_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-v1-...
AI_DEFAULT_MODEL=anthropic/claude-sonnet-4-20250514
AI_REQUEST_TIMEOUT_MS=120000  # 2 minutes
AI_MAX_RETRIES=2
```

#### Core Types

```typescript
// Message structure
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Streaming chunks
type StreamChunk =
  | { type: 'content'; content: string }
  | { type: 'done'; result: ChatCompletionResult };

// Complete result
interface ChatCompletionResult {
  content: string;
  usage: UsageMetadata;
  model: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error' | null;
}
```

#### Usage Examples

**Streaming (recommended for chat):**

```typescript
import { openRouterClient } from '@raptscallions/ai';

const stream = openRouterClient.streamChat(
  [{ role: 'user', content: 'Hello!' }],
  { model: 'anthropic/claude-sonnet-4-20250514' }
);

for await (const chunk of stream) {
  if (chunk.type === 'content') {
    // Stream content to user
    process.stdout.write(chunk.content);
  } else if (chunk.type === 'done') {
    // Store usage metadata
    console.log('Tokens:', chunk.result.usage);
  }
}
```

**Non-streaming (for product tools):**

```typescript
const result = await openRouterClient.chat(
  [{ role: 'user', content: 'Generate a quiz' }],
  { model: 'anthropic/claude-sonnet-4-20250514' }
);

console.log(result.content);
console.log('Tokens used:', result.usage.totalTokens);
```

#### Error Handling

The client throws typed errors:

- `RateLimitError` (429) - Rate limit exceeded
- `AuthenticationError` (401/403) - Invalid API key
- `ModelNotAvailableError` (400) - Model not found or unavailable
- `TimeoutError` - Request timeout or cancellation
- `InvalidResponseError` - Malformed response or missing usage metadata
- `AiError` - Generic AI errors (gateway issues, network failures)

#### Integration Points

- **Chat Runtime** (E04-T003): Uses `streamChat()` for multi-turn conversations
- **Message Persistence** (E04-T005): Stores usage metadata from responses
- **Product Tools** (future): Uses `chat()` for single I/O generation
- **SSE Endpoint** (E04-T004): Forwards streaming chunks to frontend

---

## API Design

### Principles

- RESTful with HATEOAS hints
- Consistent error format: `{ error: string, code: string, details?: any }`
- Cursor-based pagination
- Zod validation on all inputs
- OpenAPI documentation auto-generated

### Response Codes

| Code | Meaning           |
| ---- | ----------------- |
| 200  | Success with body |
| 201  | Created           |
| 204  | Success, no body  |
| 400  | Validation error  |
| 401  | Not authenticated |
| 403  | Not authorized    |
| 404  | Not found         |
| 409  | Conflict          |
| 429  | Rate limited      |
| 500  | Server error      |

---

## Data Flow: Chat Message

```
User sends message
        │
        ▼
┌─────────────────┐
│ Validate input  │
│ Check auth      │
│ Check rate limit│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Load session    │
│ Build context   │
│ (system + history)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Execute hooks   │
│ chat:before_ai  │
│ (can block/modify)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call AI Gateway │
│ Stream response │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Execute hooks   │
│ chat:after_ai   │
│ (can modify)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Persist message │
│ Track usage     │
│ Emit events     │
└────────┬────────┘
         │
         ▼
    Return to user
```

---

## Deployment Targets

| Target     | Method             | Notes                               |
| ---------- | ------------------ | ----------------------------------- |
| Heroku     | One-click button   | Procfile, addons for Postgres/Redis |
| Docker     | docker-compose.yml | Local dev and simple deployments    |
| Kubernetes | Helm chart         | Production scale                    |

All deployments use the same container images with environment-based configuration.

---

## Containerization Requirements

**CRITICAL: The entire project MUST be containerizable.**

All components must run in Docker containers with no host dependencies beyond Docker itself:

### Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   api       │  │   worker    │  │    web      │         │
│  │  (Fastify)  │  │  (BullMQ)   │  │   (Vite)    │         │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘         │
│         │                │                                   │
│         └────────┬───────┘                                   │
│                  │                                           │
│  ┌───────────────┴───────────────┐                          │
│  │         Infrastructure        │                          │
│  │  ┌──────────┐  ┌──────────┐  │                          │
│  │  │ postgres │  │  redis   │  │                          │
│  │  │  :5432   │  │  :6379   │  │                          │
│  │  └──────────┘  └──────────┘  │                          │
│  └───────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Requirements

| Requirement                | Details                                                  |
| -------------------------- | -------------------------------------------------------- |
| **No host dependencies**   | All services run in containers, including PostgreSQL/Redis |
| **Single command startup** | `docker compose up` starts entire stack                  |
| **Development parity**     | Local dev uses same containers as production             |
| **Volume persistence**     | Database data persists across container restarts         |
| **Hot reload support**     | Source code mounted for development hot reload           |
| **Health checks**          | All services expose health endpoints                     |
| **Network isolation**      | Services communicate via Docker network                  |

### Environment Configuration

```yaml
# docker-compose.yml services must include:
services:
  postgres:
    image: postgres:16
    # with ltree extension
  redis:
    image: redis:7
  api:
    build: ./apps/api
    depends_on: [postgres, redis]
  worker:
    build: ./apps/worker
    depends_on: [postgres, redis]
  web:
    build: ./apps/web
```

### Development vs Production

| Aspect           | Development                    | Production               |
| ---------------- | ------------------------------ | ------------------------ |
| Source mounting  | Yes (hot reload)               | No (built into image)    |
| Debug ports      | Exposed                        | Not exposed              |
| Log level        | debug                          | info/warn                |
| Database         | Local container                | Managed service or container |
| SSL              | Optional                       | Required                 |

---

## Related Documentation

| Document                         | Purpose                      |
| -------------------------------- | ---------------------------- |
| `CONVENTIONS.md`                 | Code style, naming, patterns |
| `Auth_spec`                      | Detailed auth implementation |
| `Module_system_implementation`   | Module system deep dive      |
| `Chat_implementation_design_doc` | Chat runtime details         |
| `Simplified_auth_and_events`     | Events, queues, real-time    |
| `Theme_configuration`            | Theming system               |

---

## Key Design Decisions

| Decision                   | Choice                                                      | Rationale |
| -------------------------- | ----------------------------------------------------------- | --------- |
| Fastify over Express       | Performance (2-3x), native TypeScript, plugin architecture  |
| Drizzle over Prisma        | SQL-like syntax, better perf, true TS types, smaller bundle |
| PostgreSQL + ltree         | Native hierarchy support, JSONB flexibility, mature         |
| Redis for ephemeral        | Single dep for sessions, cache, queues, pub/sub             |
| Worker threads for modules | Isolation, can kill runaway modules, no process overhead    |
| SSE for streaming          | Industry standard for LLM, good browser support             |
| Zod over Yup/Joi           | TypeScript inference, composable, better DX                 |

---

_End of Architecture Document_
