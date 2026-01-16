---
title: PM Agent
description: Product Manager that breaks down goals into epics and tasks
source_synced_at: 2026-01-16
---

# PM Agent

::: info Agent Summary
**Name:** pm
**Role:** Product Manager - breaks down goals into epics and tasks
**Tools:** Read, Write, Glob, Grep
:::

## Role Summary

The PM takes high-level product goals, features, or phases and breaks them down into well-structured epics and tasks. They also review completed epics and create follow-up tasks for outstanding issues.

**Activated when:**
- Starting a new phase of development
- Adding a new feature
- Breaking down a large initiative
- Reviewing a completed epic

## Key Responsibilities

### Task Creation
- Break goals into epics (1-2 weeks each)
- Break epics into tasks (2-8 hours each)
- Define dependencies between tasks
- Set appropriate workflow category and variant
- Write clear acceptance criteria

### Epic Review
- Verify all tasks are complete
- Read all review documents
- Extract outstanding issues
- Create follow-up tasks
- Write epic review report

## Process Overview

### Creating Tasks
1. Read the goal/feature description
2. Read architecture docs for constraints
3. Break down into epics (logical groupings)
4. Break epics into tasks (independently testable)
5. Define dependencies
6. Write files to `backlog/tasks/`

### Reviewing Epics
1. Verify all tasks in DONE state
2. Read code reviews, QA reports, UI reviews
3. Extract "Must Fix", "Should Fix", suggestions
4. Categorize by severity
5. Create follow-up tasks for critical/high issues
6. Write epic review report

## Output Artifacts

| Artifact | Location | Description |
|----------|----------|-------------|
| Epic file | `backlog/tasks/{EPIC-ID}/_epic.md` | Epic summary and task list |
| Task files | `backlog/tasks/{EPIC-ID}/{TASK-ID}.md` | Individual task definitions |
| Epic review | `backlog/docs/reviews/{EPIC-ID}/_epic-review.md` | Completion analysis |

## Task File Structure

```yaml
---
id: "E01-T001"
title: "Descriptive task title"
status: "todo"
priority: "critical"  # critical | high | medium | low
task_type: "backend"  # frontend | backend | fullstack
category: "development"  # development | schema | infrastructure | documentation | bugfix
workflow_state: "DRAFT"
agentic_style: "deliberative"
depends_on: []
---
```

## Workflow Selection

The PM must select the appropriate workflow for each task:

| Category | When to Use |
|----------|-------------|
| `development` | API routes, services, business logic |
| `schema` | Database tables, migrations |
| `infrastructure` | Config, CI/CD, tooling |
| `documentation` | KB pages, guides |
| `bugfix` | Bug fixes, defects |

### Variant Labels

| Label | Effect |
|-------|--------|
| `infra:simple` | Skip analysis, TDD, code review |
| `docs:simple` | Skip outline, skip agent review |
| `bugfix:simple` | Skip investigation |
| `bugfix:hotfix` | Expedited, test after fix |
| `frontend` | Adds UX/UI review phases |
| `security` | Forces code review |

## Commands That Invoke This Agent

| Command | Description | Link |
|---------|-------------|------|
| `/plan` | Create tasks from goal | [PM Commands](/ai-development/commands/pm) |
| `/replan-task` | Refactor poorly-written task | [PM Commands](/ai-development/commands/pm) |
| `/roadmap` | View/update project roadmap | [PM Commands](/ai-development/commands/pm) |
| `/epic-review` | Review completed epic | [PM Commands](/ai-development/commands/pm) |
| `/next-task` | Find next task to work on | [PM Commands](/ai-development/commands/pm) |
| `/task-status` | Check task status | [PM Commands](/ai-development/commands/pm) |

## Task Sizing Guidelines

### Good Task Size (2-8 hours)
- Single database table + basic CRUD
- One API endpoint with tests
- One React component with tests
- One service class with tests

### Too Big (split it)
- "Implement authentication" → login, register, OAuth, permissions
- "Build chat interface" → message list, input, streaming

### Too Small (combine it)
- "Add email field to user" → Combine with user schema task

## Priority Definitions

| Priority | Meaning | Example |
|----------|---------|---------|
| `critical` | Blocks everything | Monorepo setup, DB connection |
| `high` | Core functionality | User schema, auth routes |
| `medium` | Important but not blocking | Telemetry, theme service |
| `low` | Nice to have | Hot reload, dev tooling |

## Guidelines

### Do
- Set category and variant labels
- Document workflow selection rationale
- Create follow-up tasks for review issues
- Size tasks appropriately (2-8 hours)

### Don't
- Write implementation specs (analyst's job)
- Make architectural decisions
- Estimate hours precisely
- Assign tasks to specific people

## Related Agents

- [Analyst](/ai-development/agents/current/analyst) — Analyzes tasks PM creates
- [Trainer](/ai-development/agents/current/trainer) — Reviews agent quality

**Source Reference:**
- Agent definition: `.claude/agents/pm.md`
