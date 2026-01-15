---
id: "E06"
title: "Knowledge Base & Documentation Infrastructure"
description: "Centralized, authoritative knowledge store with VitePress, domain-first organization, automated staleness detection, built from completed implementations"
status: "planned"
priority: 3
estimated_weeks: 2
depends_on_epics: ["E01"]
---

# Epic E06: Knowledge Base & Documentation Infrastructure

## Goals

Establish a centralized, authoritative knowledge base that serves as the single source of truth for architecture, patterns, decisions, and troubleshooting. The KB should be:

- **Authoritative** — Built from actual implemented code, not planning docs
- **Discoverable** — VitePress-powered search and navigation
- **Maintainable** — Automated staleness detection prevents documentation drift
- **Version-controlled** — Git-native, bundled with the application
- **Interconnected** — Cross-references between related concepts

This epic establishes the infrastructure and documents the **currently implemented** features (E01-E04 completed tasks).

## Success Criteria

- [ ] VitePress site generator configured and buildable
- [ ] Domain-first folder structure implemented with clear hierarchy
- [ ] Automated staleness detection tracks doc-to-code relationships
- [ ] CI integration validates docs build and flags stale content
- [ ] KB homepage provides clear navigation and orientation
- [ ] Auth domain documented (Lucia, CASL, guards, rate limiting)
- [ ] Database domain documented (entities, Drizzle patterns)
- [ ] AI domain documented (OpenRouter client)
- [ ] Testing domain documented (Vitest setup, patterns, Fastify testing)
- [ ] API domain documented (Fastify patterns, route handlers, middleware)
- [ ] Cross-linking convention established and documented

## Tasks

| ID       | Title                                            | Priority | Depends On |
| -------- | ------------------------------------------------ | -------- | ---------- |
| E06-T001 | VitePress setup and configuration                | critical | -          |
| E06-T002 | KB folder structure and navigation               | critical | E06-T001   |
| E06-T003 | Staleness tracking schema and detection logic    | high     | -          |
| E06-T004 | CI integration for docs validation               | high     | E06-T001, E06-T003 |
| E06-T005 | Document implemented auth system                 | high     | E06-T002   |
| E06-T006 | Document implemented database entities           | high     | E06-T002   |
| E06-T007 | Document implemented AI gateway                  | medium   | E06-T002   |
| E06-T008 | Cross-linking conventions and contribution guide | medium   | E06-T005   |
| E06-T009 | Document testing patterns and conventions        | high     | E06-T002   |
| E06-T010 | Document API patterns and conventions            | high     | E06-T002   |
| E06-T011 | Implement backlog citation system in KB         | high     | E06-T002   |
| E06-T012 | Add recommendations/improvements tracking system | medium   | E06-T005, E06-T006, E06-T007 |

## Out of Scope

- Algolia or external search services (local search sufficient for now)
- Internationalization (i18n) support
- Public hosting/deployment (local development use first)
- API documentation auto-generation (OpenAPI separate concern)
- Video or multimedia content
- Interactive code playgrounds
- Documentation versioning (v1, v2 branches)
- User comments or feedback on docs
- Analytics or usage tracking
- PDF export functionality
- Documenting unimplemented/planned features

## Risks

| Risk                              | Impact | Mitigation                                              |
| --------------------------------- | ------ | ------------------------------------------------------- |
| Staleness detection too noisy     | Medium | Tunable thresholds; ignore patterns for stable docs     |
| VitePress upgrade breaks build    | Low    | Lock version; test upgrades in CI                       |
| KB diverges from existing docs    | Medium | ARCHITECTURE.md becomes summary linking to KB           |
| Cross-linking maintenance burden  | Low    | Tooling to detect broken links; relative paths          |
| Domain boundaries unclear         | Medium | Document decision criteria; allow restructuring         |

## Notes

### Implementation-First Approach

**Critical principle:** The KB documents what is *actually implemented*, not what is planned. Source of truth:

1. **Completed tasks** in `backlog/completed/` - prove what was built
2. **Specs and reviews** in `backlog/docs/specs/` and `backlog/docs/reviews/` - provide context
3. **Actual source code** - the ultimate truth

As new epics complete, their implementations get documented. This ensures:
- Every KB article can be verified against working code
- Staleness detection has meaningful relationships to track
- Developers/agents get accurate, tested information

### What's Currently Implemented (Source for Initial KB)

**E01 - Foundation Infrastructure (8 tasks completed):**
- Monorepo structure (pnpm workspaces)
- packages/core with Zod schemas
- packages/db with Drizzle
- Users schema
- Groups schema with ltree
- Group members schema
- Telemetry stub
- Vitest configuration

