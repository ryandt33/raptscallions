---
description: Migration safety review for schema tasks
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Review Migration

You are a **reviewer** performing migration safety review for database schema changes.

## Input

- Task ID (e.g., `E02-T005`)

## Process

### 1. Read Task and Analysis

```bash
# Read the task file
cat backlog/tasks/{EPIC-ID}/{TASK-ID}.md

# Read the schema analysis
cat backlog/docs/specs/{EPIC-ID}/{TASK-ID}-analysis.md
```

### 2. Review Migration Files

```bash
# Find new migration files
ls -la packages/db/src/migrations/

# Read the migration
cat packages/db/src/migrations/NNNN_*.sql
```

### 3. Safety Checklist

#### Data Integrity

- [ ] No data loss in up migration
- [ ] Acceptable data loss in down migration (documented)
- [ ] NULL handling is explicit
- [ ] Default values are sensible
- [ ] Foreign key constraints are valid

#### Performance

- [ ] Indexes created for new foreign keys
- [ ] No full table scans on large tables
- [ ] Online DDL used where appropriate
- [ ] Lock duration is acceptable

#### Reversibility

- [ ] Down migration exists
- [ ] Down migration is tested
- [ ] Rollback data loss is documented
- [ ] No irreversible operations without approval

#### Compatibility

- [ ] Old code handles missing columns gracefully
- [ ] New columns have defaults or are nullable
- [ ] No breaking changes to existing queries
- [ ] API compatibility maintained

### 4. Test Migration

```bash
# Run migration on test database
pnpm db:migrate:test

# Verify schema state
pnpm db:generate  # Should show no changes needed

# Test rollback
pnpm db:migrate:down:test
pnpm db:migrate:test  # Re-apply
```

### 5. Review Tech Debt Assessment

From the analysis document:
- Is the debt assessment accurate?
- Are mitigations in place for identified risks?
- Should any debt create follow-up tasks?

## Output

### Migration Review Report

Create at `backlog/docs/reviews/{EPIC-ID}/{TASK-ID}-migration-review.md`:

```markdown
---
task_id: "{TASK-ID}"
type: "migration-review"
reviewer: "reviewer"
date: "{ISO_DATE}"
verdict: "APPROVED" | "NEEDS_REVISION"
---

# Migration Review: {Task Title}

## Summary

**Verdict:** APPROVED / NEEDS_REVISION

[1-2 sentence summary of migration safety]

## Safety Assessment

### Data Integrity

| Check | Status | Notes |
|-------|--------|-------|
| No data loss (up) | ✅ | |
| Documented data loss (down) | ✅ | Column data lost on rollback |
| NULL handling | ✅ | Explicit NOT NULL with default |
| FK constraints | ✅ | Valid references |

### Performance

| Check | Status | Notes |
|-------|--------|-------|
| Index coverage | ✅ | Index on new FK |
| Lock duration | ⚠️ | ~30s on users table |
| Online DDL | N/A | Small table |

### Reversibility

| Check | Status | Notes |
|-------|--------|-------|
| Down migration exists | ✅ | |
| Down migration tested | ✅ | |
| Rollback documented | ✅ | |

### Compatibility

| Check | Status | Notes |
|-------|--------|-------|
| Old code compatible | ✅ | Column is nullable |
| No breaking changes | ✅ | |

## Tech Debt Review

**Analysis Accuracy:** [Agree/Disagree with assessment]

**Additional Concerns:**
- [Any additional tech debt identified]

**Follow-up Tasks Needed:**
- [ ] [Task description if needed]

## Issues Found

### Must Fix (Blocking)

[Issues that must be fixed before merge]

### Should Fix (Recommended)

[Issues that should be addressed]

### Suggestions (Optional)

[Nice-to-have improvements]

## Migration Test Results

\`\`\`
[Output of migration test commands]
\`\`\`

## Recommendation

**APPROVED** - Migration is safe to apply
OR
**NEEDS_REVISION** - See Must Fix issues above
```

### Update Task File

Add to Reviews section:

```markdown
### Migration Review

- **Reviewer:** reviewer
- **Date:** {DATE}
- **Verdict:** APPROVED / NEEDS_REVISION
- **Notes:** [Summary of findings]
```

## Update Task Status

If APPROVED:
```yaml
workflow_state: "QA_REVIEW"
```

If NEEDS_REVISION:
```yaml
workflow_state: "IMPLEMENTING"
```

Add to History:
```
| {DATE} | MIGRATION_REVIEW | reviewer | Migration safety review: {verdict} |
```

## Next Step

Based on the **schema** workflow:

**If APPROVED:**
Run `/qa:qa {task-id}` - Integration testing

**If NEEDS_REVISION:**
Run `/developer:implement {task-id}` - Address review feedback

---

*Migration review ensures database changes are safe, reversible, and won't cause production issues.*
