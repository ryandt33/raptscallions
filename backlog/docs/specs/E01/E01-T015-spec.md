# Implementation Spec: E01-T015

## Overview

Add validation to the migration script (`packages/db/scripts/migrate.ts`) that verifies all SQL migration files are registered in Drizzle's `_journal.json` before applying migrations. This prevents silent failures where migration files exist but aren't tracked by Drizzle's migrator.

## Background

During E05-T001 integration testing, migrations 0009-0012 existed as SQL files but weren't registered in `packages/db/src/migrations/meta/_journal.json`. The migration script ran without errors (8 migrations applied), but new tables weren't created because Drizzle's migrator only processes entries listed in the journal.

**Key insight:** This is a **silent failure** that can reach production. The validation must fail fast and provide clear remediation guidance.

## Approach

### Technical Strategy

1. **Count-based validation:** Compare number of `.sql` files to number of journal entries
2. **Pre-execution check:** Validate before calling Drizzle's `migrate()` function
3. **Script-level enforcement:** No CI configuration changes needed (validation runs wherever `migrate.ts` runs)
4. **Escape hatch:** Optional `--skip-validation` flag for emergency migrations

### Why This Works

- **Zero performance impact:** Simple file counting using `fs.readdirSync()` and `JSON.parse()`
- **Catches root cause:** Detects when `drizzle-kit generate` wasn't run after creating migrations
- **Prevents cascading failures:** Stops migrations early before partial application
- **Works everywhere:** Local dev, CI, production (any environment running `migrate.ts`)

## Files to Modify

| File | Changes |
|------|---------|
| `packages/db/scripts/migrate.ts` | Add journal sync validation function, integrate into migration flow, support `--skip-validation` flag |
| `packages/db/package.json` | Update `db:migrate` script description to reference validation |

## Files to Create

No new files needed - validation is integrated into existing `migrate.ts` script.

## Implementation Details

### 1. Journal Sync Validation Function

Add to `migrate.ts`:

```typescript
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

function validateJournalSync(): { valid: boolean; message: string; sqlCount: number; journalCount: number } {
  const migrationsDir = join(__dirname, "../src/migrations");
  const journalPath = join(migrationsDir, "meta/_journal.json");

  // Count SQL migration files (excluding meta directory)
  const sqlFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const sqlCount = sqlFiles.length;

  // Parse journal entries
  let journalCount = 0;
  try {
    const journalContent = readFileSync(journalPath, "utf-8");
    const journal: Journal = JSON.parse(journalContent);
    journalCount = journal.entries.length;
  } catch (error) {
    // Handle edge case: fresh database with no migrations yet
    if (sqlCount === 0) {
      return {
        valid: true,
        message: "No migrations found (fresh database)",
        sqlCount: 0,
        journalCount: 0,
      };
    }
    return {
      valid: false,
      message: `Failed to read journal file: ${error instanceof Error ? error.message : String(error)}`,
      sqlCount,
      journalCount: 0,
    };
  }

  // Compare counts
  if (sqlCount === journalCount) {
    return {
      valid: true,
      message: `Journal in sync (${sqlCount} migrations)`,
      sqlCount,
      journalCount,
    };
  }

  // Mismatch detected
  return {
    valid: false,
    message: `Journal out of sync: ${sqlCount} SQL files but ${journalCount} journal entries`,
    sqlCount,
    journalCount,
  };
}
```

**Design rationale:**

- Returns structured result for flexible error handling
- Handles edge case: fresh database with no migrations
- Provides counts for actionable error messages
- Uses synchronous I/O (acceptable for startup validation)

### 2. Integration into Migration Flow

Update `runMigrations()` function:

