# Schema Category: Workflow Analysis

> **Status:** Draft
> **Created:** 2026-01-16
> **Purpose:** Analyze whether schema tasks need the full development workflow or a lighter alternative

## What Schema Tasks Involve

Based on completed tasks (E01-T003 through E01-T006, E04-T001):

| Component | Example | Validation Method |
|-----------|---------|-------------------|
| Table definition | `packages/db/src/schema/users.ts` | TypeScript compilation |
| Column types | `uuid`, `varchar`, `timestamp` | PostgreSQL (runtime) |
| Constraints | `NOT NULL`, `UNIQUE`, `CHECK` | PostgreSQL (runtime) |
| Indexes | `index().on(column)` | PostgreSQL (runtime) |
| Foreign keys | `references(() => users.id)` | PostgreSQL (runtime) |
| Enums | `pgEnum('status', [...])` | PostgreSQL (runtime) |
| Relations | `relations(users, ...)` | Drizzle ORM (query time) |
| Migration SQL | `0001_create_users.sql` | PostgreSQL (apply time) |
| Type exports | `type User = typeof users.$inferSelect` | TypeScript compilation |

**Key insight:** Most schema correctness is validated by PostgreSQL itself, not by tests.

---

## Current Workflow (Full Development)

Schema tasks currently go through:

```
DRAFT → ANALYZED → [UX_REVIEW] → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW →
DOCS_UPDATE → DONE
```

**Observations from completed tasks:**

| Task | Tests Written | What Tests Actually Validate |
|------|---------------|------------------------------|
| E01-T003 (Drizzle setup) | 25 | CustomType API usage, config structure |
| E01-T004 (users) | 55 | Type inference, schema shape, enum values |
| E01-T005 (groups) | 44 | ltree type, JSONB defaults, slug format |
| E01-T006 (group_members) | 41 | FK references, unique constraints, relations |
| E04-T001 (sessions) | 44 | Composite keys, sequence logic, state enum |

**What these tests actually do:**
- Verify TypeScript types are inferred correctly
- Verify schema objects have expected properties
- Verify enums have correct values
- Verify relations are defined

**What these tests DON'T do:**
- Actually create tables in PostgreSQL
- Verify constraints work at runtime
- Verify migrations apply cleanly
- Verify indexes are created

---

## The Redundancy Problem

### Layer 1: TypeScript Compilation

**Already validates:**
- Schema file syntax
- Type exports work
- Relations reference valid tables
- Drizzle API usage is correct

**No tests needed for:** "Does this TypeScript code compile?"

### Layer 2: PostgreSQL (via Migration)

**Already validates:**
- Column types are valid
- Constraints are syntactically correct
- Foreign keys reference existing tables
- Indexes can be created
- Enums are defined

**No tests needed for:** "Does PostgreSQL accept this schema?"

### Layer 3: Drizzle Runtime

**Validates at query time:**
- Relations work for joins
- Type inference matches actual data
- Query builder produces valid SQL

**Tests add value for:** "Does the query builder work as expected?"

### Layer 4: Application Logic

**This is where tests add value:**
- Business rules (soft delete filtering)
- Complex queries (hierarchy traversal)
- Edge cases (concurrent modifications)

---

## What Unit Tests Actually Catch (Schema Context)

| Issue | Caught By | Tests Needed? |
|-------|-----------|---------------|
| Typo in column name | TypeScript | ❌ No |
| Wrong column type | PostgreSQL (migration) | ❌ No |
| Missing NOT NULL | PostgreSQL (migration) | ❌ No |
| Bad FK reference | PostgreSQL (migration) | ❌ No |
| Invalid enum value | TypeScript | ❌ No |
| Missing index | PostgreSQL (migration) | ❌ No |
| Type export wrong | TypeScript | ❌ No |
| Relation misconfigured | Drizzle (query time) | ⚠️ Maybe |
| Complex default logic | Runtime | ✅ Yes |
| Custom type behavior | Runtime | ✅ Yes |

