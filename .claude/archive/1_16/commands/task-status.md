---
description: Find the next task ready to work on
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Next Task

Find the next task that is ready to be worked on based on dependencies and state.

## Usage

```
/next-task
/next-task E01       # Filter by epic
/next-task --state DRAFT  # Filter by state
```

## Process

1. Read `backlog/docs/.workflow/dependencies.yaml` for dependency graph
2. Scan `backlog/tasks/` for all task files
3. Filter tasks by:
   - State is not terminal (DONE)
   - All dependencies are in DONE state
   - No breakpoint set (or show breakpoint tasks separately)
4. Sort by priority and epic order
5. Display available tasks

## Output

```
📋 Ready Tasks:

E01-T003: Create Drizzle schema for users table
  State: DRAFT
  Priority: high
  Next step: /analyze E01-T003

E01-T005: Core types package
  State: APPROVED
  Priority: high
  Next step: /write-tests E01-T005

⏸️ Paused (breakpoint):

E02-T001: Lucia auth setup
  State: APPROVED
  Breakpoint: Human review before implementation

🚫 Blocked:

E01-T004: Groups table schema
  Blocked by: E01-T003 (DRAFT)
```

## Arguments

- `$ARGUMENTS` - Optional epic filter (e.g., E01) or --state filter