**E02 - API Foundation & Authentication (8 tasks completed):**
- Fastify API server
- Sessions schema + Lucia setup
- Email/password auth routes
- OAuth (Google, Microsoft) via Arctic
- CASL permission system
- Authentication guards and decorators
- Rate limiting middleware
- Auth integration tests

**E03 - Core Entity CRUD (2 tasks completed):**
- Classes and class_members schemas
- Tools schema with YAML storage

**E04 - AI Gateway & Chat (2 tasks completed):**
- Chat sessions and messages schemas
- OpenRouter client with streaming

### Technology Choices

**VitePress** selected because:
- Vite-based (matches project's frontend tooling)
- Vue-powered but works with plain Markdown
- Excellent built-in search
- Fast development and build times
- Simple configuration
- Good TypeScript support

### Folder Structure

The KB lives as a monorepo workspace app at `apps/docs/`, keeping VitePress dependencies isolated and following the existing app pattern.

```
raptscallions/
├── apps/
│   ├── api/
│   ├── web/
│   ├── worker/
│   └── docs/                    # VitePress site (new workspace)
│       ├── src/
│       │   ├── index.md         # KB homepage
│       │   ├── auth/            # Authentication domain
│       │   │   ├── index.md
│       │   │   ├── concepts/
│       │   │   ├── patterns/
│       │   │   ├── decisions/
│       │   │   └── troubleshooting/
│       │   ├── database/        # Database domain
│       │   ├── api/             # API design domain
│       │   ├── ai/              # AI integration domain
│       │   ├── testing/         # Testing domain
│       │   └── contributing/    # How to contribute
│       ├── .vitepress/
│       │   ├── config.ts        # VitePress configuration
│       │   └── theme/           # Custom theme extensions
│       └── package.json         # VitePress deps isolated here
├── docs/                        # Legacy/reference docs (unchanged)
│   ├── ARCHITECTURE.md          # High-level overview, links to KB
│   ├── CONVENTIONS.md           # Quick reference for conventions
│   ├── references/              # Historical planning docs
│   └── kb/                      # Migrate existing testing KB
└── backlog/
```

**Why `apps/docs`:**
- Isolated dependencies (VitePress doesn't pollute root)
- Follows existing monorepo pattern (`apps/api`, `apps/web`, `apps/worker`)
- CI can conditionally build only when `apps/docs/**` changes
- Still version-controlled together for staleness detection

### Content Types per Domain

| Type | Purpose | Example |
|------|---------|---------|
| **concepts/** | Explain core ideas and mental models | "How sessions work in Lucia" |
| **patterns/** | Reusable implementation patterns | "Guard middleware composition" |
| **decisions/** | Why we chose X over Y (ADR format) | "Why Drizzle over Prisma" |
| **troubleshooting/** | Problem → solution guides | "Session cookie not set" |

### Staleness Detection Approach

Track relationships between docs and code:

```yaml
# In doc frontmatter (apps/docs/src/auth/concepts/sessions.md)
---
title: Session Lifecycle
related_code:
  - packages/auth/src/session.service.ts
  - apps/api/src/middleware/session.middleware.ts
implements_task: E02-T002
last_verified: 2026-01-13
---
```

Detection logic:
1. Parse frontmatter for `related_code` paths
2. Compare doc's `last_verified` with code file's last commit date
3. If code changed after doc verification, flag as potentially stale
4. CI reports stale docs (warning, not blocking initially)
5. Weekly digest of stale docs for review

### Reference Convention

Each doc should include:

```markdown
## References

**Implements:** [E02-T002](../../../backlog/completed/E02/E02-T002.md)

**Key Files:**
- [session.service.ts](packages/auth/src/session.service.ts) - Session CRUD
- [session.middleware.ts](apps/api/src/middleware/session.middleware.ts) - Request hook

**Related Docs:**
- [OAuth Flow](./oauth-flow.md)
- [Guard Middleware Pattern](../patterns/guard-middleware.md)
```

### Workflow Integration

The existing `/update-docs` command should:
1. Check if relevant KB docs exist
2. Update or create docs as needed
3. Set `last_verified` to current date
4. Include in commit

Future task acceptance criteria should include:
```markdown
## Acceptance Criteria
- [ ] Relevant KB docs updated or created
```

### Relationship with Existing Docs

- **ARCHITECTURE.md** — Remains as high-level overview, links to KB for details
- **CONVENTIONS.md** — Remains as quick reference, links to KB for deep dives
- **docs/references/** — Unchanged, historical planning context
- **docs/kb/testing/** — Existing content integrated into new structure
