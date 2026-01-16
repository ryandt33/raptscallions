---
description: Review analysis and create implementation spec
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
---

# Review Plan

Review the analysis document and create an implementation spec with selected approach.

## Usage

```
/review-plan E01-T001
```

## Process

1. Load the architect agent: `@architect`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read the analysis at path in task's `analysis_file` field
4. Consider any user feedback from conversation
5. Select approach and create spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
6. Update task:
   - Set `workflow_state: APPROVED`
   - Set `spec_file: backlog/docs/specs/{epic}/{task-id}-spec.md`
   - Add History entry

## After Command Completes

**User Review Point**

Review the selected approach and constraints. You can:
- **Approve** → Proceed to `/write-tests`
- **Request changes** → Discuss in conversation, re-run `/review-plan`
- **Override selection** → "Use Approach C instead because..." then re-run

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)

## Next Step

Based on the task workflow:

**Development workflow:**
- If task has `frontend` label: Run `/review-ux {task-id}` (designer)
- Otherwise: Run `/write-tests {task-id}` (developer)

**Schema workflow:**
Run `/implement {task-id}` (developer) - Create migration

**Infrastructure workflow (standard):**
Run `/write-tests {task-id}` (developer) - Write tests for scripts

---

*The architect validates the approach. Next step depends on the workflow category.*
