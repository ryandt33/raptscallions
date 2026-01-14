# RaptScallions Backend Implementation Guide

Complete implementation guide for the RaptScallions backend using Node.js, TypeScript, Fastify, and Drizzle ORM.

---

## Table of Contents

1. [Project Structure](#project-structure)
1. [Database Schema](#database-schema)
1. [Core Services](#core-services)
1. [API Routes](#api-routes)
1. [Middleware](#middleware)
1. [Configuration](#configuration)

---

## Project Structure

```
raptscallions/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   ├── user.ts
│   │   │   │   ├── group.ts
│   │   │   │   ├── tool.ts
│   │   │   │   ├── theme.ts
│   │   │   │   ├── session.ts
│   │   │   │   └── module.ts
│   │   │   ├── schemas/
│   │   │   │   ├── user.schema.ts
│   │   │   │   ├── group.schema.ts
│   │   │   │   ├── tool.schema.ts
│   │   │   │   ├── theme.schema.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── db/
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── users.ts
│   │   │   │   ├── groups.ts
│   │   │   │   ├── classes.ts
│   │   │   │   ├── tools.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── runs.ts
│   │   │   │   ├── assignments.ts
│   │   │   │   ├── ai.ts
│   │   │   │   ├── oneroster.ts
│   │   │   │   └── index.ts
│   │   │   ├── migrations/
│   │   │   ├── client.ts
│   │   │   ├── seed.ts
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   ├── telemetry/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── tracing.ts
│   │   │   ├── metrics.ts
│   │   │   └── logging.ts
│   │   └── package.json
│   └── modules/
│       ├── src/
│       │   ├── types.ts
│       │   ├── registry.ts
│       │   ├── runner.ts
│       │   └── built-in/
│       │       ├── pii-filter/
│       │       ├── struggle-detector/
│       │       ├── safety-filter/
│       │       └── audit-log/
│       └── package.json
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── app.ts
│   │   │   ├── config.ts
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── users.routes.ts
│   │   │   │   ├── groups.routes.ts
│   │   │   │   ├── classes.routes.ts
│   │   │   │   ├── tools.routes.ts
│   │   │   │   ├── assignments.routes.ts
│   │   │   │   ├── sessions.routes.ts
│   │   │   │   ├── runs.routes.ts
│   │   │   │   ├── admin.routes.ts
│   │   │   │   └── index.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── validation.middleware.ts
│   │   │   │   ├── access-control.middleware.ts
│   │   │   │   └── rate-limit.middleware.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── group.service.ts
│   │   │   │   ├── theme.service.ts
│   │   │   │   ├── ai.service.ts
│   │   │   │   ├── module.service.ts
│   │   │   │   └── oneroster.service.ts
│   │   │   └── utils/
│   │   │       ├── crypto.ts
│   │   │       ├── jwt.ts
│   │   │       └── sanitize.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   └── worker/
│       ├── src/
│       │   ├── index.ts
│       │   ├── jobs/
│       │   │   ├── oneroster-sync.job.ts
│       │   │   ├── usage-aggregation.job.ts
│       │   │   └── cleanup.job.ts
│       │   └── queue.ts
│       └── package.json
└── package.json
```

---

## Database Schema

### Core Schema Files

#### packages/db/src/schema/groups.ts

```typescript
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";

// Custom ltree type for PostgreSQL
export const ltree = customType<{ data: string }>({
  dataType: () => "ltree",
});

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id").references(() => groups.id),
    name: text("name").notNull(),
    path: ltree("path").notNull(),
    settings: jsonb("settings").notNull().default({}),
    theme: jsonb("theme").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    pathIdx: index("groups_path_idx").using("gist", table.path),
  })
);

export const groupsRelations = relations(groups, ({ one, many }) => ({
  parent: one(groups, {
    fields: [groups.parentId],
    references: [groups.id],
  }),
  children: many(groups),
  members: many(groupMembers),
  classes: many(classes),
}));

export const groupMembers = pgTable(
  "group_members",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    role: text("role").notNull(), // admin, member
  },
  (table) => ({
    pk: { primaryKey: [table.userId, table.groupId] },
  })
);

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
}));
```

#### packages/db/src/schema/users.ts

```typescript
import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  givenName: text("given_name"),
  familyName: text("family_name"),
  status: text("status").notNull().default("active"), // active, inactive, suspended
  isSystemAdmin: boolean("is_system_admin").notNull().default(false),
  passwordHash: text("password_hash"),
  ssoProvider: text("sso_provider"), // google, clever, saml
  ssoId: text("sso_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const usersRelations = relations(users, ({ many }) => ({
  groupMemberships: many(groupMembers),
  classMemberships: many(classMembers),
  sessions: many(sessions),
  runs: many(runs),
}));
```

#### packages/db/src/schema/classes.ts

```typescript
import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id),
  name: text("name").notNull(),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const classesRelations = relations(classes, ({ one, many }) => ({
  group: one(groups, {
    fields: [classes.groupId],
    references: [groups.id],
  }),
  members: many(classMembers),
  assignments: many(assignments),
}));

export const classMembers = pgTable(
  "class_members",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id),
    role: text("role").notNull(), // teacher, student
  },
  (table) => ({
    pk: { primaryKey: [table.userId, table.classId] },
  })
);

export const classMembersRelations = relations(classMembers, ({ one }) => ({
  user: one(users, {
    fields: [classMembers.userId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [classMembers.classId],
    references: [classes.id],
  }),
}));
```

#### packages/db/src/schema/tools.ts

```typescript
import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const tools = pgTable(
  "tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(), // 'chat' | 'product'
    name: text("name").notNull(),
    version: text("version").notNull(),
    definition: jsonb("definition").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    groupId: uuid("group_id").references(() => groups.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    unique: { unique: [table.id, table.version] },
  })
);

export const toolsRelations = relations(tools, ({ one, many }) => ({
  creator: one(users, {
    fields: [tools.createdBy],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [tools.groupId],
    references: [groups.id],
  }),
  assignments: many(assignments),
  sessions: many(sessions),
  runs: many(runs),
}));
```

#### packages/db/src/schema/sessions.ts

```typescript
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  toolId: uuid("tool_id")
    .notNull()
    .references(() => tools.id),
  toolVersion: text("tool_version").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  state: text("state").notNull().default("active"), // active, paused, completed
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  tool: one(tools, {
    fields: [sessions.toolId],
    references: [tools.id],
  }),
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  messages: many(messages),
  submission: one(submissions),
  extractions: many(extractions),
}));

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  seq: integer("seq").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  meta: jsonb("meta").notNull().default({}),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
}));
```

#### packages/db/src/schema/runs.ts

```typescript
import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  toolId: uuid("tool_id")
    .notNull()
    .references(() => tools.id),
  toolVersion: text("tool_version").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  state: text("state").notNull().default("pending"), // pending, complete, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const runsRelations = relations(runs, ({ one, many }) => ({
  tool: one(tools, {
    fields: [runs.toolId],
    references: [tools.id],
  }),
  user: one(users, {
    fields: [runs.userId],
    references: [users.id],
  }),
  submission: one(submissions),
  extractions: many(extractions),
}));
```

#### packages/db/src/schema/assignments.ts

```typescript
import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  interval,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id),
  toolId: uuid("tool_id")
    .notNull()
    .references(() => tools.id),
  toolVersion: text("tool_version").notNull(),
  name: text("name").notNull(),
  instructions: text("instructions"),
  config: jsonb("config").notNull().default({}),
  availableAt: timestamp("available_at"),
  dueAt: timestamp("due_at"),
  closesAt: timestamp("closes_at"),
  maxAttempts: integer("max_attempts"),
  timeLimit: interval("time_limit"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  class: one(classes, {
    fields: [assignments.classId],
    references: [classes.id],
  }),
  tool: one(tools, {
    fields: [assignments.toolId],
    references: [tools.id],
  }),
  creator: one(users, {
    fields: [assignments.createdBy],
    references: [users.id],
  }),
  submissions: many(submissions),
}));

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    sessionId: uuid("session_id").references(() => sessions.id),
    runId: uuid("run_id").references(() => runs.id),
    attempt: integer("attempt").notNull().default(1),
    state: text("state").notNull().default("in_progress"), // in_progress, submitted, late
    startedAt: timestamp("started_at").notNull().defaultNow(),
    submittedAt: timestamp("submitted_at"),
  },
  (table) => ({
    unique: { unique: [table.assignmentId, table.userId, table.attempt] },
  })
);

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [submissions.sessionId],
    references: [sessions.id],
  }),
  run: one(runs, {
    fields: [submissions.runId],
    references: [runs.id],
  }),
}));
```

#### packages/db/src/schema/ai.ts

```typescript
import {
  pgTable,
  text,
  boolean,
  numeric,
  integer,
  jsonb,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const aiModels = pgTable("ai_models", {
  id: text("id").primaryKey(), // 'anthropic/claude-sonnet-4-20250514'
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  active: boolean("active").notNull().default(false),
  inputCostPer1k: numeric("input_cost_per_1k"),
  outputCostPer1k: numeric("output_cost_per_1k"),
  maxContextTokens: integer("max_context_tokens"),
  maxOutputTokens: integer("max_output_tokens"),
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiSettings = pgTable("ai_settings", {
  id: text("id").primaryKey(), // 'system' or group_id
  defaultModel: text("default_model").references(() => aiModels.id),
  requestsPerMinute: integer("requests_per_minute"),
  requestsPerHour: integer("requests_per_hour"),
  tokensPerDay: integer("tokens_per_day"),
  monthlyBudget: numeric("monthly_budget"),
  budgetAlertThreshold: numeric("budget_alert_threshold"),
  config: jsonb("config").notNull().default({}),
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  groupId: uuid("group_id").references(() => groups.id),
  classId: uuid("class_id").references(() => classes.id),
  toolId: uuid("tool_id").references(() => tools.id),
  sessionId: uuid("session_id").references(() => sessions.id),
  runId: uuid("run_id").references(() => runs.id),
  assignmentId: uuid("assignment_id").references(() => assignments.id),
  model: text("model").notNull(),
  requestType: text("request_type").notNull(), // 'chat' | 'product'
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  cost: numeric("cost").notNull(),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
  user: one(users, {
    fields: [aiUsage.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [aiUsage.groupId],
    references: [groups.id],
  }),
  class: one(classes, {
    fields: [aiUsage.classId],
    references: [classes.id],
  }),
  tool: one(tools, {
    fields: [aiUsage.toolId],
    references: [tools.id],
  }),
  session: one(sessions, {
    fields: [aiUsage.sessionId],
    references: [sessions.id],
  }),
  run: one(runs, {
    fields: [aiUsage.runId],
    references: [runs.id],
  }),
}));
```

#### packages/db/src/schema/extractions.ts

```typescript
import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const extractions = pgTable("extractions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id),
  runId: uuid("run_id").references(() => runs.id),
  module: text("module").notNull(),
  type: text("type").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const extractionsRelations = relations(extractions, ({ one }) => ({
  session: one(sessions, {
    fields: [extractions.sessionId],
    references: [sessions.id],
  }),
  run: one(runs, {
    fields: [extractions.runId],
    references: [runs.id],
  }),
}));
```

### Database Client

#### packages/db/src/client.ts

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;
```

### Drizzle Configuration

#### packages/db/drizzle.config.ts

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### Initial Migration

#### packages/db/src/migrations/0001_initial.sql

```sql
-- Enable ltree extension
CREATE EXTENSION IF NOT EXISTS ltree;

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  given_name TEXT,
  family_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_system_admin BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  sso_provider TEXT,
  sso_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Create groups table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES groups(id),
  name TEXT NOT NULL,
  path LTREE NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  theme JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX groups_path_idx ON groups USING gist(path);

-- Create group_members table
CREATE TABLE group_members (
  user_id UUID NOT NULL REFERENCES users(id),
  group_id UUID NOT NULL REFERENCES groups(id),
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, group_id)
);

-- Create classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id),
  name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create class_members table
CREATE TABLE class_members (
  user_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, class_id)
);

-- Create tools table
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  definition JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  group_id UUID REFERENCES groups(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, version)
);

-- Create sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES tools(id),
  tool_version TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  state TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  seq INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX messages_session_seq_idx ON messages(session_id, seq);

-- Create runs table
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES tools(id),
  tool_version TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  input JSONB NOT NULL,
  output JSONB,
  state TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create assignments table
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id),
  tool_id UUID NOT NULL REFERENCES tools(id),
  tool_version TEXT NOT NULL,
  name TEXT NOT NULL,
  instructions TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  available_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  max_attempts INTEGER,
  time_limit INTERVAL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  user_id UUID NOT NULL REFERENCES users(id),
  session_id UUID REFERENCES sessions(id),
  run_id UUID REFERENCES runs(id),
  attempt INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  UNIQUE (assignment_id, user_id, attempt)
);

