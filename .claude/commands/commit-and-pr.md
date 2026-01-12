---
description: Commit changes and create pull request
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

# Commit and Create Pull Request

Commit implemented changes following project conventions and create a pull request.

## Usage

```
/commit-and-pr E01-T001
```

## Process

1. Load the developer agent: `@developer`
2. Read the task at `backlog/tasks/{epic}/{task-id}.md`
3. Read the spec at `backlog/docs/specs/{epic}/{task-id}-spec.md`
4. **Verify task is ready for PR:**
   - Check `workflow_state` is `PR_READY`
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
   - Do NOT commit or create PR with failing checks
9. **Push branch:**
   - Push with `-u origin` flag to set upstream
10. **Create pull request:**
    - Use `gh pr create` command
    - Title format: `{type}({scope}): {subject} [{task-id}]`
    - Use pull request template body
    - Fill in: summary, task reference, changes, testing checklist
11. **Add automerge label (optional):**
    - If task priority is `low` or `medium`, add `automerge` label
    - Use `gh pr edit <PR_NUMBER> --add-label automerge`
    - For `high` or `critical`, require manual review
12. **Update task frontmatter:**
    - Set `workflow_state` to `PR_CREATED`
    - Set `pr_url` to the PR URL
    - Set `updated_at` to current ISO timestamp
13. **Add PR section to task:**
    - Add "## Pull Request" section with link and status

## Arguments

- `$ARGUMENTS` - The task ID (e.g., E01-T001)

## Error Handling

**If CI checks fail:**
- Do NOT create commit or PR
- Report specific failures (typecheck/lint/test/build)
- Recommend fixes
- Update task with error details

**If branch already exists:**
- Switch to existing branch
- Confirm with user before overwriting

**If PR already exists:**
- Report existing PR URL
- Ask if should update or create new

**If git is not configured:**
- Provide clear error message
- Show how to configure git user

## Success Criteria

- ✅ Changes committed with conventional format
- ✅ All CI checks pass locally (`pnpm ci:check`)
- ✅ Branch pushed to remote
- ✅ PR created with proper template
- ✅ Task updated with `PR_CREATED` state and PR URL
- ✅ Automerge label added (if appropriate)

## Notes

- This command assumes git and gh CLI are installed and configured
- Requires GitHub authentication via `gh auth login`
- Respects `.gitignore` - won't commit ignored files
- Uses project commit conventions from `docs/CONVENTIONS.md`
- Integrates with GitHub Actions CI pipeline
- Auto-merge only for low/medium priority (safety for critical changes)

## Related Commands

- `/implement` - Previous step (implementation)
- `/update-docs` - Previous step (documentation)
- This command runs between `DOCS_UPDATE` and `DONE` states

## Workflow State Transition

**Before:** `PR_READY` → **Command runs** → **After:** `PR_CREATED`

Next state depends on PR status:
- If automerge enabled and checks pass: → `DONE`
- If manual review required: → `PR_REVIEW` (manual monitoring)
- If CI fails: → `PR_FAILED` (needs investigation)
