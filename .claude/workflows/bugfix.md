# Bugfix Workflow

> **Category:** `bugfix`
> **Use for:** Bug fixes, defects, regressions

## Workflow Overview

### Simple Bugfix (`bugfix:simple` label)

```
DRAFT → FIXING → VERIFICATION → PR_READY → DONE
```

### Standard Bugfix (default)

```
DRAFT → INVESTIGATING → TESTS_READY → FIXING → CODE_REVIEW → VERIFICATION → PR_READY → DONE
```

### Hotfix (`bugfix:hotfix` label)

```
DRAFT → INVESTIGATING → FIXING → TESTS_READY → VERIFICATION → PR_READY → DONE
```
*+ auto-created follow-up task for debt*

**Key differences from development workflow:**
- Investigation replaces analysis (diagnose root cause vs plan implementation)
- Regression test only (not full TDD suite)
- No plan review (scope is clear: fix the bug)
- Hotfix workflow for urgent issues with debt tracking

---

## Workflow Selection

### Simple Bugfix (`bugfix:simple`)

PM sets this label when ALL criteria are met:

- ✅ Fix is obvious (no investigation needed)
- ✅ Low risk of regression
- ✅ No complex logic involved

**Examples:**
- Typo in UI text
- Wrong color/styling
- Misaligned element
- Incorrect label
- Simple config value wrong

**Workflow:** Skip investigation, direct to fix with QA verification

### Standard Bugfix (default)

Any bug that doesn't meet simple criteria:

- ❌ Root cause unclear
- ❌ Multiple possible causes
- ❌ Complex logic involved
- ❌ Could affect other areas

**Examples:**
- Feature doesn't work as expected
- Edge case failures
- Performance issues
- Race conditions
- Data inconsistency

**Workflow:** Full investigation, TDD-style regression test, code review

### Hotfix (`bugfix:hotfix`)

For critical bugs requiring immediate attention:

- 🚨 Production is down
- 🚨 Data loss risk
- 🚨 Security vulnerability
- 🚨 Major user impact

**Workflow:** Expedited - test after fix, skip code review, creates follow-up task for debt

---

## Phase Reference

### Simple Workflow

| Phase | Command | Agent | Input | Output |
|-------|---------|-------|-------|--------|
| DRAFT → FIXING | `/implement` | developer | Task file | Fix code |
| FIXING → VERIFICATION | `/verify-fix` | qa | Fix + bug report | Verification report |
| VERIFICATION → PR_READY | — | — | — | Manual PR creation |

### Standard Workflow

| Phase | Command | Agent | Input | Output |
|-------|---------|-------|-------|--------|
| DRAFT → INVESTIGATING | `/investigate` | developer | Bug report | Root cause analysis |
| INVESTIGATING → TESTS_READY | `/write-tests` | developer | Root cause | Regression test (failing) |
| TESTS_READY → FIXING | `/implement` | developer | Test + root cause | Fix code (test passes) |
| FIXING → CODE_REVIEW | `/review-code` | reviewer | Fix code | Review report |
| CODE_REVIEW → VERIFICATION | `/verify-fix` | qa | All artifacts | Verification report |
| VERIFICATION → PR_READY | — | — | — | Manual PR creation |

### Hotfix Workflow

| Phase | Command | Agent | Input | Output |
|-------|---------|-------|-------|--------|
| DRAFT → INVESTIGATING | `/investigate` | developer | Bug report | Root cause (quick) |
| INVESTIGATING → FIXING | `/implement` | developer | Root cause | Fix code |
| FIXING → TESTS_READY | `/write-tests` | developer | Fix code | Regression test |
| TESTS_READY → VERIFICATION | `/verify-fix` | qa | All artifacts | Verification report |
| VERIFICATION → PR_READY | — | — | — | Manual PR + follow-up task |

---

## Phase Details

### 1. Investigation (DRAFT → INVESTIGATING)

**Command:** `/investigate {task-id}`
**Agent:** developer

**Purpose:** Diagnose root cause before attempting fix.

**Process:**
1. Reproduce the bug
2. Identify root cause
3. Determine fix scope
4. Document findings in task file

**Key Questions:**
- Can we reproduce it?
- What's the root cause?
- What's the minimal fix?
- What could regress?

**Output:** Root cause analysis in task file

**Transitions:**
- ✅ Root cause found → INVESTIGATING
- ❌ Cannot reproduce → Document and close or escalate

---

### 2. Regression Test (→ TESTS_READY)

**Command:** `/write-tests {task-id}`
**Agent:** developer

**Purpose:** Write a test that reproduces the bug.

**Process:**
1. Write test that triggers the bug
2. Verify test fails (proves bug exists)
3. Document expected vs actual behavior

**Output:** Failing test file

**This is TDD for bugs:** Test proves bug exists, then proves when it's fixed.

**Timing by workflow:**
- **Standard:** Before fix (TDD style)
- **Hotfix:** After fix, before PR merge

**Transitions:**
- ✅ Test fails (bug reproduced) → TESTS_READY
- ❌ Test passes → Investigate further (bug not reproduced correctly)

---

### 3. Fixing (→ FIXING)

**Command:** `/implement {task-id}`
**Agent:** developer

**Purpose:** Implement the minimal fix.

**Process:**
1. Make the smallest change that fixes the bug
2. Verify regression test passes
3. Verify existing tests still pass
4. Document what was changed

