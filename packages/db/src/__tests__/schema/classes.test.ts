import { describe, it, expect } from "vitest";
import type { Class, NewClass } from "../../schema/classes.js";
import { classes } from "../../schema/classes.js";

describe("Classes Schema", () => {
  describe("Type Inference", () => {
    it("should infer Class type correctly with all required fields", () => {
      // Arrange
      const classData: Class = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        groupId: "223e4567-e89b-12d3-a456-426614174001",
        name: "Period 3 Algebra I",
        settings: { grading: { scale: "standard" } },
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        deletedAt: null,
      };

      // Act & Assert - TypeScript compilation verifies types
      expect(classData.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(classData.groupId).toBe("223e4567-e89b-12d3-a456-426614174001");
      expect(classData.name).toBe("Period 3 Algebra I");
      expect(classData.settings).toEqual({ grading: { scale: "standard" } });
      expect(classData.createdAt).toBeInstanceOf(Date);
      expect(classData.updatedAt).toBeInstanceOf(Date);
      expect(classData.deletedAt).toBeNull();
    });

    it("should allow null deleted_at for active classes", () => {
      // Arrange
      const activeClass: Class = {
        id: "323e4567-e89b-12d3-a456-426614174002",
        groupId: "423e4567-e89b-12d3-a456-426614174003",
        name: "English 101",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(activeClass.deletedAt).toBeNull();
    });

    it("should allow non-null deleted_at for archived classes", () => {
      // Arrange
      const archivedClass: Class = {
        id: "523e4567-e89b-12d3-a456-426614174004",
        groupId: "623e4567-e89b-12d3-a456-426614174005",
        name: "History 201 (Spring 2023)",
        settings: {},
        createdAt: new Date("2023-01-01T00:00:00Z"),
        updatedAt: new Date("2023-05-15T00:00:00Z"),
        deletedAt: new Date("2023-06-01T00:00:00Z"),
      };

      // Act & Assert
      expect(archivedClass.deletedAt).toBeInstanceOf(Date);
      expect(archivedClass.deletedAt?.toISOString()).toBe(
        "2023-06-01T00:00:00.000Z"
      );
    });

    it("should type settings as unknown (requires Zod parsing)", () => {
      // Arrange
      const classData: Class = {
        id: "723e4567-e89b-12d3-a456-426614174006",
        groupId: "823e4567-e89b-12d3-a456-426614174007",
        name: "Science Lab",
        settings: {
          features: { discussions: true, peerReview: false },
          theme: { color: "#0066cc" },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert - settings is typed as unknown (JSON value)
      expect(classData.settings).toEqual({
        features: { discussions: true, peerReview: false },
        theme: { color: "#0066cc" },
      });
    });

    it("should allow empty settings object", () => {
      // Arrange
      const classData: Class = {
        id: "923e4567-e89b-12d3-a456-426614174008",
        groupId: "a23e4567-e89b-12d3-a456-426614174009",
        name: "Minimal Class",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(classData.settings).toEqual({});
    });
  });

  describe("NewClass Type (Insert Operations)", () => {
    it("should infer NewClass type correctly for inserts", () => {
      // Arrange - NewClass should omit auto-generated fields
      const newClass: NewClass = {
        groupId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Advanced Chemistry",
        settings: { grading: { passingGrade: 70 } },
      };

      // Act & Assert
      expect(newClass.groupId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(newClass.name).toBe("Advanced Chemistry");
      expect(newClass.settings).toEqual({ grading: { passingGrade: 70 } });
    });

    it("should allow creating class with empty settings", () => {
      // Arrange
      const newClass: NewClass = {
        groupId: "223e4567-e89b-12d3-a456-426614174001",
        name: "Empty Settings Class",
        settings: {},
      };

      // Act & Assert
      expect(newClass.settings).toEqual({});
    });

    it("should make auto-generated fields optional in NewClass", () => {
      // Arrange - Minimal NewClass without id, timestamps
      const minimalClass: NewClass = {
        groupId: "323e4567-e89b-12d3-a456-426614174002",
        name: "Minimal Class",
      };

      // Act & Assert - id, createdAt, updatedAt should be optional/undefined
      expect(minimalClass.id).toBeUndefined();
      expect(minimalClass.createdAt).toBeUndefined();
      expect(minimalClass.updatedAt).toBeUndefined();
    });

    it("should allow creating class with complex settings", () => {
      // Arrange
      const newClass: NewClass = {
        groupId: "423e4567-e89b-12d3-a456-426614174003",
        name: "Advanced Settings Class",
        settings: {
          grading: { scale: "weighted", passingGrade: 75 },
          theme: { color: "#ff6600", icon: "book" },
          features: { enableDiscussions: true, enablePeerReview: true },
        },
      };

      // Act & Assert
      expect(newClass.settings).toEqual({
        grading: { scale: "weighted", passingGrade: 75 },
        theme: { color: "#ff6600", icon: "book" },
        features: { enableDiscussions: true, enablePeerReview: true },
      });
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      // Act & Assert
      expect(classes._.name).toBe("classes");
    });

    it("should have id column", () => {
      // Act & Assert
      expect(classes.id).toBeDefined();
      expect(classes.id.name).toBe("id");
    });

    it("should have groupId column", () => {
      // Act & Assert
      expect(classes.groupId).toBeDefined();
      expect(classes.groupId.name).toBe("group_id");
    });

    it("should have name column", () => {
      // Act & Assert
      expect(classes.name).toBeDefined();
      expect(classes.name.name).toBe("name");
    });

    it("should have settings column", () => {
      // Act & Assert
      expect(classes.settings).toBeDefined();
      expect(classes.settings.name).toBe("settings");
    });

    it("should have createdAt column", () => {
      // Act & Assert
      expect(classes.createdAt).toBeDefined();
      expect(classes.createdAt.name).toBe("created_at");
    });

    it("should have updatedAt column", () => {
      // Act & Assert
      expect(classes.updatedAt).toBeDefined();
      expect(classes.updatedAt.name).toBe("updated_at");
    });

    it("should have deletedAt column", () => {
      // Act & Assert
      expect(classes.deletedAt).toBeDefined();
      expect(classes.deletedAt.name).toBe("deleted_at");
    });

    it("should have all required columns", () => {
      // Arrange
      const expectedColumns = [
        "id",
        "groupId",
        "name",
        "settings",
        "createdAt",
        "updatedAt",
        "deletedAt",
      ];

      // Act
      const actualColumns = Object.keys(classes).filter(
        (key) => !key.startsWith("_")
      );

      // Assert
      expectedColumns.forEach((col) => {
        expect(actualColumns).toContain(col);
      });
    });
  });

  describe("Schema Exports", () => {
    it("should export classes table", () => {
      // Act & Assert
      expect(classes).toBeDefined();
      expect(classes._.name).toBe("classes");
    });
  });

  describe("Foreign Key Fields", () => {
    it("should type groupId as UUID string", () => {
      // Arrange
      const newClass: NewClass = {
        groupId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Class",
      };

      // Act & Assert - groupId should be typed as string
      const groupId: string = newClass.groupId;
      expect(groupId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(typeof newClass.groupId).toBe("string");
    });

    it("should enforce foreign key reference is UUID", () => {
      // Arrange
      const classData: Class = {
        id: "223e4567-e89b-12d3-a456-426614174001",
        groupId: "323e4567-e89b-12d3-a456-426614174002",
        name: "FK Test Class",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert - groupId should be a valid UUID string
      expect(classData.groupId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe("Type Safety", () => {
    it("should enforce required groupId field", () => {
      // Arrange
      const classData: Class = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        groupId: "223e4567-e89b-12d3-a456-426614174001",
        name: "Required Field Class",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(classData.groupId).toBeTruthy();
      expect(typeof classData.groupId).toBe("string");
    });

    it("should enforce required name field", () => {
      // Arrange
      const classData: Class = {
        id: "323e4567-e89b-12d3-a456-426614174002",
        groupId: "423e4567-e89b-12d3-a456-426614174003",
        name: "Required Name",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(classData.name).toBeTruthy();
      expect(typeof classData.name).toBe("string");
    });

    it("should enforce required settings field", () => {
      // Arrange
      const classData: Class = {
        id: "523e4567-e89b-12d3-a456-426614174004",
        groupId: "623e4567-e89b-12d3-a456-426614174005",
        name: "Settings Test Class",
        settings: { feature_flags: { enabled: true } },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(classData.settings).toBeDefined();
      expect(typeof classData.settings).toBe("object");
    });
  });

  describe("Settings Field", () => {
    it("should handle grading settings", () => {
      // Arrange
      const classData: Class = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        groupId: "223e4567-e89b-12d3-a456-426614174001",
        name: "Grading Class",
        settings: {
          grading: {
            scale: "standard",
            passingGrade: 70,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(classData.settings).toEqual({
        grading: {
          scale: "standard",
          passingGrade: 70,
        },
      });
    });

    it("should handle theme settings", () => {
      // Arrange
      const classData: Class = {
        id: "323e4567-e89b-12d3-a456-426614174002",
        groupId: "423e4567-e89b-12d3-a456-426614174003",
        name: "Themed Class",
        settings: {
          theme: {
            color: "#0066cc",
            icon: "book",
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(classData.settings).toEqual({
        theme: {
          color: "#0066cc",
          icon: "book",
        },
      });
    });

    it("should handle feature flags settings", () => {
      // Arrange
      const classData: Class = {
        id: "523e4567-e89b-12d3-a456-426614174004",
        groupId: "623e4567-e89b-12d3-a456-426614174005",
        name: "Feature Class",
        settings: {
          features: {
            enableDiscussions: true,
            enablePeerReview: false,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(classData.settings).toEqual({
        features: {
          enableDiscussions: true,
          enablePeerReview: false,
        },
      });
    });

    it("should handle complex nested settings", () => {
      // Arrange
      const complexSettings = {
        grading: {
          scale: "weighted",
          passingGrade: 75,
        },
        theme: {
          color: "#ff6600",
          icon: "science",
        },
        features: {
          enableDiscussions: true,
          enablePeerReview: true,
          enableAssignments: true,
        },
        accessibility: {
          highContrast: false,
          textSize: "medium",
        },
      };

      const classData: Class = {
        id: "723e4567-e89b-12d3-a456-426614174006",
        groupId: "823e4567-e89b-12d3-a456-426614174007",
        name: "Complex Settings Class",
        settings: complexSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(classData.settings).toEqual(complexSettings);
    });
  });

  describe("Soft Delete", () => {
    it("should support soft delete via deletedAt", () => {
      // Arrange
      const softDeletedClass: Class = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        groupId: "223e4567-e89b-12d3-a456-426614174001",
        name: "Archived Class",
        settings: {},
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-05-01T00:00:00Z"),
        deletedAt: new Date("2024-06-01T00:00:00Z"),
      };

      // Act & Assert
      expect(softDeletedClass.deletedAt).not.toBeNull();
      expect(softDeletedClass.deletedAt).toBeInstanceOf(Date);
    });

    it("should distinguish between active and archived classes", () => {
      // Arrange
      const activeClass: Class = {
        id: "323e4567-e89b-12d3-a456-426614174002",
        groupId: "423e4567-e89b-12d3-a456-426614174003",
        name: "Active Class",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const archivedClass: Class = {
        id: "523e4567-e89b-12d3-a456-426614174004",
        groupId: "623e4567-e89b-12d3-a456-426614174005",
        name: "Archived Class",
        settings: {},
        createdAt: new Date("2023-01-01T00:00:00Z"),
        updatedAt: new Date("2023-12-01T00:00:00Z"),
        deletedAt: new Date("2024-01-01T00:00:00Z"),
      };

      // Act & Assert
      expect(activeClass.deletedAt).toBeNull();
      expect(archivedClass.deletedAt).not.toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle classes with long names (up to 100 chars)", () => {
      // Arrange
      const longName = "A".repeat(100);
      const classData: Class = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        groupId: "223e4567-e89b-12d3-a456-426614174001",
        name: longName,
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(classData.name.length).toBe(100);
      expect(classData.name).toBe(longName);
    });

    it("should handle class with no members (empty roster)", () => {
      // Arrange - A newly created class with no students or teachers yet
      const emptyClass: NewClass = {
        groupId: "323e4567-e89b-12d3-a456-426614174002",
        name: "Empty Class",
        settings: {},
      };

      // Act & Assert
      expect(emptyClass.name).toBe("Empty Class");
      expect(emptyClass.groupId).toBeTruthy();
    });

    it("should handle class with multiple teachers (co-teaching)", () => {
      // Arrange - Class designed for co-teaching (members tracked separately)
      const coTeachingClass: NewClass = {
        groupId: "423e4567-e89b-12d3-a456-426614174003",
        name: "Co-Teaching Biology",
        settings: { coTeaching: true },
      };

      // Act & Assert
      expect(coTeachingClass.name).toBe("Co-Teaching Biology");
      expect(coTeachingClass.settings).toEqual({ coTeaching: true });
    });

    it("should handle archived class with historical data", () => {
      // Arrange
      const historicalClass: Class = {
        id: "523e4567-e89b-12d3-a456-426614174004",
        groupId: "623e4567-e89b-12d3-a456-426614174005",
        name: "Spring 2020 History",
        settings: { semester: "spring", year: 2020 },
        createdAt: new Date("2020-01-15T00:00:00Z"),
        updatedAt: new Date("2020-05-20T00:00:00Z"),
        deletedAt: new Date("2020-06-01T00:00:00Z"),
      };

      // Act & Assert
      expect(historicalClass.deletedAt).not.toBeNull();
      expect(historicalClass.settings).toEqual({
        semester: "spring",
        year: 2020,
      });
      expect(historicalClass.createdAt.getFullYear()).toBe(2020);
    });

    it("should handle different class name formats", () => {
      // Arrange - Various common class naming patterns
      const periodClass: NewClass = {
        groupId: "723e4567-e89b-12d3-a456-426614174006",
        name: "Period 3 Algebra I",
      };

      const codeClass: NewClass = {
        groupId: "823e4567-e89b-12d3-a456-426614174007",
        name: "CS101",
      };

      const descriptiveClass: NewClass = {
        groupId: "923e4567-e89b-12d3-a456-426614174008",
        name: "Advanced Placement Chemistry - Lab Section",
      };

      // Act & Assert
      expect(periodClass.name).toBe("Period 3 Algebra I");
      expect(codeClass.name).toBe("CS101");
      expect(descriptiveClass.name).toBe(
        "Advanced Placement Chemistry - Lab Section"
      );
    });

    it("should handle settings with different configurations", () => {
      // Arrange
      const minimalSettings: NewClass = {
        groupId: "a23e4567-e89b-12d3-a456-426614174009",
        name: "Minimal Settings",
        settings: {},
      };

      const standardSettings: NewClass = {
        groupId: "b23e4567-e89b-12d3-a456-42661417400a",
        name: "Standard Settings",
        settings: {
          grading: { passingGrade: 70 },
        },
      };

      const complexSettings: NewClass = {
        groupId: "c23e4567-e89b-12d3-a456-42661417400b",
        name: "Complex Settings",
        settings: {
          grading: { scale: "weighted", passingGrade: 75 },
          theme: { color: "#0066cc", icon: "book" },
          features: { discussions: true, peerReview: true },
        },
      };

      // Act & Assert
      expect(minimalSettings.settings).toEqual({});
      expect(standardSettings.settings).toHaveProperty("grading");
      expect(complexSettings.settings).toHaveProperty("grading");
      expect(complexSettings.settings).toHaveProperty("theme");
      expect(complexSettings.settings).toHaveProperty("features");
    });
  });
});
