# Infrastructure Workflow

> **Category:** `infrastructure`
> **Use for:** Tooling, configuration files, CI/CD workflows, scripts, package stubs

## Workflow Overview

### Simple Infrastructure (`infra:simple` label)

```
DRAFT → IMPLEMENTING → VALIDATION → DOCS_UPDATE → PR_READY → DONE
```

### Simple Infrastructure with Security (`infra:simple` + `security` labels)

```
DRAFT → IMPLEMENTING → CODE_REVIEW → VALIDATION → DOCS_UPDATE → PR_READY → DONE
```

### Standard Infrastructure (default)

```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW → DOCS_UPDATE → PR_READY → DONE
```

**Key differences from development workflow:**
- Simple workflow available for config-only changes
- VALIDATION phase for execution-based testing (instead of unit tests)
- TDD only for scripts/utilities with logic
- Documentation always required (high developer experience impact)

---

## Simple vs Standard Infrastructure

### Simple Infrastructure (`infra:simple`)

PM sets this label at task creation when ALL criteria are met:

- ✅ Configuration file only (no procedural logic)
- ✅ Following established patterns/conventions
- ✅ Tool validates correctness (ESLint runs = config valid)
- ✅ No security-sensitive changes
- ✅ Low risk of bugs

**Examples:**
- ESLint/Prettier configuration
- tsconfig.json changes
- docker-compose.yml updates
- Simple GitHub Actions additions
- Package.json script additions
- Vitest/testing configuration

**Workflow:** Skip analysis, plan review, TDD, code review

### Standard Infrastructure (default)

Any task that doesn't meet simple criteria, including:

- ❌ Scripts with procedural logic (if/else, loops, error handling)
- ❌ Validation utilities
- ❌ Package stubs/interfaces (define contracts)
- ❌ Complex CI/CD workflows (matrix builds, conditional jobs)
- ❌ New patterns or conventions
- ❌ Build tooling with logic

**Workflow:** Full analysis, plan review, TDD, code review, QA

### Security Label Override

When `security` label is present on ANY infrastructure task:
- CODE_REVIEW phase becomes **mandatory**
- Applies even to `infra:simple` tasks
- Use for: GitHub secrets, environment variables, auth config, permissions

---

## Infrastructure Types

| Type | Examples | Testing Approach | Workflow |
|------|----------|------------------|----------|
| Config files | ESLint, tsconfig, docker-compose | Tool execution | Simple |
| Scripts | migrate.ts, validation utilities | Unit + integration tests | Standard |
| CI/CD workflows | GitHub Actions, deployment | Local CI + actual run | Simple or Standard |
| Package stubs | telemetry interfaces | TypeScript compilation | Standard |

---

## Phase Reference

### Simple Workflow

| Phase | Command | Agent | Input | Output |
|-------|---------|-------|-------|--------|
| DRAFT → IMPLEMENTING | `/implement` | developer | Task file | Config/code files |
| IMPLEMENTING → VALIDATION | — | — | Files | Tool execution results |
| VALIDATION → DOCS_UPDATE | `/update-docs` | writer | All artifacts | Documentation updates |
| DOCS_UPDATE → PR_READY | — | — | — | Manual PR creation |

### Standard Workflow

| Phase | Command | Agent | Input | Output |
|-------|---------|-------|-------|--------|
| DRAFT → ANALYZED | `/analyze` | analyst | Task file | Implementation spec |
| ANALYZED → PLAN_REVIEW | `/review-plan` | architect | Spec | Approved spec |
| APPROVED → TESTS_READY | `/write-tests` | developer | Spec | Test files |
| TESTS_READY → IMPLEMENTING | `/implement` | developer | Spec + tests | Implementation |
| IMPLEMENTING → CODE_REVIEW | `/review-code` | reviewer | Code | Review report |
| CODE_REVIEW → QA_REVIEW | `/qa` | qa | All artifacts | QA report |
| QA_REVIEW → DOCS_UPDATE | `/update-docs` | writer | All artifacts | Documentation updates |
| DOCS_UPDATE → PR_READY | — | — | — | Manual PR creation |

---

## Phase Details

### 1. Implementation (DRAFT → IMPLEMENTING)

**Command:** `/implement {task-id}`
**Agent:** developer

**For Simple Infrastructure:**
1. Read task requirements
2. Create/modify configuration files
3. Run tool to validate: `pnpm lint`, `pnpm typecheck`, `docker compose up`, etc.
4. Verify expected behavior

**For Standard Infrastructure:**
1. Follow approved spec
2. Write tests first (TDD for scripts)
3. Implement functionality
4. Ensure all tests pass

**Transitions:**
- ✅ Success → IMPLEMENTING (ready for validation/review)
- ❌ Failure → Re-run `/implement`

---

### 2. Validation (Simple only: IMPLEMENTING → VALIDATION)

**No command** - Developer validates by running tools.

**Process:**
1. Execute the tool/config being modified
2. Verify expected behavior
3. Check for regressions

**Validation by Type:**

```bash
# ESLint/Prettier config
pnpm lint

# TypeScript config
pnpm typecheck

# Vitest config
pnpm test

# Docker config
docker compose up -d && docker compose ps

# GitHub Actions
# Local: pre-commit hooks run CI checks
# Remote: Push and observe CI run
```

**Checklist:**
- [ ] Tool runs without errors
- [ ] Expected behavior observed
- [ ] No regressions in existing functionality

**Transitions:**
- ✅ Success → VALIDATION (ready for docs)
- ❌ Failure → IMPLEMENTING (fix issues)

---

### 3. Code Review (Standard, or Simple + `security`)

