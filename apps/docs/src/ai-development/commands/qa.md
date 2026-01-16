---
title: QA Commands
description: Commands for quality assurance and validation
source_synced_at: 2026-01-16
---

# QA Commands

Commands that invoke the [QA Agent](/ai-development/agents/current/qa) for validation against requirements.

## Overview

QA commands handle validation after implementation. The QA agent thinks adversarially — finding what's broken, not confirming it works.

## Commands

| Command | Description | Used In Workflows |
|---------|-------------|-------------------|
| `/qa` | Full QA validation against requirements | development, schema, infrastructure (standard) |
| `/verify-fix` | Verify bug fix with fresh context | bugfix |
| `/integration-test` | Run integration tests | All (when needed) |

---

## `/qa`

Full QA validation against acceptance criteria.

### Purpose

Validate that implementation meets requirements:
- Verify every acceptance criterion
- Test edge cases
- Find bugs through adversarial testing
- Document findings in QA report

### Invocation

```bash
/qa E01-T001
```

### Input

- Task ID (e.g., `E01-T001`)
- Task must be in `QA_REVIEW` state (after code review passes)

### Initial vs. Re-Test

**Initial test (no report exists):**
- Comprehensive testing of all ACs
- Full edge case exploration
- Creates new QA report

**Re-test (report exists):**
- Focus only on previously identified bugs
- Verify fixes work
- Update existing report

### Process

1. Check if QA report exists (determines test type)
2. Read task file for ACs
3. Read spec for detailed requirements
4. Read implementation code
5. Run `pnpm test`
6. Manually verify each AC
7. Test edge cases
8. Create/update QA report

### Output

QA report at `backlog/docs/reviews/{epic}/{task-id}-qa-report.md`:

```markdown
# QA Report: {TASK-ID}

**Verdict:** PASSED | FAILED

## Acceptance Criteria Validation

### AC1: [Criterion]
**Status:** ✅ PASS | ❌ FAIL | ⚠️ PARTIAL
**Evidence:** [How verified]

## Edge Case Testing

| Scenario | Input | Expected | Actual | Status |
|----------|-------|----------|--------|--------|
| Empty email | "" | Error | Error | ✅ |

## Bug Report

### 🔴 Blocking Issues
1. **BUG-001:** [Details]

### 🟡 Non-Blocking Issues
1. **BUG-002:** [Details]
```

### Verdict Criteria

**PASSED:**
- All ACs verified
- No blocking bugs
- Adequate test coverage

**FAILED:**
- One or more ACs not met
- Blocking bugs found
- Critical edge cases unhandled

### Next Step

**If PASSED:**
Run `/update-docs {task-id}` (writer)

**If FAILED:**
Run `/implement {task-id}` (developer)

### Source Reference

`.claude/commands/qa/qa.md`

---

## `/verify-fix`

Verify a bug fix with fresh context.

### Purpose

Validate that a bug is actually fixed:
- Reproduce original bug
- Verify fix works
- Check for regressions
- Ensure edge cases handled

### Invocation

```bash
/verify-fix E01-T001
```

### Input

- Task ID for a bugfix task
- Task must be in appropriate state (varies by workflow)

### Process

1. Read original bug description
2. Attempt to reproduce (should fail now)
3. Verify fix works correctly
4. Check for regressions
5. Update task with verification results

### Next Step

**If verified:**
Task is ready for docs update or PR

**If not verified:**
Run `/implement {task-id}` (developer)

### Source Reference

`.claude/commands/qa/verify-fix.md`

---

## `/integration-test`

Run integration tests against real infrastructure.

### Purpose

Execute integration tests that:
- Test against actual services
- Verify end-to-end flows
- Check cross-component interactions

### Invocation

```bash
/integration-test E01-T001
```

### Safety Considerations

::: warning Infrastructure Access
Integration tests may interact with real infrastructure. Ensure proper environment configuration and safeguards.
:::

### Source Reference

`.claude/commands/qa/integration-test.md`

---

## Related Commands

- [Developer Commands](/ai-development/commands/developer) — Fixes issues QA finds
- [Reviewer Commands](/ai-development/commands/reviewer) — Reviews code before QA
- [Writer Commands](/ai-development/commands/writer) — Updates docs after QA pass
