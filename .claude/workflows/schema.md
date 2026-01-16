# Schema Workflow

> **Category:** `schema`
> **Use for:** Database tables, migrations, Drizzle schema definitions

## Workflow Overview

### Simple Schema (`schema:simple` label)

```
DRAFT → SCHEMA_ANALYZED → PLAN_REVIEW → APPROVED →
IMPLEMENTING → QA_REVIEW → DOCS_UPDATE → PR_READY → DONE
```

### Complex Schema (default)

```
DRAFT → SCHEMA_ANALYZED → PLAN_REVIEW → APPROVED →
IMPLEMENTING → MIGRATION_REVIEW → QA_REVIEW → DOCS_UPDATE → PR_READY → DONE
```

**Key differences from development workflow:**
- Uses `/analyze-schema` instead of `/analyze` (data model focus)
- No TDD phase (TypeScript + PostgreSQL validate schema)
- Migration review instead of code review (safety focus)
- QA includes integration testing (real PostgreSQL validation)

---

## Simple vs Complex Schema

### Simple Schema (`schema:simple`)

PM sets this label at task creation when ALL criteria are met:

- ✅ New table with standard columns (uuid PK, timestamps, varchar, etc.)
- ✅ No data transformation in migration
- ✅ No enum changes
- ✅ No FK to new tables (only references existing tables)
- ✅ No custom types (ltree, custom JSONB structures)

**Workflow:** Skip migration review (straightforward changes)

### Complex Schema (default)

Any task that doesn't meet simple criteria, including:

- ❌ Data transformation in migration (UPDATE existing rows)
- ❌ Enum changes (add/remove/rename values)
- ❌ New FK relationships between new tables
- ❌ Custom types (ltree, structured JSONB)
- ❌ Index strategy changes on existing tables
- ❌ Any ALTER on tables with production data

**Workflow:** Require migration review (safety-critical changes)

---

## Phase Reference

| Phase | Command | Input | Output |
|-------|---------|-------|--------|
| DRAFT → SCHEMA_ANALYZED | `/analyst:analyze-schema` | Task file | Schema analysis with tech debt assessment |
| SCHEMA_ANALYZED → PLAN_REVIEW | `/architect:review-plan` | Schema analysis | Implementation spec (approved schema) |
| APPROVED → IMPLEMENTING | `/developer:implement` | Spec | Schema + migration files |
| IMPLEMENTING → MIGRATION_REVIEW | `/reviewer:review-migration` | Migration files | Migration review report |
| MIGRATION_REVIEW → QA_REVIEW | `/qa:qa` | Schema + migration | QA report (unit + integration) |
| QA_REVIEW → DOCS_UPDATE | `/writer:update-docs` | All artifacts | Documentation updates |
| DOCS_UPDATE → PR_READY | — | — | Manual PR creation |

---

## Phase Details

### 1. Schema Analysis (DRAFT → SCHEMA_ANALYZED)

**Command:** `/analyze-schema {task-id}`
**Agent:** schema-analyst

**Purpose:** Analyze data model implications and long-term tech debt risks.

**Process:**
1. Read task file and acceptance criteria
2. Read existing schema files (`packages/db/src/schema/*.ts`)
3. Read ARCHITECTURE.md for entity relationships
4. Design proposed schema (table, columns, indexes, relations)
5. Analyze data model fit with existing entities
6. Assess tech debt risks for each decision
7. Consider alternative approaches
8. Document migration complexity and rollback strategy
9. Formulate questions for human review

**Artifact:** `backlog/docs/specs/{epic}/{task-id}-spec.md`

**Key sections in output:**
- Proposed Schema (TypeScript + SQL preview)
- Data Model Analysis (relationships, queries enabled/prevented)
- Future Extensibility assessment
- **Tech Debt Risk Assessment** (table with risk level, reversibility, mitigation)
- Migration Complexity matrix
- Alternatives Considered
- Questions for Human Review
- Checklist for PLAN_REVIEW

**Why this is different from `/analyze`:**

| `/analyze` (Development) | `/analyze-schema` (Schema) |
|--------------------------|---------------------------|
| 3 implementation approaches | 1 recommendation + alternatives |
| Short-term trade-offs | Long-term implications |
| "How to build this" | "What are we committing to" |
| Implementation risk | Tech debt risk |

**Transitions:**
- ✅ Success → SCHEMA_ANALYZED
- ❌ Failure → Re-run `/analyze-schema`

---

### 2. Plan Review (SCHEMA_ANALYZED → PLAN_REVIEW)

**Command:** `/review-plan {task-id}`
**Agent:** architect

**Purpose:** Review and approve schema design with explicit tech debt sign-off.

