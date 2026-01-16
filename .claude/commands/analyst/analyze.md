---
description: Analyze a task and propose implementation approaches
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
---

# Analyze Task

Analyze the specified task and create an analysis document with multiple approaches.

## Usage

```
/analyze E01-T001
```

## Process

1. Load the analyst agent: `@analyst`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read `docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md`
4. Create analysis at `backlog/docs/analysis/{epic}/{task-id}-analysis.md`
5. Update task:
   - Set `workflow_state: ANALYZED`
   - Set `analysis_file: backlog/docs/analysis/{epic}/{task-id}-analysis.md`
   - Add History entry

## After Command Completes

**User Review Point**

Review the 3 proposed approaches. You can:
- **Approve an approach** → Proceed to `/review-plan`
- **Request changes** → Discuss in conversation, re-run `/analyze`
- **Provide direction** → "I prefer Approach B because..." then `/review-plan`

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)

## Next Step

Based on the **development** workflow:

Run `/review-plan {task-id}` (architect) - Validate approach and create implementation spec

---

*For schema tasks, use `/analyze-schema` instead which includes tech debt assessment.*