-- Create extractions table
CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  run_id UUID REFERENCES runs(id),
  module TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ai_models table
CREATE TABLE ai_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  input_cost_per_1k NUMERIC,
  output_cost_per_1k NUMERIC,
  max_context_tokens INTEGER,
  max_output_tokens INTEGER,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ai_settings table
CREATE TABLE ai_settings (
  id TEXT PRIMARY KEY,
  default_model TEXT REFERENCES ai_models(id),
  requests_per_minute INTEGER,
  requests_per_hour INTEGER,
  tokens_per_day INTEGER,
  monthly_budget NUMERIC,
  budget_alert_threshold NUMERIC,
  config JSONB NOT NULL DEFAULT '{}'
);

-- Create ai_usage table
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  group_id UUID REFERENCES groups(id),
  class_id UUID REFERENCES classes(id),
  tool_id UUID REFERENCES tools(id),
  session_id UUID REFERENCES sessions(id),
  run_id UUID REFERENCES runs(id),
  assignment_id UUID REFERENCES assignments(id),
  model TEXT NOT NULL,
  request_type TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost NUMERIC NOT NULL,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ai_usage_user_created_idx ON ai_usage(user_id, created_at);
CREATE INDEX ai_usage_group_created_idx ON ai_usage(group_id, created_at);
CREATE INDEX ai_usage_created_idx ON ai_usage(created_at);

