# Development Workflow

> **Category:** `development`
> **Use for:** Services, routes, business logic, features with tests

## Workflow Overview

```
DRAFT → ANALYZED → [UX_REVIEW] → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → [UI_REVIEW] → CODE_REVIEW → QA_REVIEW →
DOCS_UPDATE → PR_READY → DONE
```

**States:** 12 (including DONE)
**Agents:** 7 (analyst, designer, architect, developer, reviewer, qa, writer)

**Conditional phases:**
- `[UX_REVIEW]` - Only for tasks with `frontend` label
- `[UI_REVIEW]` - Only for tasks with `frontend` label

---

## Phase Reference

| Phase | Command | Agent | Input | Output |
|-------|---------|-------|-------|--------|
| DRAFT → ANALYZED | `/analyze` | analyst | Task file | Analysis with 3 approaches |
| ANALYZED → UX_REVIEW | `/review-ux` | designer | Analysis | UX review (appended to spec) |
| UX_REVIEW → PLAN_REVIEW | `/review-plan` | architect | Analysis + UX review | Implementation spec |
| APPROVED → TESTS_READY | `/write-tests` | developer | Spec | Failing tests (TDD red) |
| TESTS_READY → IMPLEMENTING | `/implement` | developer | Failing tests | Passing code (TDD green) |
| IMPLEMENTING → UI_REVIEW | `/review-ui` | designer | Code + tests | UI review report |
| UI_REVIEW → CODE_REVIEW | `/review-code` | reviewer | Code + tests | Code review report |
| CODE_REVIEW → QA_REVIEW | `/qa` | qa | Code + reviews | QA report (unit + integration) |
| QA_REVIEW → DOCS_UPDATE | `/update-docs` | writer | All artifacts | Documentation updates |
| DOCS_UPDATE → PR_READY | — | — | — | Manual PR creation |

---

## Routing Logic

### Frontend Label

Tasks with the `frontend` label get additional design reviews:

```
                    ┌─── frontend ───┐
                    ▼                │
ANALYZED ──► UX_REVIEW ──► PLAN_REVIEW
        │                            ▲
        └─── no frontend ────────────┘

                      ┌─── frontend ───┐
                      ▼                │
IMPLEMENTING ──► UI_REVIEW ──► CODE_REVIEW
            │                          ▲
            └─── no frontend ──────────┘
```

**PM sets this label at task creation time.**

---

## Phase Details

### 1. Analysis (DRAFT → ANALYZED)

**Command:** `/analyze {task-id}`
**Agent:** analyst

**Purpose:** Explore solution space without committing to an approach.

**Process:**
1. Read task file and acceptance criteria
2. Read ARCHITECTURE.md, CONVENTIONS.md
3. Explore codebase for relevant patterns
4. Propose 3 distinct approaches with trade-offs
5. Map approaches to acceptance criteria
6. Identify open questions

**Artifact:** `backlog/docs/specs/{epic}/{task-id}-spec.md` (analysis section)

**Why this breakpoint exists:**
- ✅ Context Insulation: Analyst explores without decision bias
- ✅ Natural Friction: Human reviews approaches before committing
- ✅ Artifact: Analysis captures explored options for future reference
- ✅ Specialization: Analyst explores; architect decides

**Transitions:**
- ✅ Success → ANALYZED
- ❌ Failure → Re-run `/analyze`

---

### 2. UX Review (ANALYZED → UX_REVIEW)

**Command:** `/review-ux {task-id}`
**Agent:** designer
**Condition:** Task has `frontend` label

**Purpose:** Review spec for usability concerns before architecture decisions.

**Process:**
1. Read analysis and task acceptance criteria
2. Evaluate user flow, information architecture, accessibility
3. Identify usability concerns or improvements
4. Append UX Review section to spec

**Artifact:** UX Review section in spec file

**Why this breakpoint exists:**
- ✅ Context Insulation: Designer sees analysis fresh, focuses on users
- ✅ Natural Friction: Human can approve/reject UX concerns before architecture
- ✅ Specialization: Designer thinks about users, not implementation

**Transitions:**
- ✅ Pass → PLAN_REVIEW
- ❌ Needs Changes → ANALYZING (re-run analysis with UX feedback)
- ⏭️ Skipped (no `frontend` label) → PLAN_REVIEW

---

### 3. Architecture Review (UX_REVIEW → PLAN_REVIEW)

**Command:** `/review-plan {task-id}`
**Agent:** architect

**Purpose:** Select approach and create implementation specification.

**Process:**
1. Read analysis (with UX review if present)
2. Select approach (or create hybrid)
3. Define constraints (non-negotiable requirements)
4. Specify interface contracts (public API, types)
5. Define test criteria per acceptance criterion
6. Resolve open questions from analysis

**Artifact:** `backlog/docs/specs/{epic}/{task-id}-spec.md` (complete spec)

**Why this breakpoint exists:**
- ✅ Context Insulation: Architect decides without exploration bias
- ✅ Natural Friction: Critical decision point with human oversight
- ✅ Artifact: Spec is the contract between design and implementation
- ✅ Specialization: Architect constrains; developer implements

