---
title: Database & ORM
description: PostgreSQL schemas, Drizzle ORM patterns, migrations, and entity relationships
---

# Database & ORM

The database domain covers PostgreSQL schema design, Drizzle ORM usage patterns, migrations, and entity relationships. The system uses PostgreSQL 16 with the ltree extension for hierarchical groups.

## What's Here

**Concepts** — Entity relationships, soft deletes, ltree hierarchies, cascade behaviors, indexing strategies

**Patterns** — Drizzle query patterns, transaction usage, migration workflows, schema design patterns

**Decisions** — Why Drizzle over Prisma, PostgreSQL ltree for hierarchies, soft delete implementation, foreign key strategies

**Troubleshooting** — Migration failures, query performance issues, foreign key violations, ltree path errors

## Coming Soon

This section is currently being populated with documentation from implemented entities (Users, Groups, Sessions, Classes, Tools, Chat Sessions, Messages).

Check back soon or see the [GitHub repository](https://github.com/ryandt33/raptscallions) for implementation progress.

## Related Domains

- [API](/api/) — Services that query the database
- [Testing](/testing/) — Testing database queries and migrations
