# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RaptScallions is a fully open-source alternative to MagicSchool and Flint K12, designed for:

- **Extreme modularity** — Minimal core, everything else is a pluggable module
- **Two interface types** — Chat (multi-turn conversations) and Product (single I/O generators)
- **Teacher as creator** — No preset tools, teachers build what they need using YAML definitions
- **OneRoster native** — SIS integration from day one
- **One-click deployment** — Heroku button, Docker Compose, Kubernetes

The codebase is in early development (Foundation Infrastructure phase - Epic E01).

## Technology Stack

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
| **Testing**       | Vitest          |         | AAA pattern                    |
| **Telemetry**     | OpenTelemetry   | 1.x     | Traces, metrics, logs          |
| **Frontend**      | React           | 18.x    | With Vite                      |
| **Routing**       | TanStack Router | Latest  | Type-safe file-based routing   |
| **Data Fetching** | TanStack Query  | 5.x     | Server state management        |
| **UI Components** | shadcn/ui       | Latest  | With Tailwind CSS              |
| **Documentation** | VitePress       | 1.5+    | Static site generator for KB   |
| **AI Gateway**    | OpenRouter      | —       | Unified model access           |

## Monorepo Structure

```
raptscallions/
├── apps/
│   ├── api/                    # Fastify API server
│   │   └── src/
│   │       ├── routes/         # Route handlers by domain
│   │       ├── middleware/     # Request processing
│   │       └── services/       # Business logic
│   ├── docs/                   # VitePress knowledge base
│   │   ├── src/                # Markdown documentation files
│   │   └── .vitepress/         # VitePress configuration
│   ├── worker/                 # BullMQ job processor
│   └── web/                    # React frontend (Vite)
│       └── src/
│           ├── routes/         # TanStack Router pages
│           ├── components/     # UI components
│           ├── lib/            # Utilities
│           └── hooks/          # Custom hooks
├── packages/
│   ├── core/                   # Shared types and Zod schemas
│   ├── db/                     # Drizzle schema and migrations
│   ├── auth/                   # Lucia + Arctic + CASL
│   ├── events/                 # BullMQ queues, event emitter
│   ├── modules/                # Module supervisor (worker threads)
│   └── telemetry/              # OpenTelemetry setup
├── modules/                    # User-installed modules (hot reload)
├── docs/
│   ├── ARCHITECTURE.md         # System architecture (canonical)
│   ├── CONVENTIONS.md          # Code style guide (canonical)
│   └── references/             # Historical planning docs
└── backlog/                    # Task management (Backlog.md MCP)
    └── docs/
        ├── specs/              # Implementation specifications
        ├── reviews/            # Review artifacts
        └── .workflow/          # Workflow configuration
```

## Code Conventions

### General Principles

1. **Explicit over implicit** — Clear code beats clever code
2. **Functional over OOP** — Prefer pure functions, avoid classes where possible
3. **Composition over inheritance** — Build from small, composable pieces
4. **Fail fast** — Validate early, throw meaningful errors
5. **Test first** — TDD is the standard workflow

### TypeScript

- Never use `any` — use `unknown` and narrow
- Use `import type` for type-only imports
- Prefer interfaces for objects, types for unions/utilities
- Strict mode with `noUncheckedIndexedAccess`, `noImplicitReturns`

### File Naming

| Type             | Convention        | Example                |
| ---------------- | ----------------- | ---------------------- |
| Route handlers   | `*.routes.ts`     | `users.routes.ts`      |
| Services         | `*.service.ts`    | `user.service.ts`      |
| Middleware       | `*.middleware.ts` | `auth.middleware.ts`   |
| Types            | `*.types.ts`      | `user.types.ts`        |
| Schemas (Zod)    | `*.schema.ts`     | `user.schema.ts`       |
| Tests            | `*.test.ts`       | `user.service.test.ts` |
| React components | `PascalCase.tsx`  | `UserCard.tsx`         |

### Database

