# RaptScallions: Complete System Brief

## Open Source AI Education Platform

---

# Executive Summary

RaptScallions is a fully open-source alternative to MagicSchool and Flint K12, designed for:

- **Extreme modularity** - minimal core, everything else is a pluggable module
- **Two interface types** - Chat (multi-turn) and Product (single I/O)
- **Teacher as creator** - no preset tools, teachers build what they need
- **One-click deployment** - Heroku button, Docker Compose, Kubernetes
- **Distributed updates** - instances pull from central marketplace
- **OneRoster native** - SIS integration from day one

---

# Part 1: Architecture Overview

## System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                       SYSTEM ADMIN                               │
│  • User provisioning & management                                │
│  • AI model activation & limits                                  │
│  • OneRoster sync configuration                                  │
│  • System-wide settings                                          │
└─────────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────────┐
│                           CORE                                   │
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │   Tools   │  │  Groups   │  │  Classes  │  │ Assignments│    │
│  │ chat|prod │  │ (nested)  │  │ (rosters) │  │ submissions│    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     Module System                          │  │
│  │              hooks fire at defined points                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     AI Gateway                             │  │
│  │           OpenRouter / LiteLLM — model as param            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────────┐
│                          MODULES                                 │
│  Analysis, safety, export, import, auth, integrations, etc.     │
└─────────────────────────────────────────────────────────────────┘
```

## Core Principles

| Principle                  | Implementation                                                    |
| -------------------------- | ----------------------------------------------------------------- |
| **Minimal core**           | Only tools, sessions, groups, classes, assignments, module system |
| **AI is config**           | Single gateway (OpenRouter), model as parameter                   |
| **Modules for everything** | Analysis, auth, export, safety — all modules                      |
| **Hooks are the API**      | Modules hook into defined points (sync or async)                  |
| **Portable tools**         | YAML files, version-controlled, shareable                         |

---

# Part 2: Interface Types

## Chat (Multi-turn Conversation)

- Creates a **Session** with multiple **Messages**
- Use cases: Socratic tutoring, debate partner, writing coach
- Hooks: `chat:on_message`, `chat:pre_ai`, `chat:post_ai`, `session:start`, `session:end`

## Product (Single Input → Output)

- Creates a **Run** with input and output
- Use cases: Lesson plan generator, quiz maker, rubric creator
- Hooks: `product:pre_ai`, `product:post_ai`, `run:complete`

```yaml
# Chat tool example
name: Socratic Algebra Tutor
type: chat
version: 1.0.0

behavior: |
  Act as a Socratic tutor for algebra. Never give direct answers.
  Ask probing questions to help students discover solutions.

model: anthropic/claude-sonnet-4-20250514

constraints:
  topics: [linear equations, quadratics]
  no_direct_answers: true

modules:
  - struggle-detector
  - safety-filter

meta:
  subject: math
  grades: [7, 8, 9]
```

```yaml
# Product tool example
name: Lesson Plan Generator
type: product
version: 1.0.0

behavior: |
  Generate a detailed lesson plan based on the input.
  Include objectives, activities, materials, and assessment.

input_schema:
  type: object
  properties:
    topic: { type: string }
    grade: { type: integer }
    duration: { type: string }
  required: [topic, grade]

output_schema:
  type: object
  properties:
    title: { type: string }
    objectives: { type: array }
    activities: { type: array }
    materials: { type: array }
    assessment: { type: string }

model: anthropic/claude-sonnet-4-20250514

modules:
  - standards-aligner
```

---

# Part 3: Module System

## Module Definition

```typescript
interface Module {
  name: string;
  version: string;
  hooks: Record<string, Hook>;
  config_schema?: JSONSchema;
}

interface Hook {
  handler: (ctx: HookContext) => Promise<void | HookResult>;
  async?: boolean; // default: false (sync, blocks)
  priority?: number;
}

