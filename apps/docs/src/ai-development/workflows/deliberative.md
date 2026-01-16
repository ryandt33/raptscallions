---
title: Deliberative Workflow
description: Current workflow style with flexible reasoning, agent-driven decisions, and developer autonomy
source_synced_at: 2026-01-16
---

# Deliberative Workflow

::: tip Source of Truth
This documents the **deliberative workflow**, which is the current standard for all new tasks (E06+). This is the authoritative reference for how tasks flow through the development process.
:::

## Overview

The deliberative workflow is characterized by **flexible reasoning** and **agent-driven decisions**. Unlike the [prescriptive workflow](/ai-development/workflows/prescriptive) used historically, the deliberative approach gives agents more autonomy while maintaining clear boundaries and human checkpoints.

### Key Characteristics

| Aspect | Deliberative Approach |
|--------|----------------------|
| **Analyst role** | Explores solution space, proposes multiple approaches without implementation code |
| **Architect role** | Selects approach, defines constraints, writes lean spec |
| **Developer role** | Has autonomy within constraints; decides internal implementation details |
| **Human involvement** | Checkpoints between commands; can override agent suggestions |

## Core Philosophy

### 1. Explore, Don't Prescribe

The **analyst** explores the problem space and proposes multiple approaches. Each approach includes trade-offs, not a final recommendation. The analyst does NOT write implementation code.

### 2. Architect Decides and Constrains

The **architect** makes the architectural decision by selecting an approach (or creating a hybrid). They define **constraints** (what must be done) and **out of scope** (what must not be done), but leave implementation details to the developer.

### 3. Developer Autonomy Within Bounds

The **developer** has full autonomy over:
- Internal variable names and code structure
- Helper functions and file organization
- Implementation approach within stated constraints
- Refactoring during the TDD cycle

### 4. Human Checkpoints

After each agent command, the human can:
- Approve and continue to the next command
- Request changes before proceeding
- Override the suggested next step
- Provide additional context or requirements

## Workflow Categories

The deliberative workflow includes **five categories** based on task type. Each category has a tailored command sequence.

| Category | When to Use | Key Commands |
|----------|-------------|--------------|
| `development` | Services, routes, business logic with tests | `/analyze` → `/review-plan` → `/write-tests` → `/implement` → `/review-code` → `/qa` |
| `schema` | Database schemas and migrations | `/analyze-schema` → `/review-plan` → `/implement` → `/review-migration` → `/qa` |
| `infrastructure` | Config, CI/CD, tooling, scripts | `/analyze` → `/review-plan` → `/write-tests` → `/implement` → `/review-code` → `/qa` |
| `documentation` | KB pages, guides, docs without code | `/outline` → `/write-docs` → `/review-docs` |
| `bugfix` | Bug fixes, defects, regressions | `/investigate` → `/write-tests` → `/implement` → `/review-code` → `/verify-fix` |

## Workflow Variants

Each category may have **simple variants** for straightforward tasks:

| Label | Category | Effect |
|-------|----------|--------|
| `infra:simple` | infrastructure | Skip analysis, TDD, code review |
| `docs:simple` | documentation | Skip outline, skip agent review |
| `bugfix:simple` | bugfix | Skip investigation (obvious fix) |
| `bugfix:hotfix` | bugfix | Expedited; test after fix; creates debt task |
| `schema:simple` | schema | Skip migration review (PM decides) |

### Modifier Labels

These labels modify behavior regardless of category:

| Label | Effect | Applies To |
|-------|--------|------------|
| `frontend` | Adds `/review-ux` and `/review-ui` phases | development |
| `security` | Forces `/review-code` phase | infrastructure, any |

## Command Flow Diagrams

### Development Workflow (Standard)

```
/analyze → /review-plan → /write-tests → /implement → /review-code → /qa → /update-docs → PR
    ↓           ↓              ↓             ↓             ↓          ↓
 analyst    architect      developer     developer     reviewer      qa
```

With `frontend` label, add `/review-ux` after `/review-plan` and `/review-ui` after `/implement`.

### Schema Workflow

