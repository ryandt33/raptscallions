---
description: Schema analysis with tech debt focus for database tasks
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
---

# Analyze Schema

You are an **analyst** performing schema analysis with a focus on technical debt assessment.

## Input

- Task ID (e.g., `E02-T005`)

## Process

### 1. Read the Task

```bash
# Find and read the task file
cat backlog/tasks/{EPIC-ID}/{TASK-ID}.md
```

Understand:
- What schema changes are needed
- Why this change is being made
- Acceptance criteria

### 2. Analyze Current Schema

```bash
# Read existing schema files
cat packages/db/src/schema/*.ts

# Check existing migrations
ls -la packages/db/src/migrations/

# Look for related tables
grep -r "references" packages/db/src/schema/
```

Document:
- Current table structures
- Existing relationships
- Index definitions
- Constraints

### 3. Assess Technical Debt Impact

Evaluate each area:

| Area | Questions |
|------|-----------|
| **Data Integrity** | Will this change affect existing data? Are there null values to handle? |
| **Performance** | Does this need new indexes? Will it affect query performance? |
| **Backwards Compatibility** | Can old code still work during migration? |
| **Rollback Safety** | Can this migration be reversed? What data would be lost? |
| **Dependencies** | What code depends on this schema? What breaks if we change it? |

### 4. Propose Migration Approach

Consider:
- Single migration vs multi-step
- Online vs offline migration
- Data backfill requirements
- Zero-downtime considerations

### 5. Write Analysis Document

Create at `backlog/docs/specs/{EPIC-ID}/{TASK-ID}-analysis.md`

## Output

### Analysis Document Structure

```markdown
---
task_id: "{TASK-ID}"
type: "schema-analysis"
created_at: "{ISO_DATE}"
---

# Schema Analysis: {Task Title}

## Summary

[1-2 sentences describing the schema change]

## Current State

### Tables Affected

| Table | Current Structure | Notes |
|-------|------------------|-------|
| users | [columns] | [relationship notes] |

### Dependencies

- `apps/api/src/services/user.service.ts` - Uses users table
- `packages/auth/src/session.ts` - References users

## Proposed Change

### New/Modified Schema

\`\`\`typescript
// Example schema change
export const users = pgTable('users', {
  // ... existing columns
  newColumn: varchar('new_column', { length: 255 }),
});
\`\`\`

### Migration Strategy

**Approach:** [Single migration / Multi-step / Online DDL]

**Steps:**
1. [First migration step]
2. [Second step if needed]
3. [Backfill if needed]

## Technical Debt Assessment

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss on rollback | Low | High | Take backup before migration |
| Performance degradation | Medium | Medium | Add index in same migration |

### Debt Introduced

- [ ] **None** - Clean change with no new debt
- [ ] **Acceptable** - Minor debt, tracked for future cleanup
- [ ] **Requires Follow-up** - Creates debt task for resolution

**Details:** [If debt is introduced, explain what and why]

### Debt Resolved

[List any existing tech debt this change resolves]

## Rollback Plan

\`\`\`sql
-- Down migration
ALTER TABLE users DROP COLUMN new_column;
\`\`\`

**Data Loss on Rollback:** [Yes/No - explain what would be lost]

## Acceptance Criteria Mapping

| AC | How Validated |
|----|---------------|
| AC1 | [Migration creates column] |
| AC2 | [Index exists after migration] |

## Open Questions

- [Any unresolved questions for architect review]
```

## Update Task Status

```yaml
workflow_state: "ANALYZED"
```

Add to History:
```
| {DATE} | ANALYZED | analyst | Schema analysis complete, tech debt assessed |
```

## Next Step

Based on the **schema** workflow:

Run `/review-plan {task-id}` (architect) - Tech debt sign-off required

---

*Schema analysis requires explicit tech debt assessment because database changes have long-term implications.*