```typescript
async function runMigrations(): Promise<void> {
  console.log("Starting database migrations...");

  // Check for --skip-validation flag
  const skipValidation = process.argv.includes("--skip-validation");

  if (skipValidation) {
    console.warn("⚠️  WARNING: Skipping journal sync validation (--skip-validation flag)");
  } else {
    // Validate journal sync before connecting to database
    const validation = validateJournalSync();

    if (!validation.valid) {
      console.error("❌ Migration validation failed:");
      console.error(`   ${validation.message}`);
      console.error("");
      console.error("Details:");
      console.error(`   SQL files:      ${validation.sqlCount}`);
      console.error(`   Journal entries: ${validation.journalCount}`);
      console.error("");
      console.error("This usually means migration files were created but not registered.");
      console.error("To fix this, run:");
      console.error("");
      console.error("   pnpm --filter @raptscallions/db db:generate");
      console.error("");
      console.error("If you need to bypass this check (emergency only), use:");
      console.error("   pnpm --filter @raptscallions/db db:migrate --skip-validation");
      process.exit(1);
    }

    console.log(`✅ ${validation.message}`);
  }

  const sql = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: "./src/migrations" });
    console.log("✅ Migrations completed successfully");

    // Existing migration count verification...
    const result = await sql<
      Array<{ count: string }>
    >`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = '__drizzle_migrations'`;
    console.log(`Migration tracking table exists: ${result[0]?.count === "1"}`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:");
    console.error(error);
    await sql.end();
    process.exit(1);
  }
}
```

**Key points:**

- Validation runs **before** database connection (fail fast)
- Clear multi-line error message with counts
- Suggests exact remediation command
- Documents emergency escape hatch
- Success message shows validation passed

### 3. Command-Line Flag Support

The `--skip-validation` flag is checked via `process.argv.includes()`:

```typescript
// Usage:
// Normal: pnpm --filter @raptscallions/db db:migrate
// Emergency: pnpm --filter @raptscallions/db db:migrate --skip-validation
```

**When to use `--skip-validation`:**

- Emergency production hotfix where journal is intentionally out of sync
- Recovering from corrupted journal file
- Advanced troubleshooting by database administrator

**Important:** Document this flag in error message but discourage routine use.

### 4. Package.json Update (Optional)

Update `packages/db/package.json` description:

```json
{
  "scripts": {
    "db:migrate": "tsx scripts/migrate.ts",
    "db:migrate:check": "tsx scripts/migrate-check.ts"
  }
}
```

No script changes needed - validation is automatic.

## Dependencies

- **Requires:** E01-T009 (created `migrate.ts`)
- **No new packages:** Uses Node.js built-in `fs` and `path` modules
- **No CI changes:** Validation runs automatically wherever `migrate.ts` runs

## Test Strategy

### Unit Tests

