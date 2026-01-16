---
description: Skip GitHub automation for manual git/PR workflow
allowed-tools:
  - Read
  - Edit
---

# Skip GitHub Automation

Mark a task to skip automated GitHub PR creation, allowing manual git workflow.

## Usage

```
/skip-github E01-T001 [set|clear]
```

## Purpose

Some tasks may require manual git/PR workflow instead of automation:
- Complex merge scenarios
- Multiple related PRs
- Manual cherry-picking
- Special deployment requirements
- Testing CI pipeline changes

## What It Does

### Set Skip GitHub

```
/skip-github E01-T001 set
```

1. Reads task file
2. Sets `skip_github: true` in frontmatter
3. Saves task

**Effect:**
- When task reaches `PR_READY` state, orchestrator will pause
- Will NOT run `/commit-and-pr` command
- Displays message: "Please manually commit and create PR"
- Task stays in `PR_READY` state until manually set to `DONE`

### Clear Skip GitHub

```
/skip-github E01-T001 clear
```

1. Reads task file
2. Sets `skip_github: false` (or removes field)
3. Saves task

**Effect:**
- Resumes normal GitHub automation
- `/commit-and-pr` will run when reaching `PR_READY`

## Manual Workflow When Skipped

When `skip_github` is enabled:

1. **Task reaches PR_READY** - Orchestrator pauses

2. **Manual git workflow:**
   ```bash
   # Create branch
   git checkout -b feature/E01-T001-description

   # Make your commits manually
   git add .
   git commit -m "feat(scope): description

   Refs: E01-T001"

   # Push
   git push -u origin feature/E01-T001-description

   # Create PR manually
   gh pr create --title "..." --body "..."
   ```

3. **Update task manually:**
   ```bash
   # Edit task file
   # Set workflow_state: DONE
   # Set pr_url: "https://github.com/..."
   # Set completed_at: <timestamp>
   ```

4. **Move to completed:**
   ```bash
   # Move task file
   mv backlog/tasks/E01/E01-T001.md backlog/completed/E01/
   ```

## Use Cases

### Testing CI Changes

```bash
# Mark task to skip automation
/skip-github E02-T010 set

# Run workflow to PR_READY
pnpm workflow:run E02-T010

# Manually create PR to test CI changes
git checkout -b feature/E02-T010-test-ci
# ... manual workflow ...

# After testing, clear flag for future tasks
/skip-github E02-T010 clear
```

### Multiple Related PRs

```bash
# Task requires 3 separate PRs
/skip-github E03-T015 set

# Manually create first PR
git checkout -b feature/E03-T015-part1
# ...

# Create second PR
git checkout main
git checkout -b feature/E03-T015-part2
# ...

# Create third PR
git checkout main
git checkout -b feature/E03-T015-part3
# ...

# After all merged, manually set DONE
```

### Complex Merge Scenario

```bash
# Task needs cherry-picking between branches
/skip-github E04-T020 set

# Manual workflow with cherry-pick
git checkout develop
git cherry-pick <commit>
git checkout main
git cherry-pick <commit>
# ...
```

## Task Frontmatter

```yaml
---
id: E01-T001
skip_github: true  # Skips GitHub automation
workflow_state: PR_READY
---
```

## Orchestrator Behavior

When task has `skip_github: true`:

```
Task reaches PR_READY
     ↓
Check skip_github flag
     ↓
skip_github = true
     ↓
Display warning and stop
     ↓
Manual intervention required
```

When task has `skip_github: false` (or unset):

```
Task reaches PR_READY
     ↓
Check skip_github flag
     ↓
skip_github = false
     ↓
Run /commit-and-pr
     ↓
PR_CREATED → DONE
```

## Breakpoint vs Skip GitHub

**Breakpoint:**
- Pauses at ANY state
- Temporary pause for review
- Resume with `pnpm workflow:run`

**Skip GitHub:**
- Only affects PR_READY state
- Permanent until cleared
- Requires manual git/PR workflow

**Combine both:**
```bash
# Pause at PR_READY for manual review
pnpm workflow:breakpoint E01-T001 set

# Also skip GitHub automation
/skip-github E01-T001 set

# When ready, do manual workflow
# Then clear both flags
```

## Checking Skip Status

View task status:
```bash
pnpm workflow:status E01-T001

# Output will show:
# skip_github: true
```

Or read task file:
```bash
cat backlog/tasks/E01/E01-T001.md | grep skip_github
```

## Notes

- `skip_github` is optional field (defaults to `false`)
- Can be set/cleared at any time
- Only checked when task reaches `PR_READY` state
- Does NOT affect states before `PR_READY`
- After manual PR creation, remember to update task with PR URL

## Related Commands

- `pnpm workflow:breakpoint` - Pause at any state
- `/commit-and-pr` - Automated GitHub workflow (what gets skipped)
- `/update-docs` - Previous step before PR_READY

## Implementation Note

This is a simple flag check in the orchestrator, not a separate agent/command that runs. The orchestrator checks the flag and pauses when appropriate.
