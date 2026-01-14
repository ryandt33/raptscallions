import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { describe, it, expect } from "vitest";

import { ltree } from "../../schema/types.js";

describe("Custom PostgreSQL Types", () => {
  describe("ltree", () => {
    it("should be a valid Drizzle custom type column builder function", () => {
      // Arrange & Act
      const column = ltree("test_path");

      // Assert - verify it creates a valid column config
      expect(column).toBeDefined();
      expect(typeof column).toBe("object");
    });

    it("should create columns that can be used in table definitions", () => {
      // Arrange & Act
      const testTable = pgTable("test_groups", {
        id: uuid("id").primaryKey().defaultRandom(),
        name: varchar("name", { length: 100 }).notNull(),
        path: ltree("path").notNull(),
      });

      // Assert
      expect(testTable.path).toBeDefined();
      expect(testTable.id).toBeDefined();
      expect(testTable.name).toBeDefined();
    });

    it("should support the notNull modifier", () => {
      // Arrange & Act
      const column = ltree("path").notNull();

      // Assert
      expect(column).toBeDefined();
      expect(column.notNull).toBeDefined();
    });

    it("should support the default modifier", () => {
      // Arrange & Act
      const column = ltree("path").default("root");

      // Assert
      expect(column).toBeDefined();
    });

    it("should create column with correct name", () => {
      // Arrange & Act
      const testTable = pgTable("hierarchy", {
        path: ltree("hierarchy_path"),
      });

      // Assert - verify the column is created with the expected name
      expect(testTable.path).toBeDefined();
      // The column config should have the name we specified
      expect(testTable.path.name).toBe("hierarchy_path");
    });

    it("should be usable for hierarchical path patterns", () => {
      // Arrange - Create a table definition with ltree for hierarchical data
      const groups = pgTable("groups", {
        id: uuid("id").primaryKey().defaultRandom(),
        name: varchar("name", { length: 100 }).notNull(),
        path: ltree("path").notNull(), // e.g., "district.school.department"
      });

      // Assert - Verify the schema is properly defined
      expect(groups.path).toBeDefined();
      expect(groups.id).toBeDefined();
      expect(groups.name).toBeDefined();
    });
  });
});
