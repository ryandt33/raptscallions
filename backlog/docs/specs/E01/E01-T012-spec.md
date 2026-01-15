# Implementation Spec: E01-T012

## Overview

Add a CI workflow step that applies database migrations to a PostgreSQL service before running tests. This ensures migrations are validated against a real database in CI, catching migration failures before code reaches production.

## Background

### Current State

The existing CI workflow (`.github/workflows/ci.yml`) has:
- PostgreSQL 16-alpine service container running during tests
- Redis 7-alpine service container for integration tests
- `test` job that runs `pnpm test` with DATABASE_URL pointing to the PostgreSQL service
- **Missing:** No migration step before tests - tests run against an uninitialized database

### Problem

Without migrations running in CI:
1. Tests that don't need the database pass, but integration tests may silently skip database operations
2. Migration files are never validated against a real PostgreSQL instance in CI
3. Developers have false confidence that migrations will work in production
4. Migration syntax errors, missing extensions, or constraint violations are only discovered during deployment

### Solution

Add a migration step to the CI workflow that:
1. Enables the ltree extension (required by groups table)
2. Runs the TypeScript migration script (`pnpm --filter @raptscallions/db db:migrate`)
3. Verifies the `__drizzle_migrations` tracking table exists
4. Fails the workflow if any step fails

## Technical Context

### Existing Infrastructure

**CI Workflow:** `.github/workflows/ci.yml`
- Already has PostgreSQL service configured correctly
- Uses `postgres:16-alpine` image (matches production version)
- Health checks ensure PostgreSQL is ready before jobs run
- DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/raptscallions_test`

**Migration Script:** `packages/db/scripts/migrate.ts`
- TypeScript migration runner using Drizzle ORM's `migrate()` function
- Validates DATABASE_URL environment variable
- Logs success/failure with clear messaging
- Checks for `__drizzle_migrations` table existence

**Migration Files:** `packages/db/src/migrations/`
- 11 SQL migration files (0001-0011)
- Includes ltree extension usage (groups table)
- Includes enum modifications with proper rename-recreate-drop pattern

### Dependencies

This task depends on E01-T009 which created:
- `packages/db/scripts/migrate.ts` - Migration runner
- `packages/db/scripts/migrate-check.ts` - Validation script
- `db:migrate` npm script in `packages/db/package.json`

## Approach

### Workflow Modifications

Add a new step to the `test` job that runs migrations before tests execute. The step will:

1. Enable ltree extension using `psql`
2. Run migrations using the existing `db:migrate` script
3. Verify migration success by checking the tracking table

### PostgreSQL Service Configuration

The existing PostgreSQL service configuration is suitable but needs adjustment for consistency with the task requirements:

**Current:**
```yaml
postgres:
  image: postgres:16-alpine
  env:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    POSTGRES_DB: raptscallions_test
```

**Keep as-is.** The existing configuration:
- Uses PostgreSQL 16 (correct version)
- Health check ensures service is ready
- Database name is appropriate for testing

### Migration Step Design

The migration step needs to:

1. **Enable ltree extension** - Required before migrations run
   - PostgreSQL extensions can only be enabled by superuser
   - The `postgres` user has superuser privileges in the service container
   - Use `psql` to execute: `CREATE EXTENSION IF NOT EXISTS ltree;`

2. **Run migrations** - Apply all SQL migration files
   - Use: `pnpm --filter @raptscallions/db db:migrate`
   - This executes `tsx scripts/migrate.ts`
   - Script connects to DATABASE_URL and runs Drizzle's `migrate()`

3. **Verify tracking table** - Confirm migrations were tracked
   - Use `psql` to check: `SELECT COUNT(*) FROM __drizzle_migrations`
   - This confirms the tracking mechanism is working

### Error Handling

The workflow should fail if:
- ltree extension creation fails
- Any migration file fails to apply
- The migration tracking table doesn't exist after migrations
- PostgreSQL connection fails

Error messages should be:
- Clear about which step failed
- Actionable for debugging (show relevant logs)
- Visible in GitHub Actions UI

## Files to Modify

| File | Changes |
|------|---------|
| `.github/workflows/ci.yml` | Add migration step to `test` job; add migration step to `test-coverage` job |

## Files to Create

None - all required infrastructure already exists from E01-T009.

## Implementation Details

### Step 1: Add Migration Step to `test` Job

Insert after "Install dependencies" and before "Run tests":

```yaml
- name: Enable PostgreSQL extensions
  run: |
    PGPASSWORD=postgres psql -h localhost -U postgres -d raptscallions_test -c "CREATE EXTENSION IF NOT EXISTS ltree;"
  env:
    PGPASSWORD: postgres

- name: Run database migrations
  run: pnpm --filter @raptscallions/db db:migrate
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/raptscallions_test