**Transitions:**
- ✅ Approved → APPROVED
- ❌ User rejects → Re-run `/review-plan`

---

### 4. Test Writing (APPROVED → TESTS_READY)

**Command:** `/write-tests {task-id}`
**Agent:** developer

**Purpose:** Write failing tests before implementation (TDD red phase).

**Process:**
1. Read spec with test criteria
2. Write test files following AAA pattern
3. Cover all acceptance criteria
4. Verify tests FAIL (implementation doesn't exist yet)
5. Pass typecheck and lint

**Artifact:** Test files (listed in `test_files` frontmatter)

**Why this breakpoint exists:**
- ✅ Context Insulation: Developer sees spec fresh, without analysis debates
- ✅ Artifact: Test files capture expected behavior
- ✅ Recovery: Can re-run test writing without losing spec
- ⚠️ Natural Friction: Low, but enables TDD enforcement

**Transitions:**
- ✅ Success → TESTS_READY
- ❌ Failure → Re-run `/write-tests`

---

### 5. Implementation (TESTS_READY → IMPLEMENTING)

**Command:** `/implement {task-id}`
**Agent:** developer

**Purpose:** Write minimal implementation to make tests pass (TDD green phase).

**Process:**
1. Read failing tests
2. Write implementation to make tests pass
3. Follow conventions from spec
4. Verify all tests pass, typecheck passes, lint passes

**Artifact:** Code files (listed in `code_files` frontmatter)

**Why this breakpoint exists:**
- ✅ Context Insulation: Fresh developer reviews test quality before implementing
- ✅ Artifact: Code files are the deliverable
- ✅ Recovery: Can re-run implementation without rewriting tests
- ✅ TDD Enforcement: Proves tests existed before code

**Transitions:**
- ✅ Success → IMPLEMENTING (ready for review)
- ❌ Tests are bad → TESTS_REVISION_NEEDED (feedback to `/write-tests`)
- ❌ Failure → Re-run `/implement`

---

### 6. UI Review (IMPLEMENTING → UI_REVIEW)

**Command:** `/review-ui {task-id}`
**Agent:** designer
**Condition:** Task has `frontend` label

**Purpose:** Review implemented components for design quality.

**Process:**
1. Read implemented component code
2. Check design system compliance
3. Verify accessibility (ARIA, keyboard nav, contrast)
4. Check visual consistency and responsiveness
5. Create UI review report

**Artifact:** `backlog/docs/reviews/{epic}/{task-id}-ui-review.md`

**Why this breakpoint exists:**
- ✅ Context Insulation: Designer sees UI fresh, like a user would
- ✅ Natural Friction: UI issues caught before code review
- ✅ Specialization: Designer evaluates UX; reviewer evaluates code

**Transitions:**
- ✅ Pass → CODE_REVIEW
- ❌ Needs Changes → IMPLEMENTING (re-run `/implement` with feedback)
- ⏭️ Skipped (no `frontend` label) → CODE_REVIEW

---

### 7. Code Review (UI_REVIEW → CODE_REVIEW)

**Command:** `/review-code {task-id}`
**Agent:** reviewer

**Purpose:** Fresh-eyes review of code quality.

**Key Characteristic:** Starts with **fresh context** - no prior conversation history.

**Process:**
1. Run typecheck, lint, tests
2. Review code for:
   - Correctness (does it do what spec says?)
   - Readability (clear naming, structure)
   - Maintainability (not overly complex)
   - Testing (adequate coverage, good tests)
   - Conventions (follows project patterns)
3. Produce structured report

**Artifact:** `backlog/docs/reviews/{epic}/{task-id}-code-review.md`

**Report Categories:**
- **Must Fix:** Blocking issues
- **Should Fix:** Important but not blocking
- **Suggestions:** Nice-to-have improvements

**Why this breakpoint exists:**
- ✅ Context Insulation: Explicit fresh context catches blind spots
- ✅ Natural Friction: Human reviews findings before QA
- ✅ Artifact: Review doc captures quality assessment
- ✅ Specialization: Reviewer evaluates quality; QA validates correctness

**Transitions:**
- ✅ Approved → CODE_REVIEW (ready for QA)
- ❌ Changes Requested → IMPLEMENTING (re-run `/implement` with feedback)

---

### 8. QA Validation (CODE_REVIEW → QA_REVIEW)

**Command:** `/qa {task-id}`
**Agent:** qa

**Purpose:** Validate implementation against requirements with adversarial mindset. Includes both unit and integration testing.

**Key Characteristic:** Starts with **fresh context** - no prior conversation history.

**Process:**
1. **Unit Testing:**
   - Run typecheck, lint, tests
   - Validate EVERY acceptance criterion with evidence
   - Test edge cases (empty, null, boundaries, permissions)
2. **Integration Testing:**
   - Start Docker infrastructure (`pnpm docker:up`)
   - Execute real HTTP requests against running application
   - Verify behavior in production-like environment
   - Stop infrastructure (`pnpm docker:down`)
3. Produce structured report with both results

**Artifact:** `backlog/docs/reviews/{epic}/{task-id}-qa-report.md`

**Report Sections:**
- AC verification (each criterion with evidence)
- Edge case testing table
- Integration test results
- Bugs found (if any)
- Overall assessment

**Why this breakpoint exists:**
- ✅ Context Insulation: Fresh context, adversarial mindset
- ✅ Natural Friction: Final validation before documentation
- ✅ Artifact: QA report proves requirements met
- ✅ Specialization: QA validates correctness (different from code quality)

**Transitions:**
- ✅ Pass → QA_REVIEW (ready for docs)
- ❌ Fail → IMPLEMENTING (re-run `/implement` with bug details)

---

### 9. Documentation (QA_REVIEW → DOCS_UPDATE)

**Command:** `/update-docs {task-id}`
**Agent:** writer

**Purpose:** Update documentation to reflect implemented reality.

**Process:**
1. Review what was implemented (code, tests, reviews)
2. Update relevant documentation:
   - ARCHITECTURE.md (if architectural changes)
   - CONVENTIONS.md (if new patterns)
   - Package READMEs
   - Knowledge Base pages
3. Verify accuracy of examples and links
4. Set workflow_state to PR_READY

**Artifact:** Documentation Updates section in task file

**Why this breakpoint exists:**
- ✅ Context Insulation: Writer sees finished product, documents reality
- ✅ Artifact: Documentation is part of the deliverable
- ✅ Specialization: Writer documents; doesn't code or test

**Transitions:**
- ✅ Success → PR_READY
- ❌ Failure → Re-run `/update-docs`

---

### 10. PR Creation (PR_READY → DONE)

**Manual step** - Human creates PR and merges.

**Process:**
1. Review all changes
2. Create branch if needed
3. Create commit with conventional format
4. Push and create PR
5. After merge: Archive task to `backlog/completed/{epic}/`
6. Set workflow_state to DONE

---

## Rejection Flows

When a phase fails, the workflow routes back for fixes:

```
                                    ┌─────────────────┐
                                    │                 │
CODE_REVIEW rejects ────────────────┤                 │
                                    │  IMPLEMENTING   │
QA_REVIEW fails ────────────────────┤                 │
                                    │                 │
UI_REVIEW needs changes ────────────┤                 │
                                    └─────────────────┘

/implement finds bad tests ─────────► TESTS_REVISION_NEEDED ──► /write-tests

UX_REVIEW needs changes ────────────► ANALYZING (re-analyze with feedback)

PLAN_REVIEW rejected ───────────────► Re-run /review-plan
```

---

## State Machine

```
DRAFT
  │ /analyze (analyst)
  ▼
ANALYZED
  │ /review-ux (designer) ─── if frontend label
  ▼
[UX_REVIEW] ──── (needs changes) ───► ANALYZING
  │ (passes or skipped)
  ▼
PLAN_REVIEW
  │ /review-plan (architect)
  ▼
APPROVED
  │ /write-tests (developer)
  ▼
TESTS_READY ◄───────────────────────── TESTS_REVISION_NEEDED
  │ /implement (developer)                    ▲
  │                                           │
  ├─── (tests are bad) ───────────────────────┘
  ▼
IMPLEMENTING ◄─────────────────────────────────────────┐
  │ /review-ui (designer) ─── if frontend label        │
  ▼                                                    │
[UI_REVIEW] ─── (needs changes) ───────────────────────┤
  │ (passes or skipped)                                │
  │ /review-code (reviewer) ─── FRESH CONTEXT          │
  ▼                                                    │
CODE_REVIEW ─── (changes requested) ───────────────────┤
  │ (approved)                                         │
  │ /qa (qa) ─── FRESH CONTEXT                         │
  ▼                                                    │
QA_REVIEW ───── (failed) ──────────────────────────────┘
  │ (passed)
  │ /update-docs (writer)
  ▼
DOCS_UPDATE
  │
  ▼
PR_READY
  │ (manual PR creation)
  ▼
DONE
```

---

## Quick Reference

**Start a task:**
```bash
/analyze E01-T001
```

**Full sequence (backend):**
```bash
/analyze E01-T001       # Explore approaches
/review-plan E01-T001   # Create spec
/write-tests E01-T001   # Write failing tests
/implement E01-T001     # Make tests pass
/review-code E01-T001   # Code quality review
/qa E01-T001            # Validate + integration test
/update-docs E01-T001   # Update documentation
# Manual: create PR and merge
```

**Full sequence (frontend):**
```bash
/analyze E01-T001       # Explore approaches
/review-ux E01-T001     # UX review
/review-plan E01-T001   # Create spec
/write-tests E01-T001   # Write failing tests
/implement E01-T001     # Make tests pass
/review-ui E01-T001     # UI quality review
/review-code E01-T001   # Code quality review
/qa E01-T001            # Validate + integration test
/update-docs E01-T001   # Update documentation
# Manual: create PR and merge
```

**Check task status:**
```bash
# Active tasks
cat backlog/tasks/{epic}/{task-id}.md

# Completed tasks
cat backlog/completed/{epic}/{task-id}.md
```
