import { describe, it, expect } from "vitest";

import {
  storageLimitValuesSchema,
  roleStorageLimitsSchema,
  groupStorageSettingsSchema,
  fileUploadMetadataSchema,
  setUserStorageLimitSchema,
  type StorageLimitValues,
  type RoleStorageLimits,
  type GroupStorageSettings,
  type FileUploadMetadata,
  type SetUserStorageLimit,
} from "../../schemas/storage.schema.js";

describe("storageLimitValuesSchema", () => {
  describe("Basic Validation", () => {
    it("should accept empty object", () => {
      // Arrange & Act
      const result = storageLimitValuesSchema.parse({});

      // Assert
      expect(result).toEqual({});
    });

    it("should accept valid maxFileSizeBytes", () => {
      // Arrange
      const input = { maxFileSizeBytes: 10485760 }; // 10MB

      // Act
      const result = storageLimitValuesSchema.parse(input);

      // Assert
      expect(result.maxFileSizeBytes).toBe(10485760);
    });

    it("should accept valid storageQuotaBytes", () => {
      // Arrange
      const input = { storageQuotaBytes: 1073741824 }; // 1GB

      // Act
      const result = storageLimitValuesSchema.parse(input);

      // Assert
      expect(result.storageQuotaBytes).toBe(1073741824);
    });

    it("should accept both limit values together", () => {
      // Arrange
      const input: StorageLimitValues = {
        maxFileSizeBytes: 52428800, // 50MB
        storageQuotaBytes: 5368709120, // 5GB
      };

      // Act
      const result = storageLimitValuesSchema.parse(input);

      // Assert
      expect(result.maxFileSizeBytes).toBe(52428800);
      expect(result.storageQuotaBytes).toBe(5368709120);
    });
  });

  describe("Validation Rejects Invalid Values", () => {
    it("should reject negative maxFileSizeBytes", () => {
      // Arrange
      const invalid = { maxFileSizeBytes: -1 };

      // Act & Assert
      expect(() => storageLimitValuesSchema.parse(invalid)).toThrow();
    });

    it("should reject negative storageQuotaBytes", () => {
      // Arrange
      const invalid = { storageQuotaBytes: -100 };

      // Act & Assert
      expect(() => storageLimitValuesSchema.parse(invalid)).toThrow();
    });

    it("should reject non-integer maxFileSizeBytes", () => {
      // Arrange
      const invalid = { maxFileSizeBytes: 1024.5 };

      // Act & Assert
      expect(() => storageLimitValuesSchema.parse(invalid)).toThrow();
    });

    it("should reject non-integer storageQuotaBytes", () => {
      // Arrange
      const invalid = { storageQuotaBytes: 1073741824.7 };

      // Act & Assert
      expect(() => storageLimitValuesSchema.parse(invalid)).toThrow();
    });

    it("should reject string values for byte fields", () => {
      // Arrange
      const invalid = { maxFileSizeBytes: "10485760" };

      // Act & Assert
      expect(() => storageLimitValuesSchema.parse(invalid)).toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should accept zero for maxFileSizeBytes", () => {
      // Arrange
      const input = { maxFileSizeBytes: 0 };

      // Act
      const result = storageLimitValuesSchema.parse(input);

      // Assert
      expect(result.maxFileSizeBytes).toBe(0);
    });

    it("should accept zero for storageQuotaBytes", () => {
      // Arrange
      const input = { storageQuotaBytes: 0 };

      // Act
      const result = storageLimitValuesSchema.parse(input);

      // Assert
      expect(result.storageQuotaBytes).toBe(0);
    });

    it("should accept very large values (bigint range)", () => {
      // Arrange - 1 petabyte
      const oneExabyte = 1099511627776000;
      const input = { storageQuotaBytes: oneExabyte };

      // Act
      const result = storageLimitValuesSchema.parse(input);

      // Assert
      expect(result.storageQuotaBytes).toBe(oneExabyte);
    });
  });
});

