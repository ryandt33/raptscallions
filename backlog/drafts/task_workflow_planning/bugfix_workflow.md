# Bugfix Category: Workflow Analysis

> **Status:** Draft
> **Created:** 2026-01-16
> **Purpose:** Define expedited workflow for bug fixes

## What Bugfix Tasks Involve

Bug fixes address defects in existing functionality:

| Type | Examples | Urgency |
|------|----------|---------|
| Critical bugs | Data loss, security vulnerabilities, system down | Immediate |
| Functional bugs | Feature doesn't work as expected | High |
| Edge case bugs | Works normally, fails in specific scenarios | Medium |
| Cosmetic bugs | UI glitches, formatting issues | Low |

**Key insight:** Bug fixes need **expedited workflows** because:
1. Users are impacted NOW
2. Root cause is often known or quickly identifiable
3. Fix scope is usually narrow
4. Extensive planning delays resolution

---

## Current Workflow Observations

Bug fixes currently use the same workflow as new features:

| Problem | Impact |
|---------|--------|
| Full analysis for obvious fix | Delays resolution |
| Plan review for single-line change | Unnecessary friction |
| Full TDD for regression test | Sometimes overkill |
| Full QA for minor fix | Adds latency |

**Observation:** Many bugs have a clear root cause and narrow fix scope. The full development workflow creates unnecessary delay.

---

## The 7 Benefits Matrix: Bugfix Workflow

| Benefit | Applicability | Notes |
|---------|---------------|-------|
| Context Insulation | ⚠️ Less critical | Fix is targeted, not creative |
| Natural Friction | ✅ Still needed | Prevent regression, verify fix |
| Artifact Persistence | ✅ Needed | Audit trail for what was fixed |
| Specialization Focus | ⚠️ Less critical | Same person can diagnose and fix |
| Error Recovery | ✅ Needed | Can revert bad fix |
| Parallelization | ❌ Not needed | Sequential by nature |
| Cost Management | ⚠️ Less relevant | Speed matters more than cost |

### Analysis

**Context Insulation:** Less critical for bug fixes. The developer diagnosing the bug has the context to fix it. Fresh eyes less valuable than continuity.

**Natural Friction:** Still important. Must verify the fix actually works and doesn't introduce regressions. But can be lighter than new feature development.

**Artifact Persistence:** Important for post-mortems and preventing recurrence. Bug report, root cause, and fix should be documented.

**Specialization Focus:** Less critical. The developer who finds the bug often has the best context to fix it efficiently.

**Error Recovery:** Critical. A bad fix can make things worse. Need ability to quickly revert.

**Parallelization:** Not applicable. Bug fixes are inherently sequential: diagnose → fix → verify.

**Cost Management:** Secondary concern. Speed of resolution matters more than model costs for bugs affecting users.

---

## Proposed Bugfix Workflows

### Hotfix (`bugfix:hotfix`)

For critical bugs requiring immediate attention:

```
DRAFT → INVESTIGATING → FIXING → VERIFICATION → PR_READY → DONE
```

**Characteristics:**
- Skip analysis (root cause investigation replaces it)
- Skip plan review (fix is urgent)
- Minimal TDD (regression test only)
- Quick verification (does it work now?)
- Fast PR turnaround

**When to use:**
- Production is down
- Data loss risk
- Security vulnerability
- Major user impact

### Standard Bugfix (default)

For normal bugs with moderate urgency:

```
DRAFT → INVESTIGATING → TESTS_READY → FIXING → CODE_REVIEW → VERIFICATION → PR_READY → DONE
```

**Characteristics:**
- Investigation phase (diagnose root cause)
- Regression test written first (TDD for the fix)
- Implementation focused on fix
- Code review (prevent regression)
- Verification with fresh context

**When to use:**
- Feature doesn't work correctly
- Edge case failures
- Performance issues
- Non-critical defects

---

## Phase Details

### 1. Investigation (DRAFT → INVESTIGATING)

**Purpose:** Diagnose root cause before attempting fix.

**Process:**
1. Reproduce the bug
2. Identify root cause
3. Determine fix scope
4. Document findings

**Output:** Root cause analysis in task file

**Key Questions:**
- Can we reproduce it?
- What's the root cause?
- What's the minimal fix?
- What could regress?

### 2. Regression Test (INVESTIGATING → TESTS_READY)

**Purpose:** Write a test that fails now, passes after fix.

**Process:**
1. Write test that reproduces the bug
2. Verify test fails
3. Document expected behavior

**Output:** Failing test file

**This is TDD for bugs:** The test proves the bug exists and will prove when it's fixed.

### 3. Fixing (TESTS_READY → FIXING)

**Purpose:** Implement the minimal fix.

**Process:**
1. Make the smallest change that fixes the bug
2. Verify regression test passes
3. Verify existing tests still pass
4. Document what was changed

**Output:** Code changes

### 4. Code Review (FIXING → CODE_REVIEW)

**For Standard bugfix only.**

**Purpose:** Verify fix is correct and doesn't introduce new issues.

**Focus:**
- Is this the right fix (not just a workaround)?
- Could this introduce regressions?
- Is the fix complete (all affected paths)?

### 5. Verification (CODE_REVIEW → VERIFICATION)

**Purpose:** Confirm bug is fixed with fresh context.

**Process:**
1. Fresh context (QA agent or different developer)
2. Reproduce original bug scenario
3. Verify it no longer occurs
4. Run full test suite
5. Check related functionality

**Output:** Verification report

### 6. PR Creation (VERIFICATION → DONE)

**Manual step** - Human creates PR and merges.

For hotfixes: Expedited review and merge.

---

## Comparison: Hotfix vs Standard Bugfix