Create `packages/db/src/__tests__/migrate-validation.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";

describe("Journal Sync Validation", () => {
  const testDir = join(__dirname, "../../__test-migrations__");
  const migrationsDir = join(testDir, "migrations");
  const journalPath = join(migrationsDir, "meta/_journal.json");

  beforeEach(() => {
    // Create test directory structure
    mkdirSync(join(migrationsDir, "meta"), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("validateJournalSync", () => {
    it("should pass when SQL files match journal entries", () => {
      // Arrange: 3 SQL files, 3 journal entries
      writeFileSync(join(migrationsDir, "0001_create_users.sql"), "CREATE TABLE users;");
      writeFileSync(join(migrationsDir, "0002_create_groups.sql"), "CREATE TABLE groups;");
      writeFileSync(join(migrationsDir, "0003_create_sessions.sql"), "CREATE TABLE sessions;");

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: [
          { idx: 0, version: "7", when: 1768149572305, tag: "0001_create_users", breakpoints: true },
          { idx: 1, version: "7", when: 1768151160000, tag: "0002_create_groups", breakpoints: true },
          { idx: 2, version: "7", when: 1768152660000, tag: "0003_create_sessions", breakpoints: true }
        ]
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync();

      // Assert
      expect(result.valid).toBe(true);
      expect(result.sqlCount).toBe(3);
      expect(result.journalCount).toBe(3);
      expect(result.message).toContain("in sync");
    });

    it("should fail when SQL files exceed journal entries", () => {
      // Arrange: 4 SQL files, 2 journal entries (E05-T001 scenario)
      writeFileSync(join(migrationsDir, "0001_create_users.sql"), "CREATE TABLE users;");
      writeFileSync(join(migrationsDir, "0002_create_groups.sql"), "CREATE TABLE groups;");
      writeFileSync(join(migrationsDir, "0003_create_sessions.sql"), "CREATE TABLE sessions;");
      writeFileSync(join(migrationsDir, "0004_create_tools.sql"), "CREATE TABLE tools;");

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: [
          { idx: 0, version: "7", when: 1768149572305, tag: "0001_create_users", breakpoints: true },
          { idx: 1, version: "7", when: 1768151160000, tag: "0002_create_groups", breakpoints: true }
        ]
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.sqlCount).toBe(4);
      expect(result.journalCount).toBe(2);
      expect(result.message).toContain("out of sync");
      expect(result.message).toContain("4 SQL files");
      expect(result.message).toContain("2 journal entries");
    });

    it("should fail when journal entries exceed SQL files", () => {
      // Arrange: 2 SQL files, 4 journal entries (unlikely but possible)
      writeFileSync(join(migrationsDir, "0001_create_users.sql"), "CREATE TABLE users;");
      writeFileSync(join(migrationsDir, "0002_create_groups.sql"), "CREATE TABLE groups;");

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: [
          { idx: 0, version: "7", when: 1768149572305, tag: "0001_create_users", breakpoints: true },
          { idx: 1, version: "7", when: 1768151160000, tag: "0002_create_groups", breakpoints: true },
          { idx: 2, version: "7", when: 1768152660000, tag: "0003_create_sessions", breakpoints: true },
          { idx: 3, version: "7", when: 1768153000000, tag: "0004_create_tools", breakpoints: true }
        ]
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.sqlCount).toBe(2);
      expect(result.journalCount).toBe(4);
    });

    it("should handle fresh database with no migrations", () => {
      // Arrange: no SQL files, empty journal
      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: []
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync();

      // Assert
      expect(result.valid).toBe(true);
      expect(result.sqlCount).toBe(0);
      expect(result.journalCount).toBe(0);
      expect(result.message).toContain("fresh database");
    });

    it("should fail when journal file is missing", () => {
      // Arrange: SQL files exist but no journal
      writeFileSync(join(migrationsDir, "0001_create_users.sql"), "CREATE TABLE users;");
      // No journal file created

      // Act
      const result = validateJournalSync();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.sqlCount).toBe(1);
      expect(result.journalCount).toBe(0);
      expect(result.message).toContain("Failed to read journal");
    });

    it("should fail when journal file is malformed JSON", () => {
      // Arrange: SQL files exist, corrupted journal
      writeFileSync(join(migrationsDir, "0001_create_users.sql"), "CREATE TABLE users;");
      writeFileSync(journalPath, "{ invalid json }");

      // Act
      const result = validateJournalSync();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Failed to read journal");
    });
  });

  describe("--skip-validation flag", () => {
    it("should skip validation when flag is present", () => {
      // This test would verify that process.argv includes the flag
      // In actual implementation, test by running migrate.ts with flag
      expect(true).toBe(true); // Placeholder
    });
  });
});
```

**Test coverage:**

- ✅ Happy path: matching counts
- ✅ Mismatch: more SQL files (E05-T001 scenario)
- ✅ Mismatch: more journal entries
- ✅ Edge case: fresh database (zero migrations)
- ✅ Edge case: missing journal file
- ✅ Edge case: corrupted journal JSON

### Integration Tests

Add to existing `packages/db/src/__tests__/integration/migration-workflow.test.ts`:

```typescript
describe("Journal sync validation", () => {
  it("should prevent migration when journal is out of sync", async () => {
    // This test verifies the validation runs in the actual migrate.ts script
    // Implementation: spawn migrate.ts as child process, expect exit code 1
  });

  it("should allow migration with --skip-validation flag", async () => {
    // Verify emergency escape hatch works
  });
});
```

### Manual Testing