-- Create oneroster_config table
CREATE TABLE oneroster_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_schedule TEXT,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  org_mapping JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create oneroster_sync_log table
CREATE TABLE oneroster_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES oneroster_config(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT,
  orgs_synced INTEGER NOT NULL DEFAULT 0,
  users_synced INTEGER NOT NULL DEFAULT 0,
  classes_synced INTEGER NOT NULL DEFAULT 0,
  enrollments_synced INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'
);

-- Create oneroster_mappings table
CREATE TABLE oneroster_mappings (
  oneroster_type TEXT NOT NULL,
  sourced_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  config_id UUID NOT NULL REFERENCES oneroster_config(id),
  last_synced_at TIMESTAMPTZ,
  PRIMARY KEY (config_id, oneroster_type, sourced_id)
);
```

---

## Core Services

### Theme Service

#### apps/api/src/services/theme.service.ts

```typescript
import { db } from "@raptscallions/db";
import { groups } from "@raptscallions/db/schema";
import { eq, sql } from "drizzle-orm";
import { ThemeConfig } from "@raptscallions/core/schemas";
import { redis } from "../config";

export class ThemeService {
  /**
   * Resolve theme for a group by merging themes from all ancestors
   */
  async resolveGroupTheme(groupId: string): Promise<ThemeConfig> {
    // Check cache first
    const cached = await redis.get(`theme:${groupId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get system default theme
    let theme = this.getSystemTheme();

    // Get group path
    const group = await db
      .select({ path: groups.path })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group[0]) {
      return theme;
    }

    const groupPath = group[0].path;

    // Get all groups in hierarchy (root to leaf)
    const hierarchy = await db
      .select()
      .from(groups)
      .where(
        sql`${groups.path} @> ${groupPath} OR ${groups.path} = ${groupPath}`
      )
      .orderBy(sql`nlevel(${groups.path})`);

    // Merge themes (later overrides earlier)
    for (const g of hierarchy) {
      if (g.theme && Object.keys(g.theme).length > 0) {
        theme = { ...theme, ...g.theme };
      }
    }

    // Cache for 1 hour
    await redis.set(`theme:${groupId}`, JSON.stringify(theme), "EX", 3600);

    return theme;
  }

  /**
   * Update group theme and invalidate cache
   */
  async updateGroupTheme(
    groupId: string,
    themeUpdate: Partial<ThemeConfig>
  ): Promise<ThemeConfig> {
    // Get current theme
    const current = await db
      .select({ theme: groups.theme })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    const currentTheme = (current[0]?.theme as ThemeConfig) || {};

    // Merge with update
    const newTheme = { ...currentTheme, ...themeUpdate };

    // Update database
    await db
      .update(groups)
      .set({ theme: newTheme })
      .where(eq(groups.id, groupId));

    // Invalidate cache for this group and all descendants
    await this.invalidateThemeCache(groupId);

    return newTheme;
  }

  /**
   * Delete group theme (revert to parent)
   */
  async deleteGroupTheme(groupId: string): Promise<void> {
    await db.update(groups).set({ theme: {} }).where(eq(groups.id, groupId));

    await this.invalidateThemeCache(groupId);
  }

  /**
   * Invalidate cache for group and all descendants
   */
  private async invalidateThemeCache(groupId: string): Promise<void> {
    // Get group path
    const group = await db
      .select({ path: groups.path })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group[0]) return;

    const groupPath = group[0].path;

    // Get all descendants
    const descendants = await db
      .select({ id: groups.id })
      .from(groups)
      .where(sql`${groups.path} <@ ${groupPath}`);

    // Delete from cache
    const keys = [
      `theme:${groupId}`,
      ...descendants.map((d) => `theme:${d.id}`),
    ];

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Get system default theme
   */
  private getSystemTheme(): ThemeConfig {
    return {
      primary: "#0066CC",
      secondary: "#64748B",
      accent: "#10B981",
      fontFamily: "Inter",
      layoutStyle: "modern",
      sidebarPosition: "left",
    };
  }

  /**
   * Get pre-built theme templates
   */
  getThemeTemplates(): Record<string, ThemeConfig> {
    return {
      default: {
        primary: "#0066CC",
        secondary: "#64748B",
        accent: "#10B981",
        fontFamily: "Inter",
      },
      vibrant: {
        primary: "#8B5CF6",
        secondary: "#EC4899",
        accent: "#F59E0B",
        fontFamily: "Poppins",
      },
      professional: {
        primary: "#1E40AF",
        secondary: "#475569",
        accent: "#0891B2",
        fontFamily: "Roboto",
      },
      nature: {
        primary: "#059669",
        secondary: "#84CC16",
        accent: "#FBBF24",
        fontFamily: "Open Sans",
      },
      sunset: {
        primary: "#DC2626",
        secondary: "#F97316",
        accent: "#FBBF24",
        fontFamily: "Montserrat",
      },
    };
  }
}

export const themeService = new ThemeService();
```

### Group Service

#### apps/api/src/services/group.service.ts

```typescript
import { db } from "@raptscallions/db";
import { groups, groupMembers } from "@raptscallions/db/schema";
import { eq, sql } from "drizzle-orm";

export class GroupService {
  /**
   * Create a new group
   */
  async createGroup(data: {
    parentId?: string;
    name: string;
    settings?: any;
    theme?: any;
  }) {
    // Get parent path if parentId provided
    let path = data.name.toLowerCase().replace(/[^a-z0-9]/g, "_");

    if (data.parentId) {
      const parent = await db
        .select({ path: groups.path })
        .from(groups)
        .where(eq(groups.id, data.parentId))
        .limit(1);

      if (!parent[0]) {
        throw new Error("Parent group not found");
      }

      path = `${parent[0].path}.${path}`;
    }

    const [group] = await db
      .insert(groups)
      .values({
        ...data,
        path,
      })
      .returning();

    return group;
  }

  /**
   * Get group with full hierarchy path
   */
  async getGroup(groupId: string) {
    const group = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    return group[0];
  }

  /**
   * Get all children of a group
   */
  async getChildren(groupId: string) {
    const parent = await db
      .select({ path: groups.path })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!parent[0]) {
      throw new Error("Group not found");
    }

    return db
      .select()
      .from(groups)
      .where(sql`${groups.path} ~ ${parent[0].path + ".*{1}"}`);
  }

  /**
   * Get all ancestors of a group
   */
  async getAncestors(groupId: string) {
    const group = await db
      .select({ path: groups.path })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group[0]) {
      throw new Error("Group not found");
    }

    return db
      .select()
      .from(groups)
      .where(sql`${groups.path} @> ${group[0].path}`)
      .orderBy(sql`nlevel(${groups.path})`);
  }

  /**
   * Get all descendants of a group
   */
  async getDescendants(groupId: string) {
    const parent = await db
      .select({ path: groups.path })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!parent[0]) {
      throw new Error("Group not found");
    }

    return db
      .select()
      .from(groups)
      .where(sql`${groups.path} <@ ${parent[0].path}`);
  }

  /**
   * Check if user can access a group
   */
  async canAccessGroup(userId: string, groupId: string): Promise<boolean> {
    // Get all groups user is a member of
    const userGroups = await db
      .select({ path: groups.path })
      .from(groupMembers)
      .innerJoin(groups, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId));

    // Get target group path
    const targetGroup = await db
      .select({ path: groups.path })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!targetGroup[0]) return false;

    const targetPath = targetGroup[0].path;

    // Check if any user group is ancestor or descendant of target
    return userGroups.some(
      (ug) => targetPath.startsWith(ug.path) || ug.path.startsWith(targetPath)
    );
  }

  /**
   * Update group
   */
  async updateGroup(
    groupId: string,
    data: Partial<{
      name: string;
      settings: any;
      theme: any;
    }>
  ) {
    const [updated] = await db
      .update(groups)
      .set(data)
      .where(eq(groups.id, groupId))
      .returning();

    return updated;
  }
}

export const groupService = new GroupService();
```

### AI Service

#### apps/api/src/services/ai.service.ts

```typescript
import { db } from "@raptscallions/db";
import { aiModels, aiSettings, aiUsage } from "@raptscallions/db/schema";
import { eq, sql } from "drizzle-orm";
import { redis } from "../config";
import { trace, metrics } from "@raptscallions/telemetry";

interface AIRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  maxTokens?: number;
}

interface AIContext {
  userId: string;
  groupId?: string;
  classId?: string;
  toolId?: string;
  sessionId?: string;
  runId?: string;
  assignmentId?: string;
  requestType: "chat" | "product";
}

export class AIService {
  private endpoint =
    process.env.AI_GATEWAY_URL || "https://openrouter.ai/api/v1";
  private apiKey = process.env.AI_API_KEY!;

  /**
   * Call AI gateway with rate limiting and usage tracking
   */
  async call(request: AIRequest, context: AIContext) {
    return trace.startActiveSpan("ai.call", async (span) => {
      const startTime = Date.now();

      try {
        // 1. Resolve model
        const model = await this.resolveModel(request.model, context.groupId);
        span.setAttribute("ai.model", model);

        // 2. Check model is active
        if (!(await this.isModelActive(model))) {
          throw new Error(`Model ${model} is not active`);
        }

        // 3. Check rate limits
        await this.checkRateLimits(context.userId, context.groupId);

        // 4. Check budget
        if (context.groupId) {
          await this.checkBudget(context.groupId);
        }

        // 5. Make API call
        const response = await fetch(`${this.endpoint}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: request.messages,
            max_tokens: request.maxTokens || 4000,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const latency = Date.now() - startTime;

        // 6. Track usage
        const cost = await this.calculateCost(model, data.usage);
        await this.trackUsage({
          ...context,
          model,
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          cost,
          latencyMs: latency,
        });

        // 7. Record metrics
        metrics.recordAIRequest(model, context.requestType, latency, cost);

        span.setAttribute("ai.input_tokens", data.usage.prompt_tokens);
        span.setAttribute("ai.output_tokens", data.usage.completion_tokens);
        span.setAttribute("ai.cost", cost);

        return {
          content: data.choices[0].message.content,
          usage: data.usage,
          cost,
        };
      } catch (error) {
        span.recordException(error as Error);
        metrics.recordAIError(
          request.model || "unknown",
          (error as Error).message
        );
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Resolve which model to use (tool -> group -> system default)
   */
  private async resolveModel(
    toolModel: string | undefined,
    groupId: string | undefined
  ): Promise<string> {
    // Tool-level override
    if (toolModel) return toolModel;

    // Group-level default
    if (groupId) {
      const groupSettings = await db
        .select({ defaultModel: aiSettings.defaultModel })
        .from(aiSettings)
        .where(eq(aiSettings.id, groupId))
        .limit(1);

      if (groupSettings[0]?.defaultModel) {
        return groupSettings[0].defaultModel;
      }
    }

    // System default
    const systemSettings = await db
      .select({ defaultModel: aiSettings.defaultModel })
      .from(aiSettings)
      .where(eq(aiSettings.id, "system"))
      .limit(1);

    return (
      systemSettings[0]?.defaultModel ||
      process.env.AI_DEFAULT_MODEL ||
      "anthropic/claude-sonnet-4-20250514"
    );
  }

  /**
   * Check if model is active
   */
  private async isModelActive(modelId: string): Promise<boolean> {
    const model = await db
      .select({ active: aiModels.active })
      .from(aiModels)
      .where(eq(aiModels.id, modelId))
      .limit(1);

    return model[0]?.active ?? false;
  }

  /**
   * Check rate limits (requests per minute/hour)
   */
  private async checkRateLimits(
    userId: string,
    groupId?: string
  ): Promise<void> {
    const settings = await this.getAISettings(groupId);

    if (settings.requestsPerMinute) {
      const key = `rate_limit:${userId}:minute`;
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, 60);
      }

      if (count > settings.requestsPerMinute) {
        throw new Error("Rate limit exceeded: requests per minute");
      }
    }

    if (settings.requestsPerHour) {
      const key = `rate_limit:${userId}:hour`;
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, 3600);
      }

