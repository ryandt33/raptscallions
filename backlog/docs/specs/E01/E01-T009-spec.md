# Implementation Spec: E01-T009

## Overview

Fix the database migration workflow to ensure migration SQL files are properly applied in development and align development and production migration strategies. This task addresses a critical gap discovered during E04-T009 integration testing where migration files were created but never applied due to Docker using `drizzle-kit push --force` instead of running SQL migrations.

## Root Cause Analysis

### What Happened

During E04-T009 integration testing, the tester discovered:

1. Migration file `0010_enhance_chat_sessions.sql` was created and committed
2. The schema changes (enum modification, new columns) were NOT applied to the development database
3. Tests passed in isolation but failed with real infrastructure
4. Manual SQL intervention was required to complete the migration

### Why It Happened

**Process Gap:** Migration files are generated but never validated or applied in development

- `drizzle-kit generate` creates SQL migration files
- Developers commit these files
- No step validates that migrations match schema definitions
- No automated verification occurs before merge

**Tool Mismatch:** Development uses `push`, production needs `migrate`

- Docker setup: `docker-compose.yml` line 59 uses `drizzle-kit push --force`
- Push strategy: Syncs schema directly, bypassing migration files entirely
- Production requires: SQL migrations for controlled, versioned changes
- Result: Development and production use completely different migration approaches

**Tool Limitation:** Drizzle Kit `push` doesn't handle PostgreSQL enum changes properly

- PostgreSQL requirement: Enum modifications need rename-recreate-drop pattern
- Drizzle Kit push: Attempts to `ALTER TYPE ... ADD VALUE` or similar (not supported for removals)
- Migration SQL: Correctly implements rename-recreate-drop pattern
- Evidence: E04-T009 migration required manual enum handling

**Documentation Gap:** No clear guidance on when to use `push` vs `migrate`

- `docs/ARCHITECTURE.md` line 395: References migrations but not application strategy
- `docs/CONVENTIONS.md` lines 452-457: Migration naming only, no workflow guidance
- No developer documentation on migration creation, validation, or application
- No troubleshooting guide for common migration issues

### Impact Assessment

**Current Impact:**

- Development databases diverge from migration files
- Schema changes work locally (via push) but may fail in production (via migrate)
- Integration tests give false confidence (schema changes not actually applied)
- Manual intervention required when enum changes or complex migrations involved

**Risk if Unfixed:**

- Production migrations may fail catastrophically
- Data corruption risk if migrations contain errors not caught in development
- Developer confusion about which migration strategy to use
- Inability to roll back schema changes in production

## Proposed Solution

### Strategy Overview

**Adopt "migrate-first" workflow for all environments:**

1. **Development:** Use SQL migrations (`drizzle-kit migrate`), not push
2. **CI/Testing:** Apply migrations before running tests
3. **Production:** Continue using migrations (already planned)
4. **Reserve `push` for:** Rapid prototyping only (with clear warnings)

**Benefits:**

- Development mirrors production migration strategy
- Migration files validated on every change
- Integration tests verify actual migration success
- Enum changes handled correctly via SQL migrations
- Consistent developer experience across environments

### Migration Workflow (New)

```
1. Developer modifies Drizzle schema (packages/db/src/schema/*.ts)
   ↓
2. Run `pnpm --filter @raptscallions/db db:generate`
   → Creates SQL migration in packages/db/src/migrations/
   ↓
3. Review generated SQL migration
   → Validate enum handling, add data migrations if needed
   → Edit migration if Drizzle Kit generated incorrect SQL
   ↓
4. Apply migration locally: `pnpm --filter @raptscallions/db db:migrate`
   → Verifies migration actually works
   ↓
5. Run tests: `pnpm test`
   → Tests verify schema changes work with code
   ↓
6. Commit both schema + migration files
   ↓
7. CI runs migrations before tests
   → Catches migration failures before merge
```

### When to Use Each Command