interface HookContext {
  tool: Tool;
  user: User;
  group?: Group;

  // Chat
  session?: Session;
  messages?: Message[];
  current?: Message;

  // Product
  run?: Run;
  input?: any;
  output?: any;

  // Actions
  emit: (type: string, data: any) => void; // write extraction
  modify: (changes: any) => void; // alter response (sync only)
  block: (reason: string) => void; // stop execution (sync only)
}
```

## Hook Points

| Hook              | Type    | When                 | Sync/Async |
| ----------------- | ------- | -------------------- | ---------- |
| `chat:on_message` | chat    | any message received | either     |
| `chat:pre_ai`     | chat    | before AI call       | sync       |
| `chat:post_ai`    | chat    | after AI response    | sync       |
| `session:start`   | chat    | session created      | either     |
| `session:end`     | chat    | session completed    | either     |
| `product:pre_ai`  | product | before AI call       | sync       |
| `product:post_ai` | product | after AI response    | sync       |
| `run:complete`    | product | run finished         | either     |

## Message Flow (Chat)

```
POST /chat/sessions/:id/message
         │
         ▼
  ┌──────────────┐
  │ chat:message │  modules react (async ok)
  └──────────────┘
         │
         ▼
  ┌──────────────┐
  │ chat:pre_ai  │  modules modify prompt (sync)
  └──────────────┘
         │
         ▼
  ┌──────────────┐
  │  AI Gateway  │  → OpenRouter
  └──────────────┘
         │
         ▼
  ┌──────────────┐
  │ chat:post_ai │  modules modify/block response (sync)
  └──────────────┘
         │
         ▼
  Store messages, return response
```

## Module Categories

| Category | Examples                                                  |
| -------- | --------------------------------------------------------- |
| Analysis | struggle-detector, content-coverage, misconception-tagger |
| Safety   | pii-filter, topic-fence, profanity-filter                 |
| Export   | csv-export, lms-grade-passback, pdf-report                |
| Import   | google-classroom-roster, clever-sync                      |
| Auth     | google-oauth, saml, clever-sso                            |
| Logging  | audit-log, analytics-events                               |

---

# Part 4: Data Model

## Entity Relationship Diagram

```
SYSTEM ADMIN
├── ai_models
├── ai_settings
├── ai_usage
├── oneroster_config
├── oneroster_sync_log
└── oneroster_mappings

IDENTITY
├── users
├── groups (nested via ltree)
└── group_members

TEACHING
├── classes
├── class_members
├── tools
├── assignments
└── submissions

RUNTIME
├── sessions
├── messages
├── runs
└── extractions
```

## Complete Schema

### Groups (Nested Hierarchy)

```sql
create table groups (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references groups(id),
  name text not null,
  path ltree,  -- e.g., 'district.middle_school.grade6.class_a'
  settings jsonb default '{}',
  created_at timestamptz default now()
);

create index groups_path on groups using gist(path);

-- Query descendants: select * from groups where path <@ 'district.middle_school';
-- Query ancestors: select * from groups where path @> 'district.middle_school.grade6';
```

### Users & Memberships

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text,
  given_name text,
  family_name text,
  status text default 'active',  -- active, inactive, suspended
  is_system_admin boolean default false,
  password_hash text,
  sso_provider text,
  sso_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_login_at timestamptz
);

create table group_members (
  user_id uuid references users(id),
  group_id uuid references groups(id),
  role text not null,  -- admin, member
  primary key (user_id, group_id)
);
```

### Classes & Rosters

```sql
create table classes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id),
  name text not null,
  settings jsonb default '{}',
  created_at timestamptz default now()
);

create table class_members (
  user_id uuid references users(id),
  class_id uuid references classes(id),
  role text not null,  -- teacher, student
  primary key (user_id, class_id)
);
```

### Tools

