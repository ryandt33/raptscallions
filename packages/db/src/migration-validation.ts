import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// Type definitions for journal validation
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

export interface ValidationResult {
  valid: boolean;
  message: string;
  sqlCount: number;
  journalCount: number;
}

/**
 * Validates that all SQL migration files are registered in Drizzle's _journal.json
 * This prevents silent failures where migration files exist but aren't tracked
 *
 * @param migrationsDir - Optional path to migrations directory (for testing)
 * @returns ValidationResult with valid flag, message, and counts
 */
export function validateJournalSync(migrationsDir?: string): ValidationResult {
  const migrationsDirPath = migrationsDir || join(__dirname, "./migrations");
  const journalPath = join(migrationsDirPath, "meta/_journal.json");

  // Count SQL migration files (excluding meta directory)
  let sqlFiles: string[];
  try {
    sqlFiles = readdirSync(migrationsDirPath)
      .filter((file) => {
        // Only count .sql files in the root migrations directory
        // Ignore meta directory and non-SQL files
        return file.endsWith(".sql");
      })
      .sort();
  } catch (error) {
    // Handle case where migrations directory doesn't exist
    return {
      valid: false,
      message: `Failed to read migrations directory: ${error instanceof Error ? error.message : String(error)}`,
      sqlCount: 0,
      journalCount: 0,
    };
  }

  const sqlCount = sqlFiles.length;

  // Parse journal entries
  let journalCount = 0;
  try {
    const journalContent = readFileSync(journalPath, "utf-8");
    const journal = JSON.parse(journalContent) as Journal;
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
    // Journal file missing or corrupted with SQL files present
    return {
      valid: false,
      message: `Failed to read journal file: ${error instanceof Error ? error.message : String(error)}`,
      sqlCount,
      journalCount: 0,
    };
  }

  // Compare counts
  if (sqlCount === journalCount) {
    // Special case: both are 0 (fresh database)
    if (sqlCount === 0) {
      return {
        valid: true,
        message: "No migrations found (fresh database)",
        sqlCount: 0,
        journalCount: 0,
      };
    }
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
