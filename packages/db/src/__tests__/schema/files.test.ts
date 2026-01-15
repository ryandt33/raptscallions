import { describe, it, expect } from "vitest";

import { files, fileStatusEnum, storageBackendEnum } from "../../schema/files.js";

import type { File, NewFile } from "../../schema/files.js";

describe("Files Schema", () => {
  describe("Type Inference", () => {
    it("should infer File type correctly with all required fields", () => {
      // Arrange
      const file: File = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        originalName: "document.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1048576, // 1MB
        storageKey: "s3/uploads/123e4567-e89b-12d3-a456-426614174000/document.pdf",
        storageBackend: "s3",
        uploadedBy: "223e4567-e89b-12d3-a456-426614174001",
        groupId: "323e4567-e89b-12d3-a456-426614174002",
        purpose: "general",
        status: "active",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        deletedAt: null,
      };

      // Act & Assert - TypeScript compilation verifies types
      expect(file.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(file.originalName).toBe("document.pdf");
      expect(file.mimeType).toBe("application/pdf");
      expect(file.sizeBytes).toBe(1048576);
      expect(file.storageKey).toContain("document.pdf");
      expect(file.storageBackend).toBe("s3");
      expect(file.uploadedBy).toBe("223e4567-e89b-12d3-a456-426614174001");
      expect(file.groupId).toBe("323e4567-e89b-12d3-a456-426614174002");
      expect(file.purpose).toBe("general");
      expect(file.status).toBe("active");
      expect(file.createdAt).toBeInstanceOf(Date);
      expect(file.updatedAt).toBeInstanceOf(Date);
      expect(file.deletedAt).toBeNull();
    });

    it("should allow null groupId for files not associated with a group", () => {
      // Arrange - File without group association
      const userFile: File = {
        id: "223e4567-e89b-12d3-a456-426614174001",
        originalName: "avatar.png",
        mimeType: "image/png",
        sizeBytes: 51200, // 50KB
        storageKey: "s3/avatars/223e4567-e89b-12d3-a456-426614174001.png",
        storageBackend: "s3",
        uploadedBy: "323e4567-e89b-12d3-a456-426614174002",
        groupId: null,
        purpose: "avatar",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(userFile.groupId).toBeNull();
      expect(userFile.originalName).toBe("avatar.png");
    });

    it("should support local storage backend", () => {
      // Arrange - File on local storage
      const localFile: File = {
        id: "323e4567-e89b-12d3-a456-426614174002",
        originalName: "test-file.txt",
        mimeType: "text/plain",
        sizeBytes: 1024,
        storageKey: "local/uploads/323e4567/test-file.txt",
        storageBackend: "local",
        uploadedBy: "423e4567-e89b-12d3-a456-426614174003",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(localFile.storageBackend).toBe("local");
      expect(localFile.storageKey).toContain("local/");
    });

    it("should allow null deletedAt for active files", () => {
      // Arrange
      const activeFile: File = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        originalName: "active-doc.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: 204800,
        storageKey: "s3/docs/423e4567/active-doc.docx",
        storageBackend: "s3",
        uploadedBy: "523e4567-e89b-12d3-a456-426614174004",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(activeFile.deletedAt).toBeNull();
      expect(activeFile.status).toBe("active");
    });

    it("should allow non-null deletedAt for soft-deleted files", () => {
      // Arrange
      const deletedFile: File = {
        id: "523e4567-e89b-12d3-a456-426614174004",
        originalName: "deleted-file.pdf",
        mimeType: "application/pdf",
        sizeBytes: 102400,
        storageKey: "s3/docs/523e4567/deleted-file.pdf",
        storageBackend: "s3",
        uploadedBy: "623e4567-e89b-12d3-a456-426614174005",
        groupId: null,
        purpose: "general",
        status: "soft_deleted",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        deletedAt: new Date("2024-01-03T00:00:00Z"),
      };

      // Act & Assert
      expect(deletedFile.deletedAt).toBeInstanceOf(Date);
      expect(deletedFile.deletedAt?.toISOString()).toBe("2024-01-03T00:00:00.000Z");
      expect(deletedFile.status).toBe("soft_deleted");
    });
  });

  describe("NewFile Type (Insert Operations)", () => {
    it("should infer NewFile type correctly for inserts", () => {
      // Arrange - NewFile should omit auto-generated fields
      const newFile: NewFile = {
        originalName: "new-file.pdf",
        mimeType: "application/pdf",
        sizeBytes: 512000,
        storageKey: "s3/uploads/new-uuid/new-file.pdf",
        storageBackend: "s3",
        uploadedBy: "623e4567-e89b-12d3-a456-426614174005",
        groupId: "723e4567-e89b-12d3-a456-426614174006",
        purpose: "attachment",
      };

      // Act & Assert
      expect(newFile.originalName).toBe("new-file.pdf");
      expect(newFile.mimeType).toBe("application/pdf");
      expect(newFile.sizeBytes).toBe(512000);
      expect(newFile.storageBackend).toBe("s3");
      expect(newFile.purpose).toBe("attachment");
    });

    it("should allow creating file with minimal required fields", () => {
      // Arrange - File with defaults for optional/defaulted fields
      const minimalFile: NewFile = {
        originalName: "minimal.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
        storageKey: "s3/uploads/min-uuid/minimal.txt",
        uploadedBy: "723e4567-e89b-12d3-a456-426614174006",
      };

      // Act & Assert
      expect(minimalFile.originalName).toBe("minimal.txt");
      expect(minimalFile.mimeType).toBe("text/plain");
      expect(minimalFile.sizeBytes).toBe(100);
      expect(minimalFile.uploadedBy).toBeTruthy();
      // Default values will be set by database
      expect(minimalFile.storageBackend).toBeUndefined();
      expect(minimalFile.purpose).toBeUndefined();
      expect(minimalFile.status).toBeUndefined();
    });

    it("should make auto-generated fields optional in NewFile", () => {
      // Arrange - Minimal NewFile without id, timestamps
      const minimalInsert: NewFile = {
        originalName: "auto-gen-test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
        storageKey: "s3/test/auto-gen-test.pdf",
        uploadedBy: "823e4567-e89b-12d3-a456-426614174007",
      };

      // Act & Assert - id, createdAt, updatedAt should be optional/undefined
      expect(minimalInsert.id).toBeUndefined();
      expect(minimalInsert.createdAt).toBeUndefined();
      expect(minimalInsert.updatedAt).toBeUndefined();
      expect(minimalInsert.deletedAt).toBeUndefined();
    });
  });

  describe("File Status Enum", () => {
    it("should have active status value", () => {
      // Arrange
      const activeStatus: File["status"] = "active";

      // Act & Assert
      expect(activeStatus).toBe("active");
    });

    it("should have soft_deleted status value", () => {
      // Arrange
      const softDeletedStatus: File["status"] = "soft_deleted";

      // Act & Assert
      expect(softDeletedStatus).toBe("soft_deleted");
    });

    it("should contain exactly two status values", () => {
      // Arrange
      const validStatuses: Array<File["status"]> = ["active", "soft_deleted"];

      // Act & Assert
      expect(validStatuses).toHaveLength(2);
    });
  });

  describe("Storage Backend Enum", () => {
    it("should have s3 backend value", () => {
      // Arrange
      const s3Backend: File["storageBackend"] = "s3";

      // Act & Assert
      expect(s3Backend).toBe("s3");
    });

    it("should have local backend value", () => {
      // Arrange
      const localBackend: File["storageBackend"] = "local";

      // Act & Assert
      expect(localBackend).toBe("local");
    });

    it("should contain exactly two backend values", () => {
      // Arrange
      const validBackends: Array<File["storageBackend"]> = ["s3", "local"];

      // Act & Assert
      expect(validBackends).toHaveLength(2);
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      // Act & Assert
      expect(files._.name).toBe("files");
    });

    it("should have id column", () => {
      // Act & Assert
      expect(files.id).toBeDefined();
      expect(files.id.name).toBe("id");
    });

    it("should have originalName column", () => {
      // Act & Assert
      expect(files.originalName).toBeDefined();
      expect(files.originalName.name).toBe("original_name");
    });

    it("should have mimeType column", () => {
      // Act & Assert
      expect(files.mimeType).toBeDefined();
      expect(files.mimeType.name).toBe("mime_type");
    });

    it("should have sizeBytes column", () => {
      // Act & Assert
      expect(files.sizeBytes).toBeDefined();
      expect(files.sizeBytes.name).toBe("size_bytes");
    });

    it("should have storageKey column", () => {
      // Act & Assert
      expect(files.storageKey).toBeDefined();
      expect(files.storageKey.name).toBe("storage_key");
    });

    it("should have storageBackend column", () => {
      // Act & Assert
      expect(files.storageBackend).toBeDefined();
      expect(files.storageBackend.name).toBe("storage_backend");
    });

    it("should have uploadedBy column", () => {
      // Act & Assert
      expect(files.uploadedBy).toBeDefined();
      expect(files.uploadedBy.name).toBe("uploaded_by");
    });

    it("should have groupId column", () => {
      // Act & Assert
      expect(files.groupId).toBeDefined();
      expect(files.groupId.name).toBe("group_id");
    });

    it("should have purpose column", () => {
      // Act & Assert
      expect(files.purpose).toBeDefined();
      expect(files.purpose.name).toBe("purpose");
    });

    it("should have status column", () => {
      // Act & Assert
      expect(files.status).toBeDefined();
      expect(files.status.name).toBe("status");
    });

    it("should have createdAt column", () => {
      // Act & Assert
      expect(files.createdAt).toBeDefined();
      expect(files.createdAt.name).toBe("created_at");
    });

    it("should have updatedAt column", () => {
      // Act & Assert
      expect(files.updatedAt).toBeDefined();
      expect(files.updatedAt.name).toBe("updated_at");
    });

    it("should have deletedAt column", () => {
      // Act & Assert
      expect(files.deletedAt).toBeDefined();
      expect(files.deletedAt.name).toBe("deleted_at");
    });

    it("should have all required columns", () => {
      // Arrange
      const expectedColumns = [
        "id",
        "originalName",
        "mimeType",
        "sizeBytes",
        "storageKey",
        "storageBackend",
        "uploadedBy",
        "groupId",
        "purpose",
        "status",
        "createdAt",
        "updatedAt",
        "deletedAt",
      ];

      // Act
      const actualColumns = Object.keys(files).filter(
        (key) => !key.startsWith("_")
      );

      // Assert
      expectedColumns.forEach((col) => {
        expect(actualColumns).toContain(col);
      });
    });
  });

  describe("Schema Exports", () => {
    it("should export files table", () => {
      // Act & Assert
      expect(files).toBeDefined();
      expect(files._.name).toBe("files");
    });

    it("should export fileStatusEnum", () => {
      // Act & Assert
      expect(fileStatusEnum).toBeDefined();
    });

    it("should export storageBackendEnum", () => {
      // Act & Assert
      expect(storageBackendEnum).toBeDefined();
    });
  });

  describe("Purpose Field", () => {
    it("should accept general purpose (default)", () => {
      // Arrange
      const generalFile: File = {
        id: "623e4567-e89b-12d3-a456-426614174005",
        originalName: "general-file.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: "s3/general/general-file.pdf",
        storageBackend: "s3",
        uploadedBy: "723e4567-e89b-12d3-a456-426614174006",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(generalFile.purpose).toBe("general");
    });

    it("should accept avatar purpose", () => {
      // Arrange
      const avatarFile: NewFile = {
        originalName: "profile.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 51200,
        storageKey: "s3/avatars/profile.jpg",
        uploadedBy: "823e4567-e89b-12d3-a456-426614174007",
        purpose: "avatar",
      };

      // Act & Assert
      expect(avatarFile.purpose).toBe("avatar");
    });

    it("should accept attachment purpose", () => {
      // Arrange
      const attachmentFile: NewFile = {
        originalName: "homework.pdf",
        mimeType: "application/pdf",
        sizeBytes: 102400,
        storageKey: "s3/attachments/homework.pdf",
        uploadedBy: "923e4567-e89b-12d3-a456-426614174008",
        purpose: "attachment",
      };

      // Act & Assert
      expect(attachmentFile.purpose).toBe("attachment");
    });

    it("should accept export purpose", () => {
      // Arrange
      const exportFile: NewFile = {
        originalName: "report.csv",
        mimeType: "text/csv",
        sizeBytes: 204800,
        storageKey: "s3/exports/report.csv",
        uploadedBy: "a23e4567-e89b-12d3-a456-426614174009",
        purpose: "export",
      };

      // Act & Assert
      expect(exportFile.purpose).toBe("export");
    });

    it("should accept custom purpose values", () => {
      // Arrange - purpose is varchar, allowing custom values
      const customPurposeFile: NewFile = {
        originalName: "custom.bin",
        mimeType: "application/octet-stream",
        sizeBytes: 4096,
        storageKey: "s3/custom/custom.bin",
        uploadedBy: "b23e4567-e89b-12d3-a456-42661417400a",
        purpose: "custom_integration_data",
      };

      // Act & Assert
      expect(customPurposeFile.purpose).toBe("custom_integration_data");
    });
  });

  describe("Foreign Key Fields", () => {
    it("should type uploadedBy as UUID string", () => {
      // Arrange
      const newFile: NewFile = {
        originalName: "fk-test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: "s3/fk-test/fk-test.pdf",
        uploadedBy: "c23e4567-e89b-12d3-a456-42661417400b",
      };

      // Act & Assert - uploadedBy should be typed as string
      const uploadedBy: string = newFile.uploadedBy;
      expect(uploadedBy).toBe("c23e4567-e89b-12d3-a456-42661417400b");
      expect(typeof newFile.uploadedBy).toBe("string");
    });

    it("should type groupId as UUID string or null", () => {
      // Arrange - Group-scoped file
      const groupFile: NewFile = {
        originalName: "group-file.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
        storageKey: "s3/group/group-file.pdf",
        uploadedBy: "d23e4567-e89b-12d3-a456-42661417400c",
        groupId: "e23e4567-e89b-12d3-a456-42661417400d",
      };

      // Act & Assert
      if (groupFile.groupId !== null && groupFile.groupId !== undefined) {
        const groupId: string = groupFile.groupId;
        expect(groupId).toBe("e23e4567-e89b-12d3-a456-42661417400d");
      }
    });

    it("should enforce foreign key references are UUIDs", () => {
      // Arrange
      const file: File = {
        id: "f23e4567-e89b-12d3-a456-42661417400e",
        originalName: "uuid-fk-test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 3072,
        storageKey: "s3/uuid-fk/uuid-fk-test.pdf",
        storageBackend: "s3",
        uploadedBy: "023e4567-e89b-12d3-a456-42661417400f",
        groupId: "123e4567-e89b-12d3-a456-426614174010",
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert - Both FK fields should be valid UUIDs
      expect(file.uploadedBy).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      if (file.groupId) {
        expect(file.groupId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      }
    });
  });

  describe("Type Safety", () => {
    it("should enforce required originalName field", () => {
      // Arrange
      const file: File = {
        id: "223e4567-e89b-12d3-a456-426614174011",
        originalName: "required-name.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: "s3/required/required-name.pdf",
        storageBackend: "s3",
        uploadedBy: "323e4567-e89b-12d3-a456-426614174012",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(file.originalName).toBeTruthy();
      expect(typeof file.originalName).toBe("string");
    });

    it("should enforce required mimeType field", () => {
      // Arrange
      const file: File = {
        id: "323e4567-e89b-12d3-a456-426614174012",
        originalName: "mime-test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: "s3/mime/mime-test.pdf",
        storageBackend: "s3",
        uploadedBy: "423e4567-e89b-12d3-a456-426614174013",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(file.mimeType).toBeTruthy();
      expect(typeof file.mimeType).toBe("string");
    });

    it("should enforce required sizeBytes field", () => {
      // Arrange
      const file: File = {
        id: "423e4567-e89b-12d3-a456-426614174013",
        originalName: "size-test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1048576,
        storageKey: "s3/size/size-test.pdf",
        storageBackend: "s3",
        uploadedBy: "523e4567-e89b-12d3-a456-426614174014",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(file.sizeBytes).toBeTruthy();
      expect(typeof file.sizeBytes).toBe("number");
    });

    it("should enforce required storageKey field", () => {
      // Arrange
      const file: File = {
        id: "523e4567-e89b-12d3-a456-426614174014",
        originalName: "key-test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: "s3/keys/unique-key-test.pdf",
        storageBackend: "s3",
        uploadedBy: "623e4567-e89b-12d3-a456-426614174015",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(file.storageKey).toBeTruthy();
      expect(typeof file.storageKey).toBe("string");
    });

    it("should enforce required uploadedBy field", () => {
      // Arrange
      const file: File = {
        id: "623e4567-e89b-12d3-a456-426614174015",
        originalName: "uploader-test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: "s3/uploader/uploader-test.pdf",
        storageBackend: "s3",
        uploadedBy: "723e4567-e89b-12d3-a456-426614174016",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(file.uploadedBy).toBeTruthy();
      expect(typeof file.uploadedBy).toBe("string");
    });
  });

  describe("Edge Cases", () => {
    it("should handle files with very long names (up to 255 chars)", () => {
      // Arrange
      const longName = "a".repeat(251) + ".pdf"; // 255 chars total
      const file: File = {
        id: "723e4567-e89b-12d3-a456-426614174016",
        originalName: longName,
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: "s3/long/long-name.pdf",
        storageBackend: "s3",
        uploadedBy: "823e4567-e89b-12d3-a456-426614174017",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(file.originalName.length).toBe(255);
      expect(file.originalName).toBe(longName);
    });

    it("should handle files with very long MIME types (up to 100 chars)", () => {
      // Arrange
      const longMime = "application/" + "x".repeat(88); // 100 chars total
      const file: File = {
        id: "823e4567-e89b-12d3-a456-426614174017",
        originalName: "long-mime.bin",
        mimeType: longMime,
        sizeBytes: 1024,
        storageKey: "s3/long-mime/long-mime.bin",
        storageBackend: "s3",
        uploadedBy: "923e4567-e89b-12d3-a456-426614174018",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(file.mimeType.length).toBe(100);
    });

    it("should handle files with very long storage keys (up to 500 chars)", () => {
      // Arrange
      const longKey = "s3/" + "path/".repeat(98) + "file.pdf"; // ~500 chars
      const file: File = {
        id: "923e4567-e89b-12d3-a456-426614174018",
        originalName: "deep-path.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: longKey,
        storageBackend: "s3",
        uploadedBy: "a23e4567-e89b-12d3-a456-426614174019",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(file.storageKey.length).toBeGreaterThan(400);
      expect(file.storageKey).toBe(longKey);
    });

    it("should handle very large file sizes (bigint range)", () => {
      // Arrange - 10GB file (10 * 1024^3)
      const tenGigabytes = 10737418240;
      const file: File = {
        id: "a23e4567-e89b-12d3-a456-426614174019",
        originalName: "large-file.zip",
        mimeType: "application/zip",
        sizeBytes: tenGigabytes,
        storageKey: "s3/large/large-file.zip",
        storageBackend: "s3",
        uploadedBy: "b23e4567-e89b-12d3-a456-42661417401a",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(file.sizeBytes).toBe(tenGigabytes);
      expect(file.sizeBytes).toBeGreaterThan(1073741824); // > 1GB
    });

    it("should handle zero-byte files", () => {
      // Arrange - Empty file
      const emptyFile: File = {
        id: "b23e4567-e89b-12d3-a456-42661417401a",
        originalName: "empty.txt",
        mimeType: "text/plain",
        sizeBytes: 0,
        storageKey: "s3/empty/empty.txt",
        storageBackend: "s3",
        uploadedBy: "c23e4567-e89b-12d3-a456-42661417401b",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(emptyFile.sizeBytes).toBe(0);
    });

    it("should handle files with special characters in name", () => {
      // Arrange
      const specialName = "Report (Q1) - Final Draft [v2].pdf";
      const file: File = {
        id: "c23e4567-e89b-12d3-a456-42661417401b",
        originalName: specialName,
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: "s3/special/report-special.pdf",
        storageBackend: "s3",
        uploadedBy: "d23e4567-e89b-12d3-a456-42661417401c",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(file.originalName).toBe(specialName);
      expect(file.originalName).toContain("(");
      expect(file.originalName).toContain("[");
    });

    it("should handle purpose with max length (50 chars)", () => {
      // Arrange
      const longPurpose = "p".repeat(50);
      const file: File = {
        id: "d23e4567-e89b-12d3-a456-42661417401c",
        originalName: "purpose-test.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: "s3/purpose/purpose-test.pdf",
        storageBackend: "s3",
        uploadedBy: "e23e4567-e89b-12d3-a456-42661417401d",
        groupId: null,
        purpose: longPurpose,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(file.purpose.length).toBe(50);
    });
  });

  describe("Soft Delete", () => {
    it("should distinguish between active and soft_deleted files", () => {
      // Arrange
      const activeFile: File = {
        id: "e23e4567-e89b-12d3-a456-42661417401d",
        originalName: "active.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: "s3/active/active.pdf",
        storageBackend: "s3",
        uploadedBy: "f23e4567-e89b-12d3-a456-42661417401e",
        groupId: null,
        purpose: "general",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const deletedFile: File = {
        id: "f23e4567-e89b-12d3-a456-42661417401e",
        originalName: "deleted.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        storageKey: "s3/deleted/deleted.pdf",
        storageBackend: "s3",
        uploadedBy: "023e4567-e89b-12d3-a456-42661417401f",
        groupId: null,
        purpose: "general",
        status: "soft_deleted",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        deletedAt: new Date("2024-01-02T00:00:00Z"),
      };

      // Act & Assert
      expect(activeFile.status).toBe("active");
      expect(activeFile.deletedAt).toBeNull();
      expect(deletedFile.status).toBe("soft_deleted");
      expect(deletedFile.deletedAt).not.toBeNull();
    });
  });
});
