/**
 * Tests for storage configuration system
 *
 * Tests the Zod-based configuration system with lazy loading,
 * backend-specific validation, and clear error messages.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";

import {
  registerBackendConfig,
  resetConfigRegistry,
  isBackendConfigRegistered,
} from "../config-registry.js";
import {
  storageConfig,
  resetStorageConfig,
  getBackendConfig,
  registerBuiltInConfigs,
  commonConfigSchema,
  localConfigSchema,
  s3ConfigSchema,
  azureConfigSchema,
  gcsConfigSchema,
  aliyunConfigSchema,
} from "../config.js";
import { ConfigurationError, StorageErrorCode } from "../errors.js";

import type { LocalConfig, S3Config } from "../config.js";

/**
 * Helper to set environment variables and clean up after test
 */
function withEnv(
  env: Record<string, string | undefined>,
  fn: () => void | Promise<void>
): () => Promise<void> {
  return async () => {
    const originalEnv: Record<string, string | undefined> = {};

    // Save original values and set new ones
    for (const key of Object.keys(env)) {
      originalEnv[key] = process.env[key];
      if (env[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = env[key];
      }
    }

    try {
      await fn();
    } finally {
      // Restore original values
      for (const key of Object.keys(originalEnv)) {
        if (originalEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalEnv[key];
        }
      }
    }
  };
}

/**
 * Helper to clear all storage-related env vars
 */
function clearStorageEnv(): void {
  const storageVars = Object.keys(process.env).filter(
    (key) => key.startsWith("STORAGE_")
  );
  for (const key of storageVars) {
    delete process.env[key];
  }
}

describe("Storage Config", () => {
  beforeEach(() => {
    // Reset both config and registry between tests
    resetStorageConfig();
    resetConfigRegistry();
    clearStorageEnv();
    // Re-register built-in configs after reset
    registerBuiltInConfigs();
  });

  afterEach(() => {
    // Clean up after each test
    resetStorageConfig();
    clearStorageEnv();
  });

  describe("Common Config Schema", () => {
    describe("commonConfigSchema", () => {
      it("should validate common settings", () => {
        // Act
        const result = commonConfigSchema.safeParse({
          STORAGE_BACKEND: "local",
          STORAGE_MAX_FILE_SIZE_BYTES: "1048576",
          STORAGE_QUOTA_BYTES: "10737418240",
          STORAGE_SIGNED_URL_EXPIRATION_SECONDS: "3600",
        });

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.STORAGE_BACKEND).toBe("local");
          expect(result.data.STORAGE_MAX_FILE_SIZE_BYTES).toBe(1048576);
          expect(result.data.STORAGE_QUOTA_BYTES).toBe(10737418240);
          expect(result.data.STORAGE_SIGNED_URL_EXPIRATION_SECONDS).toBe(3600);
        }
      });

      it("should apply default values", () => {
        // Act
        const result = commonConfigSchema.safeParse({});

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.STORAGE_BACKEND).toBe("local");
          expect(result.data.STORAGE_MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024); // 10MB
          expect(result.data.STORAGE_QUOTA_BYTES).toBe(1024 * 1024 * 1024); // 1GB
          expect(result.data.STORAGE_SIGNED_URL_EXPIRATION_SECONDS).toBe(15 * 60); // 15 minutes
        }
      });

      it("should reject negative file size", () => {
        // Act
        const result = commonConfigSchema.safeParse({
          STORAGE_MAX_FILE_SIZE_BYTES: "-100",
        });

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject negative quota", () => {
        // Act
        const result = commonConfigSchema.safeParse({
          STORAGE_QUOTA_BYTES: "-1000",
        });

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject negative signed URL expiration", () => {
        // Act
        const result = commonConfigSchema.safeParse({
          STORAGE_SIGNED_URL_EXPIRATION_SECONDS: "-60",
        });

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject zero values for positive number fields", () => {
        // Act
        const fileSizeResult = commonConfigSchema.safeParse({
          STORAGE_MAX_FILE_SIZE_BYTES: "0",
        });
        const quotaResult = commonConfigSchema.safeParse({
          STORAGE_QUOTA_BYTES: "0",
        });
        const expirationResult = commonConfigSchema.safeParse({
          STORAGE_SIGNED_URL_EXPIRATION_SECONDS: "0",
        });

        // Assert
        expect(fileSizeResult.success).toBe(false);
        expect(quotaResult.success).toBe(false);
        expect(expirationResult.success).toBe(false);
      });

      it("should coerce string numbers to integers", () => {
        // Act
        const result = commonConfigSchema.safeParse({
          STORAGE_MAX_FILE_SIZE_BYTES: "1048576",
          STORAGE_QUOTA_BYTES: "10737418240",
        });

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data.STORAGE_MAX_FILE_SIZE_BYTES).toBe("number");
          expect(typeof result.data.STORAGE_QUOTA_BYTES).toBe("number");
        }
      });
    });
  });

  describe("Built-in Backend Config Schemas", () => {
    describe("localConfigSchema", () => {
      it("should validate local backend settings", () => {
        // Act
        const result = localConfigSchema.safeParse({
          STORAGE_LOCAL_PATH: "/custom/uploads",
        });

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.STORAGE_LOCAL_PATH).toBe("/custom/uploads");
        }
      });

      it("should apply default path", () => {
        // Act
        const result = localConfigSchema.safeParse({});

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.STORAGE_LOCAL_PATH).toBe("./storage/uploads");
        }
      });
    });

    describe("s3ConfigSchema", () => {
      it("should validate S3 backend settings", () => {
        // Act
        const result = s3ConfigSchema.safeParse({
          STORAGE_S3_ENDPOINT: "https://s3.us-east-1.amazonaws.com",
          STORAGE_S3_REGION: "us-east-1",
          STORAGE_S3_BUCKET: "my-bucket",
          STORAGE_S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
          STORAGE_S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        });

        // Assert
        expect(result.success).toBe(true);
      });

      it("should allow optional endpoint (for AWS S3)", () => {
        // Act
        const result = s3ConfigSchema.safeParse({
          STORAGE_S3_REGION: "us-east-1",
          STORAGE_S3_BUCKET: "my-bucket",
          STORAGE_S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
          STORAGE_S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        });

        // Assert
        expect(result.success).toBe(true);
      });

      it("should require region", () => {
        // Act
        const result = s3ConfigSchema.safeParse({
          STORAGE_S3_BUCKET: "my-bucket",
          STORAGE_S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
          STORAGE_S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        });

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((i) => i.path[0] === "STORAGE_S3_REGION")).toBe(true);
        }
      });

      it("should require bucket", () => {
        // Act
        const result = s3ConfigSchema.safeParse({
          STORAGE_S3_REGION: "us-east-1",
          STORAGE_S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
          STORAGE_S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        });

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((i) => i.path[0] === "STORAGE_S3_BUCKET")).toBe(true);
        }
      });

      it("should require access key ID", () => {
        // Act
        const result = s3ConfigSchema.safeParse({
          STORAGE_S3_REGION: "us-east-1",
          STORAGE_S3_BUCKET: "my-bucket",
          STORAGE_S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        });

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((i) => i.path[0] === "STORAGE_S3_ACCESS_KEY_ID")).toBe(true);
        }
      });

      it("should require secret access key", () => {
        // Act
        const result = s3ConfigSchema.safeParse({
          STORAGE_S3_REGION: "us-east-1",
          STORAGE_S3_BUCKET: "my-bucket",
          STORAGE_S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
        });

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((i) => i.path[0] === "STORAGE_S3_SECRET_ACCESS_KEY")).toBe(true);
        }
      });

      it("should reject invalid endpoint URL", () => {
        // Act
        const result = s3ConfigSchema.safeParse({
          STORAGE_S3_ENDPOINT: "not-a-url",
          STORAGE_S3_REGION: "us-east-1",
          STORAGE_S3_BUCKET: "my-bucket",
          STORAGE_S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
          STORAGE_S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        });

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject empty string values", () => {
        // Act
        const result = s3ConfigSchema.safeParse({
          STORAGE_S3_REGION: "",
          STORAGE_S3_BUCKET: "",
          STORAGE_S3_ACCESS_KEY_ID: "",
          STORAGE_S3_SECRET_ACCESS_KEY: "",
        });

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(4);
        }
      });
    });

    describe("azureConfigSchema", () => {
      it("should validate Azure backend settings", () => {
        // Act
        const result = azureConfigSchema.safeParse({
          STORAGE_AZURE_ACCOUNT_NAME: "mystorageaccount",
          STORAGE_AZURE_ACCESS_KEY: "base64encodedkey==",
          STORAGE_AZURE_CONTAINER: "mycontainer",
        });

        // Assert
        expect(result.success).toBe(true);
      });

      it("should require account name", () => {
        // Act
        const result = azureConfigSchema.safeParse({
          STORAGE_AZURE_ACCESS_KEY: "base64encodedkey==",
          STORAGE_AZURE_CONTAINER: "mycontainer",
        });

        // Assert
        expect(result.success).toBe(false);
      });

      it("should require access key", () => {
        // Act
        const result = azureConfigSchema.safeParse({
          STORAGE_AZURE_ACCOUNT_NAME: "mystorageaccount",
          STORAGE_AZURE_CONTAINER: "mycontainer",
        });

        // Assert
        expect(result.success).toBe(false);
      });

      it("should require container", () => {
        // Act
        const result = azureConfigSchema.safeParse({
          STORAGE_AZURE_ACCOUNT_NAME: "mystorageaccount",
          STORAGE_AZURE_ACCESS_KEY: "base64encodedkey==",
        });

        // Assert
        expect(result.success).toBe(false);
      });
    });

    describe("gcsConfigSchema", () => {
      it("should validate GCS backend settings", () => {
        // Act
        const result = gcsConfigSchema.safeParse({
          STORAGE_GCS_PROJECT_ID: "my-project",
          STORAGE_GCS_BUCKET: "my-bucket",
          STORAGE_GCS_KEY_FILE_PATH: "/path/to/keyfile.json",
        });

        // Assert
        expect(result.success).toBe(true);
      });

      it("should allow optional key file path (for ADC)", () => {
        // Act
        const result = gcsConfigSchema.safeParse({
          STORAGE_GCS_PROJECT_ID: "my-project",
          STORAGE_GCS_BUCKET: "my-bucket",
        });

        // Assert
        expect(result.success).toBe(true);
      });

      it("should require project ID", () => {
        // Act
        const result = gcsConfigSchema.safeParse({
          STORAGE_GCS_BUCKET: "my-bucket",
        });

        // Assert
        expect(result.success).toBe(false);
      });

      it("should require bucket", () => {
        // Act
        const result = gcsConfigSchema.safeParse({
          STORAGE_GCS_PROJECT_ID: "my-project",
        });

        // Assert
        expect(result.success).toBe(false);
      });
    });

    describe("aliyunConfigSchema", () => {
      it("should validate Aliyun OSS backend settings", () => {
        // Act
        const result = aliyunConfigSchema.safeParse({
          STORAGE_ALIYUN_REGION: "oss-cn-hangzhou",
          STORAGE_ALIYUN_BUCKET: "my-bucket",
          STORAGE_ALIYUN_ACCESS_KEY_ID: "LTAI5tExampleKey",
          STORAGE_ALIYUN_SECRET_ACCESS_KEY: "ExampleSecretKey1234",
        });

        // Assert
        expect(result.success).toBe(true);
      });

      it("should require all fields", () => {
        // Act & Assert
        expect(
          aliyunConfigSchema.safeParse({
            STORAGE_ALIYUN_BUCKET: "my-bucket",
            STORAGE_ALIYUN_ACCESS_KEY_ID: "key",
            STORAGE_ALIYUN_SECRET_ACCESS_KEY: "secret",
          }).success
        ).toBe(false); // Missing region

        expect(
          aliyunConfigSchema.safeParse({
            STORAGE_ALIYUN_REGION: "oss-cn-hangzhou",
            STORAGE_ALIYUN_ACCESS_KEY_ID: "key",
            STORAGE_ALIYUN_SECRET_ACCESS_KEY: "secret",
          }).success
        ).toBe(false); // Missing bucket

        expect(
          aliyunConfigSchema.safeParse({
            STORAGE_ALIYUN_REGION: "oss-cn-hangzhou",
            STORAGE_ALIYUN_BUCKET: "my-bucket",
            STORAGE_ALIYUN_SECRET_ACCESS_KEY: "secret",
          }).success
        ).toBe(false); // Missing access key ID

        expect(
          aliyunConfigSchema.safeParse({
            STORAGE_ALIYUN_REGION: "oss-cn-hangzhou",
            STORAGE_ALIYUN_BUCKET: "my-bucket",
            STORAGE_ALIYUN_ACCESS_KEY_ID: "key",
          }).success
        ).toBe(false); // Missing secret
      });
    });
  });

  describe("Built-in Config Registration", () => {
    it("should register local backend config on module load", () => {
      // Assert - registerBuiltInConfigs was called in beforeEach
      expect(isBackendConfigRegistered("local")).toBe(true);
    });

    it("should register s3 backend config on module load", () => {
      // Assert
      expect(isBackendConfigRegistered("s3")).toBe(true);
    });

    it("should register azure backend config on module load", () => {
      // Assert
      expect(isBackendConfigRegistered("azure")).toBe(true);
    });

    it("should register gcs backend config on module load", () => {
      // Assert
      expect(isBackendConfigRegistered("gcs")).toBe(true);
    });

    it("should register aliyun backend config on module load", () => {
      // Assert
      expect(isBackendConfigRegistered("aliyun")).toBe(true);
    });

    it("should re-register built-in configs after reset", () => {
      // Arrange
      resetConfigRegistry();
      expect(isBackendConfigRegistered("local")).toBe(false);

      // Act
      registerBuiltInConfigs();

      // Assert
      expect(isBackendConfigRegistered("local")).toBe(true);
      expect(isBackendConfigRegistered("s3")).toBe(true);
      expect(isBackendConfigRegistered("azure")).toBe(true);
      expect(isBackendConfigRegistered("gcs")).toBe(true);
      expect(isBackendConfigRegistered("aliyun")).toBe(true);
    });
  });

  describe("Lazy Loading", () => {
    it(
      "should not parse config until first access",
      withEnv({ STORAGE_BACKEND: "local" }, () => {
        // Arrange - config should not be parsed yet
        // Reset to ensure fresh state
        resetStorageConfig();

        // Act - accessing a property should trigger loading
        const backend = storageConfig.STORAGE_BACKEND;

        // Assert - config was loaded
        expect(backend).toBe("local");
      })
    );

    it(
      "should return cached config on subsequent accesses",
      withEnv({ STORAGE_BACKEND: "local" }, () => {
        // Arrange
        resetStorageConfig();

        // Act - access twice
        const backend1 = storageConfig.STORAGE_BACKEND;
        // Change env (shouldn't affect cached config)
        process.env.STORAGE_BACKEND = "s3";
        const backend2 = storageConfig.STORAGE_BACKEND;

        // Assert - should return cached value
        expect(backend1).toBe("local");
        expect(backend2).toBe("local");
      })
    );

    it(
      "should reload config after reset",
      withEnv({ STORAGE_BACKEND: "local" }, () => {
        // Arrange
        resetStorageConfig();
        const backend1 = storageConfig.STORAGE_BACKEND;
        expect(backend1).toBe("local");

        // Act - reset and change env
        resetStorageConfig();
        process.env.STORAGE_BACKEND = "s3";
        process.env.STORAGE_S3_REGION = "us-east-1";
        process.env.STORAGE_S3_BUCKET = "test-bucket";
        process.env.STORAGE_S3_ACCESS_KEY_ID = "test-key";
        process.env.STORAGE_S3_SECRET_ACCESS_KEY = "test-secret";
        const backend2 = storageConfig.STORAGE_BACKEND;

        // Assert
        expect(backend2).toBe("s3");
      })
    );
  });

  describe("Configuration Validation", () => {
    it(
      "should validate local backend with minimal config",
      withEnv({}, () => {
        // Arrange - local backend should work with zero config
        resetStorageConfig();

        // Act
        const backend = storageConfig.STORAGE_BACKEND;

        // Assert
        expect(backend).toBe("local");
      })
    );

    it(
      "should validate S3 backend with all required settings",
      withEnv(
        {
          STORAGE_BACKEND: "s3",
          STORAGE_S3_REGION: "us-east-1",
          STORAGE_S3_BUCKET: "test-bucket",
          STORAGE_S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
          STORAGE_S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        },
        () => {
          // Arrange
          resetStorageConfig();

          // Act
          const backend = storageConfig.STORAGE_BACKEND;

          // Assert
          expect(backend).toBe("s3");
        }
      )
    );

    it(
      "should throw ConfigurationError for missing S3 settings",
      withEnv(
        {
          STORAGE_BACKEND: "s3",
          // Missing required settings
        },
        () => {
          // Arrange
          resetStorageConfig();

          // Act & Assert
          expect(() => storageConfig.STORAGE_BACKEND).toThrow(ConfigurationError);
        }
      )
    );

    it(
      "should throw ConfigurationError for invalid S3 endpoint",
      withEnv(
        {
          STORAGE_BACKEND: "s3",
          STORAGE_S3_ENDPOINT: "not-a-url",
          STORAGE_S3_REGION: "us-east-1",
          STORAGE_S3_BUCKET: "test-bucket",
          STORAGE_S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
          STORAGE_S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        },
        () => {
          // Arrange
          resetStorageConfig();

          // Act & Assert
          expect(() => storageConfig.STORAGE_BACKEND).toThrow(ConfigurationError);
        }
      )
    );
  });

  describe("Error Messages", () => {
    it(
      "should produce clear error for missing required field",
      withEnv(
        {
          STORAGE_BACKEND: "s3",
          STORAGE_S3_BUCKET: "test-bucket",
          STORAGE_S3_ACCESS_KEY_ID: "test-key",
          STORAGE_S3_SECRET_ACCESS_KEY: "test-secret",
          // Missing STORAGE_S3_REGION
        },
        () => {
          // Arrange
          resetStorageConfig();

          // Act & Assert
          try {
            void storageConfig.STORAGE_BACKEND;
            expect.fail("Should have thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(ConfigurationError);
            const configError = error as ConfigurationError;
            expect(configError.message).toContain("STORAGE_S3_REGION");
            expect(configError.code).toBe(StorageErrorCode.CONFIGURATION_ERROR);
          }
        }
      )
    );

    it(
      "should list multiple missing fields",
      withEnv(
        {
          STORAGE_BACKEND: "s3",
          // Missing all S3 fields
        },
        () => {
          // Arrange
          resetStorageConfig();

          // Act & Assert
          try {
            void storageConfig.STORAGE_BACKEND;
            expect.fail("Should have thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(ConfigurationError);
            const configError = error as ConfigurationError;
            expect(configError.message).toContain("STORAGE_S3_REGION");
            expect(configError.message).toContain("STORAGE_S3_BUCKET");
            expect(configError.message).toContain("STORAGE_S3_ACCESS_KEY_ID");
            expect(configError.message).toContain("STORAGE_S3_SECRET_ACCESS_KEY");
          }
        }
      )
    );

    it(
      "should produce clear error for invalid value",
      withEnv(
        {
          STORAGE_MAX_FILE_SIZE_BYTES: "-100",
        },
        () => {
          // Arrange
          resetStorageConfig();

          // Act & Assert
          expect(() => storageConfig.STORAGE_BACKEND).toThrow(ConfigurationError);
        }
      )
    );
  });

  describe("getBackendConfig helper", () => {
    it(
      "should return backend-specific config",
      withEnv({}, () => {
        // Arrange
        resetStorageConfig();

        // Act
        const backendConfig = getBackendConfig<LocalConfig>();

        // Assert
        expect(backendConfig).toBeDefined();
        expect(backendConfig.STORAGE_LOCAL_PATH).toBe("./storage/uploads");
      })
    );

    it(
      "should return typed S3 config",
      withEnv(
        {
          STORAGE_BACKEND: "s3",
          STORAGE_S3_REGION: "us-east-1",
          STORAGE_S3_BUCKET: "my-bucket",
          STORAGE_S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
          STORAGE_S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        },
        () => {
          // Arrange
          resetStorageConfig();

          // Act
          const s3Config = getBackendConfig<S3Config>();

          // Assert
          expect(s3Config.STORAGE_S3_BUCKET).toBe("my-bucket");
          expect(s3Config.STORAGE_S3_REGION).toBe("us-east-1");
        }
      )
    );
  });

  describe("Config Immutability", () => {
    it(
      "should not allow direct property modification",
      withEnv({}, () => {
        // Arrange
        resetStorageConfig();
        const originalBackend = storageConfig.STORAGE_BACKEND;

        // Act - attempt to modify (should be ignored by Proxy)
        // TypeScript won't allow this, but we test runtime behavior
        try {
          (storageConfig as Record<string, unknown>).STORAGE_BACKEND = "s3";
        } catch {
          // Expected - strict mode may throw
        }

        // Assert - value should be unchanged
        expect(storageConfig.STORAGE_BACKEND).toBe(originalBackend);
      })
    );
  });

  describe("Test Reset Functions", () => {
    it(
      "should reset storage config state",
      withEnv({ STORAGE_BACKEND: "local" }, () => {
        // Arrange
        resetStorageConfig();
        void storageConfig.STORAGE_BACKEND; // Load config

        // Act
        resetStorageConfig();
        process.env.STORAGE_BACKEND = "s3";
        process.env.STORAGE_S3_REGION = "us-west-2";
        process.env.STORAGE_S3_BUCKET = "new-bucket";
        process.env.STORAGE_S3_ACCESS_KEY_ID = "new-key";
        process.env.STORAGE_S3_SECRET_ACCESS_KEY = "new-secret";

        // Assert - new config should be loaded
        expect(storageConfig.STORAGE_BACKEND).toBe("s3");
      })
    );

    it("should allow config reset without registry reset", () => {
      // Arrange
      resetStorageConfig();
      resetConfigRegistry();
      registerBuiltInConfigs();

      // Act - reset only config, not registry
      resetStorageConfig();

      // Assert - registry should still have schemas
      expect(isBackendConfigRegistered("local")).toBe(true);
      expect(isBackendConfigRegistered("s3")).toBe(true);
    });
  });

  describe("Environment Variables as Source", () => {
    it(
      "should read from process.env",
      withEnv(
        {
          STORAGE_BACKEND: "azure",
          STORAGE_AZURE_ACCOUNT_NAME: "testaccount",
          STORAGE_AZURE_ACCESS_KEY: "testkey",
          STORAGE_AZURE_CONTAINER: "testcontainer",
        },
        () => {
          // Arrange
          resetStorageConfig();

          // Act
          const backend = storageConfig.STORAGE_BACKEND;

          // Assert
          expect(backend).toBe("azure");
        }
      )
    );

    it(
      "should handle undefined env vars with defaults",
      withEnv({}, () => {
        // Arrange
        resetStorageConfig();

        // Act
        const fileSize = storageConfig.STORAGE_MAX_FILE_SIZE_BYTES;
        const quota = storageConfig.STORAGE_QUOTA_BYTES;
        const expiration = storageConfig.STORAGE_SIGNED_URL_EXPIRATION_SECONDS;

        // Assert - should use defaults
        expect(fileSize).toBe(10 * 1024 * 1024);
        expect(quota).toBe(1024 * 1024 * 1024);
        expect(expiration).toBe(15 * 60);
      })
    );
  });

  describe("Extensibility", () => {
    it(
      "should work with custom backend config schemas",
      withEnv(
        {
          STORAGE_BACKEND: "custom",
          CUSTOM_STORAGE_URL: "https://custom.storage.example.com",
          CUSTOM_STORAGE_TOKEN: "my-secure-token",
        },
        () => {
          // Arrange
          resetStorageConfig();
          resetConfigRegistry();
          registerBuiltInConfigs();

          // Register custom backend config
          const customSchema = z.object({
            CUSTOM_STORAGE_URL: z.string().url(),
            CUSTOM_STORAGE_TOKEN: z.string().min(1),
          });
          registerBackendConfig("custom", customSchema);

          // Act
          const backend = storageConfig.STORAGE_BACKEND;

          // Assert
          expect(backend).toBe("custom");
        }
      )
    );

    it(
      "should allow unknown backends without registered schemas",
      withEnv({ STORAGE_BACKEND: "unknown-backend" }, () => {
        // Arrange
        resetStorageConfig();
        resetConfigRegistry();
        // Don't register any schemas

        // Act - should not throw
        // The backend registration (E05-T002a) will fail if backend doesn't exist
        const backend = storageConfig.STORAGE_BACKEND;

        // Assert
        expect(backend).toBe("unknown-backend");
      })
    );
  });

  describe("Default Values (AC8)", () => {
    it(
      "should default max file size to 10MB",
      withEnv({}, () => {
        // Arrange
        resetStorageConfig();

        // Act
        const fileSize = storageConfig.STORAGE_MAX_FILE_SIZE_BYTES;

        // Assert
        expect(fileSize).toBe(10 * 1024 * 1024); // 10485760 bytes
      })
    );

    it(
      "should default quota to 1GB",
      withEnv({}, () => {
        // Arrange
        resetStorageConfig();

        // Act
        const quota = storageConfig.STORAGE_QUOTA_BYTES;

        // Assert
        expect(quota).toBe(1024 * 1024 * 1024); // 1073741824 bytes
      })
    );

    it(
      "should default signed URL expiration to 15 minutes",
      withEnv({}, () => {
        // Arrange
        resetStorageConfig();

        // Act
        const expiration = storageConfig.STORAGE_SIGNED_URL_EXPIRATION_SECONDS;

        // Assert
        expect(expiration).toBe(15 * 60); // 900 seconds
      })
    );

    it(
      "should default local path to ./storage/uploads",
      withEnv({}, () => {
        // Arrange
        resetStorageConfig();

        // Act
        const backendConfig = getBackendConfig<LocalConfig>();

        // Assert
        expect(backendConfig.STORAGE_LOCAL_PATH).toBe("./storage/uploads");
      })
    );
  });
});
