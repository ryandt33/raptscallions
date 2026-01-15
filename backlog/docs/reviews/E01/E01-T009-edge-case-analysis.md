# Database Migration Testing - Edge Case Gap Analysis

**Document:** E01-T009 Edge Case Analysis
**Date:** 2026-01-14
**Status:** Outstanding gaps identified for future enhancement

---

## Executive Summary

The database migration validation system (E01-T009) successfully handles the **core edge cases** required for production use:
- ✅ Zero migrations (fresh project)
- ✅ First migration only (0001)
- ✅ Migration sequence gaps detection
- ✅ Unsafe SQL pattern warnings (DROP TABLE, enum changes, NOT NULL)

However, analysis of the test suite and validation script reveals **7 categories of edge cases** that are NOT currently validated. While these gaps are **low-to-medium priority** (Drizzle Kit auto-generation handles most scenarios), they represent potential failure modes worth documenting.

---

## Edge Cases Currently Validated

### Migration Number Sequencing ✅

**Test file:** `packages/db/src/__tests__/migrations.test.ts` lines 439-522
**Validation script:** `packages/db/scripts/migrate-check.ts` lines 98-118

| Scenario | Tested | Location |
|----------|--------|----------|
| Zero migrations (fresh project) | ✅ YES | migrations.test.ts:442-451 |
| First migration only (0001) | ✅ YES | migrations.test.ts:453-467 |
| Gap detection (0001, 0002, 0004) | ✅ YES | migrations.test.ts:469-493 |
| Actual migrations validation | ✅ YES | migrations.test.ts:494-521 |

**Coverage:** 100% for sequential numbering validation

### Unsafe SQL Patterns ✅

**Test file:** `packages/db/src/__tests__/migrations.test.ts` lines 79-252
**Validation script:** `packages/db/scripts/migrate-check.ts` lines 64-96

| Pattern | Detection | Location |
|---------|-----------|----------|
| DROP TABLE without IF EXISTS | ✅ WARNING | migrate-check.ts:69-71 |
| Enum ALTER without rename-recreate-drop | ✅ WARNING | migrate-check.ts:73-85 |
| NOT NULL without DEFAULT | ✅ WARNING | migrate-check.ts:87-95 |

**Coverage:** Core unsafe patterns detected with actionable warnings

---

## Edge Cases NOT Validated

### 1. Duplicate Migration Numbers ❌

**Priority:** MEDIUM
**Risk:** Could cause migration application conflicts

**Scenario:**
```
packages/db/src/migrations/
  0005_add_user_preferences.sql
  0005_add_notifications.sql  # Duplicate number
```

**Current Behavior:**
- ✅ Tests check for sequential numbering (lines 31-49)
- ❌ No check for duplicate numbers within sequence
- ❌ Drizzle migration runner behavior: **UNDEFINED** (which migration runs first?)

**Detection Gap:**
```typescript
// migrate-check.ts lines 99-105
const numbers = migrationFiles.map((f) => {
  const match = f.match(/^(\d{4})_/);
  return parseInt(match?.[1] || "0", 10);
}).sort((a, b) => a - b);

// ❌ No check for duplicates in numbers array
// Should add: numbers.filter((n, i, arr) => arr.indexOf(n) === i).length !== numbers.length
```

**Why It Matters:**
- Concurrent development: Two developers create migration 0011 on different branches
- Git merge doesn't conflict (different filenames)
- CI might apply migrations in undefined order
- Production deployment could apply wrong migration first

**Recommendation:**
Add duplicate detection to `migrate-check.ts`:
```typescript
// After line 105, add:
const uniqueNumbers = [...new Set(numbers)];
if (uniqueNumbers.length !== numbers.length) {
  result.errors.push(
    `Duplicate migration numbers detected. Each migration must have unique number.`
  );
  result.valid = false;
}
```

**Workaround (current):**
- Git conflicts on migration number
- Code review catches duplicates
- Manual renumbering before merge

---

### 2. First Migration NOT 0001 ❌

**Priority:** LOW
**Risk:** Breaks sequential numbering assumption

**Scenario:**
```
packages/db/src/migrations/
  0010_initial_schema.sql  # First migration starts at 0010, not 0001
```

**Current Behavior:**
- ✅ Tests check that first file matches `^0001_` (line 75)
- ❌ No enforcement in validation script
- ❌ Gap detection only warns if already have migrations

