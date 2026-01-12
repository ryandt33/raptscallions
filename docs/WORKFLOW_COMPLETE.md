# Complete Development Workflow

This document describes the complete end-to-end workflow for Raptscallions development, from epic planning to completion, including the new epic review process.

## Overview

The Raptscallions workflow is fully automated using Claude Code agents and a TypeScript orchestrator. Tasks flow through defined states with agent-based reviews and quality gates.

## Workflow Phases

### Phase 1: Epic Planning

**Trigger:** New feature or phase needs to be broken down

**Command:** `/plan` or `/roadmap plan-next`

**Process:**
1. PM agent reads the goal/feature description
2. Reviews architectural docs and existing epics
3. Breaks down into logical epics (1-2 weeks each)
4. Breaks epics into tasks (2-8 hours each)
5. Defines dependencies between tasks
6. Creates task files in `backlog/tasks/{EPIC-ID}/`

**Outputs:**
- Epic file: `backlog/tasks/{EPIC-ID}/_epic.md`
- Task files: `backlog/tasks/{EPIC-ID}/{TASK-ID}.md`
- Dependencies: Updated in `backlog/docs/.workflow/dependencies.yaml`

### Phase 2: Task Analysis

**State Transition:** `DRAFT → ANALYZING → ANALYZED`

**Command:** `/analyze {task-id}`

**Process:**
1. Analyst agent reads task description and acceptance criteria
2. Explores codebase for context and existing patterns
3. Identifies files to create/modify
4. Designs implementation approach
5. Writes detailed spec in `backlog/docs/specs/{EPIC-ID}/{TASK-ID}.md`

**Outputs:**
- Implementation spec with technical details
- File list (what to create/modify)
- Step-by-step implementation plan

### Phase 3: UX Review

**State Transition:** `ANALYZED → UX_REVIEW → PLAN_REVIEW`

**Command:** `/review-ux {task-id}`

**Process:**
1. Designer agent reviews spec from UX perspective
2. Checks for usability and accessibility
3. Validates UI consistency
4. Can approve or reject with feedback

**Outputs:**
- UX review in task's "Reviews" section
- Verdict: APPROVED or REJECTED
- If rejected: Returns to ANALYZING

### Phase 4: Architecture Review

**State Transition:** `PLAN_REVIEW → APPROVED` (or back to `ANALYZING`)

**Command:** `/review-plan {task-id}`

**Process:**
1. Architect agent reviews implementation plan
2. Validates against ARCHITECTURE.md and CONVENTIONS.md
3. Checks for architectural consistency
4. Verifies patterns and best practices
5. Can approve or reject with feedback

**Outputs:**
- Architecture review in task's "Reviews" section
- Verdict: APPROVED or REJECTED
- If rejected: Returns to ANALYZING

### Phase 5: Test Writing (TDD Red)

**State Transition:** `APPROVED → WRITING_TESTS → TESTS_READY`

**Command:** `/write-tests {task-id}`

**Process:**
1. Developer agent reads approved spec
2. Writes comprehensive tests (AAA pattern)
3. Tests fail initially (red phase)
4. Covers all acceptance criteria

**Outputs:**
- Test files in `{package}/__tests__/`
- Tests added to task frontmatter

### Phase 6: Implementation (TDD Green)

**State Transition:** `TESTS_READY → IMPLEMENTING → IMPLEMENTED`

**Command:** `/implement {task-id}`

**Process:**
1. Developer agent **validates tests first** - checks if tests use real library APIs
2. **If tests have API mismatches** → Sets `TESTS_REVISION_NEEDED` and rejects (see below)
3. **If tests are correct** → Implements code to make tests pass
4. Follows conventions and patterns
5. Refactors for quality
6. Runs tests to verify

**Outputs:**
- Implementation files
- All tests passing
- Code files added to task frontmatter

#### Test Rejection Path (TESTS_REVISION_NEEDED)

**Critical Quality Gate:** If developer discovers tests use **non-existent library APIs**, they reject the tests:

**State Transition:** `IMPLEMENTING → TESTS_REVISION_NEEDED → TESTS_READY`

