# Infrastructure Category: Workflow Analysis

> **Status:** Draft
> **Created:** 2026-01-16
> **Purpose:** Define workflow for infrastructure, tooling, CI/CD, and configuration tasks

## What Infrastructure Tasks Involve

Based on completed tasks (E01-T001, E01-T007, E01-T008, E01-T009, E01-T010, E01-T012, E01-T015, E06-T001):

| Type | Examples | Validation Method |
|------|----------|-------------------|
| Monorepo setup | pnpm workspace, tsconfig | Build succeeds |
| CI/CD workflows | GitHub Actions, migration CI | Workflow runs successfully |
| Build tooling | Vitest config, ESLint config | Tool runs without errors |
| Docker config | docker-compose, healthchecks | Containers start and pass healthchecks |
| Scripts/utilities | migrate.ts, migrate-check.ts | Script executes correctly |
| Package stubs | telemetry interfaces | TypeScript compiles, contracts defined |

**Key insight:** Infrastructure correctness is validated by **execution**, not by unit tests.

---

## Current Workflow Observations

Infrastructure tasks currently use varying workflows:

| Task | Workflow | Tests? |
|------|----------|--------|
| E01-T001 (pnpm monorepo) | DRAFT → ANALYZED → IMPLEMENTING → CODE_REVIEW → DOCS | No |
| E01-T008 (Vitest config) | Full TDD workflow | 234 tests |
| E01-T009 (migration fix) | DRAFT → ANALYZED → IMPLEMENTING → QA → INTEGRATION | 42 tests |
| E01-T010 (ESLint config) | DRAFT → ANALYZED → IMPLEMENTING → DOCS | No (validated by running) |
| E01-T012 (CI workflow) | DRAFT → ANALYZED → IMPLEMENTING → DOCS | No (validated by CI run) |

**Observations:**
1. **Configuration tasks** often skip TDD (config validated by execution)
2. **Script/utility tasks** get TDD (migrate-check.ts has 42 tests)
3. **All tasks** get documentation (developer experience is critical)
4. **Code review** is often lighter (config files are straightforward)

---

## Infrastructure Task Types

### Type 1: Configuration Files

**Examples:** ESLint config, Vitest config, tsconfig, docker-compose

**Characteristics:**
- Declarative (not procedural)
- Validated by tool execution
- No business logic to test
- Errors are immediate and obvious

**Testing approach:** Run the tool. If it works, config is correct.

### Type 2: Scripts and Utilities

**Examples:** migrate.ts, migrate-check.ts, validation scripts

**Characteristics:**
- Procedural code with logic
- Edge cases matter (what if file is missing? what if format is wrong?)
- Can have bugs that aren't immediately obvious
- Often called by CI/automation

**Testing approach:** Unit tests for logic, integration tests for real execution.

### Type 3: CI/CD Workflows

**Examples:** GitHub Actions workflows, deployment scripts

**Characteristics:**
- YAML/declarative with some logic
- Validated by actual execution in CI
- Hard to unit test (depends on external services)
- Failures are visible in CI runs

**Testing approach:** Integration testing by running the workflow.

### Type 4: Package Stubs/Interfaces

**Examples:** telemetry package stub

**Characteristics:**
- Define contracts for future implementation
- Types and interfaces, not runtime code
- Tests define expected API behavior
- Documentation-heavy

**Testing approach:** Tests define the contract (what the API should look like).

---

## The 7 Benefits Matrix: Infrastructure Workflow

### Current Observations

| Phase | Type 1 (Config) | Type 2 (Scripts) | Type 3 (CI/CD) | Type 4 (Stubs) |
|-------|-----------------|------------------|----------------|----------------|
| Analysis | ⚠️ Often obvious | ✅ Needed | ⚠️ Often obvious | ✅ Needed |
| Plan Review | ⚠️ Light | ✅ Needed | ⚠️ Light | ✅ Needed |
| TDD | ❌ Skip | ✅ Needed | ❌ Skip | ✅ Contract tests |
| Code Review | ⚠️ Light | ✅ Needed | ⚠️ Light | ✅ Needed |
| QA | ⚠️ Execution test | ✅ Needed | ⚠️ CI run | ✅ Needed |
| Docs | ✅ Critical | ✅ Critical | ✅ Critical | ✅ Critical |

