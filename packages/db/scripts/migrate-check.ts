import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ESM compatibility: __dirname is not available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  // NOTE: Schema drift detection requires Git to be available. If running in a non-Git
  // environment (e.g., Docker without .git), this check will be skipped gracefully.
  // This is acceptable as CI/CD environments will have Git available.
  try {
    const schemaFiles = execSync(
      "git status --short src/schema/ 2>/dev/null || echo ''",
      {
        encoding: "utf-8",
        cwd: join(__dirname, ".."),
      }
    ).trim();

    if (schemaFiles) {
      console.log("Uncommitted schema changes detected, validating...");
      // Schema changes detected - this is OK, just log it
      // In a full implementation, we would generate a temp migration to check
    }
  } catch (error) {
    // Git not available or not in git repo - skip this check
    console.log("Git not available, skipping schema drift check");
  }

  // 2. Check for common migration issues
  const migrationsDir = join(__dirname, "../src/migrations");

  if (!existsSync(migrationsDir)) {
    console.log("No migrations directory found (fresh project)");
    return result;
  }

  const migrationFiles = readdirSync(migrationsDir).filter((f) =>
    f.endsWith(".sql")
  );

  if (migrationFiles.length === 0) {
    console.log("No migration files found (fresh project)");
    return result;
  }

  // Check for invalid filename formats
  const invalidFiles = migrationFiles.filter(
    (f) => !/^\d{4}_[\w-]+\.sql$/.test(f)
  );

  if (invalidFiles.length > 0) {
    result.warnings.push(
      `Invalid migration filenames detected (will be ignored): ${invalidFiles.join(", ")}. ` +
        `Expected format: NNNN_description.sql`
    );
  }

  for (const file of migrationFiles) {
    const filePath = join(migrationsDir, file);
    const content = readFileSync(filePath, "utf-8");

    // Check for empty migration files (no SQL content)
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

    // Check for dangerous patterns
    if (content.includes("DROP TABLE") && !content.includes("IF EXISTS")) {
      result.warnings.push(`${file}: DROP TABLE without IF EXISTS`);
    }

    if (content.includes("ALTER TYPE")) {
      // Check if using proper enum alteration pattern
      // Safe pattern includes RENAME TO and CREATE TYPE (rename-recreate-drop)
      const hasRenameRecreate =
        content.includes("RENAME TO") && content.includes("CREATE TYPE");

      // If ALTER TYPE is present but not using rename-recreate-drop pattern, warn
      if (!hasRenameRecreate && !content.includes("CREATE TYPE")) {
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

  // 3. Validate migration number sequence
  const numbers = migrationFiles
    .map((f) => {
      const match = f.match(/^(\d{4})_/);
      const firstGroup = match?.[1];
      return firstGroup !== undefined ? Number.parseInt(firstGroup, 10) : 0;
    })
    .sort((a, b) => a - b);

  // Check for duplicate migration numbers
  const uniqueNumbers = [...new Set(numbers)];
  if (uniqueNumbers.length !== numbers.length) {
    // Find which numbers are duplicated
    const duplicates = numbers.filter((n, i) => numbers.indexOf(n) !== i);
    const uniqueDuplicates = [...new Set(duplicates)];

    result.errors.push(
      `Duplicate migration numbers detected: ${uniqueDuplicates.map((n) => String(n).padStart(4, "0")).join(", ")}. ` +
        `Each migration must have a unique number.`
    );
    result.valid = false;
  }

  // Check for gaps (only if more than one migration)
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