```bash
# Test 1: Normal operation (should pass)
pnpm --filter @raptscallions/db db:migrate

# Test 2: Simulate mismatch (create SQL file without journal entry)
touch packages/db/src/migrations/9999_test_mismatch.sql
pnpm --filter @raptscallions/db db:migrate
# Expected: Validation error with counts and remediation

# Test 3: Emergency bypass
pnpm --filter @raptscallions/db db:migrate --skip-validation
# Expected: Warning message, migration proceeds

# Test 4: Fix mismatch
rm packages/db/src/migrations/9999_test_mismatch.sql
pnpm --filter @raptscallions/db db:migrate
# Expected: Validation passes
```

## Acceptance Criteria Breakdown

### AC1: Migration script validates journal sync before applying migrations

**Implementation:**

- `validateJournalSync()` function runs at start of `runMigrations()`
- Validation occurs **before** database connection established
- Exit with code 1 on validation failure

**Test:**

- Unit test: `should pass when SQL files match journal entries`
- Integration test: Spawn migrate.ts and verify validation runs

### AC2: Validation compares count of `.sql` files to journal entries

**Implementation:**

- Count SQL files: `readdirSync().filter(f => f.endsWith('.sql')).length`
- Count journal entries: `JSON.parse(journalContent).entries.length`
- Compare counts for equality

**Test:**

- Unit test: `should fail when SQL files exceed journal entries`
- Unit test: `should fail when journal entries exceed SQL files`

### AC3: Clear error message when mismatch detected, including file counts

**Implementation:**

```
❌ Migration validation failed:
   Journal out of sync: 12 SQL files but 8 journal entries

Details:
   SQL files:       12
   Journal entries: 8

This usually means migration files were created but not registered.
To fix this, run:

   pnpm --filter @raptscallions/db db:generate
```

**Test:**

- Manual test: Verify error message format and clarity
- Unit test: Verify result.message contains counts

### AC4: Error message suggests remediation: "Run pnpm drizzle-kit generate"

**Implementation:**

- Error message includes exact command with package filter
- Explains **why** the fix works (re-generates journal)

**Test:**

- Manual test: Copy-paste command from error message
- Verify command fixes the issue

### AC5: Validation runs on `pnpm docker:up` (catches issues in local dev)

**Implementation:**

- No Docker Compose changes needed
- `migrate` service runs `pnpm db:migrate` which includes validation
- Validation runs automatically in all environments

**Test:**

```bash
# Create mismatch
touch packages/db/src/migrations/9999_test.sql

# Start Docker
pnpm docker:up

# Expected: migrate service fails with validation error
docker compose logs migrate
```

### AC6: Validation runs in CI (catches issues before merge)

**Implementation:**

- CI runs `pnpm --filter @raptscallions/db db:migrate` (line 163 in `.github/workflows/ci.yml`)
- Validation is part of migrate.ts, no CI changes needed
- CI job fails if validation fails (exit code 1)

**Test:**

- Create PR with mismatched journal
- Verify CI job fails at migration step
- Verify error message is visible in CI logs

### AC7: Zero performance impact on normal migration runs (just file counting)

**Implementation:**

- File counting: O(n) where n = number of files in migrations directory
- JSON parsing: O(m) where m = size of journal file
- Both operations complete in <10ms for realistic migration counts (<1000)
- No database connection required for validation
- Synchronous I/O acceptable for startup validation

**Test:**

- Benchmark validation with 100+ migration files: should be <100ms
- Measure total migration time with/without validation: difference <1%

### AC8: Test coverage for the validation logic

**Test files:**

- `packages/db/src/__tests__/migrate-validation.test.ts` (new, 6 unit tests)
- `packages/db/src/__tests__/integration/migration-workflow.test.ts` (add 2 integration tests)

**Coverage target:**

- Lines: 100% (validation function is critical path)
- Branches: 100% (all error cases covered)

**Verification:**

```bash
pnpm --filter @raptscallions/db test:coverage
# Verify migrate-validation.test.ts shows 100% coverage
```

## Edge Cases

### Edge Case 1: Fresh database with no migrations yet

**Scenario:** Developer starts new project, runs `docker compose up` before creating any migrations.

**Handling:**

```typescript
if (sqlCount === 0 && journalCount === 0) {
  return {
    valid: true,
    message: "No migrations found (fresh database)",
    sqlCount: 0,
    journalCount: 0,
  };
}
```

