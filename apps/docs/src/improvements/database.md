---
title: Database & ORM Improvements
description: Technical debt, enhancements, and optimizations for the database domain
implements_task: E06-T012
last_verified: 2026-01-15
---

# Database & ORM Improvements

Recommendations for improving database schemas, Drizzle ORM usage, migrations, and query patterns. Items sourced from epic reviews, code reviews, and performance monitoring.

## Domain Overview

**Current State:**
- Drizzle ORM with PostgreSQL driver
- Custom ltree type for hierarchical groups
- Comprehensive table schemas (users, groups, sessions, classes, tools, chat)
- Migration system with up/down SQL files

**Recent Changes:**
- E01 completed: Database foundation and core schemas
- E03 completed: Classes and tools schemas
- E04 completed: Chat sessions and messages schemas

## Active Recommendations

### Critical (Blocking)

::: tip No Critical Items
No blocking items currently. 🎉
:::

### High Priority

| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| DB-001 | Configuration | Make connection pool settings configurable | Low | Small | Backlog | 2026-01-15 |

**DB-001 Details:**
- **Source**: [E01-T003 Code Review](/backlog/docs/reviews/E01/E01-T003-code-review.md)
- **Description**: Pool settings hardcoded (max: 10) despite DATABASE_POOL_MIN/MAX env vars being defined in schema
- **Impact**: Cannot tune pool size for production without code changes
- **Mitigation**: Read pool settings from validated environment in client.ts
- **Blocking**: No - current defaults (max: 10) are sensible for development
- **Suggested Implementation**:
  ```typescript
  // packages/db/src/client.ts
  const pool = postgres(DATABASE_URL, {
    max: dbEnv.DATABASE_POOL_MAX || 10,
    idle_timeout: 30,
    connect_timeout: 2,
  });
  ```

### Medium Priority

| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| DB-002 | DX | Export Database type from package entry point | Low | Trivial | Backlog | 2026-01-15 |

**DB-002 Details:**
- **Source**: [E01-T003 Code Review](/backlog/docs/reviews/E01/E01-T003-code-review.md)
- **Description**: Database type defined in client.ts but not re-exported from packages/db/src/index.ts
- **Impact**: Consumers can't easily type function parameters accepting db instance
- **Mitigation**: Add `export type { Database } from "./client.js";` to index.ts
- **Blocking**: No - workaround is to import from client.ts directly
- **Benefit**: Better developer experience, consistent with other package exports

### Low Priority

No low priority items currently.

## Completed Improvements

Archive of addressed recommendations with implementation details.

::: info No Completed Items Yet
As improvements are implemented, they will be moved here with completion date and task reference.
:::

## References

**Source Reviews:**
- [E01-T003: Database package setup - Code Review](/backlog/docs/reviews/E01/E01-T003-code-review.md)
- [Post-Docker Setup Review Summary](/backlog/docs/reviews/2026-01-12_post-docker-setup/_SUMMARY.md)

**Related Documentation:**
- [Database Overview](/database/)
- [Drizzle ORM Patterns](/database/patterns/) (coming soon)