- snake_case for tables and columns
- Use Drizzle query builder, avoid raw SQL
- Migration naming: `NNNN_description.sql` (e.g., `0001_create_users.sql`)
- Always include down migrations

### Testing

- Use Vitest with AAA pattern (Arrange/Act/Assert)
- Tests go in `__tests__/` directories
- 80% minimum line coverage for unit tests

### Git

- Branch: `feature/E01-T001-description`, `bugfix/E02-T005-description`
- Commits: `feat(scope): message`, `fix(scope): message`
- Reference tasks: `Refs: E01-T002` or `Fixes: E03-T010`

## Key Architecture Decisions

| Decision                   | Choice                                                      |
| -------------------------- | ----------------------------------------------------------- |
| Fastify over Express       | Performance (2-3x), native TypeScript, plugin architecture  |
| Drizzle over Prisma        | SQL-like syntax, better perf, true TS types, smaller bundle |
| PostgreSQL + ltree         | Native hierarchy support for Groups (Districts > Schools)   |
| Redis for ephemeral        | Single dep for sessions, cache, queues, pub/sub             |
| Worker threads for modules | Isolation, can kill runaway modules, no process overhead    |
| SSE for LLM streaming      | Industry standard for LLM, good browser support             |
| Zod over Yup/Joi           | TypeScript inference, composable, better DX                 |
| Lucia over Passport        | Modern, TypeScript-first, handles edge cases                |
| CASL for permissions       | Flexible attribute-based access control                     |
| BullMQ for jobs            | Feature-rich, has UI, metrics                               |

## Core Entities

- **Groups** — Hierarchical (ltree): Districts → Schools → Departments. Each has settings, theme, enabled models
- **Users** — Members of groups with roles (system_admin, group_admin, teacher, student)
- **Classes** — Belong to a group, have rosters and assigned tools
- **Tools** — YAML-defined AI interactions (Chat or Product type), portable and version-controlled
- **Sessions** — User + Tool + Context for multi-turn chat (state: active → completed)
- **Runs** — Single input → output for Product tools (state: pending → processing → completed/failed)
- **Assignments** — Tool assigned to a class with due date, tracks submissions
- **Extractions** — Structured data emitted by modules during hook execution

## Module System

Modules hook into defined lifecycle points and run in isolated worker threads:

| Hook                | When                   | Can Block |
| ------------------- | ---------------------- | --------- |
| `chat:before_ai`    | Before AI call         | Yes       |
| `chat:after_ai`     | After AI response      | Yes       |
| `chat:on_message`   | Any message            | No        |
| `session:start`     | Session created        | No        |
| `session:end`       | Session completed      | No        |
| `product:before_ai` | Before product AI call | Yes       |
| `product:after_ai`  | After product response | Yes       |
| `run:complete`      | Product run finished   | No        |

Module features: hot reload, memory limits, timeout enforcement, sandboxed DB access.

## Authentication & Authorization

- **Auth**: Lucia with Argon2 for passwords, Arctic for OAuth (Google, Microsoft, Clever)
- **Sessions**: Short-lived with automatic extension
- **Permissions**: CASL attribute-based access control

| Role           | Scope  | Capabilities                              |
| -------------- | ------ | ----------------------------------------- |
| `system_admin` | System | Everything                                |
| `group_admin`  | Group  | Manage group, users, settings             |
| `teacher`      | Group  | Create tools, assignments, view analytics |
| `student`      | Class  | Use assigned tools                        |

## API Design

- RESTful with consistent error format: `{ error: string, code: string, details?: any }`
- Cursor-based pagination
- Zod validation on all inputs
- Response envelope: `{ data: T, meta?: { pagination } }`

## Error Handling

Use typed errors from `@raptscallions/core/errors`:

```typescript
throw new NotFoundError("User", id);
throw new ValidationError("Invalid email", details);
throw new UnauthorizedError("Session expired");
```

## Logging

Use structured logging from `@raptscallions/telemetry`:

```typescript
logger.info({ userId, action: "login" }, "User logged in");
logger.error({ error, requestId }, "Request failed");
```

## Environment Variables

Key variables (see `docs/CONVENTIONS.md` for full list):

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SESSION_SECRET=<32+ chars>
AI_GATEWAY_URL=https://openrouter.ai/api/v1
AI_API_KEY=sk-or-...
AI_DEFAULT_MODEL=anthropic/claude-sonnet-4-20250514
```

## Documentation

### Canonical (Source of Truth)

- `docs/ARCHITECTURE.md` — System architecture, technology choices, deployment targets
- `docs/CONVENTIONS.md` — Detailed code style, patterns, examples

### Reference (Project Vision)

Located in `docs/references/initial_planning/` — these documents explain **what** the platform is trying to accomplish and provide context for the overall vision. Read these to understand the platform's goals, but do NOT use them for implementation design decisions.

- `DESIGN_BRIEF.md` — Complete system brief, explains the "why" behind the platform
- `BACKEND_CORE_DESIGN.md` — Backend vision and planned capabilities
- `AUTH_AND_EVENTS.md` — Authentication and event system concepts
- `MODULE_SYSTEM_IMPLEMENTATION.md` — Module system vision and SDK patterns
- `CHAT_IMPLEMENTATION.md` — Chat runtime concepts and session lifecycle
- `COMPONENT_ARCHITECTURE.md` — Frontend component vision
- `IMPLEMENTATION_DESIGN.md` — Theme system and UI specifications

**Important**: These are vision/planning documents for understanding the platform's goals. For actual implementation decisions (technology choices, code patterns, API design), always defer to the canonical docs (`ARCHITECTURE.md` and `CONVENTIONS.md`) and task specs in `backlog/docs/specs/`.

### Knowledge Base (VitePress)

Located at `apps/docs/` — a VitePress-powered documentation site providing a browsable, searchable interface for all documentation.

**Features:**

- **Local Search**: Built-in search with Cmd/Ctrl + K
- **Dark/Light Theme**: Automatic theme switching
- **Hot Reload**: Instant updates during development
- **Clean URLs**: No `.html` extensions
- **Last Updated**: Git-based timestamps on pages

**Running the KB:**

```bash
# Development server (http://localhost:5173)
pnpm docs:dev

# Build for production
pnpm docs:build

