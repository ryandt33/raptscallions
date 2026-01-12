# Auto-Pause for Manual Merge

The workflow orchestrator automatically pauses after creating a PR to allow human review and manual merge control.

## How It Works

The workflow includes a **default breakpoint** at the `PR_CREATED` state. This means:

1. Orchestrator runs through all workflow states automatically
2. When task reaches `PR_READY`, runs `/commit-and-pr`
3. PR is created via GitHub Actions
4. **Orchestrator automatically pauses** at `PR_CREATED`
5. Human reviews PR, waits for CI, decides when to merge
6. After merge, manually resume or complete task

## Configuration

Set in `backlog/docs/.workflow/config.yaml`:

```yaml
default_breakpoints:
  - PR_CREATED  # Pause after PR created for human review/merge
```

## Typical Workflow

### Automated Portion

```
DRAFT → ANALYZING → ANALYZED → UX_REVIEW → PLAN_REVIEW → APPROVED
  → WRITING_TESTS → TESTS_READY → IMPLEMENTING → IMPLEMENTED
  → UI_REVIEW → CODE_REVIEW → QA_REVIEW → INTEGRATION_TESTING
  → DOCS_UPDATE → PR_READY → /commit-and-pr → PR_CREATED
```

### Pause at PR_CREATED

```bash
# Orchestrator output:
✓ PR created: https://github.com/org/repo/pull/123
⚠ Default breakpoint at PR_CREATED. Use --force to continue.
```

### Manual Review

```bash
# 1. Review PR on GitHub
open https://github.com/org/repo/pull/123

# 2. Wait for CI checks to pass
# 3. Request reviews if needed
# 4. Approve PR
# 5. Merge PR (manual click on GitHub)

# 6. After merge, complete the task:
# Either manually set task to DONE:
# Edit backlog/tasks/E01/E01-T001.md
#   workflow_state: DONE
#   status: done
#   completed_at: <timestamp>

# Or force orchestrator to continue (which will auto-complete):
pnpm workflow:run E01-T001 --force
```

## Override Breakpoint (Skip Pause)

If you want orchestrator to continue past PR creation:

```bash
# Use --force flag
pnpm workflow:run E01-T001 --force

# This will:
# - Create PR
# - Continue past PR_CREATED
# - Auto-transition to DONE
```

## Per-Task Control

### Clear breakpoint for specific task

```bash
# Task will not pause at PR_CREATED
pnpm workflow:breakpoint E01-T001 clear
pnpm workflow:run E01-T001
```

### Set additional breakpoint

```bash
# Pause at both APPROVED and PR_CREATED
pnpm workflow:breakpoint E01-T001 set
# Edit task to set workflow_state: APPROVED
```

## Auto-Merge vs Manual Merge

### Low/Medium Priority (Auto-Merge)

```
PR Created → CI Runs → All Checks Pass → Auto-Merge → Done
     ↓
Orchestrator Paused (breakpoint)
     ↓
Human monitors but doesn't need to manually merge
     ↓
After auto-merge, manually complete task
```

### High/Critical Priority (Manual Review)

```
PR Created → CI Runs → Human Reviews → Manual Approval → Manual Merge
     ↓
Orchestrator Paused (breakpoint)
     ↓
Human reviews, approves, merges
     ↓
After merge, manually complete task
```

## Why This Approach?

✅ **Safe** — Human always has final control
✅ **Simple** — Just use default breakpoints, no extra flags
✅ **Flexible** — Can override with --force if needed
✅ **Visible** — Clear pause point in workflow
✅ **Compatible** — Works with both auto-merge and manual review

## Commands

```bash
# Run with auto-pause at PR_CREATED
pnpm workflow:run E01-T001

# Skip pause (force continue)
pnpm workflow:run E01-T001 --force

# Clear breakpoint for task (won't pause)
pnpm workflow:breakpoint E01-T001 clear

# Check if task is paused
pnpm workflow:status E01-T001
```

## Complete Example

```bash
# Start task
pnpm workflow:run E01-T001

# ... workflow runs automatically ...
# ... creates PR ...

# Output:
✓ Created PR: https://github.com/org/repo/pull/123
⚠ Default breakpoint at PR_CREATED. Use --force to continue.

# Review PR
open https://github.com/org/repo/pull/123

# Wait for CI, review code, approve

# If auto-merge enabled (low/medium priority):
#   PR auto-merges when CI passes
#   Just wait for merge

# If manual merge needed (high/critical priority):
#   Click "Merge pull request" on GitHub

# After PR is merged, complete task:
# Option 1: Force continue (auto-completes)
pnpm workflow:run E01-T001 --force

# Option 2: Manually set to DONE
# Edit backlog/tasks/E01/E01-T001.md
#   workflow_state: DONE
#   status: done
#   completed_at: "2025-01-12T12:00:00Z"
# Move to backlog/completed/E01/
```

## Related Documentation

- [Workflow GitHub Integration](./WORKFLOW_GITHUB_INTEGRATION.md) - Complete GitHub integration
- [Workflow Config](../backlog/docs/.workflow/config.yaml) - Configuration file
- [Orchestrator](../scripts/orchestrator.ts) - Implementation details

---

**Summary:** Orchestrator automatically pauses at `PR_CREATED` to allow human review and merge control. Use `--force` to skip pause if needed.

**Last Updated:** 2025-01-12