**Principles:**
- Minimal change (don't refactor while fixing)
- Fix the root cause (not symptoms)
- Don't introduce new features

**Output:** Code changes

**Transitions:**
- ✅ Regression test passes → FIXING
- ❌ Test still fails → Continue fixing

---

### 4. Code Review (FIXING → CODE_REVIEW)

**Standard workflow only.**

**Command:** `/review-code {task-id}`
**Agent:** reviewer

**Purpose:** Verify fix is correct and complete.

**Focus Areas:**
- Is this the right fix (not just a workaround)?
- Could this introduce regressions?
- Is the fix complete (all affected paths)?
- Are there similar bugs elsewhere?

**Transitions:**
- ✅ Approved → CODE_REVIEW
- ❌ Issues → FIXING (fix and re-review)

---

### 5. Verification (→ VERIFICATION)

**Command:** `/verify-fix {task-id}`
**Agent:** qa

**Purpose:** Confirm bug is fixed with fresh context.

**Process:**
1. Fresh context (hasn't seen the fix code)
2. Reproduce original bug scenario
3. Verify bug no longer occurs
4. Run full test suite
5. Check related functionality for regressions

**Checklist:**
- [ ] Original bug scenario no longer fails
- [ ] Regression test passes
- [ ] All existing tests pass
- [ ] Related functionality works
- [ ] No new issues introduced

**Output:** Verification report

**Transitions:**
- ✅ Verified → VERIFICATION
- ❌ Bug still exists → FIXING

---

### 6. PR Creation (→ DONE)

**Manual step** - Human creates PR and merges.

**For hotfixes:**
- Expedited review and merge
- Auto-create follow-up task for debt

---

## State Machines

### Simple Bugfix

```
DRAFT
  │ /implement (developer)
  ▼
FIXING
  │ /verify-fix (qa)
  ▼
VERIFICATION ─── (failed) ────────► FIXING
  │ (passed)
  ▼
PR_READY
  │ (manual PR)
  ▼
DONE
```

### Standard Bugfix

```
DRAFT
  │ /investigate (developer)
  ▼
INVESTIGATING
  │ /write-tests (developer)
  ▼
TESTS_READY
  │ /implement (developer)
  ▼
FIXING
  │ /review-code (reviewer)
  ▼
CODE_REVIEW ─── (issues) ─────────► FIXING
  │ (approved)
  │ /verify-fix (qa)
  ▼
VERIFICATION ─── (failed) ────────► FIXING
  │ (passed)
  ▼
PR_READY
  │ (manual PR)
  ▼
DONE
```

### Hotfix

```
DRAFT
  │ /investigate (developer) - QUICK
  ▼
INVESTIGATING
  │ /implement (developer)
  ▼
FIXING
  │ /write-tests (developer) - AFTER FIX
  ▼
TESTS_READY
  │ /verify-fix (qa)
  ▼
VERIFICATION ─── (failed) ────────► FIXING
  │ (passed)
  ▼
PR_READY
  │ (manual PR + create follow-up task)
  ▼
DONE
```

---

## Hotfix Debt Tracking

When a hotfix completes, automatically create a follow-up task:

**Task Title:** `Post-hotfix cleanup: {original-task-id}`

**Labels:** `hotfix-debt`, `high`

**Checklist:**
- [ ] Add regression test (if skipped for true emergency)
- [ ] Document root cause analysis in KB (if non-obvious)
- [ ] Evaluate if KB troubleshooting entry needed
- [ ] Review if code review would have caught anything
- [ ] Consider if similar bugs exist elsewhere

**Requirements:**
- Must complete within same sprint/week
- PM reviews `hotfix-debt` tasks weekly
- Cannot close without completing checklist

---

## Quick Reference

**Start a simple bugfix:**
```bash
/implement E06-T020         # Fix the bug
/verify-fix E06-T020        # QA verification
# Manual: create PR and merge
```

**Start a standard bugfix:**
```bash
/investigate E06-T021       # Find root cause
/write-tests E06-T021       # Write failing regression test
/implement E06-T021         # Fix (test should pass)
/review-code E06-T021       # Code review
/verify-fix E06-T021        # QA verification
# Manual: create PR and merge
```

**Start a hotfix:**
```bash
/investigate E06-T022       # Quick root cause
/implement E06-T022         # Fix immediately
/write-tests E06-T022       # Regression test after fix
/verify-fix E06-T022        # QA verification
# Manual: create PR, merge, follow-up task auto-created
```

---

## Label Reference

| Label | Effect |
|-------|--------|
| `bugfix:simple` | Skip investigation, direct to fix |
| `bugfix:hotfix` | Expedited workflow, test after fix, creates debt task |
| `hotfix-debt` | Applied to follow-up tasks from hotfixes |

---

## Why These Decisions

### Investigation Instead of Analysis

Bugs have a known problem (something is broken). We need to find **why**, not plan **how to build**. Investigation focuses on root cause diagnosis.

### Regression Test Always Required

Regression tests prevent the same bug from recurring. They're non-negotiable. Only the **timing** varies:
- Standard: Before fix (proves bug exists)
- Hotfix: After fix (still before merge)

### QA Does Verification

Fresh context catches issues the fixer might miss. The developer who fixed the bug has "fix blindness" - they know it works because they made it work. QA verifies without that bias.

### Hotfix Creates Debt Task

Hotfixes skip steps for speed. The debt task ensures we don't forget to:
- Complete documentation
- Review for systemic issues
- Learn from the incident

This is explicit, trackable debt rather than hidden shortcuts.

### Simple Bugfix Skips Investigation

For truly trivial bugs (typo, wrong color), investigation is wasteful. The fix is obvious. But we still verify with QA to catch any surprises.
