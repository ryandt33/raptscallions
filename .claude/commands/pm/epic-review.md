---
description: PM reviews completed epic and creates follow-up tasks
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
---

# Epic Review

PM agent reviews a completed epic, analyzes all code reviews and QA reports, and identifies outstanding issues that should be addressed as new tasks.

## Usage

```
/epic-review E01           # Review epic E01
/epic-review E01 --create  # Review and automatically create follow-up tasks
```

## Process

### 1. Verify Epic Completion

1. Read the epic file from `backlog/tasks/{EPIC-ID}/_epic.md`
2. Load all tasks in the epic
3. Verify all tasks are in DONE state
4. If not complete, show which tasks are blocking

### 2. Gather Review Documents

1. Read all review documents from `backlog/docs/reviews/{EPIC-ID}/`:
   - `*-code-review.md` - Code reviews from reviewer agent
   - `*-qa-report.md` - QA test reports
   - `*-ui-review.md` - UI/UX reviews from designer agent
   - `*-plan-review.md` - Architectural reviews
2. Extract all issues marked as:
   - "Must Fix" (blocking)
   - "Should Fix" (non-blocking)
   - "Suggestions" (optional)

### 3. Read All Task Files

1. Read each task file in the epic
2. Check the "Reviews" section for any noted concerns
3. Look at acceptance criteria to see if any were deferred
4. Check technical notes for any "TODO" or "FIXME" items

### 4. Analyze Outstanding Work

For each issue found, categorize by:

- **Severity**: Critical, High, Medium, Low
- **Type**: Bug, Technical Debt, Enhancement, Documentation, Testing
- **Effort**: Small (< 2h), Medium (2-4h), Large (4-8h)
- **Should Address Now**: Yes/No (based on severity and effort)

### 5. Generate Epic Review Report

Create a report at `backlog/docs/reviews/{EPIC-ID}/_epic-review.md`:

```markdown
# Epic Review: {EPIC-ID}

**Reviewer:** pm
**Date:** {ISO_DATE}
**Epic Status:** {COMPLETED/INCOMPLETE}

## Summary

[2-3 sentence summary of the epic's completion and overall quality]

## Epic Goals Achievement

- [x] Goal 1 - Fully achieved
- [x] Goal 2 - Fully achieved
- [ ] Goal 3 - Partially achieved (see issues below)

## Tasks Completed

| Task ID | Title | Status |
|---------|-------|--------|
| E01-T001 | Task title | ✅ DONE |
| E01-T002 | Task title | ✅ DONE |

## Outstanding Issues

### Critical (Must Address)

1. **{Issue Title}** (from {TASK-ID} {review-type})
   - Severity: Critical
   - Type: Bug
   - Description: [Issue description]
   - Recommendation: Create new task in {EPIC-ID} or next epic
   - Estimated Effort: Medium

### High Priority (Should Address)

### Medium Priority (Nice to Have)

### Low Priority (Suggestions)

## Recommendations

### Immediate Actions Required

- [ ] Create task for {issue}
- [ ] Update documentation for {issue}

### Technical Debt to Track

- Item 1
- Item 2

### Lessons Learned

[What went well, what could be improved for future epics]

## Proposed Follow-up Tasks

{If --create flag used, list of tasks that will be created}

| Task ID | Title | Priority | Addresses |
|---------|-------|----------|-----------|
| E01-T007 | Fix issue X | high | Critical issue #1 |
| E01-T008 | Refactor Y | medium | Technical debt |

---

**Next Steps:**

- [ ] Review this report
- [ ] Approve follow-up task creation (if not using --create)
- [ ] Mark epic as fully complete after follow-ups addressed
```

### 6. Create Follow-up Tasks (if --create flag)

For each "Critical" and "High Priority" issue:

1. Create a new task file in `backlog/tasks/{EPIC-ID}/{TASK-ID}.md`
2. Set priority based on severity
3. Set `depends_on: []` (no dependencies unless specified)
4. Link back to the original review document
5. Update epic's `_epic.md` to include new tasks

## Task Creation Guidelines

### When to Create a Task