**Conclusion:** Most schema issues are caught by TypeScript or PostgreSQL. Tests add value only for:
1. Custom types with logic (ltree operations)
2. Complex defaults or computed values
3. Relation query patterns
4. Business logic built on schema

---

## The 7 Benefits Matrix: Schema Workflow

### Current Full Workflow

| Phase Transition | Command | 1-Context | 2-Friction | 3-Artifact | 4-Specialize | 5-Recovery | Score |
|------------------|---------|-----------|------------|------------|--------------|------------|-------|
| DRAFT → ANALYZED | `/analyze` | ✅ | ✅ | ✅ spec | ✅ | ✅ | 5/5 |
| ANALYZED → UX_REVIEW | `/review-ux` | ⏭️ SKIP | ⏭️ SKIP | ⏭️ SKIP | ⏭️ SKIP | ⏭️ SKIP | N/A |
| UX_REVIEW → PLAN_REVIEW | `/review-plan` | ✅ | ✅ | ✅ spec | ✅ | ✅ | 5/5 |
| APPROVED → TESTS_READY | `/write-tests` | ✅ | ⚠️ Low | ⚠️ Redundant | ⚠️ Same | ✅ | 2/5 |
| TESTS_READY → IMPLEMENTING | `/implement` | ❌ Same | ❌ None | ✅ schema | ❌ Same | ✅ | 2/5 |
| IMPLEMENTING → CODE_REVIEW | `/review-code` | ✅ | ✅ | ✅ review | ✅ | ✅ | 5/5 |
| CODE_REVIEW → QA_REVIEW | `/qa` | ✅ | ✅ | ✅ report | ✅ | ✅ | 5/5 |
| QA_REVIEW → DOCS_UPDATE | `/update-docs` | ✅ | ⚠️ Low | ✅ docs | ✅ | ✅ | 4/5 |

### Analysis of Weak Points

**APPROVED → TESTS_READY (Score: 2/5)**

- **Context Insulation:** ✅ Fresh developer sees spec
- **Natural Friction:** ⚠️ Low - nobody reviews schema tests before implementation
- **Artifact Persistence:** ⚠️ Tests are largely redundant with TypeScript/PostgreSQL
- **Specialization:** ⚠️ Same developer will implement
- **Error Recovery:** ✅ Can retry

**Problem:** Writing tests for schema is largely redundant. The tests verify things that TypeScript compilation and PostgreSQL migration already validate.

**TESTS_READY → IMPLEMENTING (Score: 2/5)**

- Same issues as development workflow
- But worse for schema because TDD adds less value

---

## Proposed Schema Workflow

### Option A: Skip TDD, Keep Full Review

```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
IMPLEMENTING → CODE_REVIEW → QA_REVIEW → DOCS_UPDATE → DONE
```

**Changes:**
- Remove `/write-tests` phase
- `/implement` writes schema + migration directly
- Code review validates migration safety
- QA validates against real PostgreSQL

**Rationale:**
- TypeScript catches type errors
- PostgreSQL catches schema errors
- Real DB testing (in QA) catches runtime issues
- Unit tests for schema are redundant

### Option B: Skip TDD, Lighter Review

```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
IMPLEMENTING → QA_REVIEW → DOCS_UPDATE → DONE
```

**Changes:**
- Remove `/write-tests` phase
- Remove `/review-code` phase
- QA with integration is the real validation

**Rationale:**
- Schema is mechanical (follow conventions)
- Migration correctness is binary (applies or fails)
- Code review adds little value for schema files
- QA with real DB is the definitive test

### Option C: Minimal Workflow

```
DRAFT → PLAN_REVIEW → APPROVED →
IMPLEMENTING → QA_REVIEW → DONE
```

**Changes:**
- Skip analysis (schema approach is usually obvious)
- Skip code review
- Skip docs (schema is self-documenting)

**Rationale:**
- Schema tasks are well-defined (add table X with columns Y)
- Approach is rarely ambiguous
- Real DB validation is all that matters

---

## Matrix Comparison: Options