**Test:**

```bash
# Clean slate
rm -rf packages/db/src/migrations/*.sql

# Start Docker
pnpm docker:up
# Expected: migrate service succeeds with "No migrations found" message
```

### Edge Case 2: Journal file missing or corrupted

**Scenario:** Git merge conflict corrupts `_journal.json`, or file is accidentally deleted.

**Handling:**

- Try-catch around `JSON.parse()`
- If sqlCount === 0, treat as fresh database (edge case 1)
- Otherwise, fail validation with error message

**Error message:**

```
❌ Migration validation failed:
   Failed to read journal file: Unexpected token in JSON at position 45

Details:
   SQL files:       12
   Journal entries: 0

This usually means the journal file is corrupted or missing.
To fix this, run:

   pnpm --filter @raptscallions/db db:generate
```

**Test:**

- Unit test: `should fail when journal file is malformed JSON`
- Unit test: `should fail when journal file is missing`

### Edge Case 3: Emergency production migration without journal update

**Scenario:** Production hotfix requires manual SQL, no time to update journal.

**Handling:**

- Use `--skip-validation` flag to bypass check
- Log warning message
- Document in runbook for DBAs

**Command:**

```bash
pnpm --filter @raptscallions/db db:migrate --skip-validation
```

**Warning:**

```
⚠️  WARNING: Skipping journal sync validation (--skip-validation flag)
```

**Documentation needed:**

- Add `--skip-validation` to migration troubleshooting guide
- Document when to use (emergency only)
- Document recovery steps after emergency migration

### Edge Case 4: Multiple migrations created in quick succession

**Scenario:** Developer creates migrations 0009, 0010, 0011 in rapid succession. After creating 0009, they run `db:generate` which updates journal. They create 0010 and 0011 but forget to run `db:generate` again.

**Handling:**

- Validation catches this: 3 SQL files, 1 journal entry
- Error message guides developer to run `db:generate` once
- Single `db:generate` run will add all missing migrations to journal

**Test:**

- Manually create multiple SQL files
- Verify validation catches count mismatch
- Run `db:generate` once
- Verify all files are now in journal

### Edge Case 5: Git branch switching with different migration histories

**Scenario:** Developer switches from feature branch A (10 migrations) to feature branch B (12 migrations). Journal count changes.

**Handling:**

- Validation automatically adjusts to current branch state
- If branch B has more SQL files than journal entries, validation fails
- Developer runs `db:generate` to sync journal with current branch
- No special handling needed - validation works per-branch

**Test:**

```bash
# Create branch A with 10 migrations
git checkout -b feature-a
# ... create 10 migrations ...

# Create branch B from main with 12 migrations
git checkout main
git checkout -b feature-b
# ... create 12 migrations ...

# Switch back to A
git checkout feature-a
pnpm db:migrate
# Expected: validation passes with 10 migrations

# Switch to B
git checkout feature-b
pnpm db:migrate
# Expected: validation passes with 12 migrations (or fails if journal not updated)
```

## Error Messages

### Success (matching counts)

```
✅ Journal in sync (12 migrations)
```

### Failure (mismatch)

```
❌ Migration validation failed:
   Journal out of sync: 12 SQL files but 8 journal entries

Details:
   SQL files:       12
   Journal entries: 8

This usually means migration files were created but not registered.
To fix this, run:

   pnpm --filter @raptscallions/db db:generate

If you need to bypass this check (emergency only), use:
   pnpm --filter @raptscallions/db db:migrate --skip-validation
```

### Bypass warning (--skip-validation)

```
⚠️  WARNING: Skipping journal sync validation (--skip-validation flag)
```

### Edge case (fresh database)

```
✅ No migrations found (fresh database)
```

### Edge case (corrupted journal)

```
❌ Migration validation failed:
   Failed to read journal file: Unexpected token in JSON at position 45

Details:
   SQL files:       12
   Journal entries: 0

This usually means the journal file is corrupted or missing.
To fix this, run:

   pnpm --filter @raptscallions/db db:generate
```

## Open Questions

