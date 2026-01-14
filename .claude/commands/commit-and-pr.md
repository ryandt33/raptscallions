---
description: Commit changes following project conventions
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

# Commit Changes

Commit implemented changes following project conventions.

## Usage

```
/commit-and-pr E01-T001
```

## Process

1. Load the developer agent: `@developer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. **Verify task is ready for commit:**
   - Check `workflow_state` is `PR_READY` or similar completion state
   - Check `status` is `in-progress` or `implemented`
   - Check code files exist (from `code_files` in frontmatter)
5. **Check git status:**
   - Run `git status` to see modified/untracked files
   - Verify there are changes to commit
   - Check current branch name
6. **Create feature branch (if not on one):**
   - Format: `feature/{epic}-{task-id}-{slug}`
   - Example: `feature/E01-T001-user-authentication`
   - Check out from `main` branch
7. **Stage and commit changes:**
   - Use conventional commit format
   - Include task reference
   - Add Co-Authored-By: Claude Sonnet 4.5
   - Example format:
     ```
     feat(auth): implement user authentication

     - Add login route handler
     - Implement password verification
     - Add session creation

     Refs: E01-T001

     Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
     ```
8. **Run CI checks locally:**
   - Run `pnpm ci:check` (typecheck, lint, test, build)
   - If any checks fail, STOP and report errors
   - Do NOT commit with failing checks
9. **Push branch:**
   - Push with `-u origin` flag to set upstream
10. **Update task frontmatter:**
    - Set `workflow_state` to `COMMITTED`
    - Set `updated_at` to current ISO timestamp

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)

## Error Handling

**If CI checks fail:**
- Do NOT create commit
- Report specific failures (typecheck/lint/test/build)
- Recommend fixes
- Update task with error details

**If branch already exists:**
- Switch to existing branch
- Confirm with user before overwriting

**If git is not configured:**
- Provide clear error message
- Show how to configure git user

## Success Criteria

- ✅ Changes committed with conventional format
- ✅ All CI checks pass locally (`pnpm ci:check`)
- ✅ Branch pushed to remote
- ✅ Task updated with `COMMITTED` state

## Notes

- This command assumes git is installed and configured
- Respects `.gitignore` - won't commit ignored files
- Uses project commit conventions from `docs/CONVENTIONS.md`

## Related Commands

- `/implement` - Previous step (implementation)
- `/update-docs` - Previous step (documentation)

## Workflow State Transition

**Before:** `PR_READY` → **Command runs** → **After:** `COMMITTED`