| Phase | Full (Current) | Option A | Option B | Option C |
|-------|----------------|----------|----------|----------|
| Analysis | ✅ | ✅ | ✅ | ❌ |
| UX Review | ⏭️ Skip | ⏭️ Skip | ⏭️ Skip | ⏭️ Skip |
| Plan Review | ✅ | ✅ | ✅ | ✅ |
| Write Tests | ✅ | ❌ | ❌ | ❌ |
| Implement | ✅ | ✅ | ✅ | ✅ |
| Code Review | ✅ | ✅ | ❌ | ❌ |
| QA (+ Integration) | ✅ | ✅ | ✅ | ✅ |
| Docs Update | ✅ | ✅ | ✅ | ❌ |
| **Total Phases** | 8 | 6 | 5 | 4 |

### Benefit Analysis by Option

| Benefit | Full | Option A | Option B | Option C |
|---------|------|----------|----------|----------|
| Context Insulation | High | High | Medium | Low |
| Natural Friction | High | High | Medium | Low |
| Artifact Persistence | High | High | Medium | Low |
| Redundancy Elimination | Low | Medium | High | High |
| Speed | Low | Medium | High | Very High |

---

## What QA Validates for Schema

With QA including integration testing, it validates:

1. **Migration applies cleanly** - `pnpm db:migrate` succeeds
2. **Constraints work** - Insert invalid data, expect rejection
3. **Indexes created** - Query plan shows index usage
4. **Foreign keys enforced** - Insert orphan record, expect failure
5. **Types correct** - Insert data, read it back, verify shape
6. **Relations work** - Query with joins, verify results

**This is the real test.** Unit tests can't validate any of this.

---

## Recommendation

### Primary: Option A (Skip TDD, Keep Full Review)

```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
IMPLEMENTING → CODE_REVIEW → QA_REVIEW → DOCS_UPDATE → DONE
```

**Why:**
- Eliminates redundant test-writing phase
- Keeps code review for migration safety (migrations are hard to reverse)
- Keeps QA with integration for real validation
- Keeps docs for API documentation

**When to use full workflow instead:**
- Custom types with complex logic (ltree operations)
- Schemas with computed defaults
- Complex business rules in schema layer

### Alternative: Option B for Simple Schemas

```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
IMPLEMENTING → QA_REVIEW → DOCS_UPDATE → DONE
```

**Use when:**
- Simple table additions
- Straightforward column types
- No custom behavior

---

## Migration Safety Concerns

Migrations deserve special attention because they're hard to reverse.

### What Code Review Should Check (Schema)

| Concern | Check |
|---------|-------|
| Down migration exists | Can we rollback? |
| Data preservation | Does migration preserve existing data? |
| Index impact | Will new indexes lock tables? |
| Enum changes | Using rename-recreate-drop pattern? |
| FK cascade | Cascade delete appropriate? |
| Default values | Defaults make sense for existing rows? |

### What QA Should Check (Schema)

| Concern | Check |
|---------|-------|
| Migration applies | `pnpm db:migrate` succeeds on fresh DB |
| Migration applies | `pnpm db:migrate` succeeds on seeded DB |
| Rollback works | Down migration applies cleanly |
| Constraints enforced | Invalid data rejected |
| Performance | Queries use indexes |

---

## Open Questions

1. **Should code review be optional for simple schemas?**
   - Add table with standard columns = skip review
   - Migration with data transformation = require review

2. **Should we have a `migration-review` specialist?**
   - Focused on migration safety, not code quality
   - Lighter than full code review

3. **What tests (if any) should schema tasks include?**
   - None for simple schemas?
   - Only for custom types?
   - Only for complex relations?

4. **How do we mark a schema task as "simple" vs "complex"?**
   - PM decides at creation?
   - Analyst recommends during analysis?
   - Label like `schema:simple` vs `schema:complex`?

---

## Tech Debt Potential: Schema Decisions Are Shackling

Schema decisions are among the most consequential in a codebase. Unlike code refactoring (which can be done incrementally), schema changes:

1. **Require migrations** - Every change needs a new migration file
2. **Affect production data** - Wrong decisions corrupt or lose data
3. **Are hard to reverse** - Down migrations are risky with real data
4. **Propagate widely** - Types, queries, APIs all depend on schema
5. **Lock in relationships** - FK constraints define domain model forever