| Command           | Use Case                               | Safety Level | Committed |
| ----------------- | -------------------------------------- | ------------ | --------- |
| `db:generate`     | Create migration from schema changes   | Safe         | Yes       |
| `db:migrate`      | Apply migrations to database           | Safe         | N/A       |
| `db:push`         | Rapid prototyping (schema exploration) | Unsafe       | No        |
| `db:push --force` | NEVER (bypasses safety checks)         | Dangerous    | No        |
| `db:studio`       | Visual database exploration            | Read-only    | N/A       |

**Guidelines:**

- **Default workflow:** Always use `generate` → `migrate`
- **Push is acceptable for:** Local experimentation before committing to schema design
- **Never commit after push:** If using push, always generate proper migration before committing
- **Never use push in:** Docker, CI, or any automated environment

## Approach

### Technical Changes

#### 1. Docker Compose Migration Service

**File:** `docker-compose.yml`

**Current (lines 46-60):**

```yaml
migrate:
  build:
    context: .
    dockerfile: Dockerfile
    target: build
  container_name: raptscallions-migrate
  depends_on:
    postgres:
      condition: service_healthy
  environment:
    DATABASE_URL: postgresql://raptscallions:raptscallions@postgres:5432/raptscallions
  working_dir: /app/packages/db
  command: ["pnpm", "exec", "drizzle-kit", "push", "--force"]
  restart: "no"
```

**Updated:**

```yaml
migrate:
  build:
    context: .
    dockerfile: Dockerfile
    target: build
  container_name: raptscallions-migrate
  depends_on:
    postgres:
      condition: service_healthy
  environment:
    DATABASE_URL: postgresql://raptscallions:raptscallions@postgres:5432/raptscallions
    NODE_ENV: development
  working_dir: /app/packages/db
  # Changed: Use migrate instead of push for production-like workflow
  command: ["pnpm", "db:migrate"]
  restart: "no"
  # Add healthcheck to verify migrations completed
  healthcheck:
    test: ["CMD-SHELL", "test -f /tmp/migration-complete"]
    interval: 5s
    timeout: 3s
    retries: 3
    start_period: 10s
```

**Migration completion signal:**

Create script `packages/db/scripts/migrate-with-signal.sh`:

```bash
#!/bin/bash
set -e

# Run migrations
pnpm exec drizzle-kit migrate

# Signal completion for Docker healthcheck
touch /tmp/migration-complete

echo "Migrations completed successfully"
```

Update command to: `["bash", "scripts/migrate-with-signal.sh"]`

#### 2. Migration Execution Script

**File:** `packages/db/scripts/migrate.ts`

Create TypeScript migration runner for better error handling:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

async function runMigrations(): Promise<void> {
  console.log("Starting database migrations...");

  const sql = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: "./src/migrations" });
    console.log("✅ Migrations completed successfully");

    // Check if __drizzle_migrations table exists
    const result = await sql`
      SELECT COUNT(*) FROM information_schema.tables
      WHERE table_name = '__drizzle_migrations'
    `;
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

runMigrations();
```

**Add to `packages/db/package.json`:**

```json
{
  "scripts": {
    "db:migrate": "tsx scripts/migrate.ts",
    "db:migrate:check": "tsx scripts/migrate-check.ts"
  }
}
```

#### 3. Migration Validation Script

**File:** `packages/db/scripts/migrate-check.ts`

Pre-commit validation that migrations match schema:

```typescript
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

