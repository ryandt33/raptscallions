# Skip GitHub Automation

Guide for bypassing automated GitHub PR creation and using manual git workflow.

## Overview

By default, tasks automatically create PRs via the `/commit-and-pr` command when reaching the `PR_READY` state. The `skip_github` flag allows you to bypass this automation for tasks requiring manual git/PR workflow.

## When to Use

Use `skip_github` when you need:

✅ **Manual control** over git workflow
✅ **Multiple PRs** for a single task
✅ **Complex merging** (cherry-picks, rebases)
✅ **CI testing** (test workflow changes)
✅ **Special deployment** requirements
✅ **Cross-branch** operations

## Quick Commands

```bash
# Skip GitHub automation
pnpm workflow:skip-github E01-T001 set

# Resume GitHub automation
pnpm workflow:skip-github E01-T001 clear

# Check if enabled (view task)
pnpm workflow:status E01-T001
```

## How It Works

### Normal Flow (skip_github = false)

```
DOCS_UPDATE → PR_READY → /commit-and-pr → PR_CREATED → DONE
```

### Manual Flow (skip_github = true)

```
DOCS_UPDATE → PR_READY → ⏸️ PAUSE → Manual git/PR → Manually set DONE
```

## Step-by-Step Manual Workflow

### 1. Enable Skip GitHub

```bash
pnpm workflow:skip-github E01-T001 set
```

**Output:**
```
✓ GitHub automation disabled for E01-T001
ℹ Task will pause at PR_READY for manual git/PR workflow
```

### 2. Run Workflow to PR_READY

```bash
pnpm workflow:run E01-T001
```

**Output:**
```
... task progresses through workflow ...
→ DOCS_UPDATE → PR_READY
⚠ Task E01-T001 has skip_github=true. Skipping GitHub automation.
ℹ Please manually commit and create PR for E01-T001, then set workflow_state to DONE.
```

### 3. Manual Git Operations

```bash
# Create feature branch
git checkout -b feature/E01-T001-user-authentication

# Stage changes
git add .

# Commit with conventions
git commit -m "feat(auth): implement user authentication

- Add login route handler
- Implement password verification with Argon2
- Add session creation logic

Refs: E01-T001

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to remote
git push -u origin feature/E01-T001-user-authentication

# Create PR
gh pr create --title "feat(auth): implement user authentication [E01-T001]" \
  --body "## Summary
Implements user login with email/password authentication.

## Task Reference
- Epic: E01 - Foundation Infrastructure
- Task: E01-T001 - Implement user authentication
..."
```

### 4. Update Task Manually

Edit task file at `backlog/tasks/E01/E01-T001.md`:

```yaml
---
id: E01-T001
workflow_state: DONE
status: done
pr_url: "https://github.com/org/repo/pull/123"
completed_at: "2025-01-12T12:00:00Z"
skip_github: true  # Leave enabled or clear for future
---
```

### 5. Move to Completed

```bash
# Move task file
mv backlog/tasks/E01/E01-T001.md backlog/completed/E01/
```

### 6. (Optional) Clear Flag

```bash
# For future tasks, re-enable automation
pnpm workflow:skip-github E01-T001 clear
```

## Common Scenarios

### Scenario 1: Testing CI Pipeline Changes

You're modifying GitHub Actions workflows and need to test them:

```bash
# Enable skip for CI testing task
pnpm workflow:skip-github E02-T010 set

# Run to PR_READY
pnpm workflow:run E02-T010

# Manually create PR to test CI
git checkout -b feature/E02-T010-update-ci
git add .github/workflows/
git commit -m "ci: update workflow configuration

Refs: E02-T010"
git push -u origin feature/E02-T010-update-ci
gh pr create --title "ci: update workflow configuration [E02-T010]"

# Watch CI run, iterate if needed
# When done, manually complete task
```

### Scenario 2: Multiple Related PRs

Task requires separate PRs for frontend and backend:

```bash
# Enable skip
pnpm workflow:skip-github E03-T015 set

# Run to PR_READY
pnpm workflow:run E03-T015

# Create backend PR
git checkout -b feature/E03-T015-backend
git add packages/db apps/api
git commit -m "feat(api): add user endpoints

Refs: E03-T015 (backend)"
git push -u origin feature/E03-T015-backend
gh pr create --title "feat(api): add user endpoints [E03-T015 backend]"

# Create frontend PR
git checkout main
git checkout -b feature/E03-T015-frontend
git add apps/web
git commit -m "feat(ui): add user management UI

Refs: E03-T015 (frontend)"
git push -u origin feature/E03-T015-frontend
gh pr create --title "feat(ui): add user management UI [E03-T015 frontend]"

# After both merged, complete task
```

