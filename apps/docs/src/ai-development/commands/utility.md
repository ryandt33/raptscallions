---
title: Utility Commands
description: Commands for Git operations and workflow utilities
source_synced_at: 2026-01-16
---

# Utility Commands

Utility commands for Git operations, workflow management, and debugging.

## Overview

Utility commands handle cross-cutting concerns: creating commits and PRs, skipping automation, and investigating failures.

## Commands

| Command | Description | Agent |
|---------|-------------|-------|
| `/commit-and-pr` | Create commit and pull request | Git Agent |
| `/skip-github` | Skip GitHub automation | - |
| `/investigate-failure` | Investigate integration test failure | - |

---

## `/commit-and-pr`

Create a commit and pull request following project conventions.

### Purpose

Automate the commit/PR workflow:
- Run CI checks before committing
- Create branch with proper naming
- Commit with conventional format
- Create PR with template
- Optionally enable automerge

### Invocation

```bash
/commit-and-pr E01-T001
```

### Input

- Task ID (e.g., `E01-T001`)
- Task must be in `PR_READY` state

### Pre-flight Checks

```bash
git status
pnpm ci:check  # MUST PASS before proceeding
```

::: danger Never Commit Without Passing CI
If `pnpm ci:check` fails:
- Report specific failures
- Show error output
- Do NOT proceed with commit/PR
:::

### Process

1. Run pre-flight checks
2. Create feature branch
3. Stage and commit changes
4. Push to remote
5. Create PR with template
6. Enable automerge (if appropriate)

### Branch Naming

**Format:** `{type}/{epic-task-id}-{slug}`

```
feature/E01-T001-user-authentication
bugfix/E02-T005-session-timeout
chore/update-dependencies
```

### Commit Format

```
feat(scope): description

- Change 1
- Change 2

Refs: E01-T001

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### PR Template

```markdown
## Summary
[Brief description]

## Task Reference
- Epic: E01 - Foundation Infrastructure
- Task: E01-T001 - Task title

## Changes Made
- [Change 1]
- [Change 2]

## Testing
- [x] Unit tests pass
- [x] Type checking passes
- [x] Linting passes
- [x] Build succeeds
```

### Automerge

- Enable for low/medium priority tasks
- Require manual review for high/critical tasks

### Source Reference

`.claude/commands/utility/commit-and-pr.md`

---

## `/skip-github`

Skip GitHub automation for manual git/PR workflow.

### Purpose

Disable automatic commit/PR creation when:
- User wants to handle git manually
- Testing locally before committing
- Working on exploratory changes

### Invocation

```bash
/skip-github
```

### Effect

Sets a flag that prevents `/commit-and-pr` from auto-running at end of workflow.

### Source Reference

`.claude/commands/utility/skip-github.md`

---

## `/investigate-failure`

Investigate an integration test failure.

### Purpose

Debug integration test failures by:
- Analyzing error output
- Checking infrastructure state
- Identifying root cause
- Proposing fixes

### Invocation

```bash
/investigate-failure E01-T001
```

### Process

1. Read test failure output
2. Analyze error messages
3. Check related infrastructure
4. Identify root cause
5. Document findings

### Output

Failure investigation added to task or separate report.

### Source Reference

`.claude/commands/utility/investigate-failure.md`

---

## Safety Rules

### Git Operations

::: danger Never Do These
- ❌ Commit without passing CI checks
- ❌ Force push to main/master
- ❌ Commit secrets or sensitive data
- ❌ Bypass pre-commit hooks
:::

::: tip Always Do These
- ✅ Run `pnpm ci:check` before committing
- ✅ Use conventional commit format
- ✅ Reference task IDs
- ✅ Check git status before operations
:::

---

## Related Commands

- [Writer Commands](/ai-development/commands/writer) — Updates docs before PR
- [QA Commands](/ai-development/commands/qa) — Validates before PR