- name: Verify migration tracking table
  run: |
    MIGRATION_COUNT=$(PGPASSWORD=postgres psql -h localhost -U postgres -d raptscallions_test -t -c "SELECT COUNT(*) FROM __drizzle_migrations")
    echo "Applied migrations: $MIGRATION_COUNT"
    if [ "$MIGRATION_COUNT" -lt 1 ]; then
      echo "ERROR: No migrations found in tracking table"
      exit 1
    fi
```

### Step 2: Add Migration Step to `test-coverage` Job

The `test-coverage` job also uses PostgreSQL and should have the same migration steps added for consistency.

### Step 3: Verify Workflow Timing

The migration step should complete within reasonable time:
- ltree extension creation: < 1 second
- 11 migration files: < 30 seconds
- Verification query: < 1 second
- **Total: < 1 minute** (well within the AC9 requirement of < 5 minutes)

## Test Strategy

### Manual Verification

After implementation, verify by:

1. **Push a test branch** - Trigger CI workflow
2. **Check migration step logs** - Verify:
   - "Starting database migrations..." message appears
   - "✅ Migrations completed successfully" message appears
   - Applied migrations count matches expected (currently 11)
3. **Verify test execution** - Confirm tests run after migrations
4. **Test failure mode** - Temporarily break a migration and verify workflow fails

### Failure Testing

Create a test scenario to verify the workflow fails correctly:

1. Add a migration with intentional SQL error
2. Push to trigger CI
3. Verify:
   - Migration step fails
   - Error message is clear
   - Workflow does not continue to tests
4. Revert the broken migration

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| AC1: GitHub Actions workflow applies migrations to PostgreSQL before running tests | Migration step added before "Run tests" step in `test` job |
| AC2: PostgreSQL service configured with ltree extension enabled | "Enable PostgreSQL extensions" step runs `CREATE EXTENSION IF NOT EXISTS ltree` |
| AC3: Migrations run against clean database (fresh PostgreSQL instance per workflow run) | GitHub Actions service containers are ephemeral - fresh per workflow |
| AC4: Test suite runs against migrated database (not push-based schema) | Tests run after migration step completes |
| AC5: Workflow fails if migration application fails | Migration script exits with code 1 on failure, stopping workflow |
| AC6: Workflow verifies migration tracking table exists (`__drizzle_migrations`) | "Verify migration tracking table" step queries and validates count |
| AC7: Workflow runs on pull requests and main branch pushes | Existing trigger configuration: `push: [main, develop]`, `pull_request: [main, develop]` |
| AC8: Migration failures show actionable error messages in CI logs | Migration script logs specific error messages; psql shows SQL errors |
| AC9: Workflow completes in reasonable time (<5 minutes for DB setup + migrations) | Estimated < 1 minute for migration steps; total workflow < 5 minutes |

## Edge Cases

### Edge Case 1: Migration Already Applied

**Scenario:** Running migrations on a database that already has some migrations applied.

**Handling:** Drizzle's `migrate()` function is idempotent - it only applies migrations not yet recorded in `__drizzle_migrations`. The CI database is fresh each run, so this won't occur, but the script handles it correctly.

### Edge Case 2: ltree Extension Already Exists

**Scenario:** Extension creation attempted when already enabled.

**Handling:** `CREATE EXTENSION IF NOT EXISTS ltree` is idempotent - no error if extension exists.

### Edge Case 3: PostgreSQL Service Not Ready

**Scenario:** Migration step runs before PostgreSQL service is healthy.

**Handling:** GitHub Actions `depends_on` and health checks ensure PostgreSQL is ready before job steps run. The migration script will fail with connection error if service unavailable, which is the correct behavior.

### Edge Case 4: Database Connection String Mismatch

**Scenario:** DATABASE_URL in migration step doesn't match test step.

**Handling:** Both steps use the same environment variable value. The implementation uses explicit values for clarity rather than relying on environment inheritance.

## Out of Scope

Per task definition:
- Migration rollback testing (future enhancement)
- Performance testing of migrations (separate concern)
- Seed data or fixtures (tests create their own data)
- Deployment automation (this is test-only)
- Notification systems (use GitHub's built-in notifications)

## Dependencies

- **E01-T009** (DONE): Created migration scripts that this workflow will invoke
- **E01-T008** (DONE): Configured Vitest which CI will run after migrations

## Open Questions

None - the task requirements are clear and the existing infrastructure provides all necessary components.

## Implementation Notes

### Why Not a Separate Migration Job?

The migration step is added to the existing `test` job rather than creating a separate job because:
1. Migrations must run in the same container where tests execute (same PostgreSQL service)
2. Job-level parallelism doesn't benefit migration execution
3. Simplifies workflow logic and reduces YAML complexity

### Why Both `test` and `test-coverage` Jobs?

Both jobs need migrations because:
1. They use separate PostgreSQL service instances (parallel job execution)
2. Both need to test against properly migrated databases
3. Test-coverage job runs different test commands that may have database dependencies

### psql vs Node.js for Extension Creation

Using `psql` directly for extension creation is preferred because:
1. PostgreSQL extensions require superuser privileges
2. The migration script connects as a regular user
3. `psql` is available in the GitHub Actions runner
4. Separates concerns: extension setup vs. schema migrations

---

## Architecture Review

**Status:** ✅ APPROVED
**Reviewer:** Architect Agent
**Date:** 2026-01-15

### Summary

This spec is well-structured and ready for implementation. The approach correctly integrates database migrations into the existing CI workflow with minimal changes while achieving all acceptance criteria. The design aligns with the project's infrastructure patterns and deployment philosophy.

### Architecture Alignment

| Aspect | Assessment | Notes |
|--------|------------|-------|
| **Technology Choices** | ✅ Correct | Uses PostgreSQL 16-alpine (matches ARCHITECTURE.md), GitHub Actions (project standard), Drizzle ORM migration tooling |
| **CI/CD Patterns** | ✅ Correct | Follows existing workflow structure, uses service containers correctly, maintains caching strategy |
| **Infrastructure Requirements** | ✅ Correct | No new dependencies, leverages existing PostgreSQL service configuration |
| **Containerization** | ✅ Compatible | Aligns with containerization requirements - ephemeral per-run databases with no persistent state |

### Strengths

1. **Minimal Change Footprint**: Adding 3 steps to existing jobs rather than creating new jobs minimizes workflow complexity and aligns with KISS principle.

2. **Idempotent Design**: Both `CREATE EXTENSION IF NOT EXISTS ltree` and Drizzle's `migrate()` function are idempotent, making the workflow robust against re-runs.

3. **Clear Verification Step**: The tracking table verification provides explicit confirmation that migrations were recorded, not just executed.

4. **Correct PostgreSQL Version**: Uses `postgres:16-alpine` matching the canonical technology stack (ARCHITECTURE.md line 31).

5. **Existing Infrastructure Reuse**: Leverages the `db:migrate` script created in E01-T009, avoiding code duplication.

### Technical Notes

1. **psql Availability**: The spec correctly notes that `psql` is available in GitHub Actions ubuntu-latest runners. This is provided by the PostgreSQL client package pre-installed on the runner.

2. **Extension Privileges**: Using the `postgres` superuser from the service container is the correct approach for enabling ltree - this matches how production PostgreSQL instances typically handle extension setup.

3. **Environment Variable Consistency**: The spec correctly uses `postgresql://postgres:postgres@localhost:5432/raptscallions_test` matching the existing CI workflow configuration.

