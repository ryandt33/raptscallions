# Task Template for Raptscallions

This template defines the structure for task files used with Backlog.md + our workflow extension.

---

## Task File Format

Tasks are stored as individual markdown files in `docs/tasks/{EPIC-ID}/TASK-{ID}.md`.

### Frontmatter (YAML)

```yaml
---
# === BACKLOG.MD STANDARD FIELDS ===
id: "E01-T001"
title: "Implement user registration endpoint"
status: "todo" # todo | in-progress | review | done (Backlog.md standard)
priority: "high" # low | medium | high | critical
labels:
  - backend
  - auth
assignee: "" # Empty until claimed by agent

# === WORKFLOW EXTENSION FIELDS ===
workflow_state: "DRAFT" # See config.yaml for valid states
epic: "E01"
depends_on: [] # List of task IDs that must complete first
blocks: [] # List of task IDs blocked by this task
breakpoint: false # If true, pause before processing this state
assigned_agent: "" # Current agent working on task

# === TRACKING ===
created_at: "2025-01-11T00:00:00Z"
updated_at: "2025-01-11T00:00:00Z"
started_at: ""
completed_at: ""

# === ARTIFACTS ===
spec_file: "" # Path to implementation spec
test_files: [] # Paths to test files
code_files: [] # Paths to implementation files
pr_url: "" # GitHub PR URL when created
---
```

### Body Structure

```markdown
# E01-T001: Implement user registration endpoint

## Description

[Clear description of what needs to be built. 2-3 sentences max.]

## Acceptance Criteria

- [ ] AC1: [Specific, testable criterion]
- [ ] AC2: [Specific, testable criterion]
- [ ] AC3: [Specific, testable criterion]

## Technical Notes

[Any technical context, constraints, or guidance. Optional.]

## History

| Date       | State | Agent | Notes        |
| ---------- | ----- | ----- | ------------ |
| 2025-01-11 | DRAFT | human | Task created |

## Reviews

### Plan Review

- **Reviewer:** architect
- **Date:**
- **Verdict:**
- **Notes:**

### Code Review

- **Reviewer:** reviewer
- **Date:**
- **Verdict:**
- **Notes:**

### QA Review

- **Reviewer:** qa
- **Date:**
- **Verdict:**
- **Notes:**
```

---

## Complete Example

```markdown
---
id: "E01-T003"
title: "Create Drizzle schema for users table"
status: "in-progress"
priority: "high"
labels:
  - backend
  - database
assignee: "developer"

workflow_state: "IMPLEMENTING"
epic: "E01"
depends_on:
  - "E01-T001" # Monorepo setup
  - "E01-T002" # Database package setup
blocks:
  - "E02-T001" # Auth implementation needs users table
breakpoint: false
assigned_agent: "developer"

created_at: "2025-01-11T10:00:00Z"
updated_at: "2025-01-11T14:30:00Z"
started_at: "2025-01-11T11:00:00Z"
completed_at: ""

spec_file: "docs/tasks/E01/E01-T003/spec.md"
test_files:
  - "packages/db/src/__tests__/schema/users.test.ts"
code_files: []
pr_url: ""
---

# E01-T003: Create Drizzle schema for users table

## Description

Define the Drizzle ORM schema for the users table including all required fields, indexes, and relationships. This is the foundational table for the authentication system.

## Acceptance Criteria

- [ ] AC1: Users table schema defined with all required fields (id, email, name, password_hash, created_at, updated_at)
- [ ] AC2: Unique constraint on email field
- [ ] AC3: Index on email for fast lookups
- [ ] AC4: Soft delete support with deleted_at field
- [ ] AC5: Schema exports TypeScript types
- [ ] AC6: Migration file generated and tested

## Technical Notes

- Use UUID for primary key (gen_random_uuid())
- Password hash is optional (null for OAuth-only users)
- Follow naming conventions in CONVENTIONS.md
- Reference Backend_implementation doc for field specifications

## History

| Date             | State         | Agent     | Notes                           |
| ---------------- | ------------- | --------- | ------------------------------- |
| 2025-01-11 10:00 | DRAFT         | human     | Task created                    |
| 2025-01-11 10:15 | ANALYZING     | analyst   | Starting analysis               |
| 2025-01-11 10:45 | ANALYZED      | analyst   | Spec complete                   |
| 2025-01-11 11:00 | PLAN_REVIEW   | architect | Reviewing plan                  |
| 2025-01-11 11:15 | APPROVED      | architect | Approved with minor suggestions |
| 2025-01-11 11:30 | WRITING_TESTS | developer | Writing tests                   |
| 2025-01-11 12:00 | TESTS_READY   | developer | 6 tests written, all failing    |
| 2025-01-11 12:15 | IMPLEMENTING  | developer | Writing schema                  |

## Reviews

### Plan Review

- **Reviewer:** architect
- **Date:** 2025-01-11 11:15
- **Verdict:** APPROVED
- **Notes:** Good approach. Suggestion: Consider adding a `status` enum field for account states (active, suspended, pending_verification).

### Code Review

- **Reviewer:** reviewer
- **Date:**
- **Verdict:**
- **Notes:**

### QA Review

- **Reviewer:** qa
- **Date:**
- **Verdict:**
- **Notes:**
```

