# Task Template for RaptScallions

This template defines the structure for task files used with Backlog.md workflow.

---

## Task File Format

Tasks are stored as individual markdown files in `backlog/tasks/{EPIC-ID}/{TASK-ID}.md`.

### Frontmatter (YAML)

```yaml
---
id: "E01-T001"
title: "Short descriptive title"
status: "todo" # todo | in-progress | done
priority: "high" # low | medium | high | critical
labels:
  - backend # Determines review path (see task_types in config.yaml)
  - auth
assignee: ""

workflow_state: "DRAFT" # Current state in workflow
epic: "E01"
depends_on: [] # Task IDs that must complete first
blocks: [] # Task IDs blocked by this task

created_at: "2026-01-12T00:00:00Z"
updated_at: "2026-01-12T00:00:00Z"
started_at: ""
completed_at: ""

spec_file: "" # Path to spec when created
test_files: [] # Paths added during implementation
code_files: [] # Paths added during implementation
pr_url: "" # PR URL when created
---
```

### Body Structure

```markdown
# E01-T001: Short descriptive title

## Description

[Clear description of what needs to be built. 2-3 sentences max.]

## Acceptance Criteria

- [ ] AC1: [Specific, testable criterion]
- [ ] AC2: [Specific, testable criterion]
- [ ] AC3: [Specific, testable criterion]

## Technical Notes

[Optional: Brief constraints or context. NO implementation code.]

## History

| Date       | State | Agent | Notes        |
| ---------- | ----- | ----- | ------------ |
| 2026-01-12 | DRAFT | human | Task created |

## Reviews

### Spec Review

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

## Spec File Format

When analyst creates a spec, it goes in `backlog/docs/specs/{EPIC}/{TASK-ID}-spec.md`.

**IMPORTANT**: Specs are REQUIREMENTS documents, not implementation guides.

```markdown
# Spec: E01-T003 - Create users table schema

## Overview

[1-2 paragraphs: What is being built and why. Business context.]

## Requirements

### Functional Requirements

- FR1: [What the system must do]
- FR2: [What the system must do]
- FR3: [What the system must do]

### Non-Functional Requirements

- NFR1: [Performance, security, scalability constraints]
- NFR2: [Compatibility requirements]

## Acceptance Criteria

Copied from task, expanded with specifics:

- [ ] AC1: Users table exists with id, email, name, password_hash, created_at, updated_at
- [ ] AC2: Email field has unique constraint
- [ ] AC3: Email field is indexed for fast lookups
- [ ] AC4: Soft delete supported via deleted_at timestamp
- [ ] AC5: TypeScript types are exported from schema
- [ ] AC6: Migration runs successfully up and down

## Files

### To Create

| Path                                               | Purpose           |
| -------------------------------------------------- | ----------------- |
| `packages/db/src/schema/users.ts`                  | User table schema |
| `packages/db/src/migrations/0001_create_users.sql` | Migration         |

### To Modify

| Path                              | Changes             |
| --------------------------------- | ------------------- |
| `packages/db/src/schema/index.ts` | Export users schema |

## Dependencies

- Requires: E01-T002 (database package must exist)
- New packages: None

## Test Strategy

### What to Test

- Schema type inference works correctly
- Default values generate as expected
- Table creation succeeds
- CRUD operations work
- Unique constraint prevents duplicate emails
- Soft delete filters work

### Test Categories

- Unit tests: Schema validation, type inference
- Integration tests: Database operations, migrations

## Risks & Mitigations

| Risk                        | Impact | Mitigation               |
| --------------------------- | ------ | ------------------------ |
| Schema changes needed later | Medium | Design for extensibility |

## Open Questions

- [ ] Should we add a metadata JSONB field?
```

---

## What Specs Should NOT Contain

1. **Full implementation code** - No 50+ line TypeScript examples
2. **Library-specific API details** - Developer discovers these
3. **Step-by-step implementation instructions** - That's the developer's job
4. **Copy-paste ready code blocks** - Leads to outdated examples

The spec answers WHAT and WHY. The developer figures out HOW using:

- `docs/ARCHITECTURE.md` for patterns
- `docs/CONVENTIONS.md` for style
- Existing codebase for consistency

---

## State Transitions

```
DRAFT → SPEC_WRITING → SPEC_REVIEW → APPROVED → IMPLEMENTING → IMPLEMENTED
                                                                    ↓
                              ┌──────────────────────────────────────┘
                              ↓
                         TECH_REVIEW ──→ UI_REVIEW* ──→ QA ──→ DONE
                              │              │           │
                              └──────────────┴───────────┘
                                        ↓
                                   IMPLEMENTING
                                   (on rejection)

* UI_REVIEW only runs for frontend/fullstack tasks
```

---

## Labels and Review Routing

| Labels                        | Task Type      | Reviews                      |
| ----------------------------- | -------------- | ---------------------------- |
| backend, api, database, auth  | backend        | TECH_REVIEW → QA             |
| frontend, ui, web, components | frontend       | TECH_REVIEW → UI_REVIEW → QA |
| fullstack                     | fullstack      | TECH_REVIEW → UI_REVIEW → QA |
| documentation, docs           | docs           | TECH_REVIEW                  |
| devops, ci, deployment        | infrastructure | TECH_REVIEW → QA             |
