---
title: Migration Validation
description: Automated validation for database migration files before application
related_code:
  - packages/db/scripts/migrate-check.ts
  - packages/db/scripts/migrate.ts
  - .github/workflows/ci.yml
  - docker-compose.yml
last_verified: 2026-01-15
implements_task: E01-T009
---

# Migration Validation

## Problem

Database migrations can fail silently or cause schema drift when:

- Migration files have unsafe SQL patterns (DROP TABLE without IF EXISTS)
- PostgreSQL enum changes use incorrect patterns
- Duplicate migration numbers exist
- Empty migration files are committed
- Invalid filename formats prevent migration application

Without automated validation, these issues aren't discovered until runtime, potentially causing production failures or data corruption.

## Solution

The `migrate-check.ts` script provides automated pre-commit validation to catch migration issues before they reach production. It validates migration file format, SQL safety patterns, and numbering sequence.

## Implementation

### Script Execution

The validation script is available as a package script:

```bash
# From project root
pnpm --filter @raptscallions/db db:migrate:check

# From packages/db directory
pnpm db:migrate:check
```

**Script definition:**

```json [packages/db/package.json]
{
  "scripts": {
    "db:migrate:check": "tsx scripts/migrate-check.ts"
  }
}
```

### Core Validation Logic

The script validates four key areas:

#### 1. Unsafe Pattern Detection

```typescript [packages/db/scripts/migrate-check.ts]
// DROP TABLE without IF EXISTS
if (content.includes("DROP TABLE") && !content.includes("IF EXISTS")) {
  result.warnings.push(`${file}: DROP TABLE without IF EXISTS`);
}

// Enum alteration without rename-recreate-drop pattern
if (content.includes("ALTER TYPE")) {
  const hasRenameRecreate =
    content.includes("RENAME TO") && content.includes("CREATE TYPE");

  if (!hasRenameRecreate && !content.includes("CREATE TYPE")) {
    result.warnings.push(
      `${file}: PostgreSQL enum alteration may be unsafe. Use rename-recreate-drop pattern.`
    );
  }
}

// NOT NULL without DEFAULT
if (
  content.includes("ALTER COLUMN") &&
  content.includes("NOT NULL") &&
  !content.includes("DEFAULT")
) {
  result.warnings.push(
    `${file}: Adding NOT NULL without DEFAULT may fail on existing data`
  );
}
```

#### 2. Duplicate Migration Number Detection

```typescript [packages/db/scripts/migrate-check.ts]
const numbers = migrationFiles
  .map((f) => {
    const match = f.match(/^(\d{4})_/);
    const firstGroup = match?.[1];
    return firstGroup !== undefined ? Number.parseInt(firstGroup, 10) : 0;
  })
  .sort((a, b) => a - b);

// Check for duplicates
const uniqueNumbers = [...new Set(numbers)];
if (uniqueNumbers.length !== numbers.length) {
  const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);
  const uniqueDuplicates = [...new Set(duplicates)];

  result.errors.push(
    `Duplicate migration numbers detected: ${uniqueDuplicates
      .map((n) => String(n).padStart(4, "0"))
      .join(", ")}. Each migration must have a unique number.`
  );
  result.valid = false;
}
```

#### 3. Empty Migration File Detection

```typescript [packages/db/scripts/migrate-check.ts]
const sqlContent = content
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .filter((line) => line.trim().length > 0)
  .join("\n");

if (sqlContent.length === 0) {
  result.warnings.push(
    `${file}: Empty migration file (no SQL statements). ` +
      `Migration will be tracked as applied but no schema changes will occur.`
  );
}
```

#### 4. Invalid Filename Format Detection

```typescript [packages/db/scripts/migrate-check.ts]
const invalidFiles = migrationFiles.filter(
  (f) => !/^\d{4}_[\w-]+\.sql$/.test(f)
);

if (invalidFiles.length > 0) {
  result.warnings.push(
    `Invalid migration filenames detected (will be ignored): ${invalidFiles.join(", ")}. ` +
      `Expected format: NNNN_description.sql`
  );
}
```

### ESM Compatibility

The script uses ESM-compatible path resolution to work across environments:

```typescript [packages/db/scripts/migrate-check.ts]
import { fileURLToPath } from "url";
import { dirname } from "path";

// ESM compatibility: __dirname is not available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

This ensures the script works in both test environments (where Vitest provides globals) and direct execution via `pnpm tsx`.

### Edge Case Handling

The script gracefully handles several edge cases:

**Zero migrations (fresh project):**

```typescript [packages/db/scripts/migrate-check.ts]
if (!existsSync(migrationsDir)) {
  console.log("No migrations directory found (fresh project)");
  return result;
}