### Why More Human Input Is Needed

| Decision | Impact if Wrong | Reversibility |
|----------|-----------------|---------------|
| Column type | Data truncation, precision loss | Hard (data migration) |
| Nullable vs NOT NULL | Application crashes or data loss | Medium (requires default) |
| FK relationship | Wrong domain model | Very Hard (data restructure) |
| Cascade behavior | Accidental data deletion | Hard (requires audit) |
| Index strategy | Performance problems at scale | Easy (just add/remove) |
| Enum values | Limited extensibility | Hard (rename-recreate-drop) |

### Capturing Tech Debt Potential

**Proposal:** Add explicit "Tech Debt Risk" assessment to schema workflow.

During **PLAN_REVIEW**, architect should flag:

```markdown
## Tech Debt Risk Assessment

| Decision | Risk Level | Reversibility | Notes |
|----------|------------|---------------|-------|
| Using JSONB for settings | Medium | Easy | Flexible but no schema validation |
| Cascade delete on group_members | High | Hard | Could accidentally delete user associations |
| ltree for hierarchy | Low | Very Hard | Good choice, but committed to PostgreSQL |
```

**Human checkpoint:** Before APPROVED, human reviews tech debt risks and explicitly accepts them.

### Recommendation: Emphasize Review for Schema

Given the shackling nature of schema decisions:

1. **Always require PLAN_REVIEW** - No skipping for "simple" schemas
2. **Add Tech Debt Risk section** - Explicit in spec
3. **Human sign-off on risks** - Before APPROVED state
4. **Migration review focus** - Reviewer focuses on migration safety, not code style

---

## Code Review: Conditional Based on Complexity

### Simple Schema (Skip Code Review)

**Criteria (PM decides at task creation):**
- New table with standard columns (uuid PK, timestamps, varchar, etc.)
- No data transformation in migration
- No enum changes
- No FK to new tables (only existing)
- No custom types

**Label:** `schema:simple`

**Workflow:**
```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
IMPLEMENTING → QA_REVIEW → DOCS_UPDATE → DONE
```

### Complex Schema (Require Code Review)

**Criteria:**
- Data transformation in migration (UPDATE existing rows)
- Enum changes (add/remove/rename values)
- New FK relationships
- Custom types (ltree, JSONB with structure)
- Index strategy changes
- Any ALTER on existing tables with data

**Label:** `schema:complex` (or absence of `schema:simple`)

**Workflow:**
```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
IMPLEMENTING → MIGRATION_REVIEW → QA_REVIEW → DOCS_UPDATE → DONE
```

---

## Proposal: Migration Review Specialist

### Why a Specialized Review?

Code review for schema is different from code review for application logic:

| Code Review | Migration Review |
|-------------|------------------|
| Readability | Safety |
| Patterns | Reversibility |
| Test coverage | Data preservation |
| Performance (general) | Lock contention |
| Maintainability | Enum patterns |

### Migration Reviewer Checklist

A specialized `/review-migration` command (or mode of `/review-code`) would check:

#### Safety Checks

- [ ] **Down migration exists** - Can we rollback?
- [ ] **Down migration tested** - Does it actually work?
- [ ] **No data loss** - Does migration preserve existing data?
- [ ] **Idempotent friendly** - Safe to re-run if interrupted?

#### PostgreSQL-Specific

- [ ] **Enum pattern** - Using rename-recreate-drop for enum changes?
- [ ] **Lock impact** - Will new indexes lock large tables?
- [ ] **Extension dependencies** - Any new extensions required?
- [ ] **Transaction safety** - Can migration run in transaction?

#### Data Integrity

- [ ] **NOT NULL with DEFAULT** - Adding NOT NULL has default for existing rows?
- [ ] **FK cascade appropriate** - CASCADE DELETE won't accidentally delete too much?
- [ ] **Unique constraints** - Existing data won't violate new constraints?
- [ ] **Type changes** - Existing data fits new type (e.g., varchar(50) → varchar(20))?

