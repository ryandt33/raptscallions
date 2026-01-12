# Backend Core Implementation Design

**Version:** 2.0.0  
**Status:** Design Specification  
**Last Updated:** January 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Project Organization](#3-project-organization)
4. [Database Design](#4-database-design)
5. [Service Layer Architecture](#5-service-layer-architecture)
6. [API Design Principles](#6-api-design-principles)
7. [Configuration Management](#7-configuration-management)
8. [Background Processing](#8-background-processing)
9. [Observability Strategy](#9-observability-strategy)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Performance Considerations](#11-performance-considerations)
12. [Security Architecture](#12-security-architecture)
13. [Open Considerations](#13-open-considerations)

---

## 1. Executive Summary

### Purpose

This document specifies the backend core infrastructure for Raptscallions—the foundational services, data models, and architectural patterns that support the application. It covers everything from project organization to deployment strategy, excluding components covered in dedicated specifications (Authentication, Events/Workflows, Module System, and Chat Runtime).

### Scope

| In Scope                                            | Out of Scope                              |
| --------------------------------------------------- | ----------------------------------------- |
| Monorepo structure and package organization         | Authentication flows (see Auth Spec)      |
| Database schema design and ORM patterns             | Event bus and workflows (see Events Spec) |
| Core services (Groups, Classes, Tools, Assignments) | Module system internals (see Module Spec) |
| API route patterns and middleware                   | Chat runtime (see Chat Design)            |
| Configuration and environment management            | Frontend implementation                   |
| Background job architecture                         | Third-party integrations (OneRoster)      |
| Telemetry and observability                         | Billing and subscription management       |
| Deployment targets (Heroku, Docker, K8s)            |                                           |

### Key Decisions Summary

| Decision   | Choice                  | Rationale                                                |
| ---------- | ----------------------- | -------------------------------------------------------- |
| Runtime    | Node.js + TypeScript    | Strong ecosystem, type safety, team familiarity          |
| Framework  | Fastify                 | Performance, plugin architecture, native TypeScript      |
| ORM        | Drizzle                 | Type-safe, SQL-like syntax, excellent performance        |
| Monorepo   | pnpm workspaces         | Fast, disk-efficient, native workspace support           |
| Database   | PostgreSQL + ltree      | Robust, hierarchical data support, JSONB for flexibility |
| Cache      | Redis                   | Session storage, job queues, rate limiting               |
| Validation | Zod                     | Runtime validation with TypeScript inference             |
| API Style  | REST with HATEOAS hints | Simplicity, caching, tooling support                     |

### Related Specifications

This document references and depends on:

- **Auth Spec** — Authentication with Lucia, OAuth with Arctic, permissions with CASL
- **Simplified Auth & Events** — BullMQ queues, Inngest workflows, Socket.io real-time
- **Module System Spec** — Worker thread isolation, hook execution engine
- **Chat Runtime Design** — Session lifecycle, streaming, message persistence

---

## 2. System Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL CLIENTS                                    │
│                                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│  │   Web    │    │  Mobile  │    │   CLI    │    │ External │                   │
│  │   App    │    │   Apps   │    │  Tools   │    │   APIs   │                   │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘                   │
│       │               │               │               │                          │
└───────┼───────────────┼───────────────┼───────────────┼──────────────────────────┘
        │               │               │               │
        └───────────────┴───────┬───────┴───────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY LAYER                                   │
│                                                                                  │
│  • Rate limiting (per-user, per-endpoint)                                       │
│  • Request validation                                                            │
│  • CORS handling                                                                 │
│  • Request/response logging                                                      │
│  • Health checks                                                                 │
│                                                                                  │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER                                   │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                           Route Handlers                                    │ │
│  │                                                                             │ │
│  │  /auth/*  /users/*  /groups/*  /classes/*  /tools/*  /sessions/*  /admin/* │ │
│  │                                                                             │ │
│  └─────────────────────────────────────┬───────────────────────────────────────┘ │
│                                        │                                         │
│  ┌─────────────────────────────────────┴───────────────────────────────────────┐ │
│  │                           Core Services                                      │ │
│  │                                                                              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │ │
│  │  │  Group   │ │  Class   │ │   Tool   │ │Assignment│ │  Theme   │          │ │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │          │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │ │
│  │                                                                              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                                     │ │
│  │  │    AI    │ │  Module  │ │  OneRoster│                                    │ │
│  │  │ Gateway  │ │Supervisor│ │  Service  │                                    │ │
│  │  └──────────┘ └──────────┘ └──────────┘                                     │ │
│  │                                                                              │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└─────────────────────────────┬───────────────────────────────────────────────────┬─┘
                              │                                                   │
                              ▼                                                   ▼
┌─────────────────────────────────────────────┐  ┌────────────────────────────────┐
│              DATA LAYER                      │  │      EXTERNAL SERVICES          │
│                                              │  │                                 │
│  ┌────────────┐      ┌────────────┐         │  │  ┌──────────────────────────┐  │
│  │ PostgreSQL │      │   Redis    │         │  │  │     AI Gateway           │  │
│  │            │      │            │         │  │  │   (OpenRouter/LiteLLM)   │  │
│  │ • Users    │      │ • Sessions │         │  │  └──────────────────────────┘  │
│  │ • Groups   │      │ • Cache    │         │  │                                 │
│  │ • Classes  │      │ • Queues   │         │  │  ┌──────────────────────────┐  │
│  │ • Tools    │      │ • Pub/Sub  │         │  │  │    OTEL Collector        │  │
│  │ • Sessions │      │            │         │  │  │   (Traces, Metrics)      │  │
│  │ • Messages │      │            │         │  │  └──────────────────────────┘  │
│  │ • Runs     │      │            │         │  │                                 │
│  └────────────┘      └────────────┘         │  │  ┌──────────────────────────┐  │
│                                              │  │  │    Email Service         │  │
└──────────────────────────────────────────────┘  │  │   (Resend/SES)          │  │
                                                  │  └──────────────────────────┘  │
                                                  │                                 │
                                                  └─────────────────────────────────┘
```

### Technology Stack

| Layer      | Technology    | Version | Purpose                 |
| ---------- | ------------- | ------- | ----------------------- |
| Runtime    | Node.js       | 20 LTS  | Server runtime          |
| Language   | TypeScript    | 5.3+    | Type safety             |
| Framework  | Fastify       | 4.x     | HTTP server             |
| ORM        | Drizzle       | 0.29+   | Database access         |
| Database   | PostgreSQL    | 16      | Primary data store      |
| Cache      | Redis         | 7       | Sessions, queues, cache |
| Queue      | BullMQ        | 5.x     | Background jobs         |
| Validation | Zod           | 3.x     | Schema validation       |
| Telemetry  | OpenTelemetry | 1.x     | Observability           |

### Why These Choices?

**Fastify over Express**: 2-3x better throughput, native async/await, schema-based validation, better TypeScript support. Plugin architecture encourages modular code.

**Drizzle over Prisma**: SQL-like syntax reduces abstraction leakage, better query performance, smaller bundle size, true TypeScript types (not generated). Trade-off: Smaller community.

**PostgreSQL with ltree**: Native hierarchical data support for nested groups (districts → schools → departments). JSONB for flexible schema (tool definitions, settings). Mature, well-understood.

**Redis for Everything Ephemeral**: Auth sessions (Lucia), job queues (BullMQ), real-time (Socket.io adapter), cache. Single dependency for multiple concerns.

---

## 3. Project Organization

### Monorepo Structure

```
raptscallions/
├── apps/
│   ├── api/                      # Main API server
│   │   ├── src/
│   │   │   ├── routes/           # Route handlers by domain
│   │   │   ├── middleware/       # Request processing
│   │   │   ├── services/         # Business logic
│   │   │   └── utils/            # Helpers
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── worker/                   # Background job processor
│   │   ├── src/
│   │   │   ├── jobs/             # Job handlers
│   │   │   └── queue.ts          # Queue configuration
│   │   └── package.json
│   │
│   └── web/                      # Frontend (Vite + React)
│       └── ...
│
├── packages/
│   ├── core/                     # Shared types and schemas
│   │   ├── src/
│   │   │   ├── types/            # TypeScript interfaces
│   │   │   └── schemas/          # Zod validation schemas
│   │   └── package.json
│   │
│   ├── db/                       # Database schema and client
│   │   ├── src/
│   │   │   ├── schema/           # Drizzle schema files
│   │   │   ├── migrations/       # SQL migrations
│   │   │   ├── client.ts         # DB connection
│   │   │   └── seed.ts           # Initial data
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── auth/                     # Authentication (Lucia + Arctic)
│   │   ├── src/
│   │   │   ├── lucia.ts          # Session management
│   │   │   ├── oauth.ts          # OAuth providers
│   │   │   └── permissions.ts    # CASL abilities
│   │   └── package.json
│   │
│   ├── events/                   # Event system (BullMQ)
│   │   ├── src/
│   │   │   ├── queues.ts         # Queue definitions
│   │   │   ├── emit.ts           # Event emitter
│   │   │   └── types.ts          # Event type definitions
│   │   └── package.json
│   │
│   ├── modules/                  # Module system
│   │   ├── src/
│   │   │   ├── supervisor.ts     # Worker management
│   │   │   ├── registry.ts       # Module discovery
│   │   │   └── built-in/         # Core modules
│   │   └── package.json
│   │
│   └── telemetry/                # Observability
│       ├── src/
│       │   ├── tracing.ts        # OpenTelemetry setup
│       │   ├── metrics.ts        # Custom metrics
│       │   └── logging.ts        # Structured logging
│       └── package.json
│
├── modules/                      # External/community modules
│   └── ...
│
├── deploy/                       # Deployment configurations
│   ├── heroku/
│   ├── docker/
│   └── kubernetes/
│
├── pnpm-workspace.yaml
├── turbo.json                    # Build orchestration
└── package.json
```

### Package Boundaries

| Package                    | Depends On             | Exposes                      |
| -------------------------- | ---------------------- | ---------------------------- |
| `@raptscallions/core`      | —                      | Types, Zod schemas           |
| `@raptscallions/db`        | `core`                 | Drizzle client, schema       |
| `@raptscallions/auth`      | `core`, `db`           | Lucia, OAuth, permissions    |
| `@raptscallions/events`    | `core`                 | Event emitter, queue configs |
| `@raptscallions/modules`   | `core`, `db`, `events` | Module supervisor            |
| `@raptscallions/telemetry` | —                      | Logger, tracer, metrics      |
| `@raptscallions/api`       | All packages           | HTTP server                  |
| `@raptscallions/worker`    | `core`, `db`, `events` | Job processors               |

**Design Principle**: Packages should have clear responsibilities and minimal coupling. The `api` app orchestrates, packages provide capabilities.

### Build Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                           turbo build                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  packages/core ──┬──► packages/db ──┬──► packages/auth              │
│                  │                  │                                │
│                  └──► packages/events ──┬──► packages/modules       │
│                                         │                            │
│  packages/telemetry ────────────────────┴──► apps/api               │
│                                             apps/worker             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Why Turborepo?** Parallel builds, intelligent caching, dependency-aware execution order. Saves significant CI time as project grows.

---

## 4. Database Design

### Schema Philosophy

**Principles**:

1. **Explicit over implicit**: Foreign keys, constraints, indexes declared upfront
2. **JSONB for flexibility**: Settings, configurations, tool definitions
3. **UUID primary keys**: Distributed-friendly, no sequential leakage
4. **Timestamps everywhere**: `created_at`, `updated_at` on all tables
5. **Soft deletes where needed**: For audit trails (users, groups)

### Core Entity Relationships

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           IDENTITY & HIERARCHY                                 │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐          │
│  │    users    │◄──────────│group_members│──────────►│   groups    │          │
│  │             │           │   (M:M)     │           │   (ltree)   │          │
│  │ • id        │           │             │           │             │          │
│  │ • email     │           │ • role      │           │ • path      │          │
│  │ • name      │           │             │           │ • settings  │          │
│  │ • status    │           └─────────────┘           │ • theme     │          │
│  └─────────────┘                                     └──────┬──────┘          │
│         │                                                    │                 │
│         │                                            ┌───────┴───────┐        │
│         │                                            ▼               │        │
│         │                                   ┌─────────────┐          │        │
│         │                                   │   classes   │          │        │
│         │                                   │             │◄─────────┘        │
│         │                                   │ • group_id  │                   │
│         │                                   │ • settings  │                   │
│         └──────────────────────────────────►└─────────────┘                   │
│                   class_members (M:M)                                          │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│                           TOOLS & RUNTIME                                      │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐          │
│  │    tools    │◄──────────│ assignments │──────────►│   classes   │          │
│  │             │           │             │           │             │          │
│  │ • type      │           │ • due_at    │           │             │          │
│  │ • definition│           │ • config    │           │             │          │
│  │ • group_id  │           └──────┬──────┘           └─────────────┘          │
│  └──────┬──────┘                  │                                            │
│         │                         │                                            │
│         │              ┌──────────┴──────────┐                                 │
│         │              ▼                     ▼                                 │
│         │     ┌─────────────┐       ┌─────────────┐                           │
│         │     │ submissions │       │             │                           │
│         │     │             │       │             │                           │
│         │     │ • attempt   │       │             │                           │
│         │     │ • state     │       │             │                           │
│         │     └──────┬──────┘       │             │                           │
│         │            │              │             │                           │
│    ┌────┴────┐  ┌────┴────┐        │             │                           │
│    ▼         ▼  ▼         │        │             │                           │
│ ┌───────┐ ┌───────┐       │        │             │                           │
│ │sessions│ │ runs  │       │        │             │                           │
│ │(chat) │ │(prod) │◄──────┘        │             │                           │
│ │       │ │       │                │             │                           │
│ └───┬───┘ └───────┘                │             │                           │
│     │                              │             │                           │
│     ▼                              │             │                           │
│ ┌───────┐                          │             │                           │
│ │messages│                         │             │                           │
│ │       │                          │             │                           │
│ └───────┘                          │             │                           │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Hierarchical Groups with ltree

**Problem**: Districts contain schools, schools contain departments. Need efficient ancestor/descendant queries.

**Solution**: PostgreSQL's `ltree` extension.

```sql
-- Create extension
CREATE EXTENSION IF NOT EXISTS ltree;

-- Groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES groups(id),
  name TEXT NOT NULL,
  path ltree NOT NULL,  -- e.g., 'district.school.department'
  settings JSONB NOT NULL DEFAULT '{}',
  theme JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX groups_path_idx ON groups USING GIST (path);
```

**Query Patterns**:

```sql
-- All descendants of a group
SELECT * FROM groups WHERE path <@ 'district.school';

-- All ancestors of a group
SELECT * FROM groups WHERE path @> 'district.school.department';

-- Direct children only
SELECT * FROM groups WHERE parent_id = $1;
```

**Trade-off**: Path must be updated when group moves. This is rare (restructuring) and can be done in a transaction.

### Tool Definition Schema

**Storage**: JSONB for flexibility, versioning support.

```typescript
// Tool definition structure (stored in tools.definition)
interface ToolDefinition {
  // Identity
  name: string;
  version: string;
  type: "chat" | "product";

  // Behavior
  behavior: string; // System prompt
  model?: string; // Override default model

  // Product tools only
  input_schema?: JSONSchema7;
  output_schema?: JSONSchema7;

  // Configuration
  constraints?: {
    topics?: string[];
    no_direct_answers?: boolean;
    max_messages?: number;
    max_session_duration?: number; // minutes
  };

  // Module configuration
  modules?: Array<{
    name: string;
    config?: Record<string, unknown>;
  }>;

  // Metadata
  meta?: {
    subject?: string;
    grades?: number[];
    description?: string;
    tags?: string[];
  };
}
```

### Migration Strategy

**Approach**: SQL migrations managed by Drizzle Kit.

```bash
# Generate migration from schema changes
pnpm --filter @raptscallions/db generate

# Apply migrations
pnpm --filter @raptscallions/db migrate

# Push schema directly (development only)
pnpm --filter @raptscallions/db push
```

**Migration Naming**: `NNNN_description.sql` (e.g., `0001_initial.sql`, `0002_add_submissions.sql`)

**Best Practices**:

- Migrations are immutable once committed
- Each migration is idempotent where possible
- Data migrations separate from schema migrations
- Test migrations against production-like data volume

---

## 5. Service Layer Architecture

### Service Design Principles

1. **Single Responsibility**: Each service owns one domain
2. **Dependency Injection**: Services receive dependencies, enabling testing
3. **Thin Controllers**: Routes delegate to services immediately
4. **Transaction Boundaries**: Services own transaction management

### Service Structure Pattern

```typescript
// packages/db/src/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

// apps/api/src/services/group.service.ts
import { db } from "@raptscallions/db";
import { groups, groupMembers } from "@raptscallions/db/schema";
import { eq, and } from "drizzle-orm";

export class GroupService {
  constructor(private db = db) {} // Default, injectable for tests

  async createGroup(data: CreateGroupInput) {
    // Business logic here
    const parent = data.parentId
      ? await this.db.query.groups.findFirst({
          where: eq(groups.id, data.parentId),
        })
      : null;

    const path = parent
      ? `${parent.path}.${slugify(data.name)}`
      : slugify(data.name);

    const [group] = await this.db
      .insert(groups)
      .values({ ...data, path })
      .returning();

    return group;
  }

  async getGroupWithInheritedTheme(groupId: string) {
    // Get group and all ancestors
    const group = await this.db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });

    if (!group) return null;

    // Get ancestors ordered by path depth (furthest first)
    const ancestors = await this.db.execute(sql`
      SELECT * FROM groups 
      WHERE path @> ${group.path}
      ORDER BY nlevel(path) ASC
    `);

    // Merge themes (child overrides parent)
    const mergedTheme = ancestors.reduce(
      (acc, ancestor) => ({ ...acc, ...ancestor.theme }),
      {}
    );

    return { ...group, resolvedTheme: mergedTheme };
  }

  async canAccessGroup(userId: string, groupId: string): Promise<boolean> {
    // Check if user is member of this group or any ancestor
    const membership = await this.db.execute(sql`
      SELECT gm.* FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      JOIN groups target ON target.path <@ g.path
      WHERE gm.user_id = ${userId} AND target.id = ${groupId}
      LIMIT 1
    `);

    return membership.length > 0;
  }
}
```

### Service Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE GRAPH                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GroupService ──────► ThemeService                              │
│       │                    │                                     │
│       │                    │                                     │
│       ▼                    │                                     │
│  ClassService ◄────────────┘                                    │
│       │                                                          │
│       │                                                          │
│       ▼                                                          │
│  AssignmentService ───────► ToolService                         │
│       │                          │                               │
│       │                          │                               │
│       ▼                          ▼                               │
│  SubmissionService          AIGateway                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Circular Dependencies**: Avoided by design. Services depend downward only. If bidirectional communication needed, use events.

---

## 6. API Design Principles

### REST Resource Structure

```
/api/v1
├── /auth
│   ├── POST   /register
│   ├── POST   /login
│   ├── POST   /logout
│   ├── POST   /refresh
│   └── GET    /me
│
├── /users
│   ├── GET    /                     # List users (admin)
│   ├── GET    /:id                  # Get user
│   ├── PATCH  /:id                  # Update user
│   └── DELETE /:id                  # Deactivate user
│
├── /groups
│   ├── GET    /                     # List user's groups
│   ├── POST   /                     # Create group
│   ├── GET    /:id                  # Get group
│   ├── PATCH  /:id                  # Update group
│   ├── DELETE /:id                  # Archive group
│   ├── GET    /:id/children         # Direct children
│   ├── GET    /:id/ancestors        # Parent chain
│   ├── GET    /:id/theme/resolved   # Merged theme
│   ├── PATCH  /:id/theme            # Update theme
│   └── GET    /:id/members          # Group members
│
├── /classes
│   ├── GET    /                     # List user's classes
│   ├── POST   /                     # Create class
│   ├── GET    /:id                  # Get class
│   ├── PATCH  /:id                  # Update class
│   ├── GET    /:id/roster           # Class members
│   ├── GET    /:id/assignments      # Class assignments
│   └── GET    /:id/submissions      # All submissions
│
├── /tools
│   ├── GET    /                     # List available tools
│   ├── POST   /                     # Create tool
│   ├── GET    /:id                  # Get tool
│   ├── PATCH  /:id                  # Update tool (creates version)
│   └── GET    /:id/versions         # Version history
│
├── /assignments
│   ├── POST   /                     # Create assignment
│   ├── GET    /:id                  # Get assignment
│   ├── PATCH  /:id                  # Update assignment
│   ├── DELETE /:id                  # Delete assignment
│   └── GET    /:id/submissions      # Assignment submissions
│
├── /sessions                        # (See Chat Runtime Design)
│
├── /runs                            # (Product tool executions)
│   ├── POST   /                     # Start run
│   ├── GET    /:id                  # Get run status
│   └── GET    /:id/result           # Get run result
│
└── /admin
    ├── /users                       # User management
    ├── /ai-models                   # Model configuration
    ├── /ai-usage                    # Usage reports
    └── /oneroster                   # SIS sync
```

### Request/Response Patterns

**Envelope Pattern**: Consistent response structure.

```typescript
// Success response
{
  data: T,
  meta?: {
    pagination?: { page, limit, total, totalPages }
  }
}

// Error response
{
  error: {
    code: string,      // Machine-readable: 'VALIDATION_ERROR'
    message: string,   // Human-readable
    details?: any      // Validation errors, etc.
  }
}
```

**Example**:

```typescript
// GET /groups?page=1&limit=20
{
  "data": [
    { "id": "...", "name": "Springfield District", ... }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### Validation with Zod

```typescript
// packages/core/src/schemas/group.schema.ts
import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional(),
  settings: z.record(z.unknown()).default({}),
});

export const updateGroupSchema = createGroupSchema.partial();

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
```

### Route Handler Pattern

```typescript
// apps/api/src/routes/groups.routes.ts
import { FastifyInstance } from "fastify";
import { createGroupSchema } from "@raptscallions/core/schemas";
import { groupService } from "../services/group.service";
import { requireAuth, requireGroupAdmin } from "../middleware/auth";

export async function groupRoutes(app: FastifyInstance) {
  // Create group
  app.post(
    "/",
    {
      preHandler: [requireAuth],
      schema: {
        body: createGroupSchema,
        response: {
          201: { $ref: "Group" },
        },
      },
    },
    async (request, reply) => {
      const group = await groupService.createGroup({
        ...request.body,
        createdBy: request.user.id,
      });
      return reply.status(201).send({ data: group });
    }
  );

  // Get group with inherited theme
  app.get(
    "/:id/theme/resolved",
    {
      preHandler: [requireAuth, requireGroupAccess],
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
    },
    async (request, reply) => {
      const theme = await groupService.getGroupWithInheritedTheme(
        request.params.id
      );
      return { data: theme };
    }
  );
}
```

---

## 7. Configuration Management

### Environment Variables

```bash
# ============================================================
# CORE
# ============================================================
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# ============================================================
# DATABASE
# ============================================================
DATABASE_URL=postgresql://user:pass@host:5432/raptscallions
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# ============================================================
# REDIS
# ============================================================
REDIS_URL=redis://localhost:6379

# ============================================================
# AUTH
# ============================================================
COOKIE_DOMAIN=.yourdomain.com
SESSION_SECRET=<random-32-bytes>

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
CLEVER_CLIENT_ID=...
CLEVER_CLIENT_SECRET=...

# ============================================================
# AI
# ============================================================
AI_GATEWAY_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-...
AI_DEFAULT_MODEL=anthropic/claude-sonnet-4-20250514

# ============================================================
# TELEMETRY
# ============================================================
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_SERVICE_NAME=raptscallions-api

# ============================================================
# NOTIFICATIONS
# ============================================================
RESEND_API_KEY=re_...
FROM_EMAIL=notifications@yourdomain.com

# ============================================================
# STORAGE (optional)
# ============================================================
S3_BUCKET=raptscallions-uploads
S3_REGION=us-east-1
```

### Config Module

```typescript
// apps/api/src/config.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error"])
    .default("info"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  COOKIE_DOMAIN: z.string().optional(),
  SESSION_SECRET: z.string().min(32),

  AI_GATEWAY_URL: z.string().url(),
  AI_API_KEY: z.string(),
  AI_DEFAULT_MODEL: z.string().default("anthropic/claude-sonnet-4-20250514"),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default("raptscallions-api"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
```

**Why Validate at Startup?** Fail fast. Better to crash immediately with clear error than fail mysteriously later.

---

## 8. Background Processing

### Job Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BULLMQ QUEUES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  notifications   │  │    oneroster     │  │    cleanup     │ │
│  │                  │  │                  │  │                │ │
│  │ • email          │  │ • sync-orgs      │  │ • expired-sess │ │
│  │ • push           │  │ • sync-users     │  │ • old-runs     │ │
│  │ • in-app         │  │ • sync-classes   │  │ • temp-files   │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │   aggregation    │  │     exports      │                     │
│  │                  │  │                  │                     │
│  │ • usage-daily    │  │ • csv            │                     │
│  │ • usage-monthly  │  │ • pdf-report     │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Queue Definitions

```typescript
// packages/events/src/queues.ts
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL);

// Queue definitions
export const notificationQueue = new Queue("notifications", { connection });
export const oneRosterQueue = new Queue("oneroster", { connection });
export const cleanupQueue = new Queue("cleanup", { connection });
export const aggregationQueue = new Queue("aggregation", { connection });

// Scheduled jobs
aggregationQueue.add(
  "usage-daily",
  {},
  { repeat: { cron: "0 2 * * *" } } // 2 AM daily
);

cleanupQueue.add(
  "expired-sessions",
  {},
  { repeat: { cron: "0 * * * *" } } // Every hour
);
```

### Job Processors

```typescript
// apps/worker/src/jobs/cleanup.job.ts
import { Worker } from "bullmq";
import { db } from "@raptscallions/db";
import { sessions } from "@raptscallions/db/schema";
import { lt, and, eq } from "drizzle-orm";

const cleanupWorker = new Worker(
  "cleanup",
  async (job) => {
    switch (job.name) {
      case "expired-sessions":
        // Complete sessions inactive for 24+ hours
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const result = await db
          .update(sessions)
          .set({ state: "completed", endedAt: new Date() })
          .where(
            and(eq(sessions.state, "active"), lt(sessions.updatedAt, cutoff))
          )
          .returning({ id: sessions.id });

        return { completed: result.length };

      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  },
  { connection }
);

cleanupWorker.on("completed", (job, result) => {
  logger.info({ job: job.name, result }, "Job completed");
});

cleanupWorker.on("failed", (job, error) => {
  logger.error({ job: job?.name, error }, "Job failed");
});
```

---

## 9. Observability Strategy

### Three Pillars

| Pillar      | Tool                   | Purpose                |
| ----------- | ---------------------- | ---------------------- |
| **Logging** | Pino + structured JSON | Request/error tracking |
| **Metrics** | OpenTelemetry          | Performance, capacity  |
| **Tracing** | OpenTelemetry + Jaeger | Request flow, latency  |

### Logging Configuration

```typescript
// packages/telemetry/src/logging.ts
import pino from "pino";
import { trace, context } from "@opentelemetry/api";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  mixin() {
    // Auto-inject trace context
    const span = trace.getSpan(context.active());
    if (span) {
      const { traceId, spanId } = span.spanContext();
      return { traceId, spanId };
    }
    return {};
  },
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty" }
      : undefined,
});
```

### Metrics Definition

```typescript
// packages/telemetry/src/metrics.ts
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("raptscallions");

export const httpRequestDuration = meter.createHistogram(
  "http_request_duration_ms",
  {
    description: "HTTP request duration in milliseconds",
    unit: "ms",
  }
);

export const aiRequestCounter = meter.createCounter("ai_requests_total", {
  description: "Total AI gateway requests",
});

export const aiTokensCounter = meter.createCounter("ai_tokens_total", {
  description: "Total AI tokens consumed",
});

export const activeSessionsGauge = meter.createUpDownCounter(
  "active_sessions",
  {
    description: "Currently active chat sessions",
  }
);
```

### Trace Context Propagation

```typescript
// apps/api/src/middleware/tracing.ts
import { FastifyPluginAsync } from "fastify";
import { trace, SpanKind, SpanStatusCode } from "@opentelemetry/api";

export const tracingPlugin: FastifyPluginAsync = async (app) => {
  const tracer = trace.getTracer("raptscallions-api");

  app.addHook("onRequest", async (request) => {
    const span = tracer.startSpan(`${request.method} ${request.routerPath}`, {
      kind: SpanKind.SERVER,
      attributes: {
        "http.method": request.method,
        "http.url": request.url,
        "http.user_agent": request.headers["user-agent"],
      },
    });

    request.span = span;
  });

  app.addHook("onResponse", async (request, reply) => {
    const span = request.span;
    if (span) {
      span.setAttribute("http.status_code", reply.statusCode);
      if (reply.statusCode >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      span.end();
    }
  });
};
```

---

## 10. Deployment Architecture

### Deployment Targets

| Target             | Complexity | Use Case                                 |
| ------------------ | ---------- | ---------------------------------------- |
| **Heroku**         | ⭐         | One-click, small schools, evaluation     |
| **Docker Compose** | ⭐⭐       | Self-hosted, single server               |
| **Kubernetes**     | ⭐⭐⭐     | Districts, enterprise, high availability |

### Heroku One-Click

```json
// app.json
{
  "name": "Raptscallions",
  "description": "Open-source AI education platform",
  "stack": "container",
  "addons": ["heroku-postgresql:essential-0", "heroku-redis:mini"],
  "env": {
    "AI_GATEWAY_URL": {
      "value": "https://openrouter.ai/api/v1"
    },
    "AI_API_KEY": {
      "required": true,
      "description": "OpenRouter API key"
    },
    "AI_DEFAULT_MODEL": {
      "value": "anthropic/claude-sonnet-4-20250514"
    },
    "SESSION_SECRET": {
      "generator": "secret"
    },
    "ADMIN_EMAIL": {
      "required": true
    },
    "ADMIN_PASSWORD": {
      "required": true
    }
  },
  "formation": {
    "web": {
      "quantity": 1,
      "size": "basic"
    },
    "worker": {
      "quantity": 1,
      "size": "basic"
    }
  },
  "scripts": {
    "postdeploy": "pnpm --filter @raptscallions/db migrate && pnpm --filter @raptscallions/db seed"
  }
}
```

### Docker Compose

```yaml
# deploy/docker/docker-compose.yml
version: "3.8"

services:
  api:
    image: ghcr.io/raptscallions/raptscallions:latest
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:postgres@db:5432/raptscallions
      REDIS_URL: redis://redis:6379
      AI_GATEWAY_URL: ${AI_GATEWAY_URL}
      AI_API_KEY: ${AI_API_KEY}
      SESSION_SECRET: ${SESSION_SECRET}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    image: ghcr.io/raptscallions/raptscallions:latest
    command: ["node", "apps/worker/dist/index.js"]
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:postgres@db:5432/raptscallions
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: raptscallions
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes Overview

```yaml
# deploy/kubernetes/deployment.yaml (simplified)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: raptscallions-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: raptscallions-api
  template:
    spec:
      containers:
        - name: api
          image: ghcr.io/raptscallions/raptscallions:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: raptscallions-secrets
            - configMapRef:
                name: raptscallions-config
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
```

---

## 11. Performance Considerations

### Database Optimization

| Concern            | Strategy                                |
| ------------------ | --------------------------------------- |
| Connection pooling | PgBouncer in front of Postgres          |
| Query performance  | Indexes on foreign keys, GiST for ltree |
| Large result sets  | Cursor-based pagination                 |
| Hot tables         | Read replicas for reporting             |

### Caching Strategy

| Data             | TTL    | Invalidation    |
| ---------------- | ------ | --------------- |
| User permissions | 5 min  | On role change  |
| Group themes     | 15 min | On theme update |
| Tool definitions | 1 hour | On tool update  |
| AI model configs | 1 hour | On admin change |

### Connection Limits

```typescript
// Database pool sizing
// Formula: connections = (cpu_cores * 2) + effective_spindle_count
// For typical cloud instances: 10-20 connections per instance

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## 12. Security Architecture

### Defense in Depth

| Layer              | Protection                                |
| ------------------ | ----------------------------------------- |
| **Network**        | HTTPS only, CORS whitelist, rate limiting |
| **Authentication** | Lucia sessions, OAuth 2.0, MFA (future)   |
| **Authorization**  | CASL abilities, resource ownership        |
| **Input**          | Zod validation, SQL parameterization      |
| **Output**         | Response sanitization, error masking      |
| **Data**           | Encryption at rest, TLS in transit        |

### Rate Limiting

```typescript
// apps/api/src/middleware/rate-limit.ts
import rateLimit from "@fastify/rate-limit";

await app.register(rateLimit, {
  global: true,
  max: 100, // requests per window
  timeWindow: "1 minute",

  // Higher limits for authenticated users
  keyGenerator: (request) => {
    return request.user?.id || request.ip;
  },

  // Custom limits per route
  onExceeded: (request, key) => {
    logger.warn({ key, path: request.url }, "Rate limit exceeded");
  },
});

// Stricter limits for expensive operations
app.register(
  async (app) => {
    await app.register(rateLimit, {
      max: 10,
      timeWindow: "1 minute",
    });

    app.post("/sessions/:id/messages" /* ... */);
  },
  { prefix: "/api/v1" }
);
```

### Secret Management

| Environment | Strategy                  |
| ----------- | ------------------------- |
| Development | `.env.local` (gitignored) |
| CI/CD       | GitHub Secrets            |
| Heroku      | Config vars               |
| Kubernetes  | Sealed Secrets            |

---

## 13. Open Considerations

### Future Enhancements

| Enhancement    | Priority | Notes                                   |
| -------------- | -------- | --------------------------------------- |
| GraphQL API    | Medium   | For complex frontend queries            |
| WebSocket push | High     | Real-time dashboard updates             |
| File uploads   | Medium   | S3/R2 integration for attachments       |
| Multi-tenancy  | Low      | Database-per-tenant for large districts |
| Audit logging  | High     | Compliance requirement                  |

### Technical Debt to Watch

| Area                  | Risk                     | Mitigation                  |
| --------------------- | ------------------------ | --------------------------- |
| TypeScript strictness | Type safety erosion      | Enable strict mode early    |
| Test coverage         | Regression risk          | CI coverage gates           |
| Dependency updates    | Security vulnerabilities | Dependabot + monthly review |
| Database migrations   | Schema drift             | Migration tests             |

### Capacity Planning

| Metric            | Small (100 users) | Medium (1000 users) | Large (10000 users) |
| ----------------- | ----------------- | ------------------- | ------------------- |
| API instances     | 1                 | 2-3                 | 5-10                |
| Worker instances  | 1                 | 1-2                 | 3-5                 |
| PostgreSQL        | Basic             | Standard            | Premium + replicas  |
| Redis             | Mini              | Standard            | Cluster             |
| Estimated cost/mo | $50               | $200                | $1000+              |

---

## Document History

| Version | Date     | Author | Changes                           |
| ------- | -------- | ------ | --------------------------------- |
| 1.0.0   | Jan 2025 | —      | Initial implementation guide      |
| 2.0.0   | Jan 2025 | —      | Rewritten as design specification |
