---
id: "E01"
title: "Foundation Infrastructure"
description: "Monorepo setup, database package, and core type definitions"
status: "planned"
priority: 1
---

# Epic E01: Foundation Infrastructure

## Goals

Set up the foundational infrastructure for RaptScallions including pnpm monorepo structure, PostgreSQL database package with Drizzle ORM, and shared core types/schemas package.

## Tasks

| ID       | Title                           | Status | Depends On         |
| -------- | ------------------------------- | ------ | ------------------ |
| E01-T001 | Initialize pnpm monorepo        | DRAFT  | -                  |
| E01-T002 | Setup packages/core with Zod    | DRAFT  | E01-T001           |
| E01-T003 | Setup packages/db with Drizzle  | DRAFT  | E01-T001           |
| E01-T004 | Create users schema             | DRAFT  | E01-T003           |
| E01-T005 | Create groups schema with ltree | DRAFT  | E01-T003, E01-T004 |
| E01-T006 | Create group_members schema     | DRAFT  | E01-T004, E01-T005 |
| E01-T007 | Setup packages/telemetry (stub) | DRAFT  | E01-T001           |
| E01-T008 | Configure Vitest for monorepo   | DRAFT  | E01-T001           |

## Completion Criteria

- [ ] pnpm workspaces functional with apps/ and packages/ structure
- [ ] TypeScript strict mode configured with shared base config
- [ ] packages/core exports Zod schemas and inferred types
- [ ] packages/db has Drizzle configured for PostgreSQL 16
- [ ] Core entity schemas: users, groups, group_members
- [ ] ltree extension configured for hierarchical groups
- [ ] Database migrations generated and testable
- [ ] Vitest configured and runnable across all packages
- [ ] All packages buildable with `pnpm build`

## Architecture Notes

This epic establishes the foundation per ARCHITECTURE.md:

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript 5.3+ (strict mode)
- **ORM**: Drizzle 0.29+ (NOT Prisma)
- **Database**: PostgreSQL 16 with ltree extension
- **Validation**: Zod 3.x
- **Testing**: Vitest

The monorepo structure follows:

```
raptscallions/
├── apps/           # (empty for now, populated in later epics)
├── packages/
│   ├── core/       # Shared types and Zod schemas
│   ├── db/         # Drizzle schema and migrations
│   └── telemetry/  # OpenTelemetry (stub for now)
├── pnpm-workspace.yaml
├── tsconfig.json   # Base TypeScript config
└── package.json    # Root package with scripts
```