#### Operational

- [ ] **Migration size** - Large data migrations should be batched
- [ ] **Rollback plan** - What if migration fails mid-way?
- [ ] **Timing** - Should this run during maintenance window?

### Implementation Options

**Option 1: Mode of existing `/review-code`**
- Add `--migration` flag
- Reviewer uses different checklist
- Same agent, different focus

**Option 2: Separate `/review-migration` command**
- Dedicated command for schema tasks
- Could use lighter model (checklist-based)
- Clearer separation of concerns

**Option 3: Part of architect role**
- Architect already reviews spec
- Extend to review migration SQL
- Single owner for schema decisions

**Recommendation:** Option 2 - Separate command. Migration review is specialized enough to warrant its own checklist and focus.

---

## Current CI Migration Checks

### What CI Currently Does

From `.github/workflows/ci.yml`:

```yaml
# 1. Start PostgreSQL 16 service
services:
  postgres:
    image: postgres:16-alpine

# 2. Enable ltree extension
- name: Enable PostgreSQL extensions
  run: psql ... -c "CREATE EXTENSION IF NOT EXISTS ltree;"

# 3. Run migrations
- name: Run database migrations
  run: pnpm --filter @raptscallions/db db:migrate

# 4. Verify migrations applied
- name: Verify migration tracking table
  run: |
    MIGRATION_COUNT=$(psql ... -c "SELECT COUNT(*) FROM drizzle.__drizzle_migrations")
    if [ "$MIGRATION_COUNT" -lt 1 ]; then
      exit 1
    fi

# 5. Run tests (with real PostgreSQL)
- name: Run tests
  run: pnpm test
```

### What `migrate-check.ts` Validates

From `packages/db/scripts/migrate-check.ts`:

| Check | What It Does |
|-------|--------------|
| Schema drift | Detects uncommitted schema changes (via git) |
| Filename format | Validates `NNNN_description.sql` pattern |
| Empty migrations | Warns about migrations with no SQL |
| DROP TABLE safety | Warns if missing `IF EXISTS` |
| ALTER TYPE safety | Warns about unsafe enum patterns |
| NOT NULL safety | Warns about NOT NULL without DEFAULT |
| Sequence gaps | Warns about gaps in migration numbers |
| Duplicate numbers | Errors on duplicate migration numbers |

### Gap Analysis: Is CI Sufficient for QA?

| Validation Need | CI Coverage | QA Needed? |
|-----------------|-------------|------------|
| Migration applies | ✅ Yes (runs `db:migrate`) | ❌ No |
| Migration tracking | ✅ Yes (checks table) | ❌ No |
| Filename format | ✅ Yes (migrate-check.ts) | ❌ No |
| Empty migration warning | ✅ Yes | ❌ No |
| Unsafe patterns | ✅ Yes (warnings) | ❌ No |
| Constraints enforced | ❌ No | ✅ Yes |
| FK relationships work | ❌ No | ✅ Yes |
| Indexes created | ❌ No | ✅ Yes |
| Down migration works | ❌ No | ✅ Yes |
| Data preservation | ❌ No | ✅ Yes |
| Query performance | ❌ No | ✅ Yes |

### Verdict: CI Is Necessary But Not Sufficient