**Create a task if:**
- Issue is marked "Must Fix" or "Should Fix" in any review
- Issue relates to correctness, security, or data integrity
- Issue is technical debt that will block future work
- Issue has medium or high effort and can't be fixed immediately

**Don't create a task if:**
- Issue is purely cosmetic with no user impact
- Suggestion is speculative or future-looking
- Issue can be fixed in < 30 minutes (just fix it)
- Issue is about preferences without clear benefit

### Task Template

```markdown
---
id: "{EPIC-ID}-T00X"
title: "{Concise title from issue}"
status: "todo"
priority: "critical" | "high" | "medium"
labels:
  - follow-up
  - {type-label}
assignee: ""

workflow_state: "DRAFT"
epic: "{EPIC-ID}"
depends_on: []
blocks: []
breakpoint: false
assigned_agent: ""

created_at: "{ISO_DATE}"
updated_at: "{ISO_DATE}"
started_at: ""
completed_at: ""

spec_file: ""
test_files: []
code_files: []
pr_url: ""
---

# {TASK-ID}: {Title}

## Description

{Issue description from review, 2-3 sentences}

This issue was identified during the epic review of {EPIC-ID} in the {review type} for {TASK-ID}.

## Acceptance Criteria

- [ ] AC1: {Specific, testable criterion based on issue}
- [ ] AC2: {Specific, testable criterion}

## Technical Notes

**Original Issue:** See `backlog/docs/reviews/{EPIC-ID}/{TASK-ID}-{review-type}.md`

**Context:** {Additional context from the review}

**Suggested Approach:** {If the review suggested a solution}

## History

| Date | State | Agent | Notes |
|------|-------|-------|-------|
| {DATE} | DRAFT | pm | Created from epic review |
```

## Output Example

```
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

CRITICAL (2):
  1. Database type not exported (E01-T003 code review)
  2. Missing graceful shutdown (E01-T003 code review)

HIGH (1):
  3. Connection pooling hardcoded values (E01-T003 code review)

MEDIUM (0)
LOW (3)

📝 Report written to: backlog/docs/reviews/E01/_epic-review.md

🎯 Recommendations:

MUST CREATE TASKS:
  - E01-T007: Export Database type for consumers
  - E01-T008: Add graceful database shutdown

SHOULD CREATE TASKS:
  - E01-T009: Make connection pool configurable

Run with --create to automatically create these tasks.
```

## Arguments

- `EPIC_ID` (required) - The epic to review (e.g., E01)
- `--create` - Automatically create follow-up tasks for critical/high issues
- `--threshold {critical|high|medium|low}` - Create tasks for issues at or above this threshold (default: high)

## Integration with Orchestrator

This command should be called automatically by the orchestrator when:
- All tasks in an epic reach DONE state
- Before transitioning to the next epic
- In continuous mode, before creating the next epic

The orchestrator workflow:
1. All tasks in epic complete → DONE
2. Call `/epic-review {EPIC-ID} --create --threshold high`
3. If follow-up tasks created → Add them to backlog
4. If no critical issues → Epic fully complete
5. Continue to next epic (if continuous mode)

## PM Agent Instructions

When running this command, you are reviewing the completed work as a Product Manager:

1. **Be thorough**: Read every review document completely
2. **Be pragmatic**: Not every suggestion needs a task. Focus on correctness, maintainability, and blocking issues
3. **Be specific**: When creating tasks, be as specific as the original review. Include file paths, line numbers, exact issues
4. **Be helpful**: Your review should make it clear what needs to be done and why
5. **Consider scope**: Some issues might belong in a future epic, not as follow-ups to this one
6. **Celebrate wins**: Note what went well in the epic. This helps the team learn.
7. **Track patterns**: If the same issue appears across multiple reviews, note it as a lesson learned

## Notes

- This command is PM-only, using the PM agent skills
- Reviews are advisory - the PM makes final call on what becomes a task
- Epic review report is version controlled and becomes part of the project history
- Follow-up tasks become part of the same epic, extending it
- If many follow-ups are needed, consider if the epic truly met its goals
