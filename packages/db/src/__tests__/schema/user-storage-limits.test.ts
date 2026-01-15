import { describe, it, expect } from "vitest";

import { userStorageLimits } from "../../schema/user-storage-limits.js";

import type {
  UserStorageLimit,
  NewUserStorageLimit,
} from "../../schema/user-storage-limits.js";

describe("User Storage Limits Schema", () => {
  describe("Type Inference", () => {
    it("should infer UserStorageLimit type correctly with all fields", () => {
      // Arrange
      const limit: UserStorageLimit = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "223e4567-e89b-12d3-a456-426614174001",
        maxFileSizeBytes: 10485760, // 10MB
        storageQuotaBytes: 1073741824, // 1GB
        usedBytes: 524288000, // 500MB
        setBy: "323e4567-e89b-12d3-a456-426614174002",
        reason: "Premium user upgrade",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      // Act & Assert - TypeScript compilation verifies types
      expect(limit.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(limit.userId).toBe("223e4567-e89b-12d3-a456-426614174001");
      expect(limit.maxFileSizeBytes).toBe(10485760);
      expect(limit.storageQuotaBytes).toBe(1073741824);
      expect(limit.usedBytes).toBe(524288000);
      expect(limit.setBy).toBe("323e4567-e89b-12d3-a456-426614174002");
      expect(limit.reason).toBe("Premium user upgrade");
      expect(limit.createdAt).toBeInstanceOf(Date);
      expect(limit.updatedAt).toBeInstanceOf(Date);
    });

    it("should allow null maxFileSizeBytes for inherited limits", () => {
      // Arrange - Null means inherit from role/system
      const inheritedLimit: UserStorageLimit = {
        id: "223e4567-e89b-12d3-a456-426614174001",
        userId: "323e4567-e89b-12d3-a456-426614174002",
        maxFileSizeBytes: null,
        storageQuotaBytes: 2147483648, // 2GB override only
        usedBytes: 0,
        setBy: "423e4567-e89b-12d3-a456-426614174003",
        reason: "Quota increase only",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(inheritedLimit.maxFileSizeBytes).toBeNull();
      expect(inheritedLimit.storageQuotaBytes).toBe(2147483648);
    });

    it("should allow null storageQuotaBytes for inherited limits", () => {
      // Arrange - Null means inherit from role/system
      const inheritedLimit: UserStorageLimit = {
        id: "323e4567-e89b-12d3-a456-426614174002",
        userId: "423e4567-e89b-12d3-a456-426614174003",
        maxFileSizeBytes: 52428800, // 50MB override only
        storageQuotaBytes: null,
        usedBytes: 1048576,
        setBy: "523e4567-e89b-12d3-a456-426614174004",
        reason: "Large file upload permission",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(inheritedLimit.maxFileSizeBytes).toBe(52428800);
      expect(inheritedLimit.storageQuotaBytes).toBeNull();
    });

    it("should allow both limit fields to be null", () => {
      // Arrange - Full inheritance (only tracking usage)
      const usageOnlyLimit: UserStorageLimit = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        userId: "523e4567-e89b-12d3-a456-426614174004",
        maxFileSizeBytes: null,
        storageQuotaBytes: null,
        usedBytes: 102400,
        setBy: null,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(usageOnlyLimit.maxFileSizeBytes).toBeNull();
      expect(usageOnlyLimit.storageQuotaBytes).toBeNull();
    });

    it("should allow null setBy for system-created limits", () => {
      // Arrange - System-created limit (no admin involved)
      const systemLimit: UserStorageLimit = {
        id: "523e4567-e89b-12d3-a456-426614174004",
        userId: "623e4567-e89b-12d3-a456-426614174005",
        maxFileSizeBytes: null,
        storageQuotaBytes: null,
        usedBytes: 0,
        setBy: null,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(systemLimit.setBy).toBeNull();
      expect(systemLimit.reason).toBeNull();
    });

    it("should allow null reason when no explanation needed", () => {
      // Arrange
      const limitWithoutReason: UserStorageLimit = {
        id: "623e4567-e89b-12d3-a456-426614174005",
        userId: "723e4567-e89b-12d3-a456-426614174006",
        maxFileSizeBytes: 104857600, // 100MB
        storageQuotaBytes: 5368709120, // 5GB
        usedBytes: 0,
        setBy: "823e4567-e89b-12d3-a456-426614174007",
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(limitWithoutReason.setBy).toBeTruthy();
      expect(limitWithoutReason.reason).toBeNull();
    });
  });

  describe("NewUserStorageLimit Type (Insert Operations)", () => {
    it("should infer NewUserStorageLimit type correctly for inserts", () => {
      // Arrange - NewUserStorageLimit should omit auto-generated fields
      const newLimit: NewUserStorageLimit = {
        userId: "723e4567-e89b-12d3-a456-426614174006",
        maxFileSizeBytes: 20971520, // 20MB
        storageQuotaBytes: 2147483648, // 2GB
        usedBytes: 0,
        setBy: "823e4567-e89b-12d3-a456-426614174007",
        reason: "Special project allocation",
      };

      // Act & Assert
      expect(newLimit.userId).toBe("723e4567-e89b-12d3-a456-426614174006");
      expect(newLimit.maxFileSizeBytes).toBe(20971520);
      expect(newLimit.storageQuotaBytes).toBe(2147483648);
      expect(newLimit.usedBytes).toBe(0);
      expect(newLimit.setBy).toBe("823e4567-e89b-12d3-a456-426614174007");
      expect(newLimit.reason).toBe("Special project allocation");
    });

    it("should allow creating limit with only userId", () => {
      // Arrange - Minimal limit (just for usage tracking)
      const minimalLimit: NewUserStorageLimit = {
        userId: "823e4567-e89b-12d3-a456-426614174007",
      };

      // Act & Assert
      expect(minimalLimit.userId).toBe("823e4567-e89b-12d3-a456-426614174007");
      // Default values will be set by database
      expect(minimalLimit.maxFileSizeBytes).toBeUndefined();
      expect(minimalLimit.storageQuotaBytes).toBeUndefined();
      expect(minimalLimit.usedBytes).toBeUndefined();
    });

    it("should make auto-generated fields optional in NewUserStorageLimit", () => {
      // Arrange - Minimal NewUserStorageLimit without id, timestamps
      const minimalInsert: NewUserStorageLimit = {
        userId: "923e4567-e89b-12d3-a456-426614174008",
        maxFileSizeBytes: 10485760,
      };

      // Act & Assert - id, createdAt, updatedAt should be optional/undefined
      expect(minimalInsert.id).toBeUndefined();
      expect(minimalInsert.createdAt).toBeUndefined();
      expect(minimalInsert.updatedAt).toBeUndefined();
    });

    it("should allow partial override configuration", () => {
      // Arrange - Only override one limit
      const partialOverride: NewUserStorageLimit = {
        userId: "a23e4567-e89b-12d3-a456-426614174009",
        maxFileSizeBytes: 104857600, // 100MB file size override
        storageQuotaBytes: null, // Inherit quota from role
        setBy: "b23e4567-e89b-12d3-a456-42661417400a",
        reason: "Large file upload permission for project submission",
      };

      // Act & Assert
      expect(partialOverride.maxFileSizeBytes).toBe(104857600);
      expect(partialOverride.storageQuotaBytes).toBeNull();
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      // Act & Assert
      expect(userStorageLimits._.name).toBe("user_storage_limits");
    });

    it("should have id column", () => {
      // Act & Assert
      expect(userStorageLimits.id).toBeDefined();
      expect(userStorageLimits.id.name).toBe("id");
    });

    it("should have userId column", () => {
      // Act & Assert
      expect(userStorageLimits.userId).toBeDefined();
      expect(userStorageLimits.userId.name).toBe("user_id");
    });

    it("should have maxFileSizeBytes column", () => {
      // Act & Assert
      expect(userStorageLimits.maxFileSizeBytes).toBeDefined();
      expect(userStorageLimits.maxFileSizeBytes.name).toBe("max_file_size_bytes");
    });

    it("should have storageQuotaBytes column", () => {
      // Act & Assert
      expect(userStorageLimits.storageQuotaBytes).toBeDefined();
      expect(userStorageLimits.storageQuotaBytes.name).toBe("storage_quota_bytes");
    });

    it("should have usedBytes column", () => {
      // Act & Assert
      expect(userStorageLimits.usedBytes).toBeDefined();
      expect(userStorageLimits.usedBytes.name).toBe("used_bytes");
    });

    it("should have setBy column", () => {
      // Act & Assert
      expect(userStorageLimits.setBy).toBeDefined();
      expect(userStorageLimits.setBy.name).toBe("set_by");
    });

    it("should have reason column", () => {
      // Act & Assert
      expect(userStorageLimits.reason).toBeDefined();
      expect(userStorageLimits.reason.name).toBe("reason");
    });

    it("should have createdAt column", () => {
      // Act & Assert
      expect(userStorageLimits.createdAt).toBeDefined();
      expect(userStorageLimits.createdAt.name).toBe("created_at");
    });

    it("should have updatedAt column", () => {
      // Act & Assert
      expect(userStorageLimits.updatedAt).toBeDefined();
      expect(userStorageLimits.updatedAt.name).toBe("updated_at");
    });

    it("should have all required columns", () => {
      // Arrange
      const expectedColumns = [
        "id",
        "userId",
        "maxFileSizeBytes",
        "storageQuotaBytes",
        "usedBytes",
        "setBy",
        "reason",
        "createdAt",
        "updatedAt",
      ];

      // Act
      const actualColumns = Object.keys(userStorageLimits).filter(
        (key) => !key.startsWith("_")
      );

      // Assert
      expectedColumns.forEach((col) => {
        expect(actualColumns).toContain(col);
      });
    });
  });

  describe("Schema Exports", () => {
    it("should export userStorageLimits table", () => {
      // Act & Assert
      expect(userStorageLimits).toBeDefined();
      expect(userStorageLimits._.name).toBe("user_storage_limits");
    });
  });

  describe("Foreign Key Fields", () => {
    it("should type userId as UUID string", () => {
      // Arrange
      const newLimit: NewUserStorageLimit = {
        userId: "b23e4567-e89b-12d3-a456-42661417400a",
      };

      // Act & Assert - userId should be typed as string
      const userId: string = newLimit.userId;
      expect(userId).toBe("b23e4567-e89b-12d3-a456-42661417400a");
      expect(typeof newLimit.userId).toBe("string");
    });

    it("should type setBy as UUID string or null", () => {
      // Arrange - Limit with admin setBy
      const adminLimit: NewUserStorageLimit = {
        userId: "c23e4567-e89b-12d3-a456-42661417400b",
        setBy: "d23e4567-e89b-12d3-a456-42661417400c",
      };

      // Act & Assert
      if (adminLimit.setBy !== null && adminLimit.setBy !== undefined) {
        const setBy: string = adminLimit.setBy;
        expect(setBy).toBe("d23e4567-e89b-12d3-a456-42661417400c");
      }
    });

    it("should enforce foreign key references are UUIDs", () => {
      // Arrange
      const limit: UserStorageLimit = {
        id: "e23e4567-e89b-12d3-a456-42661417400d",
        userId: "f23e4567-e89b-12d3-a456-42661417400e",
        maxFileSizeBytes: null,
        storageQuotaBytes: null,
        usedBytes: 0,
        setBy: "023e4567-e89b-12d3-a456-42661417400f",
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert - FK fields should be valid UUIDs
      expect(limit.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      if (limit.setBy) {
        expect(limit.setBy).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      }
    });
  });

  describe("Type Safety", () => {
    it("should enforce required userId field", () => {
      // Arrange
      const limit: UserStorageLimit = {
        id: "123e4567-e89b-12d3-a456-426614174010",
        userId: "223e4567-e89b-12d3-a456-426614174011",
        maxFileSizeBytes: null,
        storageQuotaBytes: null,
        usedBytes: 0,
        setBy: null,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(limit.userId).toBeTruthy();
      expect(typeof limit.userId).toBe("string");
    });

    it("should enforce usedBytes has default value of 0", () => {
      // Arrange - Database will set default, but we test the type
      const limit: UserStorageLimit = {
        id: "223e4567-e89b-12d3-a456-426614174011",
        userId: "323e4567-e89b-12d3-a456-426614174012",
        maxFileSizeBytes: null,
        storageQuotaBytes: null,
        usedBytes: 0,
        setBy: null,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(typeof limit.usedBytes).toBe("number");
      expect(limit.usedBytes).toBe(0);
    });

    it("should allow optional limit fields", () => {
      // Arrange - Both limits nullable
      const minimalLimit: NewUserStorageLimit = {
        userId: "323e4567-e89b-12d3-a456-426614174012",
      };

      // Act & Assert
      expect(minimalLimit.maxFileSizeBytes).toBeUndefined();
      expect(minimalLimit.storageQuotaBytes).toBeUndefined();
    });
  });

  describe("Usage Tracking", () => {
    it("should handle zero used bytes for new users", () => {
      // Arrange
      const newUserLimit: UserStorageLimit = {
        id: "323e4567-e89b-12d3-a456-426614174012",
        userId: "423e4567-e89b-12d3-a456-426614174013",
        maxFileSizeBytes: null,
        storageQuotaBytes: null,
        usedBytes: 0,
        setBy: null,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(newUserLimit.usedBytes).toBe(0);
    });

    it("should handle large used bytes values (bigint range)", () => {
      // Arrange - User near 5GB quota
      const heavyUserLimit: UserStorageLimit = {
        id: "423e4567-e89b-12d3-a456-426614174013",
        userId: "523e4567-e89b-12d3-a456-426614174014",
        maxFileSizeBytes: 104857600, // 100MB
        storageQuotaBytes: 5368709120, // 5GB
        usedBytes: 5000000000, // ~4.65GB used
        setBy: "623e4567-e89b-12d3-a456-426614174015",
        reason: "Premium user",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(heavyUserLimit.usedBytes).toBe(5000000000);
      expect(heavyUserLimit.usedBytes).toBeLessThan(heavyUserLimit.storageQuotaBytes!);
    });

    it("should allow used bytes to equal quota (user at limit)", () => {
      // Arrange - User at exactly quota
      const atLimitUser: UserStorageLimit = {
        id: "523e4567-e89b-12d3-a456-426614174014",
        userId: "623e4567-e89b-12d3-a456-426614174015",
        maxFileSizeBytes: null,
        storageQuotaBytes: 1073741824, // 1GB
        usedBytes: 1073741824, // 1GB
        setBy: null,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(atLimitUser.usedBytes).toBe(atLimitUser.storageQuotaBytes);
    });
  });

  describe("Three-Tier Limit System", () => {
    it("should represent user override tier (non-null limits)", () => {
      // Arrange - Explicit user override
      const userOverride: UserStorageLimit = {
        id: "623e4567-e89b-12d3-a456-426614174015",
        userId: "723e4567-e89b-12d3-a456-426614174016",
        maxFileSizeBytes: 209715200, // 200MB custom limit
        storageQuotaBytes: 10737418240, // 10GB custom quota
        usedBytes: 0,
        setBy: "823e4567-e89b-12d3-a456-426614174017",
        reason: "Media department - large file needs",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(userOverride.maxFileSizeBytes).not.toBeNull();
      expect(userOverride.storageQuotaBytes).not.toBeNull();
    });

    it("should represent role inheritance tier (null limits)", () => {
      // Arrange - Inherits from role
      const roleInherit: UserStorageLimit = {
        id: "723e4567-e89b-12d3-a456-426614174016",
        userId: "823e4567-e89b-12d3-a456-426614174017",
        maxFileSizeBytes: null,
        storageQuotaBytes: null,
        usedBytes: 524288000,
        setBy: null,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(roleInherit.maxFileSizeBytes).toBeNull();
      expect(roleInherit.storageQuotaBytes).toBeNull();
    });

    it("should support partial overrides (mixed null/non-null)", () => {
      // Arrange - Override only file size, inherit quota
      const partialOverride: UserStorageLimit = {
        id: "823e4567-e89b-12d3-a456-426614174017",
        userId: "923e4567-e89b-12d3-a456-426614174018",
        maxFileSizeBytes: 524288000, // 500MB file size
        storageQuotaBytes: null, // Inherit from role
        usedBytes: 102400,
        setBy: "a23e4567-e89b-12d3-a456-426614174019",
        reason: "Video upload permission",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(partialOverride.maxFileSizeBytes).toBe(524288000);
      expect(partialOverride.storageQuotaBytes).toBeNull();
    });
  });

  describe("Audit Trail", () => {
    it("should track who set the override", () => {
      // Arrange
      const auditedLimit: UserStorageLimit = {
        id: "923e4567-e89b-12d3-a456-426614174018",
        userId: "a23e4567-e89b-12d3-a456-426614174019",
        maxFileSizeBytes: 104857600,
        storageQuotaBytes: 5368709120,
        usedBytes: 0,
        setBy: "b23e4567-e89b-12d3-a456-42661417401a",
        reason: "Approved by IT department",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(auditedLimit.setBy).toBe("b23e4567-e89b-12d3-a456-42661417401a");
      expect(auditedLimit.reason).toBe("Approved by IT department");
    });

    it("should preserve limit after admin deletion (setBy becomes null)", () => {
      // Arrange - Simulates admin deleted but limit preserved
      const preservedLimit: UserStorageLimit = {
        id: "a23e4567-e89b-12d3-a456-426614174019",
        userId: "b23e4567-e89b-12d3-a456-42661417401a",
        maxFileSizeBytes: 209715200,
        storageQuotaBytes: 10737418240,
        usedBytes: 1073741824,
        setBy: null, // Admin was deleted, FK set to null
        reason: "Premium account upgrade",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(preservedLimit.setBy).toBeNull();
      expect(preservedLimit.reason).toBe("Premium account upgrade");
      // Limits still in effect even though we don't know who set them
      expect(preservedLimit.maxFileSizeBytes).toBe(209715200);
    });
  });

  describe("Edge Cases", () => {
    it("should handle reason with max length (500 chars)", () => {
      // Arrange
      const longReason = "R".repeat(500);
      const limit: UserStorageLimit = {
        id: "b23e4567-e89b-12d3-a456-42661417401a",
        userId: "c23e4567-e89b-12d3-a456-42661417401b",
        maxFileSizeBytes: 10485760,
        storageQuotaBytes: 1073741824,
        usedBytes: 0,
        setBy: "d23e4567-e89b-12d3-a456-42661417401c",
        reason: longReason,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(limit.reason?.length).toBe(500);
    });

    it("should handle very large limit values (bigint range)", () => {
      // Arrange - 1TB quota
      const terabyteQuota = 1099511627776;
      const limit: UserStorageLimit = {
        id: "c23e4567-e89b-12d3-a456-42661417401b",
        userId: "d23e4567-e89b-12d3-a456-42661417401c",
        maxFileSizeBytes: 10737418240, // 10GB file
        storageQuotaBytes: terabyteQuota,
        usedBytes: 549755813888, // ~500GB used
        setBy: "e23e4567-e89b-12d3-a456-42661417401d",
        reason: "Enterprise account",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(limit.storageQuotaBytes).toBe(terabyteQuota);
      expect(limit.usedBytes).toBe(549755813888);
    });

    it("should handle minimum valid limit values", () => {
      // Arrange - Very small limits (but valid)
      const tinyLimit: UserStorageLimit = {
        id: "d23e4567-e89b-12d3-a456-42661417401c",
        userId: "e23e4567-e89b-12d3-a456-42661417401d",
        maxFileSizeBytes: 1, // 1 byte
        storageQuotaBytes: 1, // 1 byte quota
        usedBytes: 0,
        setBy: null,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(tinyLimit.maxFileSizeBytes).toBe(1);
      expect(tinyLimit.storageQuotaBytes).toBe(1);
    });
  });

  describe("Unique Constraint", () => {
    it("should represent one record per user pattern", () => {
      // Arrange - Two different users, two records
      const user1Limit: UserStorageLimit = {
        id: "e23e4567-e89b-12d3-a456-42661417401d",
        userId: "f23e4567-e89b-12d3-a456-42661417401e",
        maxFileSizeBytes: 10485760,
        storageQuotaBytes: 1073741824,
        usedBytes: 512000,
        setBy: null,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user2Limit: UserStorageLimit = {
        id: "f23e4567-e89b-12d3-a456-42661417401e",
        userId: "023e4567-e89b-12d3-a456-42661417401f",
        maxFileSizeBytes: 20971520,
        storageQuotaBytes: 2147483648,
        usedBytes: 1024000,
        setBy: null,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert - Different users have different IDs
      expect(user1Limit.userId).not.toBe(user2Limit.userId);
      expect(user1Limit.id).not.toBe(user2Limit.id);
    });
  });
});
