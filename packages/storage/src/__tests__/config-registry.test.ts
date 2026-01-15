/**
 * Tests for storage backend config registry
 *
 * Tests the config schema registration system that allows backends
 * to define their configuration requirements.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";

import {
  registerBackendConfig,
  getBackendConfigSchema,
  isBackendConfigRegistered,
  getRegisteredBackendConfigs,
  resetConfigRegistry,
} from "../config-registry.js";

describe("Config Registry", () => {
  beforeEach(() => {
    // Reset registry state between tests
    resetConfigRegistry();
  });

  describe("registerBackendConfig", () => {
    it("should register a backend config schema", () => {
      // Arrange
      const schema = z.object({
        STORAGE_TEST_URL: z.string().url(),
      });

      // Act
      registerBackendConfig("test", schema);

      // Assert
      expect(isBackendConfigRegistered("test")).toBe(true);
    });

    it("should allow registration of multiple backend configs", () => {
      // Arrange
      const localSchema = z.object({
        STORAGE_LOCAL_PATH: z.string(),
      });
      const s3Schema = z.object({
        STORAGE_S3_BUCKET: z.string(),
        STORAGE_S3_REGION: z.string(),
      });
      const azureSchema = z.object({
        STORAGE_AZURE_ACCOUNT: z.string(),
      });

      // Act
      registerBackendConfig("local", localSchema);
      registerBackendConfig("s3", s3Schema);
      registerBackendConfig("azure", azureSchema);

      // Assert
      expect(isBackendConfigRegistered("local")).toBe(true);
      expect(isBackendConfigRegistered("s3")).toBe(true);
      expect(isBackendConfigRegistered("azure")).toBe(true);
    });

    it("should overwrite previous registration (idempotent)", () => {
      // Arrange
      const schema1 = z.object({
        STORAGE_TEST_V1: z.string(),
      });
      const schema2 = z.object({
        STORAGE_TEST_V2: z.string(),
      });

      // Act
      registerBackendConfig("test", schema1);
      registerBackendConfig("test", schema2);

      // Assert
      const retrievedSchema = getBackendConfigSchema("test");
      expect(retrievedSchema).toBe(schema2);
    });
  });

  describe("getBackendConfigSchema", () => {
    it("should return registered schema", () => {
      // Arrange
      const schema = z.object({
        STORAGE_TEST_KEY: z.string(),
      });
      registerBackendConfig("test", schema);

      // Act
      const retrievedSchema = getBackendConfigSchema("test");

      // Assert
      expect(retrievedSchema).toBe(schema);
    });

    it("should return undefined for unregistered backend", () => {
      // Act
      const schema = getBackendConfigSchema("nonexistent");

      // Assert
      expect(schema).toBeUndefined();
    });

    it("should return undefined after registry reset", () => {
      // Arrange
      const schema = z.object({
        STORAGE_TEST_KEY: z.string(),
      });
      registerBackendConfig("test", schema);
      expect(getBackendConfigSchema("test")).toBeDefined();

      // Act
      resetConfigRegistry();

      // Assert
      expect(getBackendConfigSchema("test")).toBeUndefined();
    });
  });

  describe("isBackendConfigRegistered", () => {
    it("should return true for registered backend", () => {
      // Arrange
      const schema = z.object({
        STORAGE_TEST_KEY: z.string(),
      });
      registerBackendConfig("test", schema);

      // Act & Assert
      expect(isBackendConfigRegistered("test")).toBe(true);
    });

    it("should return false for unregistered backend", () => {
      // Act & Assert
      expect(isBackendConfigRegistered("unknown")).toBe(false);
    });

    it("should return false after registry reset", () => {
      // Arrange
      const schema = z.object({
        STORAGE_TEST_KEY: z.string(),
      });
      registerBackendConfig("test", schema);
      expect(isBackendConfigRegistered("test")).toBe(true);

      // Act
      resetConfigRegistry();

      // Assert
      expect(isBackendConfigRegistered("test")).toBe(false);
    });
  });

  describe("getRegisteredBackendConfigs", () => {
    it("should return empty array when no backends registered", () => {
      // Act
      const configs = getRegisteredBackendConfigs();

      // Assert
      expect(configs).toEqual([]);
    });

    it("should return all registered backend identifiers", () => {
      // Arrange
      registerBackendConfig("local", z.object({ path: z.string() }));
      registerBackendConfig("s3", z.object({ bucket: z.string() }));
      registerBackendConfig("gcs", z.object({ project: z.string() }));

      // Act
      const configs = getRegisteredBackendConfigs();

      // Assert
      expect(configs).toHaveLength(3);
      expect(configs).toContain("local");
      expect(configs).toContain("s3");
      expect(configs).toContain("gcs");
    });

    it("should return new array (not a reference to internal state)", () => {
      // Arrange
      registerBackendConfig("test", z.object({ key: z.string() }));

      // Act
      const configs1 = getRegisteredBackendConfigs();
      const configs2 = getRegisteredBackendConfigs();

      // Assert - should be equal but not the same reference
      expect(configs1).toEqual(configs2);
      expect(configs1).not.toBe(configs2);
    });

    it("should return empty array after registry reset", () => {
      // Arrange
      registerBackendConfig("local", z.object({ path: z.string() }));
      registerBackendConfig("s3", z.object({ bucket: z.string() }));

      // Act
      resetConfigRegistry();

      // Assert
      expect(getRegisteredBackendConfigs()).toEqual([]);
    });
  });

  describe("resetConfigRegistry", () => {
    it("should clear all registered config schemas", () => {
      // Arrange
      registerBackendConfig("local", z.object({ path: z.string() }));
      registerBackendConfig("s3", z.object({ bucket: z.string() }));
      registerBackendConfig("azure", z.object({ account: z.string() }));
      expect(getRegisteredBackendConfigs()).toHaveLength(3);

      // Act
      resetConfigRegistry();

      // Assert
      expect(getRegisteredBackendConfigs()).toHaveLength(0);
      expect(isBackendConfigRegistered("local")).toBe(false);
      expect(isBackendConfigRegistered("s3")).toBe(false);
      expect(isBackendConfigRegistered("azure")).toBe(false);
    });

    it("should allow re-registration after reset", () => {
      // Arrange
      const schema1 = z.object({ v1: z.string() });
      registerBackendConfig("test", schema1);
      resetConfigRegistry();

      // Act
      const schema2 = z.object({ v2: z.string() });
      registerBackendConfig("test", schema2);

      // Assert
      expect(isBackendConfigRegistered("test")).toBe(true);
      expect(getBackendConfigSchema("test")).toBe(schema2);
    });

    it("should be safe to call multiple times", () => {
      // Arrange
      registerBackendConfig("test", z.object({ key: z.string() }));

      // Act
      resetConfigRegistry();
      resetConfigRegistry();
      resetConfigRegistry();

      // Assert - should not throw
      expect(getRegisteredBackendConfigs()).toEqual([]);
    });
  });

  describe("validation with registered schemas", () => {
    it("should allow validation using registered schema", () => {
      // Arrange
      const schema = z.object({
        STORAGE_TEST_URL: z.string().url(),
        STORAGE_TEST_KEY: z.string().min(1),
      });
      registerBackendConfig("test", schema);

      // Act
      const retrievedSchema = getBackendConfigSchema("test");
      const result = retrievedSchema?.safeParse({
        STORAGE_TEST_URL: "https://example.com",
        STORAGE_TEST_KEY: "my-key",
      });

      // Assert
      expect(result?.success).toBe(true);
    });

    it("should validate correctly with dynamically registered schemas", () => {
      // Arrange
      const customSchema = z.object({
        CUSTOM_API_URL: z.string().url(),
        CUSTOM_API_KEY: z.string().min(10),
        CUSTOM_TIMEOUT: z.coerce.number().int().positive(),
      });
      registerBackendConfig("custom", customSchema);

      // Act
      const schema = getBackendConfigSchema("custom");
      const validResult = schema?.safeParse({
        CUSTOM_API_URL: "https://api.example.com",
        CUSTOM_API_KEY: "1234567890",
        CUSTOM_TIMEOUT: "5000",
      });
      const invalidResult = schema?.safeParse({
        CUSTOM_API_URL: "not-a-url",
        CUSTOM_API_KEY: "short",
        CUSTOM_TIMEOUT: "-1",
      });

      // Assert
      expect(validResult?.success).toBe(true);
      expect(invalidResult?.success).toBe(false);
    });
  });

  describe("Backend identifier edge cases", () => {
    it("should handle identifiers with special characters", () => {
      // Arrange
      const identifiers = [
        "my-backend",
        "my_backend",
        "backend123",
        "Backend.v2",
      ];

      // Act & Assert
      for (const id of identifiers) {
        registerBackendConfig(id, z.object({ key: z.string() }));
        expect(isBackendConfigRegistered(id)).toBe(true);
      }
    });

    it("should treat identifiers as case-sensitive", () => {
      // Arrange
      const upperSchema = z.object({ upper: z.string() });
      const lowerSchema = z.object({ lower: z.string() });
      registerBackendConfig("Local", upperSchema);
      registerBackendConfig("local", lowerSchema);

      // Assert
      expect(isBackendConfigRegistered("Local")).toBe(true);
      expect(isBackendConfigRegistered("local")).toBe(true);
      expect(getRegisteredBackendConfigs()).toHaveLength(2);

      // Verify they are different schemas
      expect(getBackendConfigSchema("Local")).toBe(upperSchema);
      expect(getBackendConfigSchema("local")).toBe(lowerSchema);
    });
  });
});