describe("roleStorageLimitsSchema", () => {
  describe("Basic Validation", () => {
    it("should accept empty object", () => {
      // Arrange & Act
      const result = roleStorageLimitsSchema.parse({});

      // Assert
      expect(result).toEqual({});
    });

    it("should accept single role configuration", () => {
      // Arrange
      const input = {
        teacher: { maxFileSizeBytes: 52428800, storageQuotaBytes: 5368709120 },
      };

      // Act
      const result = roleStorageLimitsSchema.parse(input);

      // Assert
      expect(result.teacher?.maxFileSizeBytes).toBe(52428800);
      expect(result.teacher?.storageQuotaBytes).toBe(5368709120);
    });

    it("should accept multiple role configurations", () => {
      // Arrange
      const input: RoleStorageLimits = {
        teacher: { maxFileSizeBytes: 52428800, storageQuotaBytes: 5368709120 },
        student: { maxFileSizeBytes: 10485760, storageQuotaBytes: 1073741824 },
        group_admin: {
          maxFileSizeBytes: 104857600,
          storageQuotaBytes: 10737418240,
        },
      };

      // Act
      const result = roleStorageLimitsSchema.parse(input);

      // Assert
      expect(result.teacher?.maxFileSizeBytes).toBe(52428800);
      expect(result.student?.storageQuotaBytes).toBe(1073741824);
      expect(result.group_admin?.maxFileSizeBytes).toBe(104857600);
    });

    it("should accept partial role configurations", () => {
      // Arrange - Only maxFileSizeBytes for teachers
      const input = {
        teacher: { maxFileSizeBytes: 104857600 },
        student: { storageQuotaBytes: 536870912 },
      };

      // Act
      const result = roleStorageLimitsSchema.parse(input);

      // Assert
      expect(result.teacher?.maxFileSizeBytes).toBe(104857600);
      expect(result.teacher?.storageQuotaBytes).toBeUndefined();
      expect(result.student?.maxFileSizeBytes).toBeUndefined();
      expect(result.student?.storageQuotaBytes).toBe(536870912);
    });
  });

  describe("Validation Rejects Invalid Values", () => {
    it("should reject negative byte values in role config", () => {
      // Arrange
      const invalid = {
        teacher: { maxFileSizeBytes: -1024 },
      };

      // Act & Assert
      expect(() => roleStorageLimitsSchema.parse(invalid)).toThrow();
    });

    it("should reject non-integer values in role config", () => {
      // Arrange
      const invalid = {
        student: { storageQuotaBytes: 1024.5 },
      };

      // Act & Assert
      expect(() => roleStorageLimitsSchema.parse(invalid)).toThrow();
    });
  });

  describe("Type Safety", () => {
    it("should properly type RoleStorageLimits", () => {
      // Arrange
      const limits: RoleStorageLimits = {
        teacher: { maxFileSizeBytes: 52428800, storageQuotaBytes: 5368709120 },
        student: { maxFileSizeBytes: 10485760, storageQuotaBytes: 1073741824 },
      };

      // Act
      const result = roleStorageLimitsSchema.parse(limits);

      // Assert
      expect(result.teacher?.maxFileSizeBytes).toBe(52428800);
      expect(result.student?.maxFileSizeBytes).toBe(10485760);
    });
  });
});

describe("groupStorageSettingsSchema", () => {
  describe("Basic Validation", () => {
    it("should accept empty object", () => {
      // Arrange & Act
      const result = groupStorageSettingsSchema.parse({});

      // Assert
      expect(result).toEqual({});
    });

    it("should accept empty storageLimits", () => {
      // Arrange
      const input = { storageLimits: {} };

      // Act
      const result = groupStorageSettingsSchema.parse(input);

      // Assert
      expect(result.storageLimits).toEqual({});
    });

    it("should accept full storageLimits configuration", () => {
      // Arrange
      const input: GroupStorageSettings = {
        storageLimits: {
          teacher: { maxFileSizeBytes: 52428800, storageQuotaBytes: 5368709120 },
          student: { maxFileSizeBytes: 10485760, storageQuotaBytes: 1073741824 },
        },
      };

      // Act
      const result = groupStorageSettingsSchema.parse(input);

      // Assert
      expect(result.storageLimits?.teacher?.maxFileSizeBytes).toBe(52428800);
      expect(result.storageLimits?.student?.storageQuotaBytes).toBe(1073741824);
    });
  });

  describe("Validation Rejects Invalid Values", () => {
    it("should reject invalid role limit values", () => {
      // Arrange
      const invalid = {
        storageLimits: {
          teacher: { maxFileSizeBytes: -1 },
        },
      };

      // Act & Assert
      expect(() => groupStorageSettingsSchema.parse(invalid)).toThrow();
    });
  });

  describe("Type Safety", () => {
    it("should properly type GroupStorageSettings", () => {
      // Arrange
      const settings: GroupStorageSettings = {
        storageLimits: {
          teacher: { maxFileSizeBytes: 52428800 },
        },
      };

      // Act & Assert
      expect(settings.storageLimits?.teacher?.maxFileSizeBytes).toBe(52428800);
    });
  });
});