**Command:** `/review-code {task-id}`
**Agent:** reviewer

**Purpose:** Review quality, security, and correctness of infrastructure code.

**Focus Areas:**
- Script logic correctness
- Error handling completeness
- Security implications (secrets, permissions)
- Pattern consistency
- Edge case handling

**Transitions:**
- ✅ Approved → CODE_REVIEW (ready for QA/validation)
- ❌ Issues found → IMPLEMENTING (fix issues)

---

### 4. QA Validation (Standard only: CODE_REVIEW → QA_REVIEW)

**Command:** `/qa {task-id}`
**Agent:** qa

**Purpose:** Validate infrastructure with fresh context and integration testing.

**Process:**
1. **Unit tests:** Run all tests
2. **Integration testing:** Start Docker, run scripts against real environment
3. **Acceptance criteria:** Verify each AC with evidence

**Transitions:**
- ✅ Pass → QA_REVIEW (ready for docs)
- ❌ Fail → IMPLEMENTING (fix issues)

---

### 5. Documentation (→ DOCS_UPDATE)

**Command:** `/update-docs {task-id}`
**Agent:** writer

**Purpose:** Update documentation for infrastructure changes.

**Infrastructure has higher documentation requirements:**
- Developers interact with tooling daily
- New developers need onboarding docs
- Troubleshooting guides prevent support burden

**Required Documentation:**

| Type | Documentation |
|------|---------------|
| Config files | Usage guide, customization options, VS Code integration |
| Scripts | CLI usage, flags, error codes, troubleshooting |
| CI/CD | What runs when, how to debug failures, artifacts |
| Package stubs | API documentation, usage examples |

**Artifacts:**
1. README update (package or root)
2. KB page (if significant)
3. CONVENTIONS.md update (if new convention)
4. Inline comments (for non-obvious config)

**Transitions:**
- ✅ Success → PR_READY
- ❌ Failure → Re-run `/update-docs`

---

### 6. PR Creation (PR_READY → DONE)

**Manual step** - Human creates PR and merges.

**Human Checkpoint:** PR review is the human validation point. The user must run each command manually, providing natural friction. PR creation step provides final human review before merge.

---

## State Machines

### Simple Infrastructure

```
DRAFT
  │ /implement (developer)
  ▼
IMPLEMENTING
  │ (tool execution validates)
  ▼
VALIDATION ─── (failed) ──────────► IMPLEMENTING
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

### Simple Infrastructure + Security

```
DRAFT
  │ /implement (developer)
  ▼
IMPLEMENTING
  │ /review-code (reviewer)
  ▼
CODE_REVIEW ─── (issues) ─────────► IMPLEMENTING
  │ (approved)
  │ (tool execution validates)
  ▼
VALIDATION ─── (failed) ──────────► IMPLEMENTING
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

### Standard Infrastructure

```
DRAFT
  │ /analyze (analyst)
  ▼
ANALYZED
  │ /review-plan (architect)
  ▼
APPROVED
  │ /write-tests (developer)
  ▼
TESTS_READY
  │ /implement (developer)
  ▼
IMPLEMENTING
  │ /review-code (reviewer)
  ▼
CODE_REVIEW ─── (issues) ─────────► IMPLEMENTING
  │ (approved)
  │ /qa (qa) ─── FRESH CONTEXT + Integration
  ▼
QA_REVIEW ───── (failed) ─────────► IMPLEMENTING
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

**Start a simple infrastructure task:**
```bash
/implement E01-T010        # Create config/code
# Validate by running tool (pnpm lint, pnpm test, etc.)
/update-docs E01-T010      # Update documentation
# Manual: create PR and merge
```

**Start a simple infrastructure task with security:**
```bash
/implement E01-T010        # Create config/code
/review-code E01-T010      # Mandatory security review
# Validate by running tool
/update-docs E01-T010      # Update documentation
# Manual: create PR and merge
```

**Start a standard infrastructure task:**
```bash
/analyze E01-T009          # Analysis spec
/review-plan E01-T009      # Approve approach
/write-tests E01-T009      # Write tests first (TDD)
/implement E01-T009        # Implement to pass tests
/review-code E01-T009      # Code review
/qa E01-T009               # QA validation
/update-docs E01-T009      # Update documentation
# Manual: create PR and merge
```

**Check task status:**
```bash
# Active tasks
cat backlog/tasks/{epic}/{task-id}.md

# Completed tasks
cat backlog/completed/{epic}/{task-id}.md
```

---

## Label Reference

| Label | Effect |
|-------|--------|
| `infra:simple` | Use simple workflow (skip analysis, TDD, code review) |
| `security` | Force CODE_REVIEW phase (even with `infra:simple`) |

---

## Why These Decisions

### No TDD for Config Files

Configuration files are **declarative**, not procedural. They have no logic to test. Validation is **execution-based**: if the tool runs and produces expected output, the config is correct.

### TDD for Scripts/Utilities

Scripts have **procedural logic** with edge cases, error handling, and failure modes. Unit tests catch bugs that aren't immediately obvious. Integration tests validate real-world execution.

### Package Stubs Use Standard Workflow

Stubs define **contracts** that future code depends on. While TypeScript validates interface syntax (like PostgreSQL validates schema), the design decisions warrant full analysis and review.

### CI/CD Testing via Local Checks

The project runs CI/CD checks locally on commit via pre-commit hooks. This validates workflow changes before they reach remote CI. The actual CI run provides the integration test.

### Documentation Always Required

Infrastructure has **high developer experience impact**. Developers interact with tooling daily. Missing docs create support burden and slow onboarding.