**What triggers rejection:**
- Tests expect methods/properties that don't exist in library
- Tests use APIs documented differently than library provides
- Implementation would require "testability hacks" to satisfy tests

**Rejection process:**
1. Developer **stops without implementing**
2. Sets `workflow_state: TESTS_REVISION_NEEDED`
3. Documents mismatch in History and Reviews section
4. Orchestrator calls `/write-tests` again
5. Tests are rewritten to use actual library APIs
6. Task returns to `TESTS_READY` for re-implementation

**Example:**
```
Tests expect: expect(users._).toBeDefined()
Reality: Drizzle tables don't have `_` property
→ Developer rejects: TESTS_REVISION_NEEDED
→ Tests rewritten: expect(users.id).toBeDefined()
→ Implementation proceeds cleanly
```

See [TEST_REVISION_WORKFLOW.md](TEST_REVISION_WORKFLOW.md) for detailed documentation.

This prevents "testability hacks" and keeps implementation clean.

### Phase 7: UI Review

**State Transition:** `IMPLEMENTED → UI_REVIEW → CODE_REVIEW` (or back to `IMPLEMENTING`)

**Command:** `/review-ui {task-id}`

**Process:**
1. Designer agent reviews implemented UI
2. Checks design consistency
3. Validates accessibility
4. Can approve or reject with feedback

**Outputs:**
- UI review report: `backlog/docs/reviews/{EPIC-ID}/{TASK-ID}-ui-review.md`
- Verdict: APPROVED or REJECTED
- If rejected: Returns to IMPLEMENTING

### Phase 8: Code Review

**State Transition:** `CODE_REVIEW → QA_REVIEW` (or back to `IMPLEMENTING`)

**Command:** `/review-code {task-id}`

**Process:**
1. Reviewer agent (fresh context) reads all code
2. Checks TypeScript strict mode
3. Validates conventions and patterns
4. Identifies issues by severity (Must Fix, Should Fix, Suggestions)
5. Can approve or reject with feedback

**Outputs:**
- Code review report: `backlog/docs/reviews/{EPIC-ID}/{TASK-ID}-code-review.md`
- Verdict: APPROVED or REJECTED
- If rejected: Returns to IMPLEMENTING

### Phase 9: QA Validation

**State Transition:** `QA_REVIEW → DOCS_UPDATE` (or back to `IMPLEMENTING`)

**Command:** `/qa {task-id}`

**Process:**
1. QA agent validates against acceptance criteria
2. Runs all tests
3. Tries to break the implementation
4. Checks edge cases
5. Can approve or reject with feedback

**Outputs:**
- QA report: `backlog/docs/reviews/{EPIC-ID}/{TASK-ID}-qa-report.md`
- Verdict: APPROVED or REJECTED
- If rejected: Returns to IMPLEMENTING

### Phase 10: Documentation Update

**State Transition:** `DOCS_UPDATE → DONE`

**Command:** `/update-docs {task-id}`

**Process:**
1. Writer agent reviews implementation
2. Updates relevant documentation
3. Adds usage examples
4. Ensures consistency with code

**Outputs:**
- Updated documentation files
- Task marked as DONE

## Phase 11: Epic Review ⭐ NEW

**Trigger:** All tasks in epic reach `DONE` state

**Command:** `/epic-review {epic-id} --create --threshold high` (automatic in orchestrator)

**Process:**
1. PM agent verifies all tasks complete
2. Reads all review documents:
   - All code reviews (`*-code-review.md`)
   - All QA reports (`*-qa-report.md`)
   - All UI reviews (`*-ui-review.md`)
   - All plan reviews (`*-plan-review.md`)
3. Extracts outstanding issues:
   - "Must Fix" items
   - "Should Fix" items
   - "Suggestions"
4. Categorizes by severity (Critical, High, Medium, Low)
5. Creates follow-up tasks for issues meeting threshold
6. Writes comprehensive epic review report
7. Documents lessons learned

**Outputs:**
- Epic review report: `backlog/docs/reviews/{EPIC-ID}/_epic-review.md`
- Follow-up task files: `backlog/tasks/{EPIC-ID}/{TASK-ID}.md` (with `follow-up` label)
- Updated epic file with follow-up tasks listed