describe("fileUploadMetadataSchema", () => {
  describe("Basic Validation", () => {
    it("should accept valid file upload metadata", () => {
      // Arrange
      const input: FileUploadMetadata = {
        originalName: "document.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1048576,
        purpose: "attachment",
        groupId: "123e4567-e89b-12d3-a456-426614174000",
      };

      // Act
      const result = fileUploadMetadataSchema.parse(input);

      // Assert
      expect(result.originalName).toBe("document.pdf");
      expect(result.mimeType).toBe("application/pdf");
      expect(result.sizeBytes).toBe(1048576);
      expect(result.purpose).toBe("attachment");
      expect(result.groupId).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("should accept minimal required fields", () => {
      // Arrange
      const input = {
        originalName: "test.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
      };

      // Act
      const result = fileUploadMetadataSchema.parse(input);

      // Assert
      expect(result.originalName).toBe("test.txt");
      expect(result.mimeType).toBe("text/plain");
      expect(result.sizeBytes).toBe(100);
      expect(result.purpose).toBe("general"); // default
    });

    it("should apply default purpose when not provided", () => {
      // Arrange
      const input = {
        originalName: "file.bin",
        mimeType: "application/octet-stream",
        sizeBytes: 512,
      };

      // Act
      const result = fileUploadMetadataSchema.parse(input);

      // Assert
      expect(result.purpose).toBe("general");
    });
  });

  describe("Field Validation", () => {
    it("should reject empty originalName", () => {
      // Arrange
      const invalid = {
        originalName: "",
        mimeType: "text/plain",
        sizeBytes: 100,
      };

      // Act & Assert
      expect(() => fileUploadMetadataSchema.parse(invalid)).toThrow();
    });

    it("should reject empty mimeType", () => {
      // Arrange
      const invalid = {
        originalName: "test.txt",
        mimeType: "",
        sizeBytes: 100,
      };

      // Act & Assert
      expect(() => fileUploadMetadataSchema.parse(invalid)).toThrow();
    });

    it("should reject negative sizeBytes", () => {
      // Arrange
      const invalid = {
        originalName: "test.txt",
        mimeType: "text/plain",
        sizeBytes: -1,
      };

      // Act & Assert
      expect(() => fileUploadMetadataSchema.parse(invalid)).toThrow();
    });

    it("should reject zero sizeBytes", () => {
      // Arrange - Files must have positive size
      const invalid = {
        originalName: "empty.txt",
        mimeType: "text/plain",
        sizeBytes: 0,
      };

      // Act & Assert
      expect(() => fileUploadMetadataSchema.parse(invalid)).toThrow();
    });

    it("should reject non-integer sizeBytes", () => {
      // Arrange
      const invalid = {
        originalName: "test.txt",
        mimeType: "text/plain",
        sizeBytes: 100.5,
      };

      // Act & Assert
      expect(() => fileUploadMetadataSchema.parse(invalid)).toThrow();
    });

    it("should reject empty purpose", () => {
      // Arrange
      const invalid = {
        originalName: "test.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
        purpose: "",
      };

      // Act & Assert
      expect(() => fileUploadMetadataSchema.parse(invalid)).toThrow();
    });

    it("should reject invalid groupId (not UUID)", () => {
      // Arrange
      const invalid = {
        originalName: "test.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
        groupId: "not-a-uuid",
      };

      // Act & Assert
      expect(() => fileUploadMetadataSchema.parse(invalid)).toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should accept originalName at max length (255)", () => {
      // Arrange
      const maxName = "a".repeat(255);
      const input = {
        originalName: maxName,
        mimeType: "text/plain",
        sizeBytes: 100,
      };

      // Act
      const result = fileUploadMetadataSchema.parse(input);

      // Assert
      expect(result.originalName.length).toBe(255);
    });

    it("should reject originalName exceeding max length", () => {
      // Arrange
      const tooLong = "a".repeat(256);
      const invalid = {
        originalName: tooLong,
        mimeType: "text/plain",
        sizeBytes: 100,
      };

      // Act & Assert
      expect(() => fileUploadMetadataSchema.parse(invalid)).toThrow();
    });

    it("should accept mimeType at max length (100)", () => {
      // Arrange
      const maxMime = "application/" + "x".repeat(88);
      const input = {
        originalName: "test.bin",
        mimeType: maxMime,
        sizeBytes: 100,
      };

      // Act
      const result = fileUploadMetadataSchema.parse(input);

      // Assert
      expect(result.mimeType.length).toBe(100);
    });

    it("should reject mimeType exceeding max length", () => {
      // Arrange
      const tooLong = "application/" + "x".repeat(89); // 101 chars
      const invalid = {
        originalName: "test.bin",
        mimeType: tooLong,
        sizeBytes: 100,
      };

      // Act & Assert
      expect(() => fileUploadMetadataSchema.parse(invalid)).toThrow();
    });

    it("should accept purpose at max length (50)", () => {
      // Arrange
      const maxPurpose = "p".repeat(50);
      const input = {
        originalName: "test.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
        purpose: maxPurpose,
      };

      // Act
      const result = fileUploadMetadataSchema.parse(input);

      // Assert
      expect(result.purpose.length).toBe(50);
    });

    it("should reject purpose exceeding max length", () => {
      // Arrange
      const tooLong = "p".repeat(51);
      const invalid = {
        originalName: "test.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
        purpose: tooLong,
      };

      // Act & Assert
      expect(() => fileUploadMetadataSchema.parse(invalid)).toThrow();
    });

    it("should accept valid UUID for groupId", () => {
      // Arrange
      const input = {
        originalName: "test.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
        groupId: "550e8400-e29b-41d4-a716-446655440000",
      };

      // Act
      const result = fileUploadMetadataSchema.parse(input);

      // Assert
      expect(result.groupId).toBe("550e8400-e29b-41d4-a716-446655440000");
    });
  });

  describe("Type Safety", () => {
    it("should properly type FileUploadMetadata", () => {
      // Arrange
      const metadata: FileUploadMetadata = {
        originalName: "photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 2048000,
        purpose: "avatar",
        groupId: "123e4567-e89b-12d3-a456-426614174000",
      };

      // Act & Assert
      expect(metadata.originalName).toBe("photo.jpg");
      expect(metadata.mimeType).toBe("image/jpeg");
      expect(metadata.sizeBytes).toBe(2048000);
    });
  });
});

describe("setUserStorageLimitSchema", () => {
  describe("Basic Validation", () => {
    it("should accept valid user storage limit input", () => {
      // Arrange
      const input: SetUserStorageLimit = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        maxFileSizeBytes: 52428800, // 50MB
        storageQuotaBytes: 5368709120, // 5GB
        reason: "Premium account upgrade",
      };

      // Act
      const result = setUserStorageLimitSchema.parse(input);

      // Assert
      expect(result.userId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(result.maxFileSizeBytes).toBe(52428800);
      expect(result.storageQuotaBytes).toBe(5368709120);
      expect(result.reason).toBe("Premium account upgrade");
    });

    it("should accept minimal required fields (userId only)", () => {
      // Arrange
      const input = {
        userId: "223e4567-e89b-12d3-a456-426614174001",
      };

      // Act
      const result = setUserStorageLimitSchema.parse(input);

      // Assert
      expect(result.userId).toBe("223e4567-e89b-12d3-a456-426614174001");
    });

    it("should accept null for maxFileSizeBytes (inherit)", () => {
      // Arrange
      const input = {
        userId: "323e4567-e89b-12d3-a456-426614174002",
        maxFileSizeBytes: null,
        storageQuotaBytes: 2147483648,
      };

      // Act
      const result = setUserStorageLimitSchema.parse(input);

      // Assert
      expect(result.maxFileSizeBytes).toBeNull();
      expect(result.storageQuotaBytes).toBe(2147483648);
    });

    it("should accept null for storageQuotaBytes (inherit)", () => {
      // Arrange
      const input = {
        userId: "423e4567-e89b-12d3-a456-426614174003",
        maxFileSizeBytes: 104857600,
        storageQuotaBytes: null,
      };

      // Act
      const result = setUserStorageLimitSchema.parse(input);

      // Assert
      expect(result.maxFileSizeBytes).toBe(104857600);
      expect(result.storageQuotaBytes).toBeNull();
    });

    it("should accept both limits as null (full inheritance)", () => {
      // Arrange
      const input = {
        userId: "523e4567-e89b-12d3-a456-426614174004",
        maxFileSizeBytes: null,
        storageQuotaBytes: null,
        reason: "Reset to role defaults",
      };

      // Act
      const result = setUserStorageLimitSchema.parse(input);

      // Assert
      expect(result.maxFileSizeBytes).toBeNull();
      expect(result.storageQuotaBytes).toBeNull();
    });
  });

  describe("Validation Rejects Invalid Values", () => {
    it("should reject invalid userId (not UUID)", () => {
      // Arrange
      const invalid = {
        userId: "not-a-uuid",
      };

      // Act & Assert
      expect(() => setUserStorageLimitSchema.parse(invalid)).toThrow();
    });

    it("should reject negative maxFileSizeBytes", () => {
      // Arrange
      const invalid = {
        userId: "623e4567-e89b-12d3-a456-426614174005",
        maxFileSizeBytes: -1024,
      };

      // Act & Assert
      expect(() => setUserStorageLimitSchema.parse(invalid)).toThrow();
    });

    it("should reject negative storageQuotaBytes", () => {
      // Arrange
      const invalid = {
        userId: "723e4567-e89b-12d3-a456-426614174006",
        storageQuotaBytes: -1073741824,
      };

      // Act & Assert
      expect(() => setUserStorageLimitSchema.parse(invalid)).toThrow();
    });

    it("should reject non-integer maxFileSizeBytes", () => {
      // Arrange
      const invalid = {
        userId: "823e4567-e89b-12d3-a456-426614174007",
        maxFileSizeBytes: 1024.5,
      };

      // Act & Assert
      expect(() => setUserStorageLimitSchema.parse(invalid)).toThrow();
    });

    it("should reject non-integer storageQuotaBytes", () => {
      // Arrange
      const invalid = {
        userId: "923e4567-e89b-12d3-a456-426614174008",
        storageQuotaBytes: 1073741824.7,
      };

      // Act & Assert
      expect(() => setUserStorageLimitSchema.parse(invalid)).toThrow();
    });
  });

  describe("Reason Field Validation", () => {
    it("should accept reason at max length (500)", () => {
      // Arrange
      const maxReason = "R".repeat(500);
      const input = {
        userId: "a23e4567-e89b-12d3-a456-426614174009",
        reason: maxReason,
      };

      // Act
      const result = setUserStorageLimitSchema.parse(input);

      // Assert
      expect(result.reason?.length).toBe(500);
    });

    it("should reject reason exceeding max length", () => {
      // Arrange
      const tooLong = "R".repeat(501);
      const invalid = {
        userId: "b23e4567-e89b-12d3-a456-42661417400a",
        reason: tooLong,
      };

      // Act & Assert
      expect(() => setUserStorageLimitSchema.parse(invalid)).toThrow();
    });

    it("should accept empty reason (optional)", () => {
      // Arrange
      const input = {
        userId: "c23e4567-e89b-12d3-a456-42661417400b",
        maxFileSizeBytes: 52428800,
      };

      // Act
      const result = setUserStorageLimitSchema.parse(input);

      // Assert
      expect(result.reason).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should accept zero for maxFileSizeBytes", () => {
      // Arrange - Zero means no uploads allowed
      const input = {
        userId: "d23e4567-e89b-12d3-a456-42661417400c",
        maxFileSizeBytes: 0,
      };

      // Act
      const result = setUserStorageLimitSchema.parse(input);

      // Assert
      expect(result.maxFileSizeBytes).toBe(0);
    });

    it("should accept zero for storageQuotaBytes", () => {
      // Arrange - Zero quota means no storage
      const input = {
        userId: "e23e4567-e89b-12d3-a456-42661417400d",
        storageQuotaBytes: 0,
      };

      // Act
      const result = setUserStorageLimitSchema.parse(input);

      // Assert
      expect(result.storageQuotaBytes).toBe(0);
    });

    it("should accept very large values", () => {
      // Arrange - 100TB quota
      const hundredTB = 109951162777600;
      const input = {
        userId: "f23e4567-e89b-12d3-a456-42661417400e",
        storageQuotaBytes: hundredTB,
      };

      // Act
      const result = setUserStorageLimitSchema.parse(input);

      // Assert
      expect(result.storageQuotaBytes).toBe(hundredTB);
    });
  });

  describe("Type Safety", () => {
    it("should properly type SetUserStorageLimit", () => {
      // Arrange
      const limit: SetUserStorageLimit = {
        userId: "023e4567-e89b-12d3-a456-42661417400f",
        maxFileSizeBytes: 104857600,
        storageQuotaBytes: 10737418240,
        reason: "Enterprise tier upgrade",
      };

      // Act & Assert
      expect(limit.userId).toBe("023e4567-e89b-12d3-a456-42661417400f");
      expect(limit.maxFileSizeBytes).toBe(104857600);
      expect(limit.storageQuotaBytes).toBe(10737418240);
      expect(limit.reason).toBe("Enterprise tier upgrade");
    });
  });
});

describe("Real-world Usage Patterns", () => {
  describe("Group Storage Settings Configuration", () => {
    it("should validate typical school district configuration", () => {
      // Arrange
      const districtSettings: GroupStorageSettings = {
        storageLimits: {
          group_admin: {
            maxFileSizeBytes: 209715200, // 200MB
            storageQuotaBytes: 53687091200, // 50GB
          },
          teacher: {
            maxFileSizeBytes: 52428800, // 50MB
            storageQuotaBytes: 5368709120, // 5GB
          },
          student: {
            maxFileSizeBytes: 10485760, // 10MB
            storageQuotaBytes: 1073741824, // 1GB
          },
        },
      };

      // Act
      const result = groupStorageSettingsSchema.parse(districtSettings);

      // Assert
      expect(result.storageLimits?.group_admin?.maxFileSizeBytes).toBe(209715200);
      expect(result.storageLimits?.teacher?.storageQuotaBytes).toBe(5368709120);
      expect(result.storageLimits?.student?.maxFileSizeBytes).toBe(10485760);
    });

    it("should validate partial configuration (some roles only)", () => {
      // Arrange - Only configure teacher limits
      const partialSettings: GroupStorageSettings = {
        storageLimits: {
          teacher: {
            maxFileSizeBytes: 104857600, // 100MB
          },
        },
      };

      // Act
      const result = groupStorageSettingsSchema.parse(partialSettings);

      // Assert
      expect(result.storageLimits?.teacher?.maxFileSizeBytes).toBe(104857600);
      expect(result.storageLimits?.student).toBeUndefined();
    });
  });

  describe("File Upload Workflow", () => {
    it("should validate typical document upload", () => {
      // Arrange
      const documentUpload: FileUploadMetadata = {
        originalName: "Assignment_Instructions.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2457600,
        purpose: "attachment",
        groupId: "123e4567-e89b-12d3-a456-426614174000",
      };

      // Act
      const result = fileUploadMetadataSchema.parse(documentUpload);

      // Assert
      expect(result.originalName).toBe("Assignment_Instructions.pdf");
      expect(result.purpose).toBe("attachment");
    });

    it("should validate avatar upload (no group)", () => {
      // Arrange
      const avatarUpload: FileUploadMetadata = {
        originalName: "profile_photo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 153600,
        purpose: "avatar",
      };

      // Act
      const result = fileUploadMetadataSchema.parse(avatarUpload);

      // Assert
      expect(result.originalName).toBe("profile_photo.jpg");
      expect(result.purpose).toBe("avatar");
      expect(result.groupId).toBeUndefined();
    });
  });

  describe("Admin Override Workflow", () => {
    it("should validate premium user upgrade", () => {
      // Arrange
      const upgrade: SetUserStorageLimit = {
        userId: "223e4567-e89b-12d3-a456-426614174001",
        maxFileSizeBytes: 524288000, // 500MB
        storageQuotaBytes: 53687091200, // 50GB
        reason: "Premium subscription activated",
      };

      // Act
      const result = setUserStorageLimitSchema.parse(upgrade);

      // Assert
      expect(result.maxFileSizeBytes).toBe(524288000);
      expect(result.storageQuotaBytes).toBe(53687091200);
    });

    it("should validate reset to defaults", () => {
      // Arrange
      const reset: SetUserStorageLimit = {
        userId: "323e4567-e89b-12d3-a456-426614174002",
        maxFileSizeBytes: null,
        storageQuotaBytes: null,
        reason: "Subscription downgrade - reset to role defaults",
      };

      // Act
      const result = setUserStorageLimitSchema.parse(reset);

      // Assert
      expect(result.maxFileSizeBytes).toBeNull();
      expect(result.storageQuotaBytes).toBeNull();
    });
  });
});