**Process:**
1. Read schema analysis
2. Evaluate proposed schema against requirements
3. Review tech debt risks - **explicitly accept or reject each**
4. Answer questions raised by schema-analyst
5. Finalize spec with any modifications
6. Document approved schema design

**Human checkpoint:** Before APPROVED, human must:
- [ ] Confirm entity relationships match domain model understanding
- [ ] Accept tech debt risks as documented
- [ ] Verify future extensibility needs are addressed
- [ ] Approve rollback strategy

**Artifact:** Updated `backlog/docs/specs/{epic}/{task-id}-spec.md`

**Transitions:**
- ✅ Approved (with tech debt sign-off) → APPROVED
- ❌ Rejected → Re-run `/analyze-schema` with feedback

---

### 3. Implementation (APPROVED → IMPLEMENTING)

**Command:** `/implement {task-id}`
**Agent:** developer

**Purpose:** Create schema definition and migration files.

**Process:**
1. Read approved spec with schema design
2. Create Drizzle schema file (`packages/db/src/schema/{entity}.ts`)
3. Define table with columns, constraints, indexes
4. Define relations (if applicable)
5. Export types (`type Entity`, `type NewEntity`)
6. Create migration file (`packages/db/src/migrations/NNNN_{description}.sql`)
7. Create down migration (rollback)
8. Update schema index exports
9. Run `pnpm typecheck` - must pass
10. Run `pnpm lint` - must pass

**Artifacts:**
- Schema file (listed in `code_files` frontmatter)
- Migration file (listed in `code_files` frontmatter)

**No TDD for schema because:**
- TypeScript compilation validates schema syntax
- PostgreSQL validates constraints at migration time
- Integration testing validates runtime behavior
- Unit tests for schema are redundant with these layers

**Transitions:**
- ✅ Success → IMPLEMENTING (ready for review)
- ❌ Failure → Re-run `/implement`

---

### 4. Migration Review (IMPLEMENTING → MIGRATION_REVIEW)

**Command:** `/review-migration {task-id}`
**Agent:** reviewer (migration mode)
**Condition:** Complex schema only (skip for `schema:simple`)

**Purpose:** Review migration safety, reversibility, and data integrity.

**Process:**
1. Read migration SQL files
2. Run safety checklist:

**Safety Checks:**
- [ ] Down migration exists
- [ ] Down migration tested (applies cleanly)
- [ ] No data loss in migration
- [ ] Idempotent-friendly (safe to re-run if interrupted)

**PostgreSQL-Specific:**
- [ ] Enum pattern correct (rename-recreate-drop for changes)
- [ ] Lock impact assessed (large table indexes)
- [ ] Extension dependencies documented
- [ ] Transaction safety verified

