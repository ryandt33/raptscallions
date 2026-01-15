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
| DB-003 | Migrations | Add down migration files for rollback capability | Medium | Medium | Backlog | 2026-01-15 |

**DB-003 Details:**
- **Source**: Multiple code reviews ([E01-T004](/backlog/docs/reviews/E01/E01-T004-code-review.md), [E01-T005](/backlog/docs/reviews/E01/E01-T005-code-review.md), [E01-T006](/backlog/docs/reviews/E01/E01-T006-code-review.md))
- **Description**: Migration files lack corresponding down migrations for rollback capability. Currently only up migrations exist (0001-0011).
- **Impact**: Cannot cleanly rollback database changes in production if issues occur after deployment
- **Mitigation**: Create corresponding `NNNN_description_down.sql` files for each migration with DROP/REVERT statements
- **Blocking**: No - can recreate database from scratch in development, but production rollbacks require down migrations
- **Best Practice**: Essential for production-grade deployments, enables safe schema changes
- **Suggested Pattern**:
  ```sql
  -- 0001_create_users_down.sql
  DROP TABLE IF EXISTS users CASCADE;
  ```

### Low Priority

No low priority items currently.

## Completed Improvements

Archive of addressed recommendations with implementation details.

### DB-002: Export Database type from package entry point
**Completed**: 2026-01-15
**Resolution**: Database type is now properly exported from packages/db/src/index.ts, making it available for consumers to type function parameters that accept database instances. The export follows the pattern used for other package types.
**Verification**: [packages/db/src/index.ts:4](https://github.com/ryandt33/raptscallions/blob/main/packages/db/src/index.ts#L4)
**Impact**: Improved developer experience - consumers can now import Database type from the package entry point without reaching into internal client.ts file, consistent with TypeScript best practices.

## References

**Source Reviews:**
- [E01-T003: Database package setup - Code Review](/backlog/docs/reviews/E01/E01-T003-code-review.md)
- [Post-Docker Setup Review Summary](/backlog/docs/reviews/2026-01-12_post-docker-setup/_SUMMARY.md)

**Related Documentation:**
- [Database Overview](/database/)
- [Drizzle ORM Patterns](/database/patterns/) (coming soon)
