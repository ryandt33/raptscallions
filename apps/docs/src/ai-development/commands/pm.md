---
title: PM Commands
description: Commands for task creation, planning, and epic management
source_synced_at: 2026-01-16
---

# PM Commands

Commands that invoke the [PM Agent](/ai-development/agents/current/pm) for task breakdown, planning, and epic management.

## Overview

PM commands handle high-level project management: breaking down goals into tasks, reviewing completed epics, and managing the roadmap.

## Commands

| Command | Description | Used In Workflows |
|---------|-------------|-------------------|
| `/plan` | Create tasks from high-level goal | Task creation |
| `/replan-task` | Refactor poorly-written task | Task refinement |
| `/roadmap` | View or update project roadmap | Planning |
| `/epic-review` | Review completed epic, create follow-ups | Epic completion |
| `/next-task` | Find next task ready to work on | Task selection |
| `/task-status` | Check task status | Status tracking |

---

## `/plan`

Create tasks from a high-level goal or epic.

### Purpose

Break down a feature, phase, or initiative into:
- Epics (1-2 weeks each, logical groupings)
- Tasks (2-8 hours each, independently testable)

### Invocation

```bash
/plan "Implement user authentication"
```

### Input

- Goal/feature description (in quotes)
- Optional: Epic ID if adding to existing epic

### Process

1. Read the goal description
2. Read architecture docs for constraints
3. Break down into epics
4. Break epics into tasks
5. Define dependencies
6. Write files to `backlog/tasks/`

### Output

- Epic file: `backlog/tasks/{EPIC-ID}/_epic.md`
- Task files: `backlog/tasks/{EPIC-ID}/{TASK-ID}.md`

### Task Sizing

| Size | Examples |
|------|----------|
| Good (2-8h) | Single table + CRUD, one API endpoint, one component |
| Too big | "Implement authentication" → split it |
| Too small | "Add email field" → combine it |

### Source Reference

`.claude/commands/pm/plan.md`

---

## `/replan-task`

Refactor a poorly-written task into outcome-focused format.

### Purpose

Fix tasks that are:
- Too vague or unclear
- Missing acceptance criteria
- Wrong workflow category
- Poorly scoped

### Invocation

```bash
/replan-task E01-T001
```

### Process

1. Read existing task
2. Identify issues
3. Rewrite with proper format
4. Update workflow selection

### Source Reference

`.claude/commands/pm/replan-task.md`

---

## `/roadmap`

View or update the project roadmap.

### Purpose

Provide visibility into:
- Current epic status
- Upcoming work
- Dependencies between epics

### Invocation

```bash
/roadmap          # View roadmap
/roadmap --update # Update roadmap
```

### Source Reference

`.claude/commands/pm/roadmap.md`

---

## `/epic-review`

Review a completed epic and create follow-up tasks.

### Purpose

After all tasks in an epic are DONE:
- Analyze code reviews, QA reports, UI reviews
- Extract outstanding issues
- Create follow-up tasks for unresolved items
- Write epic review report

### Invocation

```bash
/epic-review E01              # Report only
/epic-review E01 --create     # Create follow-up tasks
/epic-review E01 --create --threshold medium  # Medium+ issues
```

### Process

1. Verify all tasks in DONE state
2. Read all review documents
3. Extract "Must Fix", "Should Fix", suggestions
4. Categorize by severity
5. Create follow-up tasks (if --create)
6. Write epic review report

### Output

Epic review report at `backlog/docs/reviews/{EPIC-ID}/_epic-review.md`

### When to Create Follow-up Tasks

**Create if:**
- Marked "Must Fix" or "Should Fix"
- Relates to correctness, security, data integrity
- Tech debt that will block future work
- Medium or high effort

**Don't create if:**
- Purely cosmetic
- Speculative or future-looking
- Quick fix (< 30 min)
- Preference without clear benefit

### Source Reference

`.claude/commands/pm/epic-review.md`

---

## `/next-task`

Find the next task ready to work on.

### Purpose

Identify tasks that:
- Are in TODO status
- Have all dependencies met
- Match priority ordering

### Invocation

```bash
/next-task
/next-task --epic E01  # Within specific epic
```

### Source Reference

`.claude/commands/pm/next-task.md`

---

## `/task-status`

Check the status of tasks.

### Purpose

Get status overview of:
- Specific task
- All tasks in an epic
- Tasks by status

### Invocation

```bash
/task-status E01-T001  # Specific task
/task-status --epic E01  # Epic tasks
```

### Source Reference

`.claude/commands/pm/task-status.md`

---

## Related Commands

- [Analyst Commands](/ai-development/commands/analyst) — Analyzes tasks PM creates
- [Trainer Commands](/ai-development/commands/trainer) — Reviews agent quality