async function validateMigrations(): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // 1. Check if there are uncommitted schema changes
  const schemaFiles = execSync("git status --short src/schema/", {
    encoding: "utf-8",
  }).trim();

  if (schemaFiles) {
    // 2. Generate a temporary migration to check if it matches latest
    console.log("Uncommitted schema changes detected, validating...");

    try {
      execSync("pnpm db:generate --name temp_validation", {
        stdio: "pipe",
      });

      // 3. Check if temp migration was created (means schema diverged)
      const tempMigration = join(
        __dirname,
        "../src/migrations",
        "temp_validation.sql"
      );

      if (existsSync(tempMigration)) {
        result.valid = false;
        result.errors.push(
          "Schema changes detected but no migration created. Run: pnpm db:generate"
        );

        // Clean up temp migration
        execSync(`rm ${tempMigration}`);
      }
    } catch (error) {
      result.valid = false;
      result.errors.push(`Migration generation failed: ${error}`);
    }
  }

  // 4. Check for common migration issues
  const migrationFiles = execSync("ls -1 src/migrations/*.sql", {
    encoding: "utf-8",
  })
    .trim()
    .split("\n");

  for (const file of migrationFiles) {
    const content = readFileSync(file, "utf-8");

    // Check for dangerous patterns
    if (content.includes("DROP TABLE") && !content.includes("IF EXISTS")) {
      result.warnings.push(`${file}: DROP TABLE without IF EXISTS`);
    }

    if (content.includes("ALTER TYPE") && content.includes("ENUM")) {
      // Check if using proper enum alteration pattern
      if (
        !content.includes("RENAME TO") ||
        !content.includes("CREATE TYPE")
      ) {
        result.warnings.push(
          `${file}: PostgreSQL enum alteration may be unsafe. Use rename-recreate-drop pattern.`
        );
      }
    }

    if (
      content.includes("ALTER COLUMN") &&
      content.includes("NOT NULL") &&
      !content.includes("DEFAULT")
    ) {
      result.warnings.push(
        `${file}: Adding NOT NULL without DEFAULT may fail on existing data`
      );
    }
  }

  return result;
}

async function main(): Promise<void> {
  console.log("🔍 Validating migrations...\n");

  const result = await validateMigrations();

  if (result.warnings.length > 0) {
    console.log("⚠️  Warnings:");
    result.warnings.forEach((w) => console.log(`   ${w}`));
    console.log();
  }

  if (!result.valid) {
    console.log("❌ Validation failed:");
    result.errors.forEach((e) => console.log(`   ${e}`));
    process.exit(1);
  }

  console.log("✅ Migration validation passed");
}

main();
```

#### 4. Pre-Commit Hook

**File:** `.github/hooks/pre-commit`

Add migration validation to existing pre-commit hook:

```bash
#!/bin/bash

# Existing checks...
pnpm typecheck || exit 1
pnpm lint || exit 1

# NEW: Validate migrations
echo "Validating database migrations..."
pnpm --filter @raptscallions/db db:migrate:check || exit 1

echo "✅ Pre-commit checks passed"
```

#### 5. CI Workflow Updates

**File:** `.github/workflows/ci.yml` (if exists) or add to existing CI

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: raptscallions
          POSTGRES_PASSWORD: raptscallions
          POSTGRES_DB: raptscallions_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      # NEW: Apply migrations before tests
      - name: Run database migrations
        env:
          DATABASE_URL: postgresql://raptscallions:raptscallions@localhost:5432/raptscallions_test
        run: |
          # Enable ltree extension
          psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS ltree;"

          # Run migrations
          pnpm --filter @raptscallions/db db:migrate

      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

#### 6. Enum Change Handling

**File:** `packages/db/docs/enum-migration-guide.md` (new)

Create comprehensive guide for PostgreSQL enum modifications:

```markdown
# PostgreSQL Enum Migration Guide

## Problem

PostgreSQL does not support dropping values from enums or renaming enum values directly.

## Solution Pattern

Use the rename-recreate-drop pattern:

### Step-by-Step

1. **Rename existing enum:**
   ```sql
   ALTER TYPE my_enum RENAME TO my_enum_old;
   ```

2. **Create new enum with desired values:**
   ```sql
   CREATE TYPE my_enum AS ENUM('value1', 'value2');
   ```

3. **Alter columns to use new enum (cast through text):**
   ```sql
   ALTER TABLE my_table
     ALTER COLUMN my_column TYPE my_enum
     USING my_column::text::my_enum;
   ```

4. **Drop old enum:**
   ```sql
   DROP TYPE my_enum_old;
   ```

### Data Migration

If removing an enum value, migrate existing data BEFORE step 1:

```sql
-- Example: Removing 'paused' state, migrate to 'active'
UPDATE my_table SET status = 'active' WHERE status = 'paused';
```