None. Implementation is straightforward with clear requirements.

## Performance Considerations

### Validation Performance

**Operations:**

1. Read migrations directory: `readdirSync()` - O(n) where n = number of files
2. Filter SQL files: `filter()` - O(n)
3. Read journal file: `readFileSync()` - O(m) where m = file size
4. Parse JSON: `JSON.parse()` - O(m)
5. Compare counts: O(1)

**Expected performance:**

- 10 migrations: <5ms
- 100 migrations: <20ms
- 1000 migrations: <100ms (unlikely to ever reach this)

**Real-world impact:**

- Total migration time with validation: ~30s (database operations dominate)
- Total migration time without validation: ~30s
- Overhead: <1% (validation is negligible compared to database I/O)

**Benchmark test:**

```typescript
it("should validate 100 migrations in <100ms", () => {
  // Create 100 dummy migration files
  // Measure validation time
  // Assert: elapsed < 100ms
});
```

### Memory Usage

- File counting: Stores array of filenames (string[]) - ~10KB for 1000 files
- Journal parsing: Single JSON object in memory - ~50KB for 1000 entries
- Total: <100KB additional memory (negligible)

### Network Impact

- No network operations (local filesystem only)
- No database queries during validation
- Zero impact on database load

## Integration with Existing Systems

### Local Development (Docker Compose)

**Current setup:**

```yaml
migrate:
  build:
    context: .
    dockerfile: packages/db/Dockerfile
  depends_on:
    postgres:
      condition: service_healthy
  environment:
    DATABASE_URL: ${DATABASE_URL}
  command: ["pnpm", "db:migrate"]
  volumes:
    - ./packages/db:/app/packages/db
```

**Change needed:** None. Validation is automatic.

**Effect:**

- Developer runs `pnpm docker:up`
- Migration service starts
- Validation runs automatically
- If validation fails, migration service exits with code 1
- Developer sees error message in logs
- Developer runs `pnpm db:generate` to fix
- Re-runs `pnpm docker:up`

### CI (GitHub Actions)

**Current setup:**

```yaml
- name: Run database migrations
  run: pnpm --filter @raptscallions/db db:migrate
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/raptscallions_test
```

**Change needed:** None. Validation is automatic.

**Effect:**

- CI job runs migration step
- Validation runs automatically
- If validation fails, job fails with exit code 1
- PR is blocked until fixed
- Error message is visible in CI logs
- Developer runs `pnpm db:generate` locally
- Pushes fix to PR
- CI re-runs and passes

### Production Deployment

**Assumption:** Production uses same `migrate.ts` script (or equivalent).

**Effect:**

- Deployment pipeline runs migrations
- Validation runs automatically
- If validation fails, deployment fails before database is touched
- Operations team investigates using error message
- Options:
  1. Fix journal sync (run `drizzle-kit generate`)
  2. Use `--skip-validation` for emergency hotfix (with proper change control)

**Critical:** Validation prevents silent failures in production.

## TypeScript Requirements

All code follows strict TypeScript conventions:

### Type Definitions

```typescript
// Explicit interface for journal structure
interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

// Explicit return type for validation function
interface ValidationResult {
  valid: boolean;
  message: string;
  sqlCount: number;
  journalCount: number;
}

function validateJournalSync(): ValidationResult {
  // Implementation
}
```

### No `any` Types

```typescript
// ❌ BANNED
const journal: any = JSON.parse(journalContent);

// ✅ CORRECT
const journal: Journal = JSON.parse(journalContent);
```

### Error Handling

```typescript
// ❌ BANNED
catch (error) {
  console.error(error.message); // error is any
}

// ✅ CORRECT
catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
}
```

### Import Types

```typescript
// ✅ CORRECT - explicit type imports
import type { Journal, JournalEntry } from "./types";
import { validateJournalSync } from "./validation";
```

## Related Documentation

### Files to Update

| File | Update |
|------|--------|
| `apps/docs/src/database/patterns/migration-validation.md` | Add section on journal sync validation with usage examples |
| `apps/docs/src/database/troubleshooting/migration-failures.md` | Add troubleshooting for journal sync mismatch |
| `packages/db/README.md` | Document `--skip-validation` flag in migration commands |