```sql
create table tools (
  id uuid primary key default gen_random_uuid(),
  type text not null,  -- 'chat' | 'product'
  name text not null,
  version text not null,
  definition jsonb not null,
  created_by uuid references users(id),
  group_id uuid references groups(id),  -- visibility scope
  created_at timestamptz default now(),

  unique(id, version)
);
```

### Assignments & Submissions

```sql
create table assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id),
  tool_id uuid references tools(id),
  tool_version text,
  name text not null,
  instructions text,
  config jsonb default '{}',
  available_at timestamptz,
  due_at timestamptz,
  closes_at timestamptz,
  max_attempts int,
  time_limit interval,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id),
  user_id uuid references users(id),
  session_id uuid references sessions(id),  -- for chat
  run_id uuid references runs(id),          -- for product
  attempt int default 1,
  state text default 'in_progress',  -- in_progress, submitted, late
  started_at timestamptz default now(),
  submitted_at timestamptz,

  unique(assignment_id, user_id, attempt)
);
```

### Sessions & Messages (Chat Runtime)

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid references tools(id),
  tool_version text not null,
  user_id uuid references users(id),
  state text default 'active',  -- active, paused, completed
  started_at timestamptz default now(),
  ended_at timestamptz
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id),
  role text not null,  -- user, assistant, system
  content text not null,
  seq int not null,
  created_at timestamptz default now(),
  meta jsonb default '{}'
);

create index messages_session on messages(session_id, seq);
```

### Runs (Product Runtime)

```sql
create table runs (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid references tools(id),
  tool_version text not null,
  user_id uuid references users(id),
  input jsonb not null,
  output jsonb,
  state text default 'pending',  -- pending, complete, failed
  created_at timestamptz default now(),
  completed_at timestamptz
);
```

### Extractions (Module Output)

```sql
create table extractions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id),
  run_id uuid references runs(id),
  module text not null,
  type text not null,
  data jsonb not null,
  created_at timestamptz default now()
);
```

### AI Models & Usage

```sql
create table ai_models (
  id text primary key,  -- 'anthropic/claude-sonnet-4-20250514'
  name text not null,
  provider text not null,
  active boolean default false,
  input_cost_per_1k numeric,
  output_cost_per_1k numeric,
  max_context_tokens int,
  max_output_tokens int,
  config jsonb default '{}',
  created_at timestamptz default now()
);

create table ai_settings (
  id text primary key,  -- 'system' or group_id
  default_model text references ai_models(id),
  requests_per_minute int,
  requests_per_hour int,
  tokens_per_day int,
  monthly_budget numeric,
  budget_alert_threshold numeric,
  config jsonb default '{}'
);

create table ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  group_id uuid references groups(id),
  class_id uuid references classes(id),
  tool_id uuid references tools(id),
  session_id uuid references sessions(id),
  run_id uuid references runs(id),
  assignment_id uuid references assignments(id),
  model text not null,
  request_type text not null,  -- 'chat' | 'product'
  input_tokens int not null,
  output_tokens int not null,
  total_tokens int generated always as (input_tokens + output_tokens) stored,
  cost numeric not null,
  latency_ms int,
  created_at timestamptz default now()
);

create index ai_usage_user on ai_usage(user_id, created_at);
create index ai_usage_group on ai_usage(group_id, created_at);
create index ai_usage_date on ai_usage(created_at);
```

### OneRoster Integration

```sql
create table oneroster_config (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text not null,
  client_id text not null,
  client_secret_encrypted text not null,
  sync_enabled boolean default true,
  sync_schedule text,  -- cron expression
  last_sync_at timestamptz,
  last_sync_status text,
  org_mapping jsonb default '{}',
  created_at timestamptz default now()
);

create table oneroster_sync_log (
  id uuid primary key default gen_random_uuid(),
  config_id uuid references oneroster_config(id),
  started_at timestamptz default now(),
  completed_at timestamptz,
  status text,  -- running, success, failed
  orgs_synced int default 0,
  users_synced int default 0,
  classes_synced int default 0,
  enrollments_synced int default 0,
  errors jsonb default '[]'
);