### Example (E04-T009)

See `packages/db/src/migrations/0010_enhance_chat_sessions.sql` for complete example.

## Common Mistakes

❌ **Don't use `ALTER TYPE ... DROP VALUE`** - Not supported in PostgreSQL
❌ **Don't skip data migration** - Causes cast failures
❌ **Don't use `drizzle-kit push` for enum changes** - May generate incorrect SQL

✅ **Do use rename-recreate-drop pattern**
✅ **Do migrate data first**
✅ **Do write SQL migrations manually for enum changes**
```

## Files to Create

| File                                          | Purpose                                 |
| --------------------------------------------- | --------------------------------------- |
| `packages/db/scripts/migrate.ts`              | TypeScript migration runner             |
| `packages/db/scripts/migrate-check.ts`        | Pre-commit migration validation         |
| `packages/db/scripts/migrate-with-signal.sh`  | Docker migration with completion signal |
| `packages/db/docs/enum-migration-guide.md`    | PostgreSQL enum change guide            |
| `docs/database-migrations.md`                 | Comprehensive migration workflow docs   |
| `.github/workflows/migration-check.yml`       | CI workflow for migration validation    |
| `packages/db/scripts/migration-helper.ts`     | Interactive migration creation helper   |
| `packages/db/__tests__/migrations.test.ts`    | Migration application tests             |
| `docs/troubleshooting-migrations.md`          | Common migration issues and solutions   |

## Files to Modify

| File                          | Changes                                                |
| ----------------------------- | ------------------------------------------------------ |
| `docker-compose.yml`          | Change migrate service from `push --force` to `migrate` |
| `packages/db/package.json`    | Add `db:migrate` and `db:migrate:check` scripts        |
| `.github/hooks/pre-commit`    | Add migration validation step                          |
| `docs/CONVENTIONS.md`         | Add migration workflow section (lines 452-457)         |
| `docs/ARCHITECTURE.md`        | Document migration strategy (around line 395)          |
| `README.md`                   | Add migration workflow to setup instructions           |
| `.github/workflows/ci.yml`    | Add migration application before tests                 |

## Dependencies

### New Packages

None - all tooling uses existing dependencies:

- `drizzle-orm` (existing)
- `drizzle-kit` (existing)
- `postgres` (existing in packages/db)
- `tsx` (existing for script execution)

### Environment Variables

Required for migration scripts:

```bash
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=development|test|production  # Optional, for migration safety checks
```

## Test Strategy

### Unit Tests

**File:** `packages/db/__tests__/migrations.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

describe("Database Migrations", () => {
  let sql: ReturnType<typeof postgres>;
  let testDbUrl: string;

  beforeAll(async () => {
    // Create isolated test database
    testDbUrl = process.env.TEST_DATABASE_URL || "";
    sql = postgres(testDbUrl, { max: 1 });
  });

  afterAll(async () => {
    await sql.end();
  });

  it("should apply all migrations successfully", async () => {
    const db = drizzle(sql);

    await expect(
      migrate(db, { migrationsFolder: "./src/migrations" })
    ).resolves.not.toThrow();
  });

  it("should create __drizzle_migrations tracking table", async () => {
    const result = await sql`
      SELECT COUNT(*) FROM information_schema.tables
      WHERE table_name = '__drizzle_migrations'
    `;

    expect(result[0]?.count).toBe("1");
  });

  it("should have applied all migration files", async () => {
    const migrations = await sql`
      SELECT COUNT(*) FROM __drizzle_migrations
    `;

    // Update this number when adding migrations
    expect(Number(migrations[0]?.count)).toBeGreaterThanOrEqual(10);
  });

  it("should handle re-running migrations (idempotency)", async () => {
    const db = drizzle(sql);

    // Run migrations again - should not error
    await expect(
      migrate(db, { migrationsFolder: "./src/migrations" })
    ).resolves.not.toThrow();
  });
});

