import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";

describe("Configuration (config.ts)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("envSchema", () => {
    it("should parse valid environment variables", async () => {
      // Arrange
      process.env.NODE_ENV = "development";
      process.env.PORT = "3000";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.CORS_ORIGINS = "http://localhost:5173";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act
      const { envSchema } = await import("../config.js");
      const config = envSchema.parse(process.env);

      // Assert
      expect(config.NODE_ENV).toBe("development");
      expect(config.PORT).toBe(3000);
      expect(config.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/testdb");
      expect(config.REDIS_URL).toBe("redis://localhost:6379");
      expect(config.CORS_ORIGINS).toBe("http://localhost:5173");
    });

    it("should default NODE_ENV to development", async () => {
      // Arrange
      delete process.env.NODE_ENV;
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act
      const { envSchema } = await import("../config.js");
      const config = envSchema.parse(process.env);

      // Assert
      expect(config.NODE_ENV).toBe("development");
    });

    it("should default PORT to 3000", async () => {
      // Arrange
      delete process.env.PORT;
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act
      const { envSchema } = await import("../config.js");
      const config = envSchema.parse(process.env);

      // Assert
      expect(config.PORT).toBe(3000);
    });

    it("should default CORS_ORIGINS to http://localhost:5173", async () => {
      // Arrange
      delete process.env.CORS_ORIGINS;
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act
      const { envSchema } = await import("../config.js");
      const config = envSchema.parse(process.env);

      // Assert
      expect(config.CORS_ORIGINS).toBe("http://localhost:5173");
    });

    it("should coerce PORT string to number", async () => {
      // Arrange
      process.env.PORT = "4000";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act
      const { envSchema } = await import("../config.js");
      const config = envSchema.parse(process.env);

      // Assert
      expect(config.PORT).toBe(4000);
      expect(typeof config.PORT).toBe("number");
    });

    it("should accept valid NODE_ENV values", async () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      const { envSchema } = await import("../config.js");

      // Act & Assert
      process.env.NODE_ENV = "development";
      expect(envSchema.parse(process.env).NODE_ENV).toBe("development");

      process.env.NODE_ENV = "test";
      expect(envSchema.parse(process.env).NODE_ENV).toBe("test");

      process.env.NODE_ENV = "production";
      expect(envSchema.parse(process.env).NODE_ENV).toBe("production");
    });

    it("should throw error when DATABASE_URL is missing", async () => {
      // Arrange
      delete process.env.DATABASE_URL;
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act & Assert
      const { envSchema } = await import("../config.js");
      expect(() => envSchema.parse(process.env)).toThrow();
    });

    it("should throw error when DATABASE_URL is invalid", async () => {
      // Arrange
      process.env.DATABASE_URL = "not-a-valid-url";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act & Assert
      const { envSchema } = await import("../config.js");
      expect(() => envSchema.parse(process.env)).toThrow();
    });

    it("should throw error when REDIS_URL is missing", async () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      delete process.env.REDIS_URL;
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act & Assert
      const { envSchema } = await import("../config.js");
      expect(() => envSchema.parse(process.env)).toThrow();
    });

    it("should throw error when REDIS_URL is invalid", async () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "not-a-valid-url";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act & Assert
      const { envSchema } = await import("../config.js");
      expect(() => envSchema.parse(process.env)).toThrow();
    });

    it("should throw error when PORT is negative", async () => {
      // Arrange
      process.env.PORT = "-1";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act & Assert
      const { envSchema } = await import("../config.js");
      expect(() => envSchema.parse(process.env)).toThrow();
    });

    it("should throw error when PORT is zero", async () => {
      // Arrange
      process.env.PORT = "0";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act & Assert
      const { envSchema } = await import("../config.js");
      expect(() => envSchema.parse(process.env)).toThrow();
    });

    it("should throw error when PORT exceeds 65535", async () => {
      // Arrange
      process.env.PORT = "65536";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act & Assert
      const { envSchema } = await import("../config.js");
      expect(() => envSchema.parse(process.env)).toThrow();
    });

    it("should throw error when NODE_ENV is invalid", async () => {
      // Arrange
      process.env.NODE_ENV = "invalid";
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act & Assert
      const { envSchema } = await import("../config.js");
      expect(() => envSchema.parse(process.env)).toThrow();
    });
  });

  describe("config export", () => {
    it("should export parsed config when environment is valid", async () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act
      const { config } = await import("../config.js");

      // Assert
      expect(config).toBeDefined();
      expect(config.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/testdb");
      expect(config.REDIS_URL).toBe("redis://localhost:6379");
    });

    it("should throw on first property access when environment is invalid", async () => {
      // Arrange
      delete process.env.DATABASE_URL;

      // Act & Assert
      const { config } = await import("../config.js");
      expect(() => config.DATABASE_URL).toThrow();
    });
  });

  describe("Env type inference", () => {
    it("should infer correct types from schema", async () => {
      // Arrange
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
      process.env.REDIS_URL = "redis://localhost:6379";
      process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars";

      // Act
      const { envSchema } = await import("../config.js");
      const config = envSchema.parse(process.env);

      // Assert
      expect(typeof config.NODE_ENV).toBe("string");
      expect(typeof config.PORT).toBe("number");
      expect(typeof config.DATABASE_URL).toBe("string");
      expect(typeof config.REDIS_URL).toBe("string");
      expect(typeof config.CORS_ORIGINS).toBe("string");
    });
  });
});
