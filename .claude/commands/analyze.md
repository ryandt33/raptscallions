---
description: Analyze a task and write implementation spec
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
---

# Analyze Task

Analyze the specified task and create an implementation specification.

## Usage

```
/analyze E01-T001
```

## Process

1. Load the analyst agent: `@analyst`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read `docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md`
4. Create spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
5. Update task `workflow_state` to `ANALYZED`

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)
