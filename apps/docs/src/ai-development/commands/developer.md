---
title: Developer Commands
description: Commands for TDD implementation and bug investigation
source_synced_at: 2026-01-16
---

# Developer Commands

Commands that invoke the [Developer Agent](/ai-development/agents/current/developer) for test-driven development and bug investigation.

## Overview

Developer commands handle the implementation phases. The developer writes tests first (TDD red phase), then implementation (TDD green phase), following the approved spec.

## Commands

| Command | Description | Used In Workflows |
|---------|-------------|-------------------|
| `/write-tests` | TDD red phase - write tests first | development, infrastructure (standard), bugfix |
| `/implement` | TDD green phase - write code to pass tests | all workflows |
| `/investigate` | Bug investigation and root cause analysis | bugfix (standard) |

---

## `/write-tests`

Write tests based on spec's test strategy (TDD red phase).

### Purpose

Create comprehensive tests BEFORE writing implementation code. Tests should:
- Cover all acceptance criteria
- Test edge cases from spec
- Fail for the right reason (red state)

### Invocation

```bash
/write-tests E01-T001
```

### Input

- Task ID (e.g., `E01-T001`)
- Task must be in `APPROVED` state
- Spec must exist at path in task's `spec_file` field

### Process

1. Read task file and spec
2. Read conventions for test patterns
3. Write test files
4. Run `pnpm typecheck` — must pass
5. Run `pnpm lint` — must pass
6. Run `pnpm test` — verify tests fail (red state)

### Output

Test files in:
- `packages/{pkg}/src/__tests__/` — Unit tests
- `apps/{app}/src/__tests__/services/` — Service tests
- `apps/{app}/src/__tests__/integration/` — Integration tests

### Task Updates

- Sets `workflow_state: TESTS_READY`
- Updates `test_files` array

### Next Step

Run `/implement {task-id}` (developer)

### Source Reference

`.claude/commands/developer/write-tests.md`

---

## `/implement`

Write implementation code to pass tests (TDD green phase).

### Purpose

Write minimum code needed to make tests pass. The developer has autonomy over internal implementation details within spec constraints.

### Invocation

```bash
/implement E01-T001
```

### Input

- Task ID (e.g., `E01-T001`)
- Task must be in `TESTS_READY` state (or returning from review rejection)

### Process

1. **Validate tests first** — Check library APIs are correct
2. Re-read the spec
3. Write code to pass tests
4. Run `pnpm test` — must pass
5. Run `pnpm typecheck` — must pass
6. Run `pnpm lint` — must pass
7. Refactor if needed

::: warning Test Rejection
If tests use incorrect APIs or are contradictory, reject them:
- Set `workflow_state: TESTS_REVISION_NEEDED`
- Add detailed feedback in Reviews section
- Do NOT implement bad tests
:::

### Output

Implementation code in appropriate locations based on spec.

### Task Updates

- Sets `workflow_state: IMPLEMENTED`
- Updates `code_files` array

### Next Step

**Development workflow:**
- With `frontend` label: Run `/review-ui {task-id}` (designer)
- Otherwise: Run `/review-code {task-id}` (reviewer)

**Schema workflow:**
Run `/review-migration {task-id}` (reviewer)

**Bugfix workflow:**
Run `/review-code {task-id}` (reviewer) or `/verify-fix {task-id}` (qa)

### Source Reference

`.claude/commands/developer/implement.md`

---

## `/investigate`

Diagnose bug root cause for bugfix workflow.

### Purpose

Investigate a bug to understand:
- What's happening vs. what should happen
- Root cause of the issue
- Affected code paths
- Proposed fix approach

### Invocation

```bash
/investigate E01-T001
```

### Input

- Task ID for a bugfix task
- Bug reproduction information

### Process

1. Read task file with bug description
2. Reproduce the bug
3. Trace code execution
4. Identify root cause
5. Document findings

### Output

Investigation findings added to task file:
- Steps to reproduce
- Root cause analysis
- Affected files
- Proposed fix approach

### Next Step

Run `/write-tests {task-id}` (developer) — Write regression test

For `bugfix:simple` tasks:
Run `/implement {task-id}` (developer) — Skip to fix

### Source Reference

`.claude/commands/developer/investigate.md`

---

## Related Commands

- [Architect Commands](/ai-development/commands/architect) — Creates spec that developer implements
- [Reviewer Commands](/ai-development/commands/reviewer) — Reviews developer's code
- [QA Commands](/ai-development/commands/qa) — Validates implementation