### Scenario 3: Cherry-Pick to Multiple Branches

Need to apply changes to both `main` and `develop`:

```bash
# Enable skip
pnpm workflow:skip-github E04-T020 set

# Manual workflow
git checkout -b feature/E04-T020-fix
# ... make changes ...
git commit -m "fix(auth): critical session bug

Refs: E04-T020"

# Apply to develop
git checkout develop
git cherry-pick <commit-hash>
git push

# Apply to main
git checkout main
git cherry-pick <commit-hash>
git push

# Create PRs or direct merge as needed
# Complete task manually
```

## Task Frontmatter

### With Skip Enabled

```yaml
---
id: E01-T001
title: Implement user authentication
workflow_state: PR_READY
skip_github: true  # ← Skips automation
pr_url: ""
---
```

### Without Skip (Default)

```yaml
---
id: E01-T001
title: Implement user authentication
workflow_state: PR_READY
# skip_github not set = false (automation enabled)
pr_url: ""
---
```

## Combining with Breakpoints

Use both `breakpoint` and `skip_github` for maximum control:

```bash
# Set breakpoint to pause at PR_READY
pnpm workflow:breakpoint E01-T001 set

# Also skip GitHub automation
pnpm workflow:skip-github E01-T001 set

# Run workflow
pnpm workflow:run E01-T001

# Pauses at PR_READY
# Review changes, decide on approach
# Do manual git workflow
# Complete task manually

# Clear both flags for next task
pnpm workflow:breakpoint E01-T001 clear
pnpm workflow:skip-github E01-T001 clear
```

### Differences

| Feature | Purpose | When Checked | Effect |
|---------|---------|--------------|--------|
| `breakpoint` | Pause at ANY state | Every state transition | Stops workflow, can resume |
| `skip_github` | Skip GitHub automation | Only at PR_READY | Stops workflow, manual required |

## Best Practices

### ✅ DO

- Enable `skip_github` before running workflow
- Use commit message conventions even when manual
- Update task with PR URL after creation
- Clear flag after completing task (if it was temporary)
- Document why manual workflow was needed

### ❌ DON'T

- Forget to update task to DONE after manual merge
- Skip without documenting reason
- Leave flag enabled when not needed
- Mix automated and manual workflows for same task

## Troubleshooting

### "Task stuck at PR_READY"

**Cause:** `skip_github` is enabled

**Solution:**
```bash
# Check if flag is set
pnpm workflow:status E01-T001

# If not needed, clear it
pnpm workflow:skip-github E01-T001 clear

# Resume workflow
pnpm workflow:run E01-T001
```

### "Forgot to enable skip_github"

**Cause:** Workflow already ran `/commit-and-pr`

**Solution:**
```bash
# If PR already created, just leave it
# Or close the PR and do manual workflow

# For next time, enable skip first
pnpm workflow:skip-github E01-T002 set
```

### "Need to re-enable automation"

**Cause:** Task has `skip_github: true` from previous run

**Solution:**
```bash
# Clear the flag
pnpm workflow:skip-github E01-T001 clear

# Or edit task file directly
# Remove or set to false
```

## Related Commands

```bash
# Workflow orchestrator
pnpm workflow:run <task-id>        # Run workflow
pnpm workflow:status <task-id>     # View task status

# Control flags
pnpm workflow:breakpoint <id> set  # Pause at any state
pnpm workflow:skip-github <id> set # Skip GitHub automation

# Clear flags
pnpm workflow:breakpoint <id> clear
pnpm workflow:skip-github <id> clear
```

## Implementation Details

The `skip_github` flag is checked in the orchestrator at `PR_READY` state:

```typescript
// In runWorkflowStep()
if (task.skip_github && currentState === "PR_READY") {
  logWarning("Skipping GitHub automation");
  logInfo("Please manually commit and create PR");
  return false; // Stop workflow
}
```

No agent runs, no automatic transitions. Task pauses until manual intervention.

## Summary

- **Flag:** `skip_github: true` in task frontmatter
- **Command:** `pnpm workflow:skip-github <id> set|clear`
- **Effect:** Pauses workflow at PR_READY for manual git/PR
- **Use When:** Manual control needed over git workflow
- **Resume:** Manually complete task and set to DONE

---

**See Also:**
- [Workflow GitHub Integration](./WORKFLOW_GITHUB_INTEGRATION.md) - Complete GitHub integration guide
- [CI/CD Documentation](./CI_CD.md) - CI/CD comprehensive docs
- [Orchestrator Usage](../scripts/orchestrator.ts) - Workflow automation

**Last Updated:** 2025-01-12
