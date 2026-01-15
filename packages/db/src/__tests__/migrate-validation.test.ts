/**
 * Unit tests for migration journal sync validation (E01-T015)
 * Tests that verify all SQL migration files are registered in Drizzle's _journal.json
 */
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Import the function to test
import { validateJournalSync } from "../migration-validation.js";

describe("Journal Sync Validation (E01-T015)", () => {
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
      writeFileSync(
        join(migrationsDir, "0001_create_users.sql"),
        "CREATE TABLE users;"
      );
      writeFileSync(
        join(migrationsDir, "0002_create_groups.sql"),
        "CREATE TABLE groups;"
      );
      writeFileSync(
        join(migrationsDir, "0003_create_sessions.sql"),
        "CREATE TABLE sessions;"
      );

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: [
          {
            idx: 0,
            version: "7",
            when: 1768149572305,
            tag: "0001_create_users",
            breakpoints: true,
          },
          {
            idx: 1,
            version: "7",
            when: 1768151160000,
            tag: "0002_create_groups",
            breakpoints: true,
          },
          {
            idx: 2,
            version: "7",
            when: 1768152660000,
            tag: "0003_create_sessions",
            breakpoints: true,
          },
        ],
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.sqlCount).toBe(3);
      expect(result.journalCount).toBe(3);
      expect(result.message).toContain("in sync");
    });

    it("should fail when SQL files exceed journal entries (E05-T001 scenario)", () => {
      // Arrange: 4 SQL files, 2 journal entries (simulates the E05-T001 issue)
      writeFileSync(
        join(migrationsDir, "0001_create_users.sql"),
        "CREATE TABLE users;"
      );
      writeFileSync(
        join(migrationsDir, "0002_create_groups.sql"),
        "CREATE TABLE groups;"
      );
      writeFileSync(
        join(migrationsDir, "0003_create_sessions.sql"),
        "CREATE TABLE sessions;"
      );
      writeFileSync(
        join(migrationsDir, "0004_create_tools.sql"),
        "CREATE TABLE tools;"
      );

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: [
          {
            idx: 0,
            version: "7",
            when: 1768149572305,
            tag: "0001_create_users",
            breakpoints: true,
          },
          {
            idx: 1,
            version: "7",
            when: 1768151160000,
            tag: "0002_create_groups",
            breakpoints: true,
          },
        ],
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync(migrationsDir);

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
      writeFileSync(
        join(migrationsDir, "0001_create_users.sql"),
        "CREATE TABLE users;"
      );
      writeFileSync(
        join(migrationsDir, "0002_create_groups.sql"),
        "CREATE TABLE groups;"
      );

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: [
          {
            idx: 0,
            version: "7",
            when: 1768149572305,
            tag: "0001_create_users",
            breakpoints: true,
          },
          {
            idx: 1,
            version: "7",
            when: 1768151160000,
            tag: "0002_create_groups",
            breakpoints: true,
          },
          {
            idx: 2,
            version: "7",
            when: 1768152660000,
            tag: "0003_create_sessions",
            breakpoints: true,
          },
          {
            idx: 3,
            version: "7",
            when: 1768153000000,
            tag: "0004_create_tools",
            breakpoints: true,
          },
        ],
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.sqlCount).toBe(2);
      expect(result.journalCount).toBe(4);
      expect(result.message).toContain("out of sync");
    });

    it("should handle fresh database with no migrations", () => {
      // Arrange: no SQL files, empty journal
      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: [],
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.sqlCount).toBe(0);
      expect(result.journalCount).toBe(0);
      expect(result.message).toContain("fresh database");
    });

    it("should fail when journal file is missing", () => {
      // Arrange: SQL files exist but no journal
      writeFileSync(
        join(migrationsDir, "0001_create_users.sql"),
        "CREATE TABLE users;"
      );
      // No journal file created

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.sqlCount).toBe(1);
      expect(result.journalCount).toBe(0);
      expect(result.message).toContain("Failed to read journal");
    });

    it("should fail when journal file is malformed JSON", () => {
      // Arrange: SQL files exist, corrupted journal
      writeFileSync(
        join(migrationsDir, "0001_create_users.sql"),
        "CREATE TABLE users;"
      );
      writeFileSync(journalPath, "{ invalid json }");

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Failed to read journal");
    });

    it("should handle missing journal with zero SQL files (fresh database)", () => {
      // Arrange: no SQL files, no journal file (truly fresh database)
      // Don't create journal file at all

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert - should treat as fresh database and pass validation
      expect(result.valid).toBe(true);
      expect(result.sqlCount).toBe(0);
      expect(result.journalCount).toBe(0);
      expect(result.message).toContain("fresh database");
    });

    it("should only count .sql files, ignoring other files", () => {
      // Arrange: Mix of SQL and non-SQL files
      writeFileSync(
        join(migrationsDir, "0001_create_users.sql"),
        "CREATE TABLE users;"
      );
      writeFileSync(
        join(migrationsDir, "0002_create_groups.sql"),
        "CREATE TABLE groups;"
      );
      writeFileSync(join(migrationsDir, "README.md"), "Documentation");
      writeFileSync(join(migrationsDir, ".gitkeep"), "");
      writeFileSync(join(migrationsDir, "schema.ts"), "export const schema = {}");

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: [
          {
            idx: 0,
            version: "7",
            when: 1768149572305,
            tag: "0001_create_users",
            breakpoints: true,
          },
          {
            idx: 1,
            version: "7",
            when: 1768151160000,
            tag: "0002_create_groups",
            breakpoints: true,
          },
        ],
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert - should only count 2 SQL files, ignoring others
      expect(result.valid).toBe(true);
      expect(result.sqlCount).toBe(2);
      expect(result.journalCount).toBe(2);
    });

    it("should ignore meta directory when counting SQL files", () => {
      // Arrange: SQL file in main dir and meta dir (meta should be ignored)
      writeFileSync(
        join(migrationsDir, "0001_create_users.sql"),
        "CREATE TABLE users;"
      );
      // Create a SQL file in the meta directory that should be ignored
      writeFileSync(
        join(migrationsDir, "meta/snapshot.sql"),
        "-- Snapshot file"
      );

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: [
          {
            idx: 0,
            version: "7",
            when: 1768149572305,
            tag: "0001_create_users",
            breakpoints: true,
          },
        ],
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert - should only count the SQL file in root, not in meta
      expect(result.valid).toBe(true);
      expect(result.sqlCount).toBe(1);
      expect(result.journalCount).toBe(1);
    });
  });

  describe("Real-world scenario validation", () => {
    it("should detect the actual E05-T001 issue (12 SQL files, 8 journal entries)", () => {
      // Arrange: Simulate the exact scenario from E05-T001
      // 12 SQL files but only 8 journal entries
      for (let i = 1; i <= 12; i++) {
        const num = String(i).padStart(4, "0");
        writeFileSync(
          join(migrationsDir, `${num}_migration.sql`),
          `CREATE TABLE test_${i};`
        );
      }

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: [
          {
            idx: 0,
            version: "7",
            when: 1768149572305,
            tag: "0001_migration",
            breakpoints: true,
          },
          {
            idx: 1,
            version: "7",
            when: 1768149572306,
            tag: "0002_migration",
            breakpoints: true,
          },
          {
            idx: 2,
            version: "7",
            when: 1768149572307,
            tag: "0003_migration",
            breakpoints: true,
          },
          {
            idx: 3,
            version: "7",
            when: 1768149572308,
            tag: "0004_migration",
            breakpoints: true,
          },
          {
            idx: 4,
            version: "7",
            when: 1768149572309,
            tag: "0005_migration",
            breakpoints: true,
          },
          {
            idx: 5,
            version: "7",
            when: 1768149572310,
            tag: "0006_migration",
            breakpoints: true,
          },
          {
            idx: 6,
            version: "7",
            when: 1768149572311,
            tag: "0007_migration",
            breakpoints: true,
          },
          {
            idx: 7,
            version: "7",
            when: 1768149572312,
            tag: "0008_migration",
            breakpoints: true,
          },
        ],
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.sqlCount).toBe(12);
      expect(result.journalCount).toBe(8);
      expect(result.message).toContain("12 SQL files");
      expect(result.message).toContain("8 journal entries");
    });

    it("should pass validation after fixing the E05-T001 issue", () => {
      // Arrange: All 12 migrations properly registered
      for (let i = 1; i <= 12; i++) {
        const num = String(i).padStart(4, "0");
        writeFileSync(
          join(migrationsDir, `${num}_migration.sql`),
          `CREATE TABLE test_${i};`
        );
      }

      const entries = [];
      for (let i = 0; i < 12; i++) {
        const num = String(i + 1).padStart(4, "0");
        entries.push({
          idx: i,
          version: "7",
          when: 1768149572305 + i,
          tag: `${num}_migration`,
          breakpoints: true,
        });
      }

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries,
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.sqlCount).toBe(12);
      expect(result.journalCount).toBe(12);
      expect(result.message).toContain("in sync");
    });
  });

  describe("Edge cases", () => {
    it("should handle single migration correctly", () => {
      // Arrange: Exactly one migration
      writeFileSync(
        join(migrationsDir, "0001_initial.sql"),
        "CREATE EXTENSION IF NOT EXISTS ltree;"
      );

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries: [
          {
            idx: 0,
            version: "7",
            when: 1768149572305,
            tag: "0001_initial",
            breakpoints: true,
          },
        ],
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.sqlCount).toBe(1);
      expect(result.journalCount).toBe(1);
    });

    it("should handle large number of migrations efficiently", () => {
      // Arrange: 100 migrations (tests performance requirement)
      for (let i = 1; i <= 100; i++) {
        const num = String(i).padStart(4, "0");
        writeFileSync(
          join(migrationsDir, `${num}_migration.sql`),
          `CREATE TABLE test_${i};`
        );
      }

      const entries = [];
      for (let i = 0; i < 100; i++) {
        const num = String(i + 1).padStart(4, "0");
        entries.push({
          idx: i,
          version: "7",
          when: 1768149572305 + i,
          tag: `${num}_migration`,
          breakpoints: true,
        });
      }

      const journal = {
        version: "7",
        dialect: "postgresql",
        entries,
      };
      writeFileSync(journalPath, JSON.stringify(journal, null, 2));

      // Act
      const startTime = Date.now();
      const result = validateJournalSync(migrationsDir);
      const elapsed = Date.now() - startTime;

      // Assert - should be fast (AC7: zero performance impact)
      expect(result.valid).toBe(true);
      expect(result.sqlCount).toBe(100);
      expect(result.journalCount).toBe(100);
      expect(elapsed).toBeLessThan(100); // Should complete in <100ms
    });

    it("should provide clear error for missing journal with SQL files present", () => {
      // Arrange: Developer created SQL files but forgot to run db:generate
      writeFileSync(
        join(migrationsDir, "0001_create_users.sql"),
        "CREATE TABLE users;"
      );
      writeFileSync(
        join(migrationsDir, "0002_create_groups.sql"),
        "CREATE TABLE groups;"
      );
      // No journal file exists

      // Act
      const result = validateJournalSync(migrationsDir);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.sqlCount).toBe(2);
      expect(result.journalCount).toBe(0);
      expect(result.message).toContain("Failed to read journal");
      // The error message should help developer understand what went wrong
    });
  });
});