if (migrationFiles.length === 0) {
  console.log("No migration files found (fresh project)");
  return result;
}
```

**Missing Git repository:**

```typescript [packages/db/scripts/migrate-check.ts]
try {
  const schemaFiles = execSync(
    "git status --short src/schema/ 2>/dev/null || echo ''",
    {
      encoding: "utf-8",
      cwd: join(__dirname, ".."),
    }
  ).trim();
  // ... validation logic
} catch (error) {
  console.log("Git not available, skipping schema drift check");
}
```

**Single migration (first project migration):**

```typescript [packages/db/scripts/migrate-check.ts]
// Only check for gaps if more than one migration exists
if (numbers.length > 1) {
  for (let i = 1; i < numbers.length; i++) {
    const prev = numbers[i - 1];
    const curr = numbers[i];
    if (prev !== undefined && curr !== undefined && curr !== prev + 1) {
      result.warnings.push(
        `Migration number gap detected: ${prev} -> ${curr}`
      );
    }
  }
}
```

## When to Use

Run validation before committing migration files:

1. **After generating migrations:**
   ```bash
   pnpm db:generate
   pnpm db:migrate:check  # Validate before committing
   ```

2. **After editing migration SQL manually:**
   ```bash
   # Edit migration file to fix enum handling
   pnpm db:migrate:check  # Verify safety patterns
   ```

3. **In CI before applying migrations:**
   ```yaml
   - name: Validate migrations
     run: pnpm --filter @raptscallions/db db:migrate:check
   ```

4. **In Docker before migration application:**
   ```yaml [docker-compose.yml]
   migrate:
     command: ["pnpm", "db:migrate"]
     # Validation runs as part of migrate script
   ```

## When NOT to Use

The validation script is **not** appropriate for:

- **SQL syntax validation** — Handled at runtime by PostgreSQL
- **Semantic validation of business logic** — Requires integration tests
- **Migration performance testing** — Requires production-like data volumes
- **Data migration verification** — Requires testing with actual data

These concerns should be addressed through:
- Integration tests with realistic data
- Performance testing in staging environments
- Code review of data transformation logic

## CI Migration Testing

In addition to file-level validation, CI applies migrations against a real PostgreSQL database before running tests. This catches runtime issues that static validation cannot detect (see [E01-T012: CI migration testing](/backlog/tasks/E01/E01-T012.md)).

### How CI Migration Works

The GitHub Actions workflow includes three migration-related steps:

```yaml [.github/workflows/ci.yml]
- name: Enable PostgreSQL extensions
  run: |
    psql -h localhost -U postgres -d raptscallions_test -c "CREATE EXTENSION IF NOT EXISTS ltree;"
  env:
    PGPASSWORD: postgres

- name: Run database migrations
  run: pnpm --filter @raptscallions/db db:migrate
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/raptscallions_test

- name: Verify migration tracking table
  run: |
    MIGRATION_COUNT=$(psql -h localhost -U postgres -d raptscallions_test -t -c "SELECT COUNT(*) FROM __drizzle_migrations")
    echo "Applied migrations: $MIGRATION_COUNT"
    if [ "$MIGRATION_COUNT" -lt 1 ]; then
      echo "ERROR: No migrations found in tracking table"
      exit 1
    fi
  env:
    PGPASSWORD: postgres
```

### What CI Migration Catches

| Issue | Static Validation | CI Migration |
|-------|-------------------|--------------|
| Invalid SQL syntax | ❌ | ✅ |
| Missing ltree extension | ❌ | ✅ |
| Foreign key violations | ❌ | ✅ |
| Column type mismatches | ❌ | ✅ |
| Index creation failures | ❌ | ✅ |
| Unsafe patterns | ✅ | ✅ |
| Duplicate numbers | ✅ | ✅ |
| Empty migration files | ✅ | ✅ |

::: tip Both Validations Are Complementary
Run `pnpm db:migrate:check` locally before committing to catch file-level issues early. CI migration testing then validates against a real database, catching runtime issues that static analysis cannot detect.
:::

### PostgreSQL Service Configuration

CI uses a PostgreSQL 16 Alpine container matching the production version:

```yaml [.github/workflows/ci.yml]
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: raptscallions_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

The health check ensures PostgreSQL is ready before migration steps run.

## Validation Output

### Success

```bash
$ pnpm db:migrate:check
🔍 Validating migrations...

✅ Migration validation passed
```

### Warnings Only

```bash
$ pnpm db:migrate:check
🔍 Validating migrations...

⚠️  Warnings:
   0010_enhance_chat_sessions.sql: PostgreSQL enum alteration may be unsafe. Use rename-recreate-drop pattern.

✅ Migration validation passed
```

**Note:** Warnings don't fail validation but should be reviewed. They indicate potential issues that may require manual verification.

### Validation Failure

```bash
$ pnpm db:migrate:check
🔍 Validating migrations...

❌ Validation failed:
   Duplicate migration numbers detected: 0011, 0012. Each migration must have a unique number.
```

**Exit code 1** — Blocks pre-commit hooks and CI/CD pipelines.

## Related Pages

**Related Documentation:**
- [Chat Schema](/database/concepts/chat-schema) - Example of enum migration pattern
- [CI Documentation Validation](/contributing/ci-validation) - How CI validates documentation

**Implementation:**
- [E01-T009: Migration scripts and validation](/backlog/completed/E01/E01-T009.md) ([spec](/backlog/docs/specs/E01/E01-T009-spec.md))
- [E01-T012: CI workflow for migration testing](/backlog/tasks/E01/E01-T012.md) ([spec](/backlog/docs/specs/E01/E01-T012-spec.md))

**Source Files:**
- [migrate-check.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/db/scripts/migrate-check.ts) - Validation script implementation
- [migrate.ts](https://github.com/ryandt33/raptscallions/blob/main/packages/db/scripts/migrate.ts) - Migration runner
- [ci.yml](https://github.com/ryandt33/raptscallions/blob/main/.github/workflows/ci.yml) - CI workflow with migration steps
- [docker-compose.yml](https://github.com/ryandt33/raptscallions/blob/main/docker-compose.yml) - Migration service configuration