```
/analyze-schema → /review-plan → /implement → /review-migration → /qa → /update-docs → PR
       ↓              ↓              ↓               ↓              ↓
    analyst       architect      developer        reviewer         qa
```

### Infrastructure Workflow (Standard)

```
/analyze → /review-plan → /write-tests → /implement → /review-code → /qa → /update-docs → PR
```

### Infrastructure Workflow (Simple)

```
/implement → (validate by running) → /update-docs → PR
```

### Documentation Workflow (Standard)

```
/outline → (human approves) → /write-docs → /review-docs → PR
    ↓                              ↓             ↓
  writer                        writer        writer
```

### Documentation Workflow (Simple)

```
/write-docs → PR
```

### Bugfix Workflow (Standard)

```
/investigate → /write-tests → /implement → /review-code → /verify-fix → PR
      ↓            ↓              ↓             ↓             ↓
  developer    developer      developer     reviewer         qa
```

### Bugfix Workflow (Hotfix)

```
/investigate → /implement → /write-tests → /verify-fix → PR + follow-up task
```

## Human Checkpoints

All workflows have mandatory human checkpoints:

| Checkpoint | When | Purpose |
|------------|------|---------|
| PLAN_REVIEW / CONTENT_REVIEW | After analysis/outline | Approve approach before implementation |
| PR Creation | After all phases complete | Final review before merge |

Additional checkpoints by workflow:
- **Schema:** Tech debt sign-off before APPROVED
- **Bugfix (hotfix):** Creates follow-up task for debt

### Overriding Agent Suggestions

Each agent suggests a next step based on the workflow. Humans can override:

1. Agent suggests next step based on workflow
2. Human can run a different command instead
3. Agent can push back once if command seems wrong for current state
4. **Human decision is final**

## Status Values

Standard status progression (varies by workflow):

```
DRAFT → ANALYZED → APPROVED → TESTS_READY → IMPLEMENTING →
CODE_REVIEW → QA_REVIEW → DOCS_UPDATE → PR_READY → DONE
```

| Status | Meaning |
|--------|---------|
| `DRAFT` | Task created, awaiting analysis |
| `ANALYZED` | Analysis complete, approaches proposed |
| `APPROVED` | Architect approved, spec written |
| `TESTS_READY` | Tests written (TDD red phase) |
| `IMPLEMENTING` | Developer writing implementation |
| `IMPLEMENTED` | Implementation complete |
| `CODE_REVIEW` | Code review in progress |
| `QA_REVIEW` | QA validation in progress |
| `DOCS_UPDATE` | Documentation being updated |
| `PR_READY` | Ready for PR creation |
| `DONE` | Task complete and merged |

## Task File Structure

Tasks include a workflow section specifying the exact phases:

```markdown
## Workflow

**Category:** `development` (standard)

**Rationale:** New API route with React component requiring full TDD workflow.

**Phases:**
1. `/analyze` - Research codebase and write analysis
2. Human approval of approach
3. `/review-plan` - Architect validates approach
4. `/write-tests` - TDD red phase
5. `/implement` - Write code to pass tests
6. `/review-code` - Fresh-eyes code review
7. `/qa` - Validation and integration tests
8. `/update-docs` - Update documentation
9. PR creation

### First Command

Run `/analyze E01-T003` (analyst)
```

## When to Use Deliberative vs. Other Styles

**Use Deliberative (default):**
- All new tasks (E06+)
- Tasks requiring multiple implementation options
- Tasks where developer judgment adds value
- Complex features with architectural implications

**Historical Reference:**
- Tasks from E01-E05 may have `agentic_style: "prescriptive"`
- See [Prescriptive Workflow](/ai-development/workflows/prescriptive) for historical context

## Related Pages

- [Current Agents](/ai-development/agents/current/) — Agents used in this workflow
- [Slash Commands](/ai-development/commands/) — Commands that drive the workflow
- [Prescriptive Workflow](/ai-development/workflows/prescriptive) — Historical workflow (E01-E05)

**Source Reference:**
- Workflow definitions: `.claude/workflows/README.md`
- Individual workflows: `.claude/workflows/{category}.md`