create table oneroster_mappings (
  oneroster_type text not null,  -- org, user, class, enrollment
  sourced_id text not null,
  entity_type text not null,  -- group, user, class, class_member
  entity_id uuid not null,
  config_id uuid references oneroster_config(id),
  last_synced_at timestamptz,
  primary key (config_id, oneroster_type, sourced_id)
);
```

## Table Summary

| Layer        | Tables                                                                                     | Count  |
| ------------ | ------------------------------------------------------------------------------------------ | ------ |
| System Admin | ai_models, ai_settings, ai_usage, oneroster_config, oneroster_sync_log, oneroster_mappings | 6      |
| Identity     | users, groups, group_members                                                               | 3      |
| Teaching     | classes, class_members, tools, assignments, submissions                                    | 5      |
| Runtime      | sessions, messages, runs, extractions                                                      | 4      |
| **Total**    |                                                                                            | **18** |

---

# Part 5: API Reference

## System Admin

```
# Users
GET    /admin/users                    list all (paginated, filterable)
POST   /admin/users                    create user
GET    /admin/users/:id                get user
PATCH  /admin/users/:id                update user
POST   /admin/users/:id/deactivate     deactivate
POST   /admin/users/:id/reactivate     reactivate
POST   /admin/users/:id/reset-password send reset
POST   /admin/users/import             bulk import (CSV)

# AI Models
GET    /admin/ai/models                list all models
POST   /admin/ai/models                add model
PATCH  /admin/ai/models/:id            update (activate/deactivate)
DELETE /admin/ai/models/:id            remove

# AI Settings
GET    /admin/ai/settings              system settings
PATCH  /admin/ai/settings              update system defaults
GET    /admin/ai/settings/:group_id    group overrides
PATCH  /admin/ai/settings/:group_id    set group overrides

# AI Usage
GET    /admin/ai/usage                 usage report
GET    /admin/ai/usage/summary         aggregated stats
GET    /admin/ai/usage/by-group        breakdown by group
GET    /admin/ai/usage/by-user         breakdown by user
GET    /admin/ai/usage/by-model        breakdown by model
GET    /admin/ai/usage/export          CSV export

# OneRoster
GET    /admin/oneroster/configs        list connections
POST   /admin/oneroster/configs        create connection
PATCH  /admin/oneroster/configs/:id    update
DELETE /admin/oneroster/configs/:id    delete
POST   /admin/oneroster/configs/:id/test   test connection
POST   /admin/oneroster/configs/:id/sync   trigger sync
GET    /admin/oneroster/configs/:id/logs   sync history
```

## Core API

```
# Groups
POST   /groups                    create
GET    /groups/:id                get
GET    /groups/:id/children       list children
GET    /groups/:id/ancestors      list ancestors
PATCH  /groups/:id                update

# Classes
POST   /classes                   create {group_id, name}
GET    /classes/:id               get
GET    /groups/:id/classes        list in group
POST   /classes/:id/members       add member
DELETE /classes/:id/members/:uid  remove member
GET    /classes/:id/members       list roster

# Tools
POST   /tools                     create
GET    /tools/:id                 get latest
GET    /tools/:id/v/:version      get specific version
PUT    /tools/:id                 update (new version)
GET    /groups/:id/tools          list visible to group

# Assignments
POST   /assignments               create
GET    /assignments/:id           get
GET    /classes/:id/assignments   list for class
PATCH  /assignments/:id           update
DELETE /assignments/:id           delete

# Submissions
POST   /assignments/:id/submissions    start → creates session/run
GET    /submissions/:id                get
GET    /assignments/:id/submissions    list all (teacher)
GET    /users/:id/submissions          list mine
PATCH  /submissions/:id                update state