      if (count > settings.requestsPerHour) {
        throw new Error("Rate limit exceeded: requests per hour");
      }
    }
  }

  /**
   * Check monthly budget
   */
  private async checkBudget(groupId: string): Promise<void> {
    const settings = await this.getAISettings(groupId);

    if (!settings.monthlyBudget) return;

    // Get current month usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await db
      .select({ cost: aiUsage.cost })
      .from(aiUsage)
      .where(
        sql`${aiUsage.groupId} = ${groupId} AND ${aiUsage.createdAt} >= ${startOfMonth}`
      );

    const totalCost = usage.reduce((sum, u) => sum + Number(u.cost), 0);

    if (totalCost >= Number(settings.monthlyBudget)) {
      throw new Error("Monthly budget exceeded");
    }

    // Alert threshold
    if (settings.budgetAlertThreshold) {
      const threshold =
        Number(settings.monthlyBudget) * Number(settings.budgetAlertThreshold);
      if (totalCost >= threshold) {
        // TODO: Send alert notification
        console.warn(
          `Group ${groupId} approaching budget limit: ${totalCost}/${settings.monthlyBudget}`
        );
      }
    }
  }

  /**
   * Get AI settings for group (or system default)
   */
  private async getAISettings(groupId?: string) {
    const id = groupId || "system";

    const settings = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.id, id))
      .limit(1);

    return settings[0] || {};
  }

  /**
   * Calculate cost based on token usage
   */
  private async calculateCost(
    modelId: string,
    usage: { prompt_tokens: number; completion_tokens: number }
  ): Promise<number> {
    const model = await db
      .select()
      .from(aiModels)
      .where(eq(aiModels.id, modelId))
      .limit(1);

    if (!model[0]) return 0;

    const inputCost =
      (usage.prompt_tokens / 1000) * Number(model[0].inputCostPer1k || 0);
    const outputCost =
      (usage.completion_tokens / 1000) * Number(model[0].outputCostPer1k || 0);

    return inputCost + outputCost;
  }

  /**
   * Track AI usage
   */
  private async trackUsage(data: {
    userId: string;
    groupId?: string;
    classId?: string;
    toolId?: string;
    sessionId?: string;
    runId?: string;
    assignmentId?: string;
    model: string;
    requestType: "chat" | "product";
    inputTokens: number;
    outputTokens: number;
    cost: number;
    latencyMs: number;
  }) {
    await db.insert(aiUsage).values({
      userId: data.userId,
      groupId: data.groupId,
      classId: data.classId,
      toolId: data.toolId,
      sessionId: data.sessionId,
      runId: data.runId,
      assignmentId: data.assignmentId,
      model: data.model,
      requestType: data.requestType,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cost: String(data.cost),
      latencyMs: data.latencyMs,
    });
  }
}