### Analysis by Type

**Type 1 (Configuration):**
- Analysis often unnecessary (approach is obvious: "add ESLint")
- Plan review light (conventions dictate config)
- TDD doesn't apply (no logic to test)
- QA = "does the tool run?"
- Docs are critical (developers need to know how to use it)

**Type 2 (Scripts/Utilities):**
- Full workflow makes sense
- Scripts have logic, edge cases, failure modes
- TDD catches bugs before they break CI
- Code review catches issues
- QA validates real execution

**Type 3 (CI/CD Workflows):**
- Analysis often unnecessary (requirements are clear)
- Plan review light (follow existing patterns)
- TDD doesn't apply (YAML isn't testable)
- QA = "does the workflow succeed?"
- Docs are critical (developers need to understand CI)

**Type 4 (Package Stubs):**
- Full workflow makes sense
- Stubs define contracts that future code depends on
- Tests document expected behavior
- Code review ensures good API design
- Docs are critical (API documentation)

---

## Proposed Infrastructure Workflows

### Simple Infrastructure (`infra:simple`)

For configuration files and straightforward CI/CD:

```
DRAFT → IMPLEMENTING → VALIDATION → DOCS_UPDATE → PR_READY → DONE
```

**Characteristics:**
- Skip analysis (approach is obvious)
- Skip plan review (follow conventions)
- Skip TDD (no logic to test)
- Skip code review (config is straightforward)
- VALIDATION = run the tool/workflow
- Docs are required

**When to use:**
- ESLint/Prettier config
- tsconfig changes
- docker-compose updates
- Simple GitHub Actions additions
- Package.json script additions

### Standard Infrastructure (default)

For scripts, utilities, and package stubs:

```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW → DOCS_UPDATE → PR_READY → DONE
```

**Characteristics:**
- Full analysis (multiple approaches possible)
- Plan review (design decisions matter)
- TDD (scripts have logic)
- Code review (quality matters)
- QA with integration testing
- Docs are required

**When to use:**
- Migration scripts
- Validation utilities
- Package stubs/interfaces
- Complex CI/CD workflows
- Build tooling with logic

---

## Matrix Comparison: Options

| Phase | Simple | Standard |
|-------|--------|----------|
| Analysis | ❌ Skip | ✅ Yes |
| Plan Review | ❌ Skip | ✅ Yes |
| TDD | ❌ Skip | ✅ Yes |
| Implementation | ✅ Yes | ✅ Yes |
| Code Review | ❌ Skip | ✅ Yes |
| QA/Validation | ✅ Tool execution | ✅ Unit + integration |
| Docs | ✅ Yes | ✅ Yes |
| **Total Phases** | 4 | 8 |

---

## Validation Approaches by Type

### Configuration Files

**Validation:** Tool execution

```bash
# ESLint config
pnpm lint  # If it runs, config is valid

# Vitest config
pnpm test  # If tests run, config is valid

# TypeScript config
pnpm typecheck  # If it passes, config is valid

# Docker config
docker compose up -d  # If containers start, config is valid
docker compose ps  # Verify healthy status
```

**QA checklist:**
- [ ] Tool runs without errors
- [ ] Expected behavior observed
- [ ] No regressions in existing functionality

### Scripts and Utilities

**Validation:** Unit tests + integration tests

```bash
# Unit tests for logic
pnpm test packages/db

# Integration tests
pnpm docker:up
pnpm db:migrate
# Verify script behavior
pnpm docker:down
```

**QA checklist:**
- [ ] All unit tests pass
- [ ] Edge cases covered (empty, missing, invalid)
- [ ] Integration test with real environment
- [ ] Error messages are clear and actionable

### CI/CD Workflows

**Validation:** Workflow execution

```bash
# Push to branch, observe CI
git push origin feature/ci-update

# Or trigger manually
gh workflow run ci.yml
```

**QA checklist:**
- [ ] Workflow starts successfully
- [ ] All jobs complete
- [ ] Expected artifacts produced
- [ ] Failure modes handled gracefully

---

## Documentation Requirements

Infrastructure tasks have **higher documentation requirements** than other categories because:

1. **Developer experience** - Developers interact with tooling daily
2. **Onboarding** - New developers need to understand the setup
3. **Troubleshooting** - When things break, docs help debug
4. **Conventions** - Tooling enforces conventions that need explanation

### Required Documentation for Infrastructure

| Type | Documentation Required |
|------|------------------------|
| Config files | Usage guide, customization options, VS Code integration |
| Scripts | CLI usage, flags, error codes, troubleshooting |
| CI/CD | What runs when, how to debug failures, artifacts |
| Package stubs | API documentation, usage examples, future roadmap |

### Documentation Artifact

Infrastructure tasks should always produce:

1. **README update** - Package or root README
2. **KB page** (if significant) - Detailed pattern/guide
3. **CONVENTIONS.md update** (if new convention) - Standard practice
4. **Inline comments** - For non-obvious configuration

---

## Code Review: When Needed?

### Skip Code Review (`infra:simple`)

- Configuration file changes
- Following established patterns
- No custom logic
- Low risk of bugs

### Require Code Review (default)

- Scripts with logic
- New patterns or conventions
- Security-sensitive changes
- Complex CI/CD logic

---

## Summary

| Current Problem | Proposed Solution |
|-----------------|-------------------|
| Full workflow for simple config | `infra:simple` label skips analysis/review |
| Inconsistent testing approach | Type-based: config = execution, scripts = TDD |
| Docs sometimes skipped | Docs always required for infrastructure |
| Unclear validation criteria | Type-specific QA checklists |

**Key insight:** Infrastructure validation is **execution-based**, not test-based. If the tool runs and produces expected output, the infrastructure is correct.

---

## Recommended Infrastructure Workflows

### For Simple Infrastructure (`infra:simple` label)

```
DRAFT → IMPLEMENTING → VALIDATION → DOCS_UPDATE → PR_READY → DONE
```

- PM sets `infra:simple` label for config-only tasks
- Skip analysis, plan review, TDD, code review
- VALIDATION = run the tool, verify it works
- Docs always required

### For Standard Infrastructure (default)

```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW → DOCS_UPDATE → PR_READY → DONE
```

- Full workflow for scripts, utilities, complex CI/CD
- TDD for logic-containing code
- Code review for quality
- QA with integration testing
- Docs always required

### Human Checkpoints

1. **PLAN_REVIEW** (standard only) - Approve design decisions
2. **VALIDATION** (simple) or **QA_REVIEW** (standard) - Verify it works
3. **PR Creation** - Final human review before merge

---

## Decisions (Resolved)

### 1. Human Checkpoint for `infra:simple`

**Decision:** PR review is the human checkpoint.

**Rationale:** There is natural human input in the workflow - the user must run each command manually. The PR creation step provides the final human review before merge. No additional checkpoint needed at VALIDATION step.

### 2. CI/CD Workflow Testing

**Decision:** Local CI checks on commit handle this.

**Rationale:** The project runs CI/CD checks locally on commit (pre-commit hooks). This validates workflow changes before they reach the remote CI. No separate testing step needed beyond:
1. Local commit triggers CI checks
2. Push triggers actual CI run
3. CI results visible before merge

### 3. Package Stubs Category

**Decision:** Use standard infrastructure workflow.

**Rationale:** Package stubs test interfaces/contracts. TypeScript compilation validates the interface definitions (similar to how PostgreSQL validates schema). Stubs follow the same pattern as scripts - they have logic/contracts that benefit from analysis and review.

**Key insight:** "The schema is enforced by PSQL" - similarly, stub interfaces are enforced by TypeScript. But unlike pure config, stubs define contracts that future code depends on, warranting full analysis and review.

### 4. Security-Sensitive Infrastructure

**Decision:** Add `security` label that forces code review regardless of `infra:simple`.

**Implementation:**
- PM can apply `security` label to any infrastructure task
- When `security` label present: CODE_REVIEW phase is mandatory
- Applies to: GitHub secrets, environment variables, auth config, permissions
- Simple workflow with `security`: DRAFT → IMPLEMENTING → CODE_REVIEW → VALIDATION → DOCS_UPDATE → PR_READY → DONE

---

## Open Questions (None Remaining)

All open questions have been resolved. See Decisions section above.
