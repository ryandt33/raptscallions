---
description: Plan tasks from high-level goal or epic
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
---

# Plan

Break down a high-level goal into well-scoped, outcome-focused tasks and epics.

## Usage

```bash
/plan "Add assignment and submission tracking"
/plan E05  # Plan remaining tasks for an epic
/plan --epic "File Storage & Attachment Management"  # Plan a new epic
```

## What This Command Does

The `/plan` command helps the PM agent break down work into epics (large features) and tasks (specific deliverables). The key principle: **tasks describe WHAT to accomplish and WHY it matters, not HOW to implement it.**

Implementation details come later during the ANALYZING phase when the analyst researches the codebase and designs the approach.

---

## Building Good Epics

An epic represents a complete, valuable feature that delivers user value. Think "mini-project" not "code change."

### Epic Structure

```markdown
---
id: "E05"
title: "File Storage & Attachment Management"
description: "Brief one-line summary of the capability"
status: "planned"
priority: 4
estimated_weeks: 3
depends_on_epics: ["E01", "E02"]
---

# Epic E05: [Title]

## Goals

2-3 paragraph description of what this epic enables and why it matters.
Focus on user value and business capabilities, not technical implementation.

## Success Criteria

Concrete, measurable outcomes that define "done":
- [ ] Users can do X
- [ ] System supports Y
- [ ] Performance meets Z threshold
- [ ] Test coverage achieves N%

## Tasks

| ID       | Title                              | Priority | Depends On |
| -------- | ---------------------------------- | -------- | ---------- |
| E05-T001 | Task title                         | critical | -          |
| E05-T002 | Another task                       | high     | E05-T001   |

## Out of Scope

Explicitly list what this epic does NOT include. This prevents scope creep
and clarifies boundaries.

## Risks

| Risk                    | Impact | Mitigation                        |
| ----------------------- | ------ | --------------------------------- |
| Technical risk          | High   | How to address                    |

## Notes

Architectural decisions, context, examples, environment variables,
configuration patterns - anything the task implementers need to know.
```

### Epic Quality Checklist

**✅ Good epic characteristics:**
- **User-focused goals** — Describes capabilities, not code changes
- **Clear success criteria** — Observable, measurable outcomes
- **Logical task breakdown** — Natural boundaries between tasks
- **Explicit out-of-scope** — Prevents feature creep
- **Risk awareness** — Identifies potential issues upfront
- **Sufficient context** — Notes provide implementation guidance without prescribing solutions

**❌ Poor epic characteristics:**
- Goals written as technical tasks ("Create XYZ service")
- Success criteria are implementation details ("Uses Redis for caching")
- Tasks too granular (changes to single functions) or too large (entire subsystem)
- No out-of-scope section (invites scope creep)
- Missing architectural context
- Prescribes specific implementation approaches

### Epic Size Guidelines

**Good epic size:**
- 5-10 tasks typically
- 1-3 weeks of work
- Delivers standalone user value
- Natural dependencies within epic
- Can be deployed independently

**Too small:** Consider merging with related work
**Too large:** Break into multiple epics

---

## Building Good Tasks

Tasks are the atomic units of work that move through the workflow (DRAFT → ANALYZED → APPROVED → IMPLEMENTED → DONE).

### Task Structure

```markdown
---
id: "E05-T003"
title: "Concise task title"
status: "todo"
priority: "critical"
task_type: "backend"  # backend | frontend | fullstack
workflow: "development"  # development | schema | infrastructure | documentation | bugfix
epic: "E05"
depends_on: ["E05-T001", "E05-T002"]
blocks: ["E05-T006"]
---

# Task Title

## Description

2-3 sentences describing WHAT capability this adds or WHAT problem it solves.
Focus on outcomes, not implementation.

## Why This Matters

1-2 sentences explaining the business value or user impact.
Why does this task exist? What can users do after it's done?

## Acceptance Criteria

Observable, testable outcomes (NOT implementation details):
- [ ] AC1: Users can perform action X
- [ ] AC2: System enforces constraint Y
- [ ] AC3: Performance meets threshold Z
- [ ] AC4: Data persists correctly
- [ ] AC5: Error handling for edge case W
- [ ] AC6: Integration with system V works

## Constraints

Technical or business requirements that affect implementation:
- Performance: Query must complete in <100ms
- Security: Must validate input against XSS attacks
- Compatibility: Must work with existing auth system
- Data integrity: Must maintain referential integrity
- Scalability: Must handle N concurrent users

## Workflow

**Category:** `development` (standard)

**Rationale:** [1-2 sentences explaining why this category/variant applies to this task]

**Phases:**
1. `/analyze` - Research codebase and write analysis
2. Human approval of approach
3. `/review-plan` - Architect validates approach
4. `/write-tests` - TDD red phase
5. `/implement` - Write code to pass tests
6. `/review-code` - Fresh-eyes code review
7. `/qa` - Validation and integration tests
8. `/update-docs` - Update documentation
9. PR creation

## Out of Scope

What this task explicitly does NOT include:
- Related feature X (covered in E05-T008)
- Future enhancement Y (deferred to E07)
- Edge case Z (not required for MVP)

## Context

Links to relevant docs, related tasks, or architectural decisions:
- See ARCHITECTURE.md for entity relationships
- Connects to auth system from E02-T003
- Uses pattern from E04-T002
```

**CRITICAL: The Workflow section MUST include the Phases list.** This tells agents and humans exactly what commands to run for this task. Consult `.claude/workflows/{category}.md` for the correct phases for each workflow category.