describe("Migration Validation", () => {
  it("should detect schema drift", async () => {
    // Test that migrate-check.ts detects uncommitted schema changes
    // (Implementation depends on test environment setup)
  });

  it("should warn on unsafe enum alterations", async () => {
    // Test that migrate-check.ts warns on unsafe enum patterns
  });

  it("should warn on NOT NULL without DEFAULT", async () => {
    // Test that migrate-check.ts warns on risky NOT NULL additions
  });
});
```

### Integration Tests

**File:** `packages/db/__tests__/integration/migration-workflow.test.ts`

```typescript
describe("Migration Workflow Integration", () => {
  it("should generate migration from schema changes", () => {
    // 1. Modify schema file
    // 2. Run db:generate
    // 3. Verify SQL file created
    // 4. Verify SQL contains expected changes
  });

  it("should apply generated migration successfully", () => {
    // 1. Generate migration
    // 2. Apply migration
    // 3. Verify database schema matches Drizzle schema
  });

  it("should handle enum modifications correctly", () => {
    // 1. Create migration that modifies enum
    // 2. Apply migration
    // 3. Verify enum values in database
    // 4. Verify old values removed
  });
});
```

### Docker Integration Tests

```bash
# Test migration service in Docker
docker compose up -d postgres
docker compose run --rm migrate

# Verify migrations applied
docker compose exec postgres psql -U raptscallions -d raptscallions \
  -c "SELECT * FROM __drizzle_migrations ORDER BY created_at;"

# Verify schema matches expectations
docker compose exec postgres psql -U raptscallions -d raptscallions \
  -c "\d+ chat_sessions"
```

## Acceptance Criteria Breakdown

### AC1: Docker uses `migrate` instead of `push`

**Implementation:**

- Modify `docker-compose.yml` migrate service command
- Change from `drizzle-kit push --force` to `pnpm db:migrate`
- Add healthcheck to verify migration completion

**Done when:**

- `docker compose up` applies migrations successfully
- Migrations tracked in `__drizzle_migrations` table
- No errors in migration container logs

### AC2: Migration validation script exists

**Implementation:**

- Create `packages/db/scripts/migrate-check.ts`
- Detect uncommitted schema changes
- Warn on unsafe migration patterns (enum changes, NOT NULL, DROP TABLE)
- Exit with error if schema drift detected

**Done when:**

- Script runs in under 5 seconds
- Catches schema changes without migrations
- Provides actionable error messages

### AC3: Pre-commit hook validates migrations

**Implementation:**

- Update `.github/hooks/pre-commit`
- Add migration validation step
- Fail commit if validation fails

**Done when:**

- Hook runs on every commit
- Prevents commits with schema drift
- Can be bypassed with `--no-verify` if needed

### AC4: CI applies migrations before tests

**Implementation:**

- Update `.github/workflows/ci.yml` or create new workflow
- Add PostgreSQL service
- Run migrations before test execution
- Fail build if migrations fail

**Done when:**

- CI applies migrations successfully
- Tests run against migrated database
- Migration failures block PR merge

### AC5: Developer documentation updated

**Implementation:**

- Create `docs/database-migrations.md`
- Update `docs/CONVENTIONS.md` migration section
- Create `packages/db/docs/enum-migration-guide.md`
- Update `README.md` with migration workflow

**Done when:**

- Clear step-by-step migration workflow documented
- Enum change pattern documented with examples
- Troubleshooting guide available
- `push` vs `migrate` decision tree provided

### AC6: Migration helper script created

**Implementation:**

- Create `packages/db/scripts/migration-helper.ts`
- Interactive prompts for migration creation
- Validates migration name
- Opens editor for manual SQL adjustments
- Runs validation after creation

**Done when:**

- Script provides friendly UX
- Guides developers through migration workflow
- Catches common mistakes early

### AC7: Enum migration tests pass

**Implementation:**

- Create test that modifies enum
- Apply migration in test environment
- Verify enum values changed
- Verify data migration succeeded

**Done when:**

- Test creates enum with 3 values
- Migration removes 1 value
- Database reflects changes
- Old data migrated correctly

### AC8: Migration rollback documented

**Implementation:**

- Document rollback strategy in `docs/database-migrations.md`
- Explain that Drizzle doesn't support down migrations
- Provide pattern for creating reverse migrations
- Document backup/restore strategy

**Done when:**

- Clear rollback procedure documented
- Example reverse migration provided
- Backup requirements specified

## Edge Cases

### Edge Case 1: Migration Fails Mid-Execution

**Scenario:** Migration contains multiple statements, one fails

**Handling:**

- PostgreSQL transactions: Entire migration rolls back automatically
- Migration tracking: Failed migration NOT recorded in `__drizzle_migrations`
- Developer workflow: Fix migration SQL, re-run
- No partial application risk

**Implementation:**

```typescript
// packages/db/scripts/migrate.ts already handles this
// Drizzle wraps each migration file in transaction automatically
```

### Edge Case 2: Schema Changes Without Migration

**Scenario:** Developer modifies Drizzle schema but forgets to generate migration

**Handling:**

- Pre-commit hook: Runs `db:migrate:check`, detects drift
- Validation: Generates temp migration, compares to latest
- Error message: "Schema changes detected but no migration created"
- Blocks commit until migration generated

**Implementation:** Already covered in `migrate-check.ts`

### Edge Case 3: Enum Change in Production

**Scenario:** Need to modify enum in production database with live data

**Handling:**

- Documentation: Warn about downtime requirements
- Migration pattern: Use rename-recreate-drop (atomic within transaction)
- Data migration: Verify data migrated before enum change
- Testing: Require production-like data volume testing

**Documentation Section:**

```markdown
## Production Enum Changes