**Follow-up Task Creation Criteria:**

**Create if:**
- Marked "Must Fix" or "Should Fix" in any review
- Relates to correctness, security, or data integrity
- Technical debt that will block future work
- Medium or high effort (can't fix in < 30 min)

**Don't create if:**
- Purely cosmetic with no impact
- Speculative or future-looking
- Quick fix (< 30 min)
- Preference without clear benefit

**Threshold Levels:**
- `--threshold critical`: Only critical "Must Fix" issues
- `--threshold high` (default): Critical + high priority
- `--threshold medium`: Critical + high + medium
- `--threshold low`: All issues including suggestions

### Phase 12: Follow-up Processing

**Trigger:** Follow-up tasks created from epic review

**Process:**
1. Orchestrator reloads task list
2. Identifies new ready tasks (follow-ups)
3. Processes each follow-up through normal workflow
4. Continues until all follow-ups complete

**Note:** Follow-up tasks are part of the same epic and extend it.

### Phase 13: Next Epic Creation (Continuous Mode Only)

**Trigger:** Epic review complete, all follow-ups done, continuous mode active

**Command:** `/roadmap plan-next` (automatic in orchestrator)

**Process:**
1. PM agent reads roadmap
2. Identifies next unstarted epic
3. Creates tasks for next epic
4. Orchestrator begins processing new epic

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Epic Planning                           │
│  /plan → Creates Epic → Creates Tasks → DRAFT               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Task Workflow Loop                        │
│  (Repeats for each task in epic)                            │
│                                                              │
│  DRAFT                                                       │
│    ↓ /analyze                                               │
│  ANALYZING → ANALYZED                                       │
│    ↓ /review-ux                                             │
│  UX_REVIEW → PLAN_REVIEW (or back to ANALYZING)            │
│    ↓ /review-plan                                           │
│  APPROVED (or back to ANALYZING)                            │
│    ↓ /write-tests                                           │
│  WRITING_TESTS → TESTS_READY                                │
│    ↓ /implement                                             │
│  IMPLEMENTING → IMPLEMENTED                                 │
│    ↓ /review-ui                                             │
│  UI_REVIEW → CODE_REVIEW (or back to IMPLEMENTING)         │
│    ↓ /review-code                                           │
│  QA_REVIEW (or back to IMPLEMENTING)                        │
│    ↓ /qa                                                    │
│  DOCS_UPDATE (or back to IMPLEMENTING)                      │
│    ↓ /update-docs                                           │
│  DONE                                                        │
│                                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                    All tasks DONE?
                         │
                         ├─ No → Continue task loop
                         │
                         └─ Yes → Epic Review
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      Epic Review                             │
│  /epic-review {epic} --create --threshold high               │
│    ↓                                                         │
│  PM Agent:                                                   │
│  - Reads all review documents                               │
│  - Extracts unresolved issues                               │
│  - Creates follow-up tasks                                  │
│  - Writes epic review report                                │
│    ↓                                                         │
│  Follow-up tasks created?                                   │
│    ├─ Yes → Process follow-ups (return to task loop)       │
│    └─ No → Epic fully complete                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                    Continuous mode?
                         │
                         ├─ No → Stop (epic complete)
                         │
                         └─ Yes → Next Epic
                                    │
                                    ▼
                         /roadmap plan-next
                                    │
                                    ▼
                         Return to Task Workflow Loop
```

## Orchestrator Commands

### Single Task

```bash
# Run one task through complete workflow
pnpm workflow:run E01-T003
```

### Auto Mode

```bash
# Run all ready tasks in priority order
# Stops after epic complete + epic review + follow-ups
pnpm workflow:run --auto
```

### Continuous Mode

```bash
# Run all tasks + epic review + follow-ups + next epic
# Continues indefinitely until no more epics
pnpm workflow:run --continuous
```

### Task Board

```bash
# View all tasks by state
pnpm workflow:status

# View specific task details
pnpm workflow:status E01-T003
```

### Next Tasks

```bash
# Show all ready tasks
pnpm workflow:next
```

### Breakpoints

```bash
# Pause workflow at a task
pnpm workflow:breakpoint E01-T003 set

# Resume workflow
pnpm workflow:breakpoint E01-T003 clear
```

## Example Complete Run

```bash
# Start continuous mode
pnpm workflow:run --continuous

# Orchestrator output:
# ═══════════════════════════════════════════════════════════
#   Continuous Mode - Running All Ready Tasks
# ═══════════════════════════════════════════════════════════
#
# [AUTO] Picking next task: E01-T001 (critical)
# [RUNNING] E01-T001: analyze (analyst agent)
# [Claude Code runs /analyze E01-T001]
# ✓ E01-T001: DRAFT → ANALYZING → ANALYZED
#
# [RUNNING] E01-T001: review-ux (designer agent)
# [Claude Code runs /review-ux E01-T001]
# ✓ E01-T001: ANALYZED → UX_REVIEW → PLAN_REVIEW
#
# [RUNNING] E01-T001: review-plan (architect agent)
# [Claude Code runs /review-plan E01-T001]
# ✓ E01-T001: PLAN_REVIEW → APPROVED
#
# ... [continues through all states]
#
# ✓ E01-T001: DOCS_UPDATE → DONE
#
# [AUTO] Picking next task: E01-T002 (critical)
# ... [repeats for all tasks]
#
# ✅ All tasks in current epic completed!
#
# [EPIC REVIEW] Running epic review for E01...
# [Claude Code runs /epic-review E01 --create --threshold high]
#
# 📊 Epic Review: E01
# ✅ All 5 tasks completed
# ⚠️  Outstanding Issues Found:
#   HIGH (2): Database type export, graceful shutdown
# 🎯 Follow-up Tasks Created:
#   - E01-T006: Export Database type (high)
#   - E01-T007: Add graceful shutdown (high)
#
# ✅ Epic E01 review complete. Follow-up tasks created.
# ℹ Found 2 follow-up task(s) from epic review. Processing...
#
# [AUTO] Picking next task: E01-T006 (high)
# ... [processes follow-up tasks]
#
# [CONTINUOUS] Creating next epic via PM agent...
# [Claude Code runs /roadmap plan-next]
# ✅ Next epic created. Continuing...
#
# [AUTO] Picking next task: E02-T001 (critical)
# ... [continues with next epic]
```

## Quality Gates

The workflow includes multiple quality gates:

1. **UX Review** - Ensures good user experience before implementation
2. **Architecture Review** - Validates technical approach
3. **TDD** - Tests written before code ensures testability
4. **UI Review** - Validates design consistency
5. **Code Review** - Fresh-eyes review catches issues
6. **QA Validation** - Tests acceptance criteria
7. **Epic Review** - Ensures no issues are lost ⭐ NEW

## Benefits

### Automation
- Zero manual state transitions
- Automatic dependency management
- Continuous integration possible

### Quality
- Multiple review checkpoints
- TDD enforced
- Comprehensive issue tracking via epic review
- No issues lost between epics

### Traceability
- Every state change logged
- Every review documented
- Complete audit trail
- Epic review provides historical record

### Efficiency
- Parallel work on independent tasks
- Automatic priority ordering
- Follow-up tasks processed immediately
- Continuous mode enables overnight development

## Epic Review Impact

The new epic review process ensures:

1. **No Issues Lost** - All review issues are tracked and addressed
2. **Quality Continuity** - Follow-ups extend the epic until fully polished
3. **Lessons Learned** - PM documents patterns and improvements
4. **Clean Handoffs** - Next epic starts with clean slate
5. **Accountability** - Clear record of what was done and what remains

## Configuration Files

- `.claude/agents/*.md` - Agent definitions and instructions
- `.claude/commands/*.md` - Command definitions
- `scripts/orchestrator.ts` - Workflow automation logic
- `backlog/docs/.workflow/config.yaml` - Workflow configuration
- `backlog/docs/.workflow/dependencies.yaml` - Task dependencies

## Related Documentation

- [EPIC_REVIEW.md](EPIC_REVIEW.md) - Epic review process details
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [CONVENTIONS.md](CONVENTIONS.md) - Code conventions
- [CLAUDE.md](../CLAUDE.md) - Project instructions
- [.claude/commands/README.md](../.claude/commands/README.md) - Command reference