# Chat
POST   /sessions/:id/messages     send message
GET    /sessions/:id              get session + messages
PATCH  /sessions/:id              pause, complete

# Product
GET    /runs/:id                  get run + output

# Extractions
GET    /sessions/:id/extractions  list for session
GET    /runs/:id/extractions      list for run
```

---

# Part 6: Access Control

## Roles

| Role             | Scope               | Permissions                                         |
| ---------------- | ------------------- | --------------------------------------------------- |
| **System Admin** | Global              | All admin operations, user provisioning, AI config  |
| **Group Admin**  | Group + descendants | Manage group settings, view usage                   |
| **Teacher**      | Classes they teach  | Create assignments, view submissions, manage roster |
| **Student**      | Own data            | View assignments, create submissions                |

## Access Rules

```typescript
// User can access resource if in resource's group or any ancestor
function canAccess(user: User, resource: { group_id: string }): boolean {
  const userGroups = getUserGroupPaths(user);
  const resourcePath = getGroupPath(resource.group_id);

  return userGroups.some(
    (path) => resourcePath.startsWith(path) || path.startsWith(resourcePath)
  );
}
```

---

# Part 7: OneRoster Integration

## Entity Mapping

| OneRoster    | RaptScallions       |
| ------------ | ------------------- |
| `org`        | `groups`            |
| `user`       | `users`             |
| `class`      | `classes`           |
| `enrollment` | `class_members`     |
| `course`     | metadata on classes |

## Sync Process

1. Fetch orgs → create/update groups (respecting hierarchy)
1. Fetch users → create/update users
1. Fetch classes → create/update classes
1. Fetch enrollments → create/update class_members

## OneRoster API Endpoints Consumed

```
GET /ims/oneroster/v1p1/orgs
GET /ims/oneroster/v1p1/users
GET /ims/oneroster/v1p1/classes
GET /ims/oneroster/v1p1/enrollments
GET /ims/oneroster/v1p1/courses
GET /ims/oneroster/v1p1/academicSessions
```

---

# Part 8: AI Gateway

## Configuration

```typescript
// Single endpoint, model as parameter
const config = {
  endpoint: process.env.AI_GATEWAY_URL, // https://openrouter.ai/api/v1
  apiKey: process.env.AI_API_KEY,
  defaultModel: process.env.AI_DEFAULT_MODEL, // anthropic/claude-sonnet-4-20250514
};
```

## Request Flow

```typescript
async function callAI(request: AIRequest, ctx: Context): Promise<AIResponse> {
  // 1. Resolve model (tool override → group default → system default)
  const model = resolveModel(request.model, ctx.group_id);

  // 2. Check model is active
  if (!(await isModelActive(model))) {
    throw new Error(`Model ${model} is not active`);
  }

  // 3. Check rate limits
  await checkRateLimits(ctx.user_id, ctx.group_id);

  // 4. Check budget
  await checkBudget(ctx.group_id);

  // 5. Call AI (with OpenTelemetry tracing)
  const response = await traceAICall("chat", { model, ...ctx }, async () => {
    return fetch(config.endpoint + "/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages: request.messages }),
    });
  });

  // 6. Track usage
  await trackUsage({
    userId: ctx.user_id,
    groupId: ctx.group_id,
    model,
    inputTokens: response.usage.prompt_tokens,
    outputTokens: response.usage.completion_tokens,
    cost: calculateCost(model, response.usage),
  });

  return response;
}
```

---

# Part 9: Observability (OpenTelemetry)

## Setup

Full OpenTelemetry from day one - traces, metrics, logs unified via OTLP.

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: OTEL_ENDPOINT + "/v1/traces" }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: OTEL_ENDPOINT + "/v1/metrics" }),
  }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({ url: OTEL_ENDPOINT + "/v1/logs" })
  ),
  instrumentations: [getNodeAutoInstrumentations()],
});
```

## Key Metrics