**CI catches:**
- Migration syntax errors (won't apply)
- Basic safety patterns (via warnings)
- Regression (existing migrations still work)

**CI does NOT catch:**
- Logic errors (wrong constraints)
- Performance issues (missing indexes)
- Reversibility (down migration works)
- Data integrity (constraints actually enforced)
- Integration (queries using schema work)

**Conclusion:** QA with integration testing is still needed for schema tasks. CI is a safety net, not a replacement.

---

## Summary

| Current Problem | Proposed Solution |
|-----------------|-------------------|
| Writing tests for things TypeScript validates | Skip TDD phase |
| Writing tests for things PostgreSQL validates | Skip TDD phase |
| Full code review for mechanical schemas | Conditional: simple = skip, complex = migration review |
| Integration testing as separate phase | Merged into QA |
| Schema decisions are shackling | Add Tech Debt Risk assessment, require human sign-off |
| No specialized migration review | Add `/review-migration` command with focused checklist |

**Key insight:** Schema correctness is validated by the type system and database, not by unit tests. The real validation is applying the migration to a real database (integration testing in QA).

**Additional insight:** Schema decisions create long-term tech debt. More human oversight is needed at PLAN_REVIEW, with explicit Tech Debt Risk assessment.

---

## Recommended Schema Workflow

### For Simple Schema (`schema:simple` label)

```
DRAFT → ANALYZED → PLAN_REVIEW (+ Tech Debt Risk) → APPROVED →
IMPLEMENTING → QA_REVIEW (+ Integration) → DOCS_UPDATE → DONE
```

- PM sets `schema:simple` label
- Skip TDD (redundant)
- Skip code review (simple changes)
- QA includes real DB testing

### For Complex Schema (default)

```
DRAFT → ANALYZED → PLAN_REVIEW (+ Tech Debt Risk) → APPROVED →
IMPLEMENTING → MIGRATION_REVIEW → QA_REVIEW (+ Integration) → DOCS_UPDATE → DONE
```

- No label or `schema:complex`
- Skip TDD (redundant)
- Migration review (focused checklist)
- QA includes real DB testing

### Human Checkpoints

1. **PLAN_REVIEW** - Review Tech Debt Risk assessment, accept long-term implications
2. **MIGRATION_REVIEW** (complex only) - Review migration safety
3. **PR Creation** - Final human review before merge

---

## Proposal: `/analyze-schema` Command

### Why a Separate Command?

The existing `/analyze` command focuses on **implementation approaches** - "Here are 3 ways to build this feature." Schema tasks need a different kind of analysis focused on **long-term implications** - "What are we committing to with this data model?"

| `/analyze` (Development) | `/analyze-schema` (Schema) |
|--------------------------|---------------------------|
| How to implement | What to model |
| Short-term trade-offs | Long-term implications |
| Code complexity | Data model correctness |
| Performance now | Flexibility later |
| 3 implementation approaches | 1 recommended schema + alternatives |

### When to Use

- All tasks with `schema` category label
- Replaces `/analyze` in the schema workflow
- Produces schema-specific analysis artifact

### Command Specification

```
/analyze-schema E01-T007
```

**Agent:** `schema-analyst` (new) or mode of `analyst`

**Input:**
- Task file with acceptance criteria
- Existing schema files (`packages/db/src/schema/*.ts`)
- ARCHITECTURE.md (entity relationships section)

**Output:** `backlog/docs/specs/{epic}/{task-id}-spec.md` with schema-specific sections

### Output Template

```markdown
# Schema Analysis: {TASK-ID}

**Analyst:** schema-analyst
**Date:** {DATE}
**Task:** {TASK-TITLE}

## Acceptance Criteria

[Copy from task file]

## Proposed Schema

### Table Definition

```typescript
export const {tableName} = pgTable('{table_name}', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ... columns
}, (table) => ({
  // ... indexes
}));
```

### Migration Preview

```sql
CREATE TABLE {table_name} (
  -- ... SQL preview
);
```

### Type Exports

```typescript
export type {Entity} = typeof {tableName}.$inferSelect;
export type New{Entity} = typeof {tableName}.$inferInsert;
```

## Data Model Analysis

### Entity Relationships

```
┌─────────────┐       ┌─────────────┐
│   users     │──1:N──│  {new_table}│
└─────────────┘       └─────────────┘
```

- **Relationship to existing entities:** [How this fits in the domain model]
- **Queries this enables:** [What queries become possible]
- **Queries this prevents/complicates:** [What becomes harder]

### Future Extensibility

| Likely Future Need | How This Schema Handles It |
|--------------------|---------------------------|
| [Need 1] | [Easy/Hard/Impossible] - [Why] |
| [Need 2] | [Easy/Hard/Impossible] - [Why] |
| [Need 3] | [Easy/Hard/Impossible] - [Why] |

## Tech Debt Risk Assessment

| Decision | Risk Level | Reversibility | Mitigation |
|----------|------------|---------------|------------|
| [Decision 1] | Low/Medium/High | Easy/Medium/Hard/Very Hard | [How to mitigate] |
| [Decision 2] | ... | ... | ... |

### Risk Explanations

**[Decision 1]:** [Detailed explanation of why this is risky and what could go wrong]

**[Decision 2]:** [...]

## Migration Complexity

| Scenario | Complexity | Notes |
|----------|------------|-------|
| Fresh database | Easy/Medium/Hard | [Notes] |
| Existing data (dev) | Easy/Medium/Hard | [Notes] |
| Existing data (prod) | Easy/Medium/Hard | [Notes] |
| Rollback | Easy/Medium/Hard | [Notes] |

### Rollback Strategy

[Describe how to rollback this migration if needed]

## Alternatives Considered

### Alternative 1: [Name]

**Schema:**
```typescript
// Alternative approach
```

**Pros:**
- [Pro 1]
- [Pro 2]

**Cons:**
- [Con 1]
- [Con 2]

**Why not chosen:** [Explanation]

### Alternative 2: [Name]

[Same format]

## Recommendation

**Recommended approach:** [Proposed Schema above]

**Confidence level:** High/Medium/Low

**Key assumptions:**
1. [Assumption 1]
2. [Assumption 2]

**Questions for human review:**
1. [Question that needs human input]
2. [Another question]

## Checklist for PLAN_REVIEW

Before approving, human should confirm:

- [ ] Entity relationships match domain model understanding
- [ ] Tech debt risks are acceptable
- [ ] Future extensibility needs are addressed
- [ ] Rollback strategy is viable
- [ ] Questions above are answered
```