| Phase | Hotfix | Standard |
|-------|--------|----------|
| Investigation | ✅ Yes (quick) | ✅ Yes (thorough) |
| Plan Review | ❌ Skip | ❌ Skip |
| Regression Test | ⚠️ Optional | ✅ Yes |
| Fix | ✅ Yes | ✅ Yes |
| Code Review | ❌ Skip | ✅ Yes |
| Verification | ✅ Yes (quick) | ✅ Yes (thorough) |
| Documentation | ⚠️ After merge | ✅ Before merge |
| **Total Phases** | 4 | 6 |

---

## State Machines

### Hotfix

```
DRAFT
  │ (investigate root cause)
  ▼
INVESTIGATING
  │ (implement fix)
  ▼
FIXING
  │ (verify fix works)
  ▼
VERIFICATION ─── (failed) ────────► FIXING
  │ (passed)
  ▼
PR_READY
  │ (expedited PR)
  ▼
DONE
  │ (post-merge)
  ▼
(document root cause and fix)
```

### Standard Bugfix

```
DRAFT
  │ (investigate root cause)
  ▼
INVESTIGATING
  │ (write regression test)
  ▼
TESTS_READY
  │ (implement fix)
  ▼
FIXING
  │ (code review)
  ▼
CODE_REVIEW ─── (issues) ─────────► FIXING
  │ (approved)
  │ (verify with fresh context)
  ▼
VERIFICATION ─── (failed) ────────► FIXING
  │ (passed)
  ▼
PR_READY
  │ (normal PR process)
  ▼
DONE
```

---

## Documentation for Bug Fixes

### During Fix (Standard)

Document in task file:
- Bug description and reproduction steps
- Root cause analysis
- Fix description
- Testing approach

### After Fix (Hotfix)

Document after merge:
- Root cause analysis (why did this happen?)
- Fix description (what was changed?)
- Prevention (how do we prevent recurrence?)

### When to Create KB Entry

Create troubleshooting doc if:
- Bug could recur in similar situations
- Root cause was non-obvious
- Fix technique is reusable
- Multiple people spent time on diagnosis

---

## Comparison with Other Workflows

| Phase | Development | Schema | Infrastructure | Documentation | Bugfix |
|-------|-------------|--------|----------------|---------------|--------|
| Analysis | ✅ Full | ✅ Schema | ✅/❌ | ❌ Outline | ❌ Investigation |
| Plan Review | ✅ Yes | ✅ Tech debt | ✅/❌ | ✅ Content | ❌ No |
| TDD | ✅ Yes | ❌ No | ✅/❌ | ❌ No | ✅ Regression test |
| Implementation | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Writing | ✅ Fixing |
| Code Review | ✅ Yes | ❌ Migration | ✅/❌ | ❌ No | ✅/❌ |
| QA | ✅ Yes | ✅ Integration | ✅/❌ | ✅ Technical | ✅ Verification |
| Docs | ✅ Yes | ✅ Yes | ✅ Yes | N/A | ⚠️ After/during |

---

## Commands for Bugfix

| Command | Agent | Purpose |
|---------|-------|---------|
| `/investigate` | developer | Diagnose root cause |
| `/write-tests` | developer | Write regression test |
| `/implement` | developer | Implement fix |
| `/review-code` | reviewer | Code review (standard only) |
| `/verify-fix` | qa | Verify bug is fixed |

**Note:** `/investigate` and `/verify-fix` may be new commands or modes of existing commands.

---

## Decisions (Resolved)

### 1. Regression Test Timing

**Decision:** Always write regression test, timing varies by workflow.

| Workflow | When to Write Test |
|----------|-------------------|
| Standard | Before fix (TDD style) |
| Hotfix | After fix, before PR merge |
| True emergency | After merge via follow-up task |

**Rationale:** Regression tests are non-negotiable for preventing recurrence. Only timing flexibility for speed.

### 2. Verification Agent

**Decision:** QA agent performs verification in all workflows.

**Rationale:** Fresh context catches issues the fixer might miss. QA agent already has verification expertise.

### 3. Hotfix Technical Debt Tracking

**Decision:** Auto-create follow-up task with `hotfix-debt` label.

**Follow-up task includes:**
- [ ] Add regression test (if skipped for emergency)
- [ ] Document root cause analysis
- [ ] Evaluate if KB troubleshooting entry needed
- [ ] Review if code review would have caught anything

**Requirements:**
- `hotfix-debt` label for easy tracking
- High priority - must complete within same sprint/week
- PM reviews hotfix-debt tasks weekly

**Rationale:** Explicit, trackable debt. Ensures learning from incidents without blocking urgent fixes.

### 4. Simple Bugfix Workflow

**Decision:** Add `bugfix:simple` workflow for trivial, obvious fixes.

```
DRAFT → FIXING → VERIFICATION → PR_READY → DONE
```

**Criteria for `bugfix:simple`:**
- Fix is obvious (no investigation needed)
- Low risk of regression
- No complex logic involved
- Examples: typo in UI, wrong color, misaligned element, incorrect label

**Difference from hotfix:**
- `bugfix:hotfix` = urgent, skip steps for speed, creates debt
- `bugfix:simple` = not urgent, but trivial enough to skip investigation

---

## Open Questions (None Remaining)

All open questions have been resolved. See Decisions section above.

---

## Summary

| Current Problem | Proposed Solution |
|-----------------|-------------------|
| Full workflow for urgent fixes | Hotfix workflow with fewer phases |
| Analysis for known root cause | Investigation phase replaces analysis |
| Full TDD for single fix | Regression test only |
| Same urgency for all bugs | Hotfix vs Standard based on severity |

**Key insight:** Bug fixes benefit from **expedited workflows** that prioritize speed while still ensuring the fix is correct and doesn't introduce regressions.