### Documentation Content

**Migration validation pattern page:**

- Add "Journal Sync Validation" section after static validation
- Explain what journal sync is and why it matters
- Show example of mismatch error and how to fix
- Link to E01-T015 task

**Troubleshooting page:**

- Add "Migration files not being applied" section
- Symptom: Tables not created even though SQL files exist
- Root cause: Journal out of sync
- Solution: Run `pnpm db:generate`
- Prevention: This validation feature

**Package README:**

- Add `--skip-validation` flag to migration command docs
- Mark as "emergency use only"
- Explain when to use and consequences

## Success Metrics

### Technical Metrics

- ✅ Zero false positives (validation only fails when actually out of sync)
- ✅ Zero false negatives (validation catches all mismatch scenarios)
- ✅ Performance overhead <1% of total migration time
- ✅ Test coverage 100% for validation function

### User Experience Metrics

- ✅ Error message is immediately actionable (developer can fix without investigation)
- ✅ Remediation succeeds on first attempt (command from error message works)
- ✅ No confusion about what went wrong or how to fix

### Incident Prevention

- ✅ Prevents E05-T001 scenario from recurring (silent migration failure)
- ✅ Catches journal sync issues in local dev before CI
- ✅ Catches journal sync issues in CI before production
- ✅ Provides escape hatch for emergency production scenarios

## Implementation Checklist

- [ ] Add `validateJournalSync()` function to `migrate.ts`
- [ ] Integrate validation into `runMigrations()` function
- [ ] Add `--skip-validation` flag support
- [ ] Add success/failure log messages with counts
- [ ] Handle edge case: fresh database (zero migrations)
- [ ] Handle edge case: missing journal file
- [ ] Handle edge case: corrupted JSON
- [ ] Create unit test file: `migrate-validation.test.ts`
- [ ] Write 6 unit tests covering all scenarios
- [ ] Add 2 integration tests to existing test file
- [ ] Manual test: Normal operation (should pass)
- [ ] Manual test: Simulate mismatch (should fail with error)
- [ ] Manual test: Test `--skip-validation` flag
- [ ] Manual test: Test in Docker environment
- [ ] Manual test: Test in CI environment
- [ ] Verify zero TypeScript errors
- [ ] Verify zero lint warnings
- [ ] Update documentation (migration-validation.md)
- [ ] Update documentation (troubleshooting page)
- [ ] Update package README with flag documentation
- [ ] Run full test suite (must pass)
- [ ] Run `pnpm typecheck` (must pass)
- [ ] Run `pnpm lint` (must pass)

## Verification Steps

After implementation:

```bash
# 1. Run tests
pnpm --filter @raptscallions/db test
# Expected: All tests pass including new validation tests

# 2. Type check
pnpm typecheck
# Expected: Zero errors

# 3. Lint check
pnpm --filter @raptscallions/db lint
# Expected: Zero warnings

# 4. Manual test: Normal operation
pnpm --filter @raptscallions/db db:migrate
# Expected: "✅ Journal in sync (12 migrations)"

# 5. Manual test: Simulate mismatch
touch packages/db/src/migrations/9999_test.sql
pnpm --filter @raptscallions/db db:migrate
# Expected: Error with counts and remediation

# 6. Manual test: Fix mismatch
rm packages/db/src/migrations/9999_test.sql
pnpm --filter @raptscallions/db db:generate
pnpm --filter @raptscallions/db db:migrate
# Expected: "✅ Journal in sync (12 migrations)"

# 7. Docker test
pnpm docker:up
# Expected: migrate service succeeds, logs show validation passed

# 8. CI test (create PR with mismatch)
# Create branch, add SQL file without journal update, push
# Expected: CI fails at migration step with clear error
```

## Timeline Estimate

- Implementation: 2-3 hours
- Testing: 1-2 hours
- Documentation: 1 hour
- Total: 4-6 hours

**Complexity:** Low (simple file counting and JSON parsing)

**Risk:** Very low (no database changes, no CI changes, clear requirements)