### Process Flow

1. **Read task file** - Understand what schema is needed
2. **Read existing schemas** - Understand current data model
3. **Design proposed schema** - Table, columns, indexes, relations
4. **Analyze data model fit** - How does this integrate?
5. **Assess tech debt risks** - What are we committing to?
6. **Consider alternatives** - What else could we do?
7. **Document migration complexity** - How hard to apply/rollback?
8. **Formulate questions** - What needs human input?

### Key Differences from `/analyze`

| Aspect | `/analyze` | `/analyze-schema` |
|--------|-----------|-------------------|
| Output focus | Implementation approaches | Data model implications |
| Number of options | 3 approaches | 1 recommendation + alternatives |
| Trade-off analysis | Complexity, performance, maintainability | Flexibility, reversibility, correctness |
| Risk assessment | Implementation risk | Tech debt risk |
| Questions | "Which approach?" | "Is this the right model?" |
| Artifact sections | Approaches, Trade-offs, Open Questions | Schema, Relationships, Risks, Migration |

### Agent Instructions (Summary)

The `schema-analyst` agent should:

1. **Think like a DBA** - Focus on data integrity, relationships, constraints
2. **Think long-term** - What will we regret in 6 months?
3. **Be explicit about risks** - Every schema decision has trade-offs
4. **Consider the domain** - Does this model the business correctly?
5. **Plan for failure** - How do we rollback if wrong?
6. **Ask good questions** - Surface decisions that need human judgment

### Implementation Notes

**Option A: New agent file**
- Create `.claude/agents/schema-analyst.md`
- Create `.claude/commands/analyze-schema.md`
- Clear separation of concerns

**Option B: Mode of existing analyst**
- Add schema-specific instructions to `analyst.md`
- Detect via task labels
- Less file proliferation

**Recommendation:** Option A - Separate files. The focus is different enough that mixing them would make both harder to maintain.

### Updated Schema Workflow

With `/analyze-schema`:

```
DRAFT → SCHEMA_ANALYZED → PLAN_REVIEW (+ Tech Debt Sign-off) → APPROVED →
IMPLEMENTING → [MIGRATION_REVIEW] → QA_REVIEW (+ Integration) → DOCS_UPDATE → DONE
```

**State change:** `ANALYZED` → `SCHEMA_ANALYZED` to distinguish from development analysis.

Or keep same state name but different command routes to it based on category label.