**Detection Gap:**
```typescript
// migrate-check.ts lines 99-118
// Only checks gaps BETWEEN migrations, not starting number
if (numbers.length > 1) {
  // ...gap detection
}

// ❌ No check: if (numbers.length > 0 && numbers[0] !== 1)
```

**Why It Matters:**
- Violates migration numbering convention (should start at 0001)
- Could indicate migrations were deleted/lost
- Confusing for new developers ("why start at 0010?")

**Recommendation:**
Add first migration validation to `migrate-check.ts`:
```typescript
// After line 118, add:
if (numbers.length > 0 && numbers[0] !== 1) {
  result.warnings.push(
    `First migration is ${String(numbers[0]).padStart(4, '0')}, expected 0001. ` +
    `This may indicate missing or deleted migrations.`
  );
}
```

**Workaround (current):**
- Code review would catch this
- Not a breaking issue (migrations still apply)
- Documentation assumes 0001 start

---

### 3. Invalid Migration Filename Format ❌

**Priority:** LOW
**Risk:** Files ignored silently during migration application

**Scenario:**
```
packages/db/src/migrations/
  0001_create_users.sql       ✅ Valid
  migration.sql               ❌ Invalid (no number)
  0002.sql                    ❌ Invalid (no description)
  fix_users.sql               ❌ Invalid (no number)
  0003_add-columns.sql        ⚠️  Questionable (hyphen vs underscore)
```

**Current Behavior:**
- ✅ Tests validate format: `/^\d{4}_[\w-]+\.sql$/` (line 27)
- ❌ No runtime enforcement
- ❌ Invalid files are **silently ignored** during migration application

**Detection Gap:**
```typescript
// migrate-check.ts lines 55-62
const migrationFiles = readdirSync(migrationsDir).filter((f) =>
  f.endsWith(".sql")
);

// ❌ No format validation beyond .sql extension
// Should check: /^\d{4}_[\w-]+\.sql$/.test(f)
```

**Why It Matters:**
- Developer creates `fix_enum_bug.sql` manually (no number)
- File is ignored during migration application
- Developer thinks fix is applied, but it's not
- Silent failure mode

**Recommendation:**
Add filename format validation to `migrate-check.ts`:
```typescript
// After line 57, add:
const invalidFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => !/^\d{4}_[\w-]+\.sql$/.test(f));

if (invalidFiles.length > 0) {
  result.warnings.push(
    `Invalid migration filenames detected (will be ignored): ${invalidFiles.join(", ")}`
  );
}
```

**Workaround (current):**
- Drizzle Kit auto-generates valid filenames
- Manual migrations are rare
- Would fail in code review (hopefully)

---

### 4. Empty Migration Files ❌

**Priority:** MEDIUM
**Risk:** Incomplete work committed to repository

**Scenario:**
```sql
-- packages/db/src/migrations/0011_add_user_preferences.sql
-- (empty file or only comments)
```

**Current Behavior:**
- ❌ No validation for file content
- ❌ Empty file passes validation
- ✅ Would fail during SQL execution (no statements to run)

**Detection Gap:**
```typescript
// migrate-check.ts lines 64-66
for (const file of migrationFiles) {
  const filePath = join(migrationsDir, file);
  const content = readFileSync(filePath, "utf-8");

  // ❌ No check for empty or comment-only content
```