### Task Quality Checklist

**✅ DO include in tasks:**
- **User-facing capabilities** — "Teachers can assign tools to classes"
- **Business requirements** — "Must handle timezones correctly"
- **Performance/security constraints** — "Query must return in <100ms"
- **Integration requirements** — "Must emit event when submission is created"
- **Observable outcomes** — "Assignment appears in student's class view"
- **Error handling needs** — "Gracefully handle duplicate submissions"

**❌ DON'T include in tasks:**
- **Specific schemas** — No column names, table structure, or TypeScript interfaces
- **SQL or code** — No migration syntax, no implementation code
- **Library choices** — Don't mandate "Use Zod" or "Store in Redis"
- **Implementation patterns** — Don't prescribe "Use Factory pattern"
- **File/function names** — Let the implementer choose structure
- **API signatures** — Don't specify exact function parameters

**Why this matters:** The analyst will research the codebase, review existing patterns, and design the implementation during the ANALYZING phase. If you prescribe implementation in the task, you remove their ability to find better approaches.

### Task Size Guidelines

**Good task size:**
- 1-3 hours of focused work
- 5-10 acceptance criteria (not 20+)
- Touches 1-3 files typically (not 10+)
- Clear "done" definition
- Single logical unit of work

**Too small:** "Add index to user_id column" — merge with related work
**Too large:** "Build entire auth system" — split into multiple tasks

### When to Split a Task

Split when you see:
- Multiple domains (schema + API + UI = 3 tasks)
- Multiple schemas (users + groups + memberships = 3 tasks)
- Complex service (auth service = login + register + OAuth = 3 tasks)
- Large scope (10+ acceptance criteria = probably 2+ tasks)

---

## Process

1. **Load the pm agent:** `@pm`
2. **Understand the goal:**
   - Read epic description if provided
   - Read [ARCHITECTURE.md](docs/ARCHITECTURE.md) for system context
   - Review existing tasks to understand patterns
   - Ask clarifying questions about requirements
3. **For epic planning:**
   - Define clear goals and success criteria
   - Identify natural task boundaries
   - List out-of-scope items
   - Document risks and mitigation strategies
   - Provide architectural context in notes
4. **For task planning:**
   - Write outcome-focused descriptions
   - Define observable acceptance criteria
   - Identify constraints and dependencies
   - Set appropriate scope (1-3 hours)
   - Provide context without prescribing implementation
5. **Create files:**
   - Epics: `backlog/tasks/{epic}/_epic.md`
   - Tasks: `backlog/tasks/{epic}/{task-id}.md`
6. **Ask user to review** before finalizing

---

## Example Transformation

### ❌ BEFORE (too implementation-heavy)

```markdown
## Description
Define schemas for assignments (tool assigned to class) and submissions.

## Acceptance Criteria
- [ ] AC1: assignments table with class_id, tool_id, name, instructions, due_at, config
- [ ] AC2: submissions table with assignment_id, user_id, session_id, run_id, state
- [ ] AC3: submission_state enum: 'in_progress', 'submitted', 'late'
[... 100 lines of TypeScript code ...]
```

**Problem:** This prescribes the exact schema structure, field names, and implementation. It removes the analyst's ability to research and design the best approach.

### ✅ AFTER (outcome-focused)

```markdown
## Description
Enable teachers to assign tools to their classes with due dates, and track student work on those assignments (in progress, submitted, late).

## Why This Matters
Teachers need a way to give students structured activities with deadlines. The system must track who has started, completed, or missed assignments to provide accountability and visibility.

## Acceptance Criteria
- [ ] AC1: Teachers can create assignments linking a tool to a class
- [ ] AC2: Assignments support optional due dates with timezone handling
- [ ] AC3: Students see assignments in their class view
- [ ] AC4: System tracks submission status (not started, in progress, submitted, late)
- [ ] AC5: Teachers can view submission status for all students
- [ ] AC6: Assignment data persists across sessions
- [ ] AC7: Supports multiple attempts if configured
- [ ] AC8: Soft delete preserves submission history

## Constraints
- Must handle timezones correctly (store UTC, display in user's zone)
- Performance: "all assignments for class" query must load in <100ms
- Data integrity: cannot orphan submissions if tool is deleted
- Concurrent access: multiple students can submit simultaneously

## Out of Scope
- Grading/scoring (E06)
- Comments/feedback (E06)
- Assignment templates (E07)
- Peer review (E08)

## Context
See ARCHITECTURE.md for entity relationships. Assignments connect three entities: Tool (what to do), Class (who does it), User (individual work). This enables the assignment workflow in the frontend.
```

**Better because:** Describes the capability, user value, and constraints without prescribing implementation. The analyst will research existing patterns, review the schema conventions, and design the optimal table structure during the ANALYZING phase.

---

## Key Principles

### For Epics:
1. **User value first** — What capability does this enable?
2. **Clear boundaries** — What's in scope, what's not?
3. **Risk awareness** — What could go wrong? How to mitigate?
4. **Sufficient context** — Provide guidance without prescribing solutions

### For Tasks:
1. **Outcome over implementation** — What needs to happen, not how to code it
2. **Observable criteria** — Can you test this without reading code?
3. **Right-sized scope** — 1-3 hours of focused work
4. **Context, not prescription** — "Must integrate with auth" not "Call authService.validate()"

---

## Arguments

- `$ARGUMENTS` — The goal description or epic ID
- `--epic` — Flag indicating this is epic-level planning