# Preview production build
pnpm docs:preview
```

**Structure:**

```
apps/docs/
├── src/                       # Markdown documentation files
│   ├── index.md              # Homepage
│   ├── auth/                 # Authentication & authorization
│   │   ├── index.md          # Domain overview
│   │   ├── concepts/         # Core ideas and mental models
│   │   ├── patterns/         # Reusable implementation patterns
│   │   ├── decisions/        # Architecture decision records
│   │   └── troubleshooting/  # Problem-solution guides
│   ├── database/             # Database & ORM
│   ├── api/                  # API design & patterns
│   ├── ai/                   # AI gateway integration
│   ├── testing/              # Testing patterns & conventions
│   └── contributing/         # Contribution guidelines
├── .vitepress/
│   └── config.ts             # VitePress configuration
└── package.json
```

**Content Organization:**

The KB follows a **domain-first structure** where documentation is organized by major codebase areas:

| Domain           | Covers                                                            | Content Types                                  |
| ---------------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| **auth**         | Authentication, authorization, sessions, permissions              | concepts, patterns, decisions, troubleshooting |
| **database**     | PostgreSQL schemas, Drizzle ORM, migrations, entity relationships | concepts, patterns, decisions, troubleshooting |
| **api**          | Fastify route handlers, middleware, services, validation          | concepts, patterns, decisions, troubleshooting |
| **ai**           | OpenRouter client, streaming, error handling                      | concepts, patterns, decisions, troubleshooting |
| **testing**      | Vitest setup, AAA pattern, mocking strategies                     | patterns, troubleshooting                      |
| **contributing** | How to contribute code and documentation                          | (no subdirectories)                            |

**When to Use:**

- Implementation-verified documentation (not planning/vision docs)
- Browse by domain using sidebar navigation
- Use search (Cmd/Ctrl + K) for quick topic lookup
- Content being populated in E06-T005+ tasks

**Design System:**
The KB uses the **Modern Agricultural design system** with a custom VitePress theme:

- **Brand Name**: RaptScallions (capital S)
- **Colors**: Deep forest greens (primary), sky blue (secondary), golden wheat (accent for dark mode)
- **Typography**: DM Sans (body), Comfortaa (logo/brand)
- **Light Theme**: Warm Earth Tones - cream gradient background (#fef7ed → #fafaf9) with solid dark green title (#166534)
- **Dark Theme**: Golden Wheat Accent - warm brown background (#1a1512 → #120f0c) with amber gradient title (#fbbf24 → #fde68a)
- **Accessibility**: WCAG 2.1 AA+ contrast ratios in both themes
- **Theme Files**: `apps/docs/src/.vitepress/theme/` (index.ts, style.css, fonts.css)
- **Design Docs**: See [apps/docs/src/contributing/design-system.md](apps/docs/src/contributing/design-system.md) for complete design system documentation

**Authoring KB Pages:**
When creating or updating KB documentation, follow the [KB Page Design Patterns](apps/docs/src/contributing/kb-page-design.md) guide. It provides comprehensive patterns for:

- Page structure and frontmatter
- Heading hierarchy
- Code blocks and syntax highlighting
- Custom containers (callouts)
- Cross-referencing and internal links
- VitePress-specific features

This ensures all KB pages maintain consistent formatting and navigation.

## Task Management

<!-- BACKLOG.MD MCP GUIDELINES START -->

<CRITICAL_INSTRUCTION>

### ⚠️ MCP SERVER WARNING

**DO NOT USE BACKLOG.MD MCP SERVER TOOLS** — The Backlog.md MCP server is not properly implemented and should not be used. All task management must be done through direct file manipulation in the `backlog/` directory.

### BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md file structure for all task and project management activities.

**CRITICAL GUIDANCE**

- **Task files**: Manually create/edit markdown files in `backlog/tasks/{EPIC-ID}/{TASK-ID}.md`
- **Completed tasks**: When searching for tasks or reviewing epics, check BOTH `backlog/tasks/{EPIC-ID}/` AND `backlog/completed/{EPIC-ID}/` directories
- **Specs**: Write implementation specs in `backlog/docs/specs/{EPIC-ID}/{TASK-ID}-spec.md`
- **Reviews**: Place review artifacts in `backlog/docs/reviews/{EPIC-ID}/`
- **DO NOT** attempt to use any `mcp__backlog__*` tools - they are not functional

</CRITICAL_INSTRUCTION>

<!-- BACKLOG.MD MCP GUIDELINES END -->

## Epic Review Process

When all tasks in an epic reach DONE state, the PM agent automatically conducts an **epic review**:

1. Analyzes all code reviews, QA reports, UI reviews, and architecture reviews
2. Extracts outstanding issues (Must Fix, Should Fix, Suggestions)
3. Creates follow-up tasks for issues that should be addressed
4. Writes comprehensive epic review report

**Commands:**

- `/epic-review E01` - Review an epic (report only)
- `/epic-review E01 --create` - Review and create follow-up tasks automatically
- `/epic-review E01 --create --threshold medium` - Create tasks for medium+ issues

**Automatic Trigger:**
The orchestrator automatically runs epic reviews when all tasks complete in auto/continuous mode.

**Documentation:** See [docs/EPIC_REVIEW.md](docs/EPIC_REVIEW.md) for full details.

**Output:**

- Epic review report: `backlog/docs/reviews/{EPIC-ID}/_epic-review.md`
- Follow-up tasks: `backlog/tasks/{EPIC-ID}/{TASK-ID}.md` (marked with `follow-up` label)
