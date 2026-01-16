---
title: Reviewer Commands
description: Commands for code review and migration review
source_synced_at: 2026-01-16
---

# Reviewer Commands

Commands that invoke the [Reviewer Agent](/ai-development/agents/current/reviewer) for code review.

## Overview

Reviewer commands handle code quality assessment. The reviewer uses the fresh-eyes principle — they have NO context from previous agents, just like real code review.

## Commands

| Command | Description | Used In Workflows |
|---------|-------------|-------------------|
| `/review-code` | Fresh-eyes code review | development, infrastructure (standard), bugfix (standard) |
| `/review-migration` | Migration safety review | schema |

---

## `/review-code`

Fresh-eyes code review with TypeScript strictness.

### Purpose

Review code for:
- Correctness (implements spec correctly)
- Readability (understandable without explanation)
- Maintainability (modular, no magic numbers)
- Testing (covers ACs, edge cases)
- Conventions (follows project patterns)

### Invocation

```bash
/review-code E01-T001
```

### Input

- Task ID (e.g., `E01-T001`)
- Task must be in `CODE_REVIEW` state (after UI_REVIEW passes or is skipped)

### Initial vs. Re-Review

**Initial review (no review exists):**
- Fresh eyes, comprehensive review
- No context from previous agents
- Creates new review document

**Re-review (review exists):**
- Focus only on previously identified issues
- Verify fixes were applied
- Update existing review

### TypeScript Strictness

::: danger Automatic Rejection
These cause automatic rejection:
- ❌ Any TypeScript errors
- ❌ Any `any` types
- ❌ Any `as any` assertions
- ❌ Any `@ts-ignore` or `@ts-expect-error`
- ❌ Missing explicit return types
:::

### Process

1. Check for existing review (determines review type)
2. Read task file and spec
3. Read all code files and test files
4. Run `pnpm typecheck` — MUST pass
5. Run `pnpm test`
6. Run `pnpm lint`
7. Perform review
8. Create/update review document

### Output

Code review at `backlog/docs/reviews/{epic}/{task-id}-code-review.md`:

```markdown
# Code Review: {TASK-ID}

**Verdict:** APPROVED | CHANGES_REQUESTED

## Summary
[2-3 sentence assessment]

## Files Reviewed
- `path/to/file.ts` - [note]

## Issues

### 🔴 Must Fix (Blocking)
1. **File: `path/to/file.ts`, Line ~XX**
   Issue: [Description]
   Suggestion: [Fix]

### 🟡 Should Fix (Non-blocking)
1. **File: `path/to/file.ts`**
   Issue: [Description]

### 💡 Suggestions (Optional)
1. [Suggestion]

## Checklist
- [ ] Zero TypeScript errors
- [ ] Zero `any` types
- [ ] Code implements spec correctly
- [ ] Tests cover ACs
```

### Verdict Criteria

**APPROVED:**
- Code ready for QA
- May have minor suggestions

**CHANGES_REQUESTED:**
- Issues must be fixed
- Be specific about what and why

### Next Step

**If APPROVED:**
Run `/qa {task-id}` (qa)

**If CHANGES_REQUESTED:**
Run `/implement {task-id}` (developer)

### Source Reference

`.claude/commands/reviewer/review-code.md`

---

## `/review-migration`

Migration safety review for schema tasks.

### Purpose

Review database migrations for:
- Backwards compatibility
- Data integrity
- Rollback safety
- Index considerations
- Foreign key relationships

### Invocation

```bash
/review-migration E01-T001
```

### Input

- Task ID for a schema task
- Migration files must exist

### Process

1. Read migration files
2. Analyze schema changes
3. Check for breaking changes
4. Verify rollback strategy
5. Create migration review

### Safety Checks

- [ ] Migration is additive or has data migration plan
- [ ] Indexes exist for query patterns
- [ ] Foreign keys have proper cascades
- [ ] No data loss scenarios
- [ ] Rollback tested

### Next Step

**If APPROVED:**
Run `/qa {task-id}` (qa)

**If CHANGES_REQUESTED:**
Run `/implement {task-id}` (developer)

### Source Reference

`.claude/commands/reviewer/review-migration.md`

---

## Related Commands

- [Developer Commands](/ai-development/commands/developer) — Fixes issues reviewer finds
- [Designer Commands](/ai-development/commands/designer) — Reviews UI before code review
- [QA Commands](/ai-development/commands/qa) — Validates after code review