export const aiService = new AIService();
```

---

## API Routes

### Groups Routes

#### apps/api/src/routes/groups.routes.ts

```typescript
import { FastifyInstance } from "fastify";
import { groupService } from "../services/group.service";
import { themeService } from "../services/theme.service";
import {
  createGroupSchema,
  updateGroupSchema,
  updateThemeSchema,
} from "@raptscallions/core/schemas";
import { authenticateUser } from "../middleware/auth.middleware";

export async function groupsRoutes(app: FastifyInstance) {
  // Create group
  app.post(
    "/groups",
    {
      preHandler: [authenticateUser],
      schema: {
        body: createGroupSchema,
      },
    },
    async (request, reply) => {
      const group = await groupService.createGroup(request.body);
      return reply.status(201).send(group);
    }
  );

  // Get group
  app.get(
    "/groups/:id",
    {
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Check access
      const canAccess = await groupService.canAccessGroup(request.user.id, id);
      if (!canAccess) {
        return reply.status(403).send({ error: "Access denied" });
      }

      const group = await groupService.getGroup(id);

      if (!group) {
        return reply.status(404).send({ error: "Group not found" });
      }

      return group;
    }
  );

  // Get children
  app.get(
    "/groups/:id/children",
    {
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const canAccess = await groupService.canAccessGroup(request.user.id, id);
      if (!canAccess) {
        return reply.status(403).send({ error: "Access denied" });
      }

      const children = await groupService.getChildren(id);
      return children;
    }
  );

  // Get ancestors
  app.get(
    "/groups/:id/ancestors",
    {
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const canAccess = await groupService.canAccessGroup(request.user.id, id);
      if (!canAccess) {
        return reply.status(403).send({ error: "Access denied" });
      }

      const ancestors = await groupService.getAncestors(id);
      return ancestors;
    }
  );

  // Update group
  app.patch(
    "/groups/:id",
    {
      preHandler: [authenticateUser],
      schema: {
        body: updateGroupSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // TODO: Check user is admin of group

      const group = await groupService.updateGroup(id, request.body);
      return group;
    }
  );

  // Get resolved theme
  app.get(
    "/groups/:id/theme/resolved",
    {
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const canAccess = await groupService.canAccessGroup(request.user.id, id);
      if (!canAccess) {
        return reply.status(403).send({ error: "Access denied" });
      }

      const theme = await themeService.resolveGroupTheme(id);
      return theme;
    }
  );

  // Update theme
  app.patch(
    "/groups/:id/theme",
    {
      preHandler: [authenticateUser],
      schema: {
        body: updateThemeSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // TODO: Check user is admin of group

      const theme = await themeService.updateGroupTheme(id, request.body);
      return theme;
    }
  );

  // Delete theme (revert to parent)
  app.delete(
    "/groups/:id/theme",
    {
      preHandler: [authenticateUser],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // TODO: Check user is admin of group

      await themeService.deleteGroupTheme(id);
      return reply.status(204).send();
    }
  );

  // Get theme templates
  app.get("/theme-templates", async (request, reply) => {
    const templates = themeService.getThemeTemplates();
    return templates;
  });
}
```

---

## Middleware

### Authentication Middleware

#### apps/api/src/middleware/auth.middleware.ts

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { verify } from "jsonwebtoken";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      isSystemAdmin: boolean;
    };
  }
}

export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing authorization header" });
    }

    const token = authHeader.substring(7);

    const decoded = verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      isSystemAdmin: boolean;
    };

    request.user = {
      id: decoded.userId,
      email: decoded.email,
      isSystemAdmin: decoded.isSystemAdmin,
    };
  } catch (error) {
    return reply.status(401).send({ error: "Invalid token" });
  }
}
```

---

## Configuration

### Main Config

#### apps/api/src/config.ts

```typescript
import Redis from "ioredis";

export const redis = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379"
);

export const config = {
  port: parseInt(process.env.PORT || "3000"),
  nodeEnv: process.env.NODE_ENV || "development",

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  ai: {
    gatewayUrl: process.env.AI_GATEWAY_URL || "https://openrouter.ai/api/v1",
    apiKey: process.env.AI_API_KEY!,
    defaultModel:
      process.env.AI_DEFAULT_MODEL || "anthropic/claude-sonnet-4-20250514",
  },

  otel: {
    endpoint:
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318",
    serviceName: process.env.OTEL_SERVICE_NAME || "raptscallions-api",
  },

  uploads: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760"), // 10MB
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/svg+xml"],
  },
};
```

### Package.json

#### apps/api/package.json

```json
{
  "name": "@raptscallions/api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "drizzle-kit migrate",
    "generate": "drizzle-kit generate"
  },
  "dependencies": {
    "@raptscallions/core": "workspace:*",
    "@raptscallions/db": "workspace:*",
    "@raptscallions/telemetry": "workspace:*",
    "@raptscallions/modules": "workspace:*",
    "fastify": "^4.25.2",
    "@fastify/cors": "^8.5.0",
    "@fastify/helmet": "^11.1.1",
    "@fastify/rate-limit": "^9.1.0",
    "drizzle-orm": "^0.29.3",
    "pg": "^8.11.3",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.5",
    "@types/pg": "^8.10.9",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcryptjs": "^2.4.6",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "drizzle-kit": "^0.20.10"
  }
}
```

---

This completes the backend implementation documentation. The next file will cover the frontend implementation.
