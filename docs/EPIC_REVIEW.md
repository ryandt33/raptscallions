# Epic Review Process

This document describes the epic review process, which is automatically triggered when all tasks in an epic are completed.

## Overview

When all tasks in an epic reach the `DONE` state, the PM agent conducts a comprehensive review of all completed work, analyzes outstanding issues from code reviews and QA reports, and creates follow-up tasks for anything that should be addressed.

## Process Flow

### 1. Automatic Trigger (Orchestrator)

The orchestrator automatically runs an epic review when:
- All tasks in the current epic are in `DONE` state
- Running in auto mode (`pnpm workflow:run --auto`)
- Running in continuous mode (`pnpm workflow:run --continuous`)

```typescript
// Automatically triggered in orchestrator.ts
if (allDone && tasks.length > 0) {
  await runClaudeCode("epic-review", `${epicId} --create --threshold high`, false);
}
```

### 2. Manual Trigger

You can also run an epic review manually:

```bash
# Review an epic (report only)
claude -p "/epic-review E01"

# Review and automatically create follow-up tasks
claude -p "/epic-review E01 --create"

# Create tasks for all issues at or above medium threshold
claude -p "/epic-review E01 --create --threshold medium"
```

### 3. PM Agent Analysis

The PM agent performs a thorough review:

1. **Verifies completion**: Checks all tasks are in `DONE` state
2. **Gathers reviews**: Reads all review documents:
   - Code reviews (`*-code-review.md`)
   - QA reports (`*-qa-report.md`)
   - UI reviews (`*-ui-review.md`)
   - Architecture reviews (`*-plan-review.md`)
3. **Extracts issues**: Identifies all unresolved issues marked as:
   - "Must Fix" (blocking)
   - "Should Fix" (non-blocking)
   - "Suggestions" (optional)
4. **Categorizes**: Groups by severity (Critical, High, Medium, Low)
5. **Creates tasks**: Generates new task files for issues that meet the threshold
6. **Documents**: Writes comprehensive epic review report

## Epic Review Report

The PM agent creates a report at `backlog/docs/reviews/{EPIC-ID}/_epic-review.md`:

```markdown
# Epic Review: E01

**Reviewer:** pm
**Date:** 2026-01-12
**Epic Status:** COMPLETED

## Summary

All 5 tasks completed successfully. The database infrastructure is solid with
comprehensive tests and well-documented code. A few minor improvements were
identified that will enhance maintainability.

## Epic Goals Achievement

- [x] Monorepo structure established
- [x] Core packages configured
- [x] Database layer with Drizzle ORM
- [x] Development tooling set up
- [x] CI/CD pipeline basic setup

## Tasks Completed

| Task ID | Title | Status |
|---------|-------|--------|
| E01-T001 | Initialize monorepo | ✅ DONE |
| E01-T002 | Setup pnpm workspace | ✅ DONE |
| E01-T003 | Create db package | ✅ DONE |
| E01-T004 | Configure TypeScript | ✅ DONE |
| E01-T005 | Basic CI workflow | ✅ DONE |

## Outstanding Issues

### Critical (Must Address)

None identified.

### High Priority (Should Address)

1. **Export Database type for consumers** (from E01-T003 code review)
   - Severity: High
   - Type: Type Definition
   - Description: The `Database` type is defined but not exported from package
   - Recommendation: Create E01-T006 to export the type
   - Estimated Effort: Small (< 1h)

2. **Add graceful database shutdown** (from E01-T003 code review)
   - Severity: High
   - Type: Enhancement
   - Description: No cleanup function for tests and app shutdown
   - Recommendation: Create E01-T007 for shutdown function
   - Estimated Effort: Small (2h)

### Medium Priority (Nice to Have)

3. **Make connection pool configurable** (from E01-T003 code review)
   - Severity: Medium
   - Type: Enhancement
   - Description: Pool settings are hardcoded, env vars defined but not used
   - Recommendation: Consider for next epic or as follow-up
   - Estimated Effort: Small (2h)

### Low Priority (Suggestions)

- Add more comprehensive logging around connection events
- Consider adding connection retry logic
- Document connection pooling strategy

## Recommendations

### Immediate Actions Required

- [x] Create E01-T006: Export Database type
- [x] Create E01-T007: Add graceful shutdown function

### Technical Debt to Track

- Connection pooling configuration flexibility
- Connection monitoring and health checks

### Lessons Learned

**What Went Well:**
- All agents followed conventions consistently
- Test coverage was excellent (25 tests, all passing)
- Documentation in code was thorough with JSDoc
- Workflow moved smoothly through all stages

**Areas for Improvement:**
- Some minor type exports were missed initially
- Could benefit from checklist for "exportable types" in code review
- Connection lifecycle management could be more explicit

## Proposed Follow-up Tasks

| Task ID | Title | Priority | Addresses |
|---------|-------|----------|-----------|
| E01-T006 | Export Database type | high | High priority issue #1 |
| E01-T007 | Graceful database shutdown | high | High priority issue #2 |

---

**Next Steps:**

- [x] Review this report
- [x] Follow-up tasks created (--create flag used)
- [ ] Process follow-up tasks before starting E02
```