⚠️ **Warning:** Enum changes acquire locks and may cause brief downtime.

**Recommended Process:**

1. Schedule maintenance window
2. Create database backup
3. Test migration on production snapshot
4. Monitor transaction duration
5. Apply migration during low-traffic period
6. Verify data integrity after migration
```

### Edge Case 4: Developer Accidentally Uses Push

**Scenario:** Developer runs `pnpm db:push`, database diverges from migrations

**Handling:**

- Warning in docs: "Never use push after initial prototyping"
- Validation script: Detects schema drift on next commit
- Recovery: Generate migration from current schema, review diff carefully
- Education: Clear guidelines in `CONVENTIONS.md`

**Prevention:**

```json
// packages/db/package.json
{
  "scripts": {
    "db:push": "echo '⚠️  WARNING: push bypasses migrations. Use db:generate + db:migrate instead. Continue? (Ctrl+C to cancel)' && read && drizzle-kit push"
  }
}
```

### Edge Case 5: Multiple Developers Creating Migrations

**Scenario:** Two developers create migrations with same number (e.g., 0011)

**Handling:**

- Git conflict: Merge conflict on migration file
- Resolution: Renumber one migration (0012)
- CI check: Validates migration numbers sequential
- Documentation: Explain renumbering process

**Validation Check:**

```typescript
// Add to migrate-check.ts
function validateMigrationNumbers(): void {
  const files = fs.readdirSync("./src/migrations");
  const numbers = files
    .map((f) => Number.parseInt(f.match(/^(\d+)_/)?.[1] || "0"))
    .sort((a, b) => a - b);

  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1]! + 1) {
      throw new Error(`Migration number gap detected: ${numbers[i - 1]} -> ${numbers[i]}`);
    }
  }
}
```

## Open Questions

- [x] **Should we support down migrations?** - No, document rollback via reverse migrations instead
- [x] **Should we run migrations automatically on app startup?** - No, keep separate for safety
- [x] **Should we add migration smoke tests to CI?** - Yes, test that migrations apply successfully
- [x] **How to handle migration failures in production?** - Document backup/restore process, transaction rollback
- [ ] **Should we implement migration locking for concurrent deployments?** - Future enhancement, not critical for single-server deployment
- [ ] **Should we add migration dry-run mode?** - Nice to have, defer to future enhancement

## Implementation Notes

### TypeScript Configuration

All migration scripts must be executable with tsx:

```json
// packages/db/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src/**/*", "scripts/**/*"]
}
```

### Drizzle Kit Configuration

Ensure `drizzle.config.ts` points to correct paths:

```typescript
// packages/db/drizzle.config.ts
export default {
  schema: "./dist/schema/**/*.js", // Compiled JS, not TS
  out: "./src/migrations", // Migration output
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Error Handling

Migration scripts must provide actionable error messages:

```typescript
catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('❌ Database schema error. Did migrations run successfully?');
      console.error('   Try: docker compose down -v && docker compose up -d');
    } else if (error.message.includes('syntax error')) {
      console.error('❌ SQL syntax error in migration.');
      console.error('   Check migration file for SQL errors.');
    } else {
      console.error('❌ Migration failed:', error.message);
    }
  }
  process.exit(1);
}
```

## Rollout Plan

### Phase 1: Infrastructure Setup (Week 1, Days 1-2)

1. Create migration execution script (`migrate.ts`)
2. Create migration validation script (`migrate-check.ts`)
3. Add scripts to `packages/db/package.json`
4. Test scripts locally with existing migrations
5. Verify migrations apply successfully

### Phase 2: Docker Integration (Week 1, Days 3-4)

1. Update `docker-compose.yml` migrate service
2. Add healthcheck to migration service
3. Test Docker migration workflow
4. Verify API service waits for migration completion
5. Test with clean database and existing database

### Phase 3: Developer Tooling (Week 1, Day 5)

1. Create enum migration guide
2. Update pre-commit hook
3. Create migration helper script
4. Test developer workflow end-to-end
5. Document in `CONVENTIONS.md`

### Phase 4: CI/CD Integration (Week 2, Days 1-2)

1. Update or create GitHub Actions workflow
2. Add PostgreSQL service to CI
3. Add migration step before tests
4. Test CI workflow with deliberate failures
5. Verify PR blocking on migration failures

### Phase 5: Documentation (Week 2, Days 3-4)

1. Create comprehensive migration workflow docs
2. Create troubleshooting guide
3. Update `README.md` with migration instructions
4. Create video walkthrough (optional)
5. Review and refine based on team feedback

### Phase 6: Team Rollout (Week 2, Day 5)

1. Team meeting: Present new workflow
2. Live demo: Creating and applying migration
3. Live demo: Handling enum change
4. Q&A session
5. Monitor for issues in first week

### Validation Checkpoints

After each phase, verify:

- [ ] No existing functionality broken
- [ ] All tests still passing
- [ ] Docker compose up/down works
- [ ] Documentation accurate and helpful

## Success Metrics

**Technical Metrics:**

- [ ] Migration files successfully applied in Docker environment
- [ ] No schema drift detected by validation scripts
- [ ] All tests pass with migrated database
- [ ] CI applies migrations before tests without errors

**Developer Experience Metrics:**

- [ ] Clear error messages when migration validation fails
- [ ] Migration creation time < 5 minutes (generate + review + apply)
- [ ] Zero production migration failures due to process gaps

**Documentation Metrics:**

- [ ] Migration workflow documented in `CONVENTIONS.md`
- [ ] Enum change pattern documented with examples
- [ ] Troubleshooting guide covers common issues
- [ ] Zero developer questions about "push vs migrate" after rollout

## Related Tasks

- **E04-T009** - Identified the migration workflow issue during integration testing
- **E04-T010** - Future chat forking task will benefit from reliable migration workflow
- **E04-T011** - Future attachments schema will use new migration workflow
- **E06-T001+** - All future schema changes will use this workflow

## References

- **Drizzle ORM Docs:** https://orm.drizzle.team/docs/migrations
- **PostgreSQL Enum Docs:** https://www.postgresql.org/docs/current/datatype-enum.html
- **E04-T009 Migration:** `packages/db/src/migrations/0010_enhance_chat_sessions.sql` (exemplar)
- **E04-T009 QA Report:** `backlog/docs/reviews/E04/E04-T009-qa-report.md` (incident log)