**Data Integrity:**
- [ ] NOT NULL columns have DEFAULT for existing rows
- [ ] CASCADE DELETE appropriate (won't delete too much)
- [ ] Unique constraints won't fail on existing data
- [ ] Type changes fit existing data

**Operational:**
- [ ] Large data migrations batched
- [ ] Rollback plan documented
- [ ] Maintenance window needed? (flagged if yes)

**Artifact:** `backlog/docs/reviews/{epic}/{task-id}-migration-review.md`

**Transitions:**
- ✅ Approved → MIGRATION_REVIEW (ready for QA)
- ❌ Issues found → IMPLEMENTING (fix migration)

---

### 5. QA Validation (MIGRATION_REVIEW → QA_REVIEW)

**Command:** `/qa {task-id}`
**Agent:** qa

**Purpose:** Validate schema against real PostgreSQL with integration testing.

**Key Characteristic:** Starts with **fresh context**.

**Process:**

**1. Unit Validation:**
- Run `pnpm typecheck` - must pass
- Run `pnpm lint` - must pass
- Run `pnpm test` - must pass

**2. Integration Testing (Real PostgreSQL):**
- Start Docker infrastructure (`pnpm docker:up`)
- Apply migration (`pnpm db:migrate`)
- Verify migration applied (check tracking table)
- Test constraints enforced (insert invalid data → expect rejection)
- Test FK relationships (insert orphan → expect rejection)
- Test indexes created (verify query plans)
- Test down migration (rollback works)
- Stop infrastructure (`pnpm docker:down`)

**3. Acceptance Criteria Validation:**
- Verify each AC with evidence from integration tests

**Artifact:** `backlog/docs/reviews/{epic}/{task-id}-qa-report.md`

**Report includes:**
- AC verification with evidence
- Integration test results (migration apply, constraints, rollback)
- Edge case testing
- Overall assessment

**Transitions:**
- ✅ Pass → QA_REVIEW (ready for docs)
- ❌ Fail → IMPLEMENTING (fix issues)

---

### 6. Documentation (QA_REVIEW → DOCS_UPDATE)

**Command:** `/update-docs {task-id}`
**Agent:** writer

**Purpose:** Update documentation to reflect new schema.

**Process:**
1. Update ARCHITECTURE.md entity section
2. Update `packages/db/README.md` with new table
3. Create/update KB page for entity (if significant)
4. Verify type exports are documented
5. Set workflow_state to PR_READY

**Artifact:** Documentation Updates section in task file

**Transitions:**
- ✅ Success → PR_READY
- ❌ Failure → Re-run `/update-docs`

---

### 7. PR Creation (PR_READY → DONE)

**Manual step** - Human creates PR and merges.

---

## Why No TDD for Schema

Schema correctness is validated by multiple layers that make unit tests redundant:

| Layer | What It Validates | Tests Needed? |
|-------|-------------------|---------------|
| TypeScript | Schema syntax, type exports, relation references | ❌ No |
| PostgreSQL | Column types, constraints, FK validity, indexes | ❌ No |
| Integration | Constraints enforced, queries work, rollback works | ✅ Yes (in QA) |

**Unit tests for schema typically verify:**
- "Does this schema file export the right types?" → TypeScript does this
- "Are the columns defined correctly?" → PostgreSQL does this at migration
- "Do constraints work?" → PostgreSQL does this at runtime

**The real validation** is applying the migration to a real database and testing behavior - which happens in QA integration testing.

---

## Tech Debt Risk Assessment

Schema decisions are **shackling** - they're hard to reverse and affect everything downstream.

### Why Schema Gets Extra Scrutiny

| Decision | Impact if Wrong | Reversibility |
|----------|-----------------|---------------|
| Column type | Data truncation, precision loss | Hard |
| Nullable vs NOT NULL | Application crashes or data loss | Medium |
| FK relationship | Wrong domain model | Very Hard |
| Cascade behavior | Accidental data deletion | Hard |
| Index strategy | Performance problems at scale | Easy |
| Enum values | Limited extensibility | Hard |

### Required in Schema Analysis

Every `/analyze-schema` output must include:

```markdown
## Tech Debt Risk Assessment

| Decision | Risk Level | Reversibility | Mitigation |
|----------|------------|---------------|------------|
| [Decision] | Low/Medium/High | Easy/Medium/Hard/Very Hard | [How to mitigate] |
```

### Human Sign-off Required

Before APPROVED, human explicitly reviews and accepts each tech debt risk.

---

## State Machine

### Simple Schema

```
DRAFT
  │ /analyze-schema (schema-analyst)
  ▼
SCHEMA_ANALYZED
  │ /review-plan (architect)
  │ + Tech Debt Sign-off
  ▼
APPROVED
  │ /implement (developer)
  ▼
IMPLEMENTING
  │ /qa (qa) ─── FRESH CONTEXT + Integration
  ▼
QA_REVIEW ───── (failed) ──────────► IMPLEMENTING
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

### Complex Schema

```
DRAFT
  │ /analyze-schema (schema-analyst)
  ▼
SCHEMA_ANALYZED
  │ /review-plan (architect)
  │ + Tech Debt Sign-off
  ▼
APPROVED
  │ /implement (developer)
  ▼
IMPLEMENTING
  │ /review-migration (reviewer)
  ▼
MIGRATION_REVIEW ─── (issues) ─────► IMPLEMENTING
  │ (approved)
  │ /qa (qa) ─── FRESH CONTEXT + Integration
  ▼
QA_REVIEW ───── (failed) ──────────► IMPLEMENTING
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

**Start a simple schema task:**
```bash
/analyst:analyze-schema E01-T007   # Schema analysis (data model focus)
/architect:review-plan E01-T007    # Approve with tech debt sign-off
/developer:implement E01-T007      # Create schema + migration
/qa:qa E01-T007                    # Validate + integration test
/writer:update-docs E01-T007       # Update documentation
# Manual: create PR and merge
```

**Start a complex schema task:**
```bash
/analyst:analyze-schema E01-T007     # Schema analysis (data model focus)
/architect:review-plan E01-T007      # Approve with tech debt sign-off
/developer:implement E01-T007        # Create schema + migration
/reviewer:review-migration E01-T007  # Migration safety review
/qa:qa E01-T007                      # Validate + integration test
/writer:update-docs E01-T007         # Update documentation
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

## New Commands Required

This workflow introduces new commands not yet implemented:

| Command | Agent | Purpose | Status |
|---------|-------|---------|--------|
| `/analyze-schema` | schema-analyst | Data model analysis with tech debt focus | **New** |
| `/review-migration` | reviewer | Migration safety checklist | **New** |

See [schema_workflow.md](../backlog/drafts/task_workflow_planning/schema_workflow.md) for detailed proposals.