## Follow-up Task Creation

When `--create` flag is used, the PM agent automatically creates task files.

### Task Creation Criteria

**Create a task if:**
- Issue is marked "Must Fix" or "Should Fix" in any review
- Issue relates to correctness, security, or data integrity
- Issue is technical debt that will block future work
- Issue requires medium or high effort (can't be fixed in < 30 minutes)

**Don't create a task if:**
- Issue is purely cosmetic with no user impact
- Suggestion is speculative or future-looking
- Issue can be fixed in < 30 minutes
- Issue is about preferences without clear benefit

### Threshold Levels

The `--threshold` flag controls what gets created:

- `--threshold critical`: Only critical "Must Fix" issues
- `--threshold high` (default): Critical + high priority issues
- `--threshold medium`: Critical + high + medium priority issues
- `--threshold low`: All issues including suggestions

### Follow-up Task Format

Follow-up tasks are created in the same epic folder:

```markdown
---
id: "E01-T006"
title: "Export Database type from db package"
status: "todo"
priority: "high"
labels:
  - follow-up
  - backend
  - database
assignee: ""

workflow_state: "DRAFT"
epic: "E01"
depends_on: []
blocks: []
breakpoint: false
assigned_agent: ""

created_at: "2026-01-12T10:30:00Z"
updated_at: "2026-01-12T10:30:00Z"
started_at: ""
completed_at: ""

spec_file: ""
test_files: []
code_files: []
pr_url: ""
---

# E01-T006: Export Database type from db package

## Description

The `Database` type is defined in `packages/db/src/client.ts` but is not
re-exported from the package's main entry point. This prevents consumers from
typing function parameters that accept the db instance.

This issue was identified during the epic review of E01 in the code review for
E01-T003.

## Acceptance Criteria

- [ ] AC1: Add `export type { Database } from "./client.js";` to `packages/db/src/index.ts`
- [ ] AC2: Verify type is importable: `import type { Database } from "@raptscallions/db"`
- [ ] AC3: Add test verifying type export

## Technical Notes

**Original Issue:** See `backlog/docs/reviews/E01/E01-T003-code-review.md` line 63-64

**Context:** The Database type is used by consumers who want to type functions
that accept the db instance as a parameter, for example in service classes or
middleware.

**Suggested Approach:** Simple addition to the barrel export in index.ts

## History

| Date | State | Agent | Notes |
|------|-------|-------|-------|
| 2026-01-12 | DRAFT | pm | Created from E01 epic review |
```

## Integration with Orchestrator

### Auto Mode

In auto mode, the orchestrator:
1. Processes all ready tasks
2. When epic completes, runs epic review
3. If follow-up tasks created, processes them
4. Stops after all tasks (including follow-ups) complete

```bash
pnpm workflow:run --auto
```

### Continuous Mode

In continuous mode, the orchestrator:
1. Processes all ready tasks
2. When epic completes, runs epic review
3. If follow-up tasks created, processes them
4. Creates next epic via PM agent
5. Continues with new epic tasks

```bash
pnpm workflow:run --continuous
```

### Workflow Sequence

```
Task E01-T005 → DONE
↓
Check: All E01 tasks DONE? → Yes
↓
Run: /epic-review E01 --create --threshold high
↓
PM Agent:
  - Reads all reviews
  - Analyzes issues
  - Creates E01-T006, E01-T007
  - Writes _epic-review.md
↓
Orchestrator:
  - Reloads tasks
  - Finds E01-T006, E01-T007 ready
  - Processes follow-up tasks
↓
All follow-ups complete
↓
[If continuous mode]
  - Run: /roadmap plan-next
  - Create next epic
  - Continue processing
[Else]
  - Stop, await user input
```

## Benefits

### Quality Assurance

- Ensures no issues are lost or forgotten
- Creates accountability trail for all identified problems
- Prevents technical debt from accumulating silently

### Workflow Automation

- Fully automated in continuous mode
- No manual tracking of review issues needed
- Follow-up tasks flow through same workflow as original tasks

### Documentation

- Comprehensive record of epic completion
- Lessons learned captured for future reference
- Issue provenance tracked back to original reviews

### Team Coordination

- Clear visibility into what was done and what remains
- PM review provides final sanity check before moving on
- Follow-up tasks are properly prioritized and tracked

## Best Practices

### For PM Agent

1. **Be thorough**: Read every review completely
2. **Be pragmatic**: Not every suggestion needs a task
3. **Be specific**: Include file paths, line numbers, exact issues
4. **Be helpful**: Make it clear what needs doing and why
5. **Consider scope**: Some issues might belong in future epics
6. **Celebrate wins**: Note what went well

### For Review Authors

1. **Be clear about severity**: Mark issues as "Must Fix", "Should Fix", or "Suggestion"
2. **Be specific**: Include file paths and line numbers
3. **Be constructive**: Suggest approaches where possible
4. **Be consistent**: Use the standard review format

### For Task Authors

1. **Address blocking issues**: Fix "Must Fix" items before completion
2. **Document deferred work**: Note "Should Fix" items in task body if not addressed
3. **Update as you go**: Mark acceptance criteria that were modified or deferred

## Example Output

When the orchestrator runs epic review in continuous mode:

```
✅ All tasks in current epic completed!

[EPIC REVIEW] Running epic review for E01...

📊 Epic Review: E01

✅ All 5 tasks completed

📋 Review Documents Analyzed:
  - E01-T001-code-review.md
  - E01-T001-qa-report.md
  - E01-T002-code-review.md
  - E01-T002-qa-report.md
  - E01-T003-code-review.md
  - E01-T003-qa-report.md

⚠️  Outstanding Issues Found:

HIGH (2):
  1. Database type not exported (E01-T003 code review)
  2. Missing graceful shutdown (E01-T003 code review)

MEDIUM (1):
  3. Connection pooling hardcoded (E01-T003 code review)

📝 Report written to: backlog/docs/reviews/E01/_epic-review.md

🎯 Follow-up Tasks Created:
  - E01-T006: Export Database type (high)
  - E01-T007: Add graceful shutdown (high)

✅ Epic E01 review complete. Follow-up tasks created.
ℹ Found 2 follow-up task(s) from epic review. Processing...

[AUTO] Picking next task: E01-T006 (high)
...
```

## Configuration

The epic review behavior can be configured in the orchestrator:

- **Threshold**: Default is `high` (only critical and high priority issues)
- **Auto-create**: Default is `--create` in auto/continuous mode
- **Break on issues**: Can add breakpoint if critical issues found (future enhancement)

## Files Generated

For each epic review:

```
backlog/
├── docs/
│   └── reviews/
│       └── {EPIC-ID}/
│           ├── {TASK-ID}-code-review.md     # From reviewer agent
│           ├── {TASK-ID}-qa-report.md       # From qa agent
│           ├── {TASK-ID}-ui-review.md       # From designer agent
│           └── _epic-review.md              # From PM agent ⭐ NEW
└── tasks/
    └── {EPIC-ID}/
        ├── _epic.md                          # Updated with follow-up tasks
        ├── {TASK-ID}.md                      # Original tasks
        └── {FOLLOW-UP-TASK-ID}.md           # Follow-up tasks ⭐ NEW
```

## Future Enhancements

Potential improvements to the epic review process:

1. **Metrics tracking**: Track issues-per-epic over time
2. **Pattern detection**: Identify recurring issue types across epics
3. **Review quality scoring**: Rate completeness of reviews
4. **Auto-prioritization**: ML-based priority assignment for follow-ups
5. **Blocking thresholds**: Auto-stop if too many critical issues found
6. **Integration with roadmap**: Feed lessons learned into next epic planning
