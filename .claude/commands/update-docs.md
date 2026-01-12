---
description: Update documentation after implementation
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Update Documentation

Update documentation to reflect new implementation.

## Usage

```
/update-docs E01-T001
```

## Process

1. Load the writer agent: `@writer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. Read implemented code (from `code_files` in task frontmatter)
5. Identify docs needing updates
6. Update relevant documentation
7. Add Documentation Updates section to task
8. Update task frontmatter:
   - Set `workflow_state` to `PR_READY`
   - Set `status` to `in-progress`
   - Set `updated_at` to current ISO timestamp
9. **DO NOT** move task to completed yet (happens after PR is merged)

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)