---

## State Transitions

When an agent completes work, the workflow system:

1. Validates completion (runs tests, checks outputs)
2. Updates `workflow_state`
3. Updates `updated_at`
4. Adds entry to History table
5. Clears `assigned_agent`
6. Checks for breakpoint
7. If no breakpoint, triggers next agent

---

## Spec File Template

When analyst creates a spec, it goes in `docs/tasks/{EPIC}/{TASK}/spec.md`:

```markdown
# Implementation Spec: E01-T003

## Overview

[Brief description of what will be implemented]

## Approach

[Technical approach, design decisions]

## Files to Create

| File                                               | Purpose                |
| -------------------------------------------------- | ---------------------- |
| `packages/db/src/schema/users.ts`                  | User schema definition |
| `packages/db/src/migrations/0001_create_users.sql` | Migration              |

## Files to Modify

| File                              | Changes             |
| --------------------------------- | ------------------- |
| `packages/db/src/schema/index.ts` | Export users schema |

## Dependencies

- Requires: E01-T002 (Database package setup)
- New packages: None

## Test Strategy

### Unit Tests

- Schema type inference
- Default value generation

### Integration Tests

- Table creation via migration
- CRUD operations
- Unique constraint enforcement

## Risks

| Risk                 | Mitigation                                         |
| -------------------- | -------------------------------------------------- |
| Schema changes later | Design for extensibility with JSONB metadata field |

## Open Questions

- [ ] Should we add a `metadata` JSONB field for extensibility?
```

---

## Epic File Template

Each epic has a summary file at `docs/tasks/{EPIC}/_epic.md`:

```markdown
---
id: "E01"
title: "Foundation"
description: "Core infrastructure setup"
status: "in-progress" # planned | in-progress | completed
priority: 1
estimated_weeks: 2
---

# Epic E01: Foundation

## Goals

Set up the foundational infrastructure for Raptscallions including monorepo structure, database package, and core type definitions.

## Tasks

| ID       | Title              | Status       | Depends On |
| -------- | ------------------ | ------------ | ---------- |
| E01-T001 | Monorepo setup     | DONE         | -          |
| E01-T002 | Database package   | DONE         | E01-T001   |
| E01-T003 | Users schema       | IMPLEMENTING | E01-T002   |
| E01-T004 | Groups schema      | DRAFT        | E01-T003   |
| E01-T005 | Core types package | DRAFT        | E01-T001   |

## Completion Criteria

- [ ] Monorepo with pnpm workspaces functional
- [ ] Database package with Drizzle configured
- [ ] Core entity schemas defined
- [ ] Migrations tested
- [ ] CI pipeline running

## Notes

[Any epic-level notes or decisions]
```