| Metric            | Type      | Labels                     | Description         |
| ----------------- | --------- | -------------------------- | ------------------- |
| `ai.requests`     | Counter   | model, group_id, tool_type | Total AI requests   |
| `ai.tokens`       | Counter   | model, type                | Token consumption   |
| `ai.latency`      | Histogram | model                      | Request latency     |
| `ai.errors`       | Counter   | model, error_type          | AI failures         |
| `sessions.active` | Gauge     | -                          | Active sessions     |
| `messages.total`  | Counter   | role, tool_id              | Messages sent       |
| `hooks.duration`  | Histogram | hook_point, module         | Hook execution time |
| `http.requests`   | Counter   | method, path, status       | HTTP requests       |

## Logging with Trace Context

```typescript
// Every log includes trace_id and span_id automatically
const logger = pino({
  mixin() {
    const span = trace.getSpan(context.active());
    if (span) {
      return {
        trace_id: span.spanContext().traceId,
        span_id: span.spanContext().spanId,
      };
    }
    return {};
  },
});
```

---

# Part 10: Deployment

## Repository Structure

```
raptscallions/
├── apps/
│   ├── api/                 # Core API
│   ├── web/                 # Frontend
│   ├── admin/               # Admin UI
│   └── worker/              # Background jobs
├── packages/
│   ├── core/                # Shared types
│   ├── db/                  # Schema, migrations
│   ├── telemetry/           # OpenTelemetry setup
│   └── modules/             # Built-in modules
├── deploy/
│   ├── heroku/
│   ├── docker/
│   └── kubernetes/
└── .github/workflows/
```

## Deployment Targets

| Target             | Complexity | Use Case                   |
| ------------------ | ---------- | -------------------------- |
| **Heroku**         | ⭐         | One-click, small schools   |
| **Docker Compose** | ⭐⭐       | Self-hosted, single server |
| **Kubernetes**     | ⭐⭐⭐     | Districts, scale, HA       |

## Heroku One-Click

```json
{
  "name": "RaptScallions",
  "stack": "container",
  "addons": ["heroku-postgresql:essential-0", "heroku-redis:mini"],
  "env": {
    "AI_GATEWAY_URL": "https://openrouter.ai/api/v1",
    "AI_API_KEY": { "required": true },
    "AI_DEFAULT_MODEL": "anthropic/claude-sonnet-4-20250514",
    "ADMIN_EMAIL": { "required": true },
    "ADMIN_PASSWORD": { "required": true }
  }
}
```

## Docker Compose

```yaml
services:
  api:
    image: ghcr.io/raptscallions/raptscallions:latest
    environment:
      DATABASE_URL: postgresql://...
      AI_GATEWAY_URL: ${AI_GATEWAY_URL}
      AI_API_KEY: ${AI_API_KEY}
    depends_on: [db, redis]

  worker:
    image: ghcr.io/raptscallions/raptscallions:latest
    command: node apps/worker/dist/worker.js

  db:
    image: postgres:16

  redis:
    image: redis:7-alpine
```

---

# Part 11: CI/CD Pipeline

## On Every Push

```yaml
jobs:
  lint: # ESLint, Prettier
  test: # Unit + integration with Postgres/Redis
  build: # Build all apps
```

## On Version Tag

```yaml
jobs:
  build-image: # Multi-arch Docker image → GHCR
  create-release: # GitHub release with changelog
  publish: # Notify marketplace registry
```

## Environments

| Env        | Branch  | Deploy          |
| ---------- | ------- | --------------- |
| Preview    | PR      | Auto            |
| Staging    | develop | Auto            |
| Production | tags    | Manual approval |

## Update System

Each instance runs an update agent:

```typescript
class UpdateAgent {
  async checkForUpdates(): Promise<Update | null> {
    const latest = await fetch(`${marketplaceUrl}/api/releases/latest`);
    if (semver.gt(latest.version, currentVersion)) {
      return latest;
    }
    return null;
  }

  async applyUpdate(update: Update) {
    switch (process.env.DEPLOYMENT_TYPE) {
      case "heroku":
        await this.updateHeroku(update);
        break;
      case "docker":
        await this.updateDocker(update);
        break;
      case "kubernetes":
        await this.updateKubernetes(update);
        break;
    }
  }
}
```

---

# Part 12: Marketplace

## Central Registry

```
# Releases
GET  /api/releases/latest?channel=stable
GET  /api/releases/:version
GET  /api/releases

# Modules
GET  /api/modules
GET  /api/modules/:name
GET  /api/modules/:name/download/:version

# Tools (community-shared)
GET  /api/tools
GET  /api/tools/:id
POST /api/tools  # publish
```

## Instance Registration (Optional)

```
POST /api/instances/register
POST /api/instances/:id/heartbeat
```

---

# Part 13: Security Considerations

## Data Protection

- All secrets encrypted at rest
- OneRoster credentials encrypted in database
- Session tokens signed with rotating keys
- PII detection module available

## Compliance

- FERPA-compatible data handling
- COPPA-compatible for under-13 (with school consent)
- GDPR data export/deletion via admin API
- Audit logging for all admin actions

## Network

- All external calls over HTTPS
- Database connections via SSL
- Redis AUTH enabled
- Rate limiting at gateway level

---

# Part 14: Implementation Roadmap

## Phase 1: Core (Weeks 1-4)

- [ ] Database schema + migrations
- [ ] User/Group/Class CRUD
- [ ] Basic auth (email/password)
- [ ] Tool definition parsing
- [ ] Session/message storage
- [ ] AI gateway (OpenRouter)
- [ ] Basic module system

## Phase 2: Teaching Flow (Weeks 5-8)

- [ ] Assignments + submissions
- [ ] Chat runtime with hooks
- [ ] Product runtime
- [ ] Teacher dashboard
- [ ] Student interface

## Phase 3: Admin (Weeks 9-12)

- [ ] System admin UI
- [ ] User provisioning
- [ ] AI model management
- [ ] Usage tracking + reports
- [ ] OneRoster sync

## Phase 4: Production (Weeks 13-16)

- [ ] OpenTelemetry integration
- [ ] CI/CD pipelines
- [ ] Heroku one-click
- [ ] Docker Compose
- [ ] Kubernetes Helm chart
- [ ] Update agent
- [ ] Marketplace MVP

---

# Appendix A: Environment Variables

```bash
# Core
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SESSION_SECRET=...
ENCRYPTION_KEY=...

# AI
AI_GATEWAY_URL=https://openrouter.ai/api/v1
AI_API_KEY=...
AI_DEFAULT_MODEL=anthropic/claude-sonnet-4-20250514

# Telemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_SERVICE_NAME=raptscallions-api

# Admin
ADMIN_EMAIL=...
ADMIN_PASSWORD=...

# Updates
MARKETPLACE_URL=https://marketplace.raptscallions.org
AUTO_UPDATE=false
```

---

# Appendix B: Tech Stack

| Component | Technology                   |
| --------- | ---------------------------- |
| API       | Node.js + Express/Fastify    |
| Database  | PostgreSQL 16 + ltree        |
| Cache     | Redis 7                      |
| ORM       | Prisma or Drizzle            |
| Frontend  | Next.js 14                   |
| UI        | shadcn/ui + Tailwind         |
| Auth      | Custom + SSO adapters        |
| AI        | OpenRouter (unified gateway) |
| Telemetry | OpenTelemetry                |
| CI/CD     | GitHub Actions               |
| Container | Docker                       |
| Registry  | GHCR                         |

---

# Appendix C: License

Recommended: **AGPL-3.0**

- Ensures modifications to hosted instances remain open source
- Standard for open-source SaaS
- Compatible with educational institution policies
