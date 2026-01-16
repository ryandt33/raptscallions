# Task Category Analysis

> **Status:** Draft
> **Created:** 2026-01-16
> **Purpose:** Define task categories and their workflow requirements to enable the PM agent to route tasks through appropriate review pipelines.

## Problem Statement

Different types of tasks require different workflows. Currently, all tasks follow the same full pipeline:

```
DRAFT → ANALYZED → UX_REVIEW → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW →
INTEGRATION_TESTING → DOCS_UPDATE → DONE
```

This is wasteful for:
- **Documentation tasks** - No code to review or test
- **Infrastructure tasks** - No TDD cycle (can't test config before it exists)
- **Bug fixes** - Often need expedited path

## Task Categories

Based on analysis of ~40 completed tasks across 6 epics (E01-E06), tasks fall into five distinct categories:

---

### Category 1: `development`

**What it is:** Tasks that create new application/business logic code with testable behavior.

**Characteristics:**
- Creates services, routes, middleware, or application logic
- Behavior can be unit tested
- Has both `test_files` and `code_files` in frontmatter
- Labels typically include: `backend`, `auth`, `api`, `services`, `frontend`

**Workflow:**
```
DRAFT → ANALYZED → [UX_REVIEW] → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW →
INTEGRATION_TESTING → DOCS_UPDATE → DONE
```

**Review Gates:**
| Review | Required | Agent | Purpose |
|--------|----------|-------|---------|
| Spec/Plan Review | Yes | architect | Verify approach aligns with architecture |
| UX Review | Optional | designer | If user-facing, verify usability |
| Code Review | Yes | reviewer | Code quality, patterns, security |
| QA Review | Yes | qa | Acceptance criteria verification |
| Integration Testing | Yes | qa | Real environment validation |
| Doc Update | Yes | writer | Update KB and legacy docs |

**Examples from codebase:**
| Task | Description |
|------|-------------|
| E02-T003 | Email/password authentication routes |
| E02-T006 | Authentication guards and decorators |
| E04-T002 | Chat service implementation |
| E05-T002a | Storage backend interface and plugin system |

---

### Category 2: `schema`

**What it is:** Tasks that create database schemas and migrations without business logic.

**Characteristics:**
- Creates Drizzle schema files and SQL migrations
- Tests verify constraints, relations, types (not behavior)
- No service/route logic
- Labels typically include: `backend`, `database`

**Workflow:**
```
DRAFT → ANALYZED → [UX_REVIEW] → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW →
DOCS_UPDATE → DONE
```

**Review Gates:**
| Review | Required | Agent | Purpose |
|--------|----------|-------|---------|
| Spec/Plan Review | Yes | architect | Verify data model design |
| UX Review | Optional | designer | Data model usability (naming, structure) |
| Code Review | Yes | reviewer | Schema correctness, migration safety |
| QA Review | Yes | qa | Constraints work, types correct |
| Integration Testing | Optional | qa | Only if complex migrations |
| Doc Update | Yes | writer | Update entity documentation |

**Key difference from `development`:** Integration testing is often unnecessary - unit tests are sufficient for verifying schema constraints and relations.

**Examples from codebase:**
| Task | Description |
|------|-------------|
| E01-T005 | Create groups schema with ltree |
| E01-T006 | Create group_members schema |
| E03-T001 | Classes and class_members schemas |
| E04-T001 | Sessions and messages schemas |
| E05-T001 | Files and storage limits schemas |

---

### Category 3: `infrastructure`

**What it is:** Tasks that set up tooling, configuration, CI/CD, or development environment.

**Characteristics:**
- Sets up build tools, Docker, CI pipelines, linting, etc.
- Configuration-focused (YAML, JSON, TypeScript config)
- Often has `code_files` but no `test_files`
- The "test" is running the thing
- Labels typically include: `infrastructure`, `devops`, `ci-cd`

**Workflow:**
```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
IMPLEMENTING → CODE_REVIEW → QA_REVIEW → DOCS_UPDATE → DONE
```

**Review Gates:**
| Review | Required | Agent | Purpose |
|--------|----------|-------|---------|
| Spec/Plan Review | Yes | architect | Verify approach and tool choices |
| UX Review | No | - | No user-facing aspects |
| TDD Phase | No | - | Cannot test config before it exists |
| Code Review | Yes | reviewer | Config correctness, best practices |
| QA Review | Yes | qa | Verify it actually works |
| Integration Testing | Optional | qa | If backend services involved |
| Doc Update | Yes | writer | Update setup docs, README |

**Key difference from `development`:** No TDD cycle. You can't write a test for "does Docker Compose work" before Docker Compose is configured.

**Examples from codebase:**
| Task | Description |
|------|-------------|
| E01-T001 | Initialize pnpm monorepo |
| E01-T007 | Docker Compose for PostgreSQL and Redis |
| E01-T009 | Fix Database Migration Workflow |
| E01-T012 | CI migration testing |
| E01-T015 | Add Migration Journal Sync Validation |
| E06-T001 | VitePress setup and configuration |

**Note from E01-T001 history:**
> `IMPLEMENTING | developer | Skipped tests (infrastructure task), starting implementation`

This confirms infrastructure tasks explicitly skip the TDD phase.

---

### Category 4: `documentation`

**What it is:** Tasks that create or update documentation without any code changes.

**Characteristics:**
- Creates KB pages, updates README, ARCHITECTURE.md, etc.
- No code changes (only markdown)
- No tests to write or run
- Epic E06 is primarily documentation tasks

**Workflow:**
```
DRAFT → ANALYZED → DOC_WRITING → DOC_REVIEW → DONE
```

**Review Gates:**
| Review | Required | Agent | Purpose |
|--------|----------|-------|---------|
| Spec/Outline Review | Yes | analyst | What to document, structure |
| Doc Writing | Yes | writer | Create the documentation |
| Doc Review | Yes | reviewer | Accuracy, completeness, formatting |
| Code Review | No | - | No code to review |
| QA Review | No | - | Nothing to test functionally |
| Integration Testing | No | - | No runtime behavior |

**Key difference from all others:** Much simpler workflow. The only validation needed is "Is this documentation accurate and complete?"

**Examples from codebase:**
| Task | Description |
|------|-------------|
| E06-T005 | Document implemented auth system |
| E06-T008 | Cross-linking conventions and contribution guide |
| E06-T009+ | Various KB documentation tasks |

**From E06-T005 history:**
```
| 2026-01-14 | DRAFT | pm | Task created |
| 2026-01-14 | DOC_REVIEW | writer | Documentation written for all acceptance criteria |
| 2026-01-14 | DONE | reviewer | Documentation review APPROVED |
```

Note the simplified flow: DRAFT → DOC_REVIEW → DONE (with doc writing happening in the DOC_REVIEW state).

---

### Category 5: `bugfix`

**What it is:** Tasks that fix existing broken functionality.

**Characteristics:**
- Fixes something that was working or should work
- Often discovered during other task's QA/integration testing
- May add regression tests
- Labels typically include: `bug`

**Workflow:**
```
DRAFT → ANALYZING → IMPLEMENTING → CODE_REVIEW → QA_REVIEW → DONE
```

**Review Gates:**
| Review | Required | Agent | Purpose |
|--------|----------|-------|---------|
| Analysis | Yes | analyst | Understand root cause |
| Spec Review | Optional | architect | Only if fix is complex |
| TDD Phase | Optional | developer | Regression test if warranted |
| Code Review | Yes | reviewer | Verify fix, no regressions |
| QA Review | Yes | qa | Verify bug is actually fixed |
| Doc Update | Optional | writer | If behavior changed |

**Key difference from others:** Expedited workflow. Often skips spec review if the fix is obvious. Focus is on fixing quickly and verifying the fix.

**Examples from codebase:**
| Task | Description |
|------|-------------|
| E06-T003-BUG | Fix failing tests in E06-T003 staleness tracking |
| (Various) | Bugs discovered during integration testing |

---

## Summary: Workflow Comparison

| Category | TDD? | UX Review? | Code Review? | QA Review? | Integration? | Doc Update? |
|----------|------|------------|--------------|------------|--------------|-------------|
| **development** | Yes | Optional | Yes | Yes | Yes | Yes |
| **schema** | Yes | Optional | Yes | Yes | Optional | Yes |
| **infrastructure** | No | No | Yes | Yes | Optional | Yes |
| **documentation** | No | No | No | No | No | N/A |
| **bugfix** | Optional | No | Yes | Yes | Optional | Optional |

---

## Implementation: Category Label

Tasks should include a `category` label in frontmatter to enable automatic workflow routing:

```yaml
---
id: "E07-T001"
title: "Implement user profile service"
labels:
  - backend
  - api
  - category:development  # <-- Category label
---
```

### Valid Category Labels

| Label | Use When |
|-------|----------|
| `category:development` | Creating services, routes, business logic with tests |
| `category:schema` | Creating database schemas and migrations |
| `category:infrastructure` | Setting up tooling, config, CI/CD, Docker |
| `category:documentation` | Writing/updating docs without code changes |
| `category:bugfix` | Fixing broken functionality |

### Fallback Inference

If no category label is present, the PM agent can infer category from other labels:

| If labels include... | Infer category |
|---------------------|----------------|
| `bug` | `bugfix` |
| `infrastructure`, `devops`, or `ci-cd` | `infrastructure` |
| `documentation` or `kb` | `documentation` |
| `database` (without `backend` services) | `schema` |
| `backend` + (`api`, `auth`, `services`) | `development` |
| Default | `development` |

---

## Breakpoint Analysis Matrix

The "gap" between workflow phases provides 7 distinct benefits. This matrix analyzes whether each category needs each benefit at each phase.

### The 7 Benefits of Workflow Gaps

| # | Benefit | Description |
|---|---------|-------------|
| 1 | **Context Insulation** | Fresh eyes, no bias from previous work |
| 2 | **Natural Friction** | Human review opportunity, intervention point |
| 3 | **Artifact Persistence** | Written record for audit, learning, blame tracing |
| 4 | **Specialization Focus** | Single job done well, not jack-of-all-trades |
| 5 | **Error Recovery** | Known restart point when phase fails |
| 6 | **Parallelization** | Independent phases can run concurrently |
| 7 | **Cost Management** | Different models for different phases |

---

### Category: `development`

Full workflow with all phases. The "gold standard" that other categories simplify from.

```
DRAFT → ANALYZED → [UX_REVIEW] → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW →
INTEGRATION_TESTING → DOCS_UPDATE → DONE
```

| Phase Transition | 1-Context | 2-Friction | 3-Artifact | 4-Special | 5-Recovery | 6-Parallel | 7-Cost |
|------------------|-----------|------------|------------|-----------|------------|------------|--------|
| DRAFT → ANALYZED | ✅ | ✅ | ✅ spec | ✅ analyst | ✅ | - | haiku |
| ANALYZED → UX_REVIEW | ✅ | ✅ | ✅ ux-review | ✅ designer | ✅ | ⚡ with arch | haiku |
| ANALYZED → PLAN_REVIEW | ✅ | ✅ | ✅ arch-review | ✅ architect | ✅ | ⚡ with ux | sonnet |
| APPROVED → TESTS_READY | ✅ | ⚠️ low | ✅ test files | ✅ developer | ✅ | - | sonnet |
| TESTS_READY → IMPLEMENTING | ❌ same agent | ❌ | ❌ | ❌ same | ✅ | - | sonnet |
| IMPLEMENTING → CODE_REVIEW | ✅ | ✅ | ✅ code-review | ✅ reviewer | ✅ | - | sonnet |
| CODE_REVIEW → QA_REVIEW | ✅ | ✅ | ✅ qa-report | ✅ qa | ✅ | - | sonnet |
| QA_REVIEW → INTEGRATION | ⚠️ same qa | ⚠️ low | ✅ int-report | ⚠️ same qa | ✅ | - | sonnet |
| INTEGRATION → DOCS_UPDATE | ✅ | ⚠️ low | ✅ doc updates | ✅ writer | ✅ | - | haiku |

**Analysis:**

- **TESTS_READY → IMPLEMENTING**: This is the same developer agent. No context insulation, no friction, no specialization benefit. The gap exists for TDD discipline (red→green), not for review. **Keep** - the artifact (failing tests) enforces TDD.

- **QA_REVIEW → INTEGRATION**: Often the same qa agent. Low friction value. But the artifact separation (qa-report vs integration-report) is valuable for tracking unit vs integration issues. **Keep** - different validation types.

- **Parallelization opportunity**: UX_REVIEW and PLAN_REVIEW could run in parallel after ANALYZED. Both read the spec, neither modifies it.

**Verdict: Current workflow is appropriate.** No phases to remove. Consider parallel UX+Arch reviews.

---

### Category: `schema`

Similar to development but integration testing is often overkill.

```
DRAFT → ANALYZED → [UX_REVIEW] → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW →
[INTEGRATION_TESTING] → DOCS_UPDATE → DONE
```

| Phase Transition | 1-Context | 2-Friction | 3-Artifact | 4-Special | 5-Recovery | 6-Parallel | 7-Cost |
|------------------|-----------|------------|------------|-----------|------------|------------|--------|
| DRAFT → ANALYZED | ✅ | ✅ | ✅ spec | ✅ analyst | ✅ | - | haiku |
| ANALYZED → UX_REVIEW | ✅ | ✅ | ✅ ux-review | ✅ designer | ✅ | ⚡ | haiku |
| ANALYZED → PLAN_REVIEW | ✅ | ✅ | ✅ arch-review | ✅ architect | ✅ | ⚡ | sonnet |
| APPROVED → TESTS_READY | ✅ | ⚠️ low | ✅ test files | ✅ developer | ✅ | - | sonnet |
| TESTS_READY → IMPLEMENTING | ❌ | ❌ | ❌ | ❌ | ✅ | - | sonnet |
| IMPLEMENTING → CODE_REVIEW | ✅ | ✅ | ✅ code-review | ✅ reviewer | ✅ | - | sonnet |
| CODE_REVIEW → QA_REVIEW | ✅ | ✅ | ✅ qa-report | ✅ qa | ✅ | - | sonnet |
| QA_REVIEW → INTEGRATION | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | - | sonnet |
| QA_REVIEW → DOCS_UPDATE | ✅ | ⚠️ low | ✅ doc updates | ✅ writer | ✅ | - | haiku |

**Analysis:**

- **INTEGRATION_TESTING**: For pure schema tasks (just tables + constraints), unit tests are sufficient. Integration testing adds value only when:
  - Complex migrations with data transformations
  - ltree or other PostgreSQL extensions
  - Foreign key cascades across multiple tables

**Verdict: Make INTEGRATION_TESTING conditional.** Skip by default, require only when `labels` include `complex-migration` or architect flags it in plan review.

---

### Category: `infrastructure`

No TDD phase - the "test" IS running the infrastructure.

```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
IMPLEMENTING → CODE_REVIEW → QA_REVIEW → [INTEGRATION_TESTING] → DOCS_UPDATE → DONE
```

| Phase Transition | 1-Context | 2-Friction | 3-Artifact | 4-Special | 5-Recovery | 6-Parallel | 7-Cost |
|------------------|-----------|------------|------------|-----------|------------|------------|--------|
| DRAFT → ANALYZED | ✅ | ✅ | ✅ spec | ✅ analyst | ✅ | - | haiku |
| ANALYZED → PLAN_REVIEW | ✅ | ✅ | ✅ arch-review | ✅ architect | ✅ | - | sonnet |
| APPROVED → IMPLEMENTING | ✅ | ⚠️ low | ✅ code files | ✅ developer | ✅ | - | sonnet |
| IMPLEMENTING → CODE_REVIEW | ✅ | ✅ | ✅ code-review | ✅ reviewer | ✅ | - | sonnet |
| CODE_REVIEW → QA_REVIEW | ✅ | ✅ | ✅ qa-report | ✅ qa | ✅ | - | sonnet |
| QA_REVIEW → INTEGRATION | ⚠️ | ⚠️ | ✅ int-report | ⚠️ same qa | ✅ | - | sonnet |
| QA/INT → DOCS_UPDATE | ✅ | ⚠️ low | ✅ doc updates | ✅ writer | ✅ | - | haiku |

**Analysis:**

- **No UX_REVIEW**: Correct - infrastructure has no user-facing aspects.
- **No TDD phase**: Correct - you can't test config before it exists.
- **INTEGRATION_TESTING**: For infrastructure, this is often MORE important than QA_REVIEW. QA verifies "does the command work?" but integration verifies "does it work in the real environment?"

**Question: Should QA and Integration be combined for infrastructure?**

For infra tasks, QA often IS integration testing (running Docker, CI pipelines, etc.). The distinction blurs.

**Verdict: Consider merging QA_REVIEW + INTEGRATION_TESTING into single "VALIDATION" phase for infrastructure.** Or keep separate but run by same agent in sequence without gap.

---

### Category: `documentation`

Dramatically simplified - only need analysis and review.

```
DRAFT → ANALYZED → DOC_WRITING → DOC_REVIEW → DONE
```

| Phase Transition | 1-Context | 2-Friction | 3-Artifact | 4-Special | 5-Recovery | 6-Parallel | 7-Cost |
|------------------|-----------|------------|------------|-----------|------------|------------|--------|
| DRAFT → ANALYZED | ✅ | ✅ | ✅ outline | ✅ analyst | ✅ | - | haiku |
| ANALYZED → DOC_WRITING | ✅ | ⚠️ low | ✅ doc files | ✅ writer | ✅ | - | sonnet |
| DOC_WRITING → DOC_REVIEW | ✅ | ✅ | ✅ doc-review | ✅ reviewer | ✅ | - | sonnet |

**Analysis:**

- **No PLAN_REVIEW**: Should documentation have architecture review?
  - For KB structure decisions, maybe.
  - For documenting existing code, no - the code already passed arch review.

- **No CODE_REVIEW**: Correct - no code.

- **No QA_REVIEW**: Correct - nothing to test functionally.

- **Should there be a "TECH_REVIEW" phase?**
  - The DOC_REVIEW verifies accuracy. But it's done by reviewer agent.
  - Alternative: Have the original developer or qa agent verify technical accuracy.
  - Current approach seems sufficient - reviewer reads the source code to verify.

**Question: Is ANALYZED necessary?**

For simple doc tasks ("update README with new command"), analysis might be overkill. But for comprehensive documentation ("document the entire auth system"), analysis/outlining is valuable.

**Verdict: Current workflow is appropriate.** Consider making ANALYZED optional for trivial doc updates (single file, < 100 lines changed).

---

### Category: `bugfix`

Expedited workflow - fix fast, verify fix.

```
DRAFT → ANALYZED → [PLAN_REVIEW] → IMPLEMENTING → CODE_REVIEW → QA_REVIEW → DONE
```

| Phase Transition | 1-Context | 2-Friction | 3-Artifact | 4-Special | 5-Recovery | 6-Parallel | 7-Cost |
|------------------|-----------|------------|------------|-----------|------------|------------|--------|
| DRAFT → ANALYZED | ✅ | ✅ | ✅ root cause | ✅ analyst | ✅ | - | haiku |
| ANALYZED → PLAN_REVIEW | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ✅ | - | sonnet |
| ANALYZED → IMPLEMENTING | ✅ | ⚠️ low | ✅ fix + test | ✅ developer | ✅ | - | sonnet |
| IMPLEMENTING → CODE_REVIEW | ✅ | ✅ | ✅ code-review | ✅ reviewer | ✅ | - | sonnet |
| CODE_REVIEW → QA_REVIEW | ✅ | ✅ | ✅ qa-report | ✅ qa | ✅ | - | sonnet |

**Analysis:**

- **PLAN_REVIEW**: For simple bugs (typo, off-by-one, missing null check), architecture review is overkill. For complex bugs (race conditions, architectural issues), it's valuable.

- **No INTEGRATION_TESTING**: Bug fixes should be verified in the same environment where they were discovered. If the bug was found in integration, QA should include integration verification.

- **No DOCS_UPDATE**: Usually not needed unless the bug revealed incorrect documentation.

- **TDD consideration**: Should bugfixes require a regression test first?
  - Best practice says yes - write test that fails, then fix.
  - But for trivial bugs, this adds overhead.
  - Proposal: Regression test required if bug was discovered in production or affected users.

**Verdict: Current workflow is appropriate.** PLAN_REVIEW should be conditional based on complexity. Consider requiring regression test for non-trivial bugs.

---

## Summary: Recommended Changes

| Category | Current | Recommendation |
|----------|---------|----------------|
| **development** | Full pipeline | ✅ Keep as-is. Consider parallel UX+Arch reviews. |
| **schema** | Full pipeline | ⚠️ Make INTEGRATION_TESTING conditional (default skip) |
| **infrastructure** | No TDD | ⚠️ Consider merging QA+Integration into single VALIDATION phase |
| **documentation** | Simplified | ✅ Keep as-is. Consider optional ANALYZED for trivial updates. |
| **bugfix** | Expedited | ✅ Keep as-is. PLAN_REVIEW conditional on complexity. |

---

## Next Steps

1. **Update PM agent** to recognize category labels and route to appropriate workflow
2. **Update analyst agent** to suggest category during task analysis
3. **Update workflow configuration** to define state machines per category
4. **Consider**: Should category be in frontmatter schema validation?

---

## Open Questions

1. **Hybrid tasks**: What if a task is both infrastructure AND has tests (like E01-T015)?
   - Proposal: If it has meaningful unit tests, treat as development. E01-T015 had tests for the validation logic, so it followed TDD despite being infrastructure-labeled.

2. **Schema + Service tasks**: What if a task creates both schema AND service code?
   - Proposal: Use `category:development` - the more comprehensive workflow.

3. **Documentation updates within dev tasks**: Every dev task has a DOCS_UPDATE phase. Is that different from `category:documentation`?
   - Clarification: `category:documentation` is for standalone doc tasks. The DOCS_UPDATE phase in dev tasks is just updating docs related to the code change.
