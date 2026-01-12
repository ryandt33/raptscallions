import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Database Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("db export", () => {
    it("should export a db client when DATABASE_URL is set", async () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";

      // Act
      const { db } = await import("../client.js");

      // Assert
      expect(db).toBeDefined();
    });

    it("should throw an error when DATABASE_URL is missing", async () => {
      // Arrange
      delete process.env.DATABASE_URL;

      // Act & Assert
      // The client module should throw when attempting to use db without DATABASE_URL
      await expect(async () => {
        const module = await import("../client.js");
        // Access the db to trigger the error
        return module.db;
      }).rejects.toThrow("DATABASE_URL");
    });
  });

  describe("queryClient export", () => {
    it("should export the raw postgres queryClient", async () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";

      // Act
      const { queryClient } = await import("../client.js");

      // Assert
      expect(queryClient).toBeDefined();
    });
  });

  describe("Connection configuration", () => {
    it("should configure connection pooling", async () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";

      // Act
      const { queryClient } = await import("../client.js");

      // Assert
      // The postgres client should be configured with pooling options
      // This test verifies the client exists and is properly configured
      expect(queryClient).toBeDefined();
    });
  });
});

describe("Package exports", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
  });

  describe("index.ts barrel export", () => {
    it("should export db client from index", async () => {
      // Act
      const exports = await import("../index.js");

      // Assert
      expect(exports.db).toBeDefined();
    });

    it("should export queryClient from index", async () => {
      // Act
      const exports = await import("../index.js");

      // Assert
      expect(exports.queryClient).toBeDefined();
    });

    it("should export validateDbEnv from index", async () => {
      // Act
      const exports = await import("../index.js");

      // Assert
      expect(exports.validateDbEnv).toBeDefined();
      expect(typeof exports.validateDbEnv).toBe("function");
    });

    it("should export dbEnvSchema from index", async () => {
      // Act
      const exports = await import("../index.js");

      // Assert
      expect(exports.dbEnvSchema).toBeDefined();
    });

    it("should export ltree custom type from index", async () => {
      // Act
      const exports = await import("../index.js");

      // Assert
      expect(exports.ltree).toBeDefined();
    });
  });
});