### Minor Suggestions (Non-blocking)

1. **PGPASSWORD Duplication**: In the proposed YAML (lines 140-141), `PGPASSWORD` is set both inline and as an environment variable. Consider using only the `env` block for clarity:
   ```yaml
   - name: Enable PostgreSQL extensions
     run: |
       psql -h localhost -U postgres -d raptscallions_test -c "CREATE EXTENSION IF NOT EXISTS ltree;"
     env:
       PGPASSWORD: postgres
   ```

2. **Build Step Dependency**: The migration script uses `tsx` which requires the build step. Verify that the `test` job either:
   - Runs after build completes (currently runs in parallel), OR
   - Dependencies are properly installed via `pnpm install --frozen-lockfile` (which includes tsx as a devDependency in packages/db)

   **Verified**: tsx is installed via pnpm install, so the current parallel execution is correct.

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration step timeout | Low | Medium | 11 migrations should complete in <30s; existing 15-min job timeout is sufficient |
| psql not available | Very Low | High | Pre-installed on ubuntu-latest; fallback would be to use GitHub Action |
| Database connection race | Low | Low | Service health checks ensure PostgreSQL is ready before job steps run |

### Acceptance Criteria Review

| AC | Spec Coverage | Notes |
|----|---------------|-------|
| AC1 | ✅ Covered | Steps 133-157 add migration before tests |
| AC2 | ✅ Covered | Extension step at lines 138-141 |
| AC3 | ✅ Covered | GitHub Actions service containers are ephemeral |
| AC4 | ✅ Covered | Tests run after migration step |
| AC5 | ✅ Covered | Script exits with code 1 on failure |
| AC6 | ✅ Covered | Verification step at lines 149-157 |
| AC7 | ✅ Covered | Existing trigger configuration preserved |
| AC8 | ✅ Covered | Migration script logs errors; psql shows SQL errors |
| AC9 | ✅ Covered | Estimated <1 minute total; well within 5-minute requirement |

### Verdict

**APPROVED** - The spec is technically sound, well-documented, and ready for implementation. The approach is conservative (modifying existing jobs rather than restructuring the workflow) while achieving all acceptance criteria. No architectural concerns.