**Why It Matters:**
- Developer generates migration but forgets to add SQL
- File gets committed (passes pre-commit hook)
- CI applies "migration" (does nothing)
- Tracking table shows migration as "applied" but schema unchanged
- **Silent schema drift** (code expects schema changes that didn't happen)

**Recommendation:**
Add content validation to `migrate-check.ts`:
```typescript
// After line 66, add:
const sqlContent = content
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .filter(line => line.trim().length > 0)
  .join('\n');

if (sqlContent.length === 0) {
  result.warnings.push(
    `${file}: Empty migration file (no SQL statements)`
  );
}
```

**Workaround (current):**
- Would be caught in code review (empty diff)
- Migration would be tracked but ineffective
- Database schema would diverge from expectations

---

### 5. SQL Syntax Errors ❌

**Priority:** LOW (Expected behavior)
**Risk:** None (caught at runtime)

**Scenario:**
```sql
-- 0011_broken_migration.sql
CREAT TABLE users (  -- Typo: CREAT instead of CREATE
  id UUID PRIMARY KEY
);
```

**Current Behavior:**
- ❌ No SQL syntax validation in `migrate-check.ts`
- ✅ Caught during migration application (PostgreSQL error)
- ✅ Transaction rollback prevents partial application

**Why NOT Validated:**
- SQL syntax validation requires PostgreSQL connection
- Pre-commit hook should be fast (<5 seconds)
- Parsing SQL correctly is complex (comments, strings, etc.)
- PostgreSQL is the authoritative validator

**Design Decision:**
Intentionally NOT validated in static checks. SQL errors are caught at runtime:
1. Local: `pnpm db:migrate` fails with clear error
2. CI: Migration application step fails before tests
3. Production: Migration rollback via PostgreSQL transaction

**Recommendation:**
Document this intentional gap in migration workflow docs (E01-T013).

---

### 6. Migration File Size / Complexity ❌

**Priority:** LOW
**Risk:** Performance issues with large migrations

**Scenario:**
```sql
-- 0011_backfill_user_data.sql (5000 lines)
-- Inserts 1 million rows via INSERT statements
INSERT INTO users VALUES (...);  -- x 1,000,000
```

**Current Behavior:**
- ❌ No file size validation
- ❌ No warning for large migrations
- ❌ No estimated duration calculation

**Why It Matters:**
- Large migrations can timeout in Docker (default: no timeout)
- Could cause downtime in production (long-running migration)
- Developer might not realize migration is too large

**Recommendation:**
Add file size warning to `migrate-check.ts`:
```typescript
// After line 66, add:
const stats = statSync(filePath);
const sizeKB = stats.size / 1024;

if (sizeKB > 500) {  // Warn if > 500KB
  result.warnings.push(
    `${file}: Large migration file (${sizeKB.toFixed(0)}KB). ` +
    `Consider splitting or using seed data instead.`
  );
}
```

**Workaround (current):**
- Code review would catch extremely large files
- Developer testing would reveal timeout issues
- Production deployment testing required

---

### 7. Concurrent Migration Application ❌

**Priority:** LOW (Future concern)
**Risk:** Race conditions in multi-instance deployments

**Scenario:**
```
Production Deployment (3 instances):
  Instance 1: Starts applying migration 0011
  Instance 2: Starts applying migration 0011 (same time)
  Instance 3: Starts applying migration 0011 (same time)
```

**Current Behavior:**
- ❌ No migration locking mechanism
- ❌ PostgreSQL transactions prevent conflicts but duplicate work
- ❌ `__drizzle_migrations` table could have race conditions

**Why It Matters:**
- Kubernetes deployments with multiple replicas
- Blue-green deployments with overlapping instances
- Could cause migration failures or deadlocks

**Design Decision:**
Out of scope for single-instance development workflow. Document as future enhancement.

**Recommendation (future):**
Implement advisory locks in `migrate.ts`:
```typescript
// Before migrations
await sql`SELECT pg_advisory_lock(12345)`;
try {
  await migrate(db, { migrationsFolder: "./src/migrations" });
} finally {
  await sql`SELECT pg_advisory_unlock(12345)`;
}
```

---

## Summary of Gaps

| Edge Case | Priority | Risk | Recommendation |
|-----------|----------|------|----------------|
| 1. Duplicate numbers | MEDIUM | Undefined behavior | Add duplicate detection to migrate-check.ts |
| 2. First migration ≠ 0001 | LOW | Convention violation | Add first number validation (warning) |
| 3. Invalid filename format | LOW | Silent ignore | Add filename format validation |
| 4. Empty migration files | MEDIUM | Silent schema drift | Add content validation |
| 5. SQL syntax errors | LOW | Caught at runtime | Document intentional gap |
| 6. Large migration files | LOW | Performance issues | Add file size warning |
| 7. Concurrent application | LOW | Future concern | Document for future enhancement |

---

## Impact Assessment

### Currently Mitigated Risks

Most edge cases are **low risk** due to existing safeguards:

1. **Drizzle Kit auto-generation:** Developers rarely hand-write migrations
2. **Code review:** Manual migrations reviewed before merge
3. **CI validation:** Migrations applied before tests (E01-T012 when implemented)
4. **PostgreSQL transactions:** Failed migrations rollback automatically
5. **Git conflicts:** Duplicate numbers likely cause merge conflicts

### Remaining Vulnerabilities

**Top 3 risks worth addressing:**

1. **Duplicate migration numbers** (MEDIUM)
   - Could slip through code review
   - Undefined migration application order
   - **Fix effort:** Low (10 lines of code)

2. **Empty migration files** (MEDIUM)
   - Silent schema drift (tracking shows applied, but schema unchanged)
   - Hard to debug ("migration was applied, why isn't schema updated?")
   - **Fix effort:** Low (15 lines of code)

3. **Invalid filename format** (LOW-MEDIUM)
   - Manual migrations silently ignored
   - Confusing behavior for developers
   - **Fix effort:** Low (10 lines of code)

---

## Recommendations

### Immediate Actions (E01-T009 or E01-T011)

Add to `packages/db/scripts/migrate-check.ts`:

1. **Duplicate number detection** (10 lines)
2. **Empty file warning** (15 lines)
3. **Invalid filename warning** (10 lines)

**Total effort:** ~30 minutes of implementation + testing

### Documentation (E01-T013)

Document in `docs/database-migrations.md`:

1. Migration numbering conventions (must start at 0001, sequential)
2. Filename format requirements (NNNN_description.sql)
3. Content requirements (cannot be empty)
4. File size guidelines (keep under 500KB)
5. SQL syntax validation (happens at runtime, not pre-commit)

### Future Enhancements (Post-MVP)

Consider for production readiness:

1. Migration locking for concurrent deployments
2. Estimated duration calculation (based on file size)
3. Dry-run mode (validate SQL without applying)
4. Rollback migration generation (reverse SQL templates)

---

## Testing Strategy

### Unit Tests to Add

Add to `packages/db/src/__tests__/migrations.test.ts`:

```typescript
describe("Additional Edge Cases", () => {
  it("should detect duplicate migration numbers", () => {
    const duplicateMigrations = [
      "0001_create_users.sql",
      "0002_add_groups.sql",
      "0002_add_notifications.sql",  // Duplicate
    ];
    // Assert: validation detects duplicate
  });

  it("should warn when first migration is not 0001", () => {
    const migrations = ["0010_initial_schema.sql"];
    // Assert: warning about starting number
  });

  it("should detect invalid filenames", () => {
    const invalidFiles = [
      "migration.sql",
      "0001.sql",
      "fix_bug.sql",
    ];
    // Assert: warnings for each invalid file
  });

  it("should warn on empty migration files", () => {
    const emptyContent = "-- Just a comment\n\n";
    // Assert: warning about empty file
  });
});
```

---

## Appendix: Code References

### Test File Coverage

- **migrations.test.ts:31-49** - Migration number sequence validation
- **migrations.test.ts:79-252** - Unsafe pattern detection
- **migrations.test.ts:439-522** - Edge case handling (zero, first, gaps)

### Validation Script Coverage

- **migrate-check.ts:24-45** - Schema drift detection (Git-based)
- **migrate-check.ts:47-62** - Migration discovery and basic validation
- **migrate-check.ts:64-96** - Unsafe SQL pattern detection
- **migrate-check.ts:98-118** - Migration number gap detection

### Integration Test Coverage

- **integration/migration-workflow.test.ts** - End-to-end migration application
- Covers: Enum patterns, data migrations, rollback behavior

---

## Conclusion

E01-T009 successfully addresses the **critical edge cases** for production migration workflows. The identified gaps are **low-to-medium priority** and mostly handled by existing safeguards (Drizzle Kit generation, code review, CI validation).

**Key Takeaways:**

1. ✅ Core sequential numbering validation is complete
2. ✅ Unsafe SQL patterns are detected
3. ⚠️  Three medium-priority gaps worth fixing (duplicates, empty files, invalid names)
4. 📝 Document intentional gaps (SQL syntax validation at runtime)
5. 🚀 Future: Migration locking for multi-instance deployments

**Recommended Next Steps:**

1. Add duplicate/empty/invalid detection to `migrate-check.ts` (E01-T011 or follow-up)
2. Document all edge cases and validation gaps in migration workflow docs (E01-T013)
3. Defer advanced features (locking, dry-run, size warnings) to future enhancements

The migration validation system is **production-ready** for single-instance deployments with standard Drizzle Kit workflows.
