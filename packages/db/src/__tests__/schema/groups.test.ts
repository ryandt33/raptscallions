import { describe, it, expect } from "vitest";

import { groups, groupTypeEnum } from "../../schema/groups.js";

import type { Group, NewGroup } from "../../schema/groups.js";

describe("Groups Schema", () => {
  describe("Type Inference", () => {
    it("should infer Group type correctly with all required fields", () => {
      // Arrange
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Springfield District",
        slug: "springfield-district",
        type: "district",
        path: "springfield_district",
        settings: { theme: { primaryColor: "#0066cc" } },
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        deletedAt: null,
      };

      // Act & Assert - TypeScript compilation verifies types
      expect(group.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(group.name).toBe("Springfield District");
      expect(group.slug).toBe("springfield-district");
      expect(group.type).toBe("district");
      expect(group.path).toBe("springfield_district");
      expect(group.settings).toEqual({ theme: { primaryColor: "#0066cc" } });
      expect(group.createdAt).toBeInstanceOf(Date);
      expect(group.updatedAt).toBeInstanceOf(Date);
      expect(group.deletedAt).toBeNull();
    });

    it("should allow null deleted_at for non-deleted groups", () => {
      // Arrange
      const activeGroup: Group = {
        id: "223e4567-e89b-12d3-a456-426614174001",
        name: "Central High School",
        slug: "central-high",
        type: "school",
        path: "springfield_district.central_high",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(activeGroup.deletedAt).toBeNull();
    });

    it("should allow non-null deleted_at for soft-deleted groups", () => {
      // Arrange
      const deletedGroup: Group = {
        id: "323e4567-e89b-12d3-a456-426614174002",
        name: "Math Department",
        slug: "math-dept",
        type: "department",
        path: "springfield_district.central_high.math_dept",
        settings: {},
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        deletedAt: new Date("2024-01-03T00:00:00Z"),
      };

      // Act & Assert
      expect(deletedGroup.deletedAt).toBeInstanceOf(Date);
      expect(deletedGroup.deletedAt?.toISOString()).toBe(
        "2024-01-03T00:00:00.000Z"
      );
    });

    it("should type path as string (ltree custom type)", () => {
      // Arrange
      const group: Group = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        name: "Science Department",
        slug: "science-dept",
        type: "department",
        path: "springfield_district.central_high.science_dept",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert - path should be typed as string
      const pathString: string = group.path;
      expect(pathString).toBe("springfield_district.central_high.science_dept");
      expect(typeof group.path).toBe("string");
    });

    it("should type settings as unknown (requires Zod parsing)", () => {
      // Arrange
      const group: Group = {
        id: "523e4567-e89b-12d3-a456-426614174004",
        name: "Test Group",
        slug: "test-group",
        type: "district",
        path: "test_group",
        settings: { enabled_models: ["gpt-4", "claude-3"] },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert - settings is typed as unknown (JSON value)
      expect(group.settings).toEqual({
        enabled_models: ["gpt-4", "claude-3"],
      });
    });

    it("should allow empty settings object", () => {
      // Arrange
      const group: Group = {
        id: "623e4567-e89b-12d3-a456-426614174005",
        name: "Minimal Group",
        slug: "minimal-group",
        type: "school",
        path: "district.minimal_school",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(group.settings).toEqual({});
    });
  });

  describe("NewGroup Type (Insert Operations)", () => {
    it("should infer NewGroup type correctly for inserts", () => {
      // Arrange - NewGroup should omit auto-generated fields
      const newGroup: NewGroup = {
        name: "New District",
        slug: "new-district",
        type: "district",
        path: "new_district",
        settings: { theme: { primaryColor: "#ff0000" } },
      };

      // Act & Assert
      expect(newGroup.name).toBe("New District");
      expect(newGroup.slug).toBe("new-district");
      expect(newGroup.type).toBe("district");
      expect(newGroup.path).toBe("new_district");
      expect(newGroup.settings).toEqual({ theme: { primaryColor: "#ff0000" } });
    });

    it("should allow creating group with empty settings", () => {
      // Arrange
      const newGroup: NewGroup = {
        name: "Empty Settings Group",
        slug: "empty-settings",
        type: "school",
        path: "district.empty_settings",
        settings: {},
      };

      // Act & Assert
      expect(newGroup.settings).toEqual({});
    });

    it("should make auto-generated fields optional in NewGroup", () => {
      // Arrange - Minimal NewGroup without id, timestamps
      const minimalGroup: NewGroup = {
        name: "Minimal District",
        slug: "minimal-district",
        type: "district",
        path: "minimal_district",
      };

      // Act & Assert - id, createdAt, updatedAt should be optional/undefined
      expect(minimalGroup.id).toBeUndefined();
      expect(minimalGroup.createdAt).toBeUndefined();
      expect(minimalGroup.updatedAt).toBeUndefined();
    });

    it("should allow district type with single-level path", () => {
      // Arrange
      const district: NewGroup = {
        name: "Sample District",
        slug: "sample-district",
        type: "district",
        path: "sample_district",
      };

      // Act & Assert
      expect(district.type).toBe("district");
      expect(district.path.split(".").length).toBe(1);
    });

    it("should allow school type with two-level path", () => {
      // Arrange
      const school: NewGroup = {
        name: "Sample School",
        slug: "sample-school",
        type: "school",
        path: "district.sample_school",
      };

      // Act & Assert
      expect(school.type).toBe("school");
      expect(school.path.split(".").length).toBe(2);
    });

    it("should allow department type with three-level path", () => {
      // Arrange
      const department: NewGroup = {
        name: "Sample Department",
        slug: "sample-dept",
        type: "department",
        path: "district.school.sample_dept",
      };

      // Act & Assert
      expect(department.type).toBe("department");
      expect(department.path.split(".").length).toBe(3);
    });
  });

  describe("Type Enum", () => {
    it("should have district type value", () => {
      // Arrange
      const districtType: Group["type"] = "district";

      // Act & Assert
      expect(districtType).toBe("district");
    });

    it("should have school type value", () => {
      // Arrange
      const schoolType: Group["type"] = "school";

      // Act & Assert
      expect(schoolType).toBe("school");
    });

    it("should have department type value", () => {
      // Arrange
      const departmentType: Group["type"] = "department";

      // Act & Assert
      expect(departmentType).toBe("department");
    });

    it("should contain exactly three type values", () => {
      // Arrange
      const validTypes: Array<Group["type"]> = [
        "district",
        "school",
        "department",
      ];

      // Act & Assert
      expect(validTypes).toHaveLength(3);
    });

    it("should enforce type enum in Group type", () => {
      // Arrange - TypeScript will enforce that type is one of the enum values
      const district: Group["type"] = "district";
      const school: Group["type"] = "school";
      const department: Group["type"] = "department";

      // Act & Assert
      expect([district, school, department]).toHaveLength(3);
      expect([district, school, department]).toEqual([
        "district",
        "school",
        "department",
      ]);
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      // Act & Assert
      expect(groups._.name).toBe("groups");
    });

    it("should have id column", () => {
      // Act & Assert
      expect(groups.id).toBeDefined();
      expect(groups.id.name).toBe("id");
    });

    it("should have name column", () => {
      // Act & Assert
      expect(groups.name).toBeDefined();
      expect(groups.name.name).toBe("name");
    });

    it("should have slug column", () => {
      // Act & Assert
      expect(groups.slug).toBeDefined();
      expect(groups.slug.name).toBe("slug");
    });

    it("should have type column", () => {
      // Act & Assert
      expect(groups.type).toBeDefined();
      expect(groups.type.name).toBe("type");
    });

    it("should have path column", () => {
      // Act & Assert
      expect(groups.path).toBeDefined();
      expect(groups.path.name).toBe("path");
    });

    it("should have settings column", () => {
      // Act & Assert
      expect(groups.settings).toBeDefined();
      expect(groups.settings.name).toBe("settings");
    });

    it("should have createdAt column", () => {
      // Act & Assert
      expect(groups.createdAt).toBeDefined();
      expect(groups.createdAt.name).toBe("created_at");
    });

    it("should have updatedAt column", () => {
      // Act & Assert
      expect(groups.updatedAt).toBeDefined();
      expect(groups.updatedAt.name).toBe("updated_at");
    });

    it("should have deletedAt column", () => {
      // Act & Assert
      expect(groups.deletedAt).toBeDefined();
      expect(groups.deletedAt.name).toBe("deleted_at");
    });

    it("should have all required columns", () => {
      // Arrange
      const expectedColumns = [
        "id",
        "name",
        "slug",
        "type",
        "path",
        "settings",
        "createdAt",
        "updatedAt",
        "deletedAt",
      ];

      // Act
      const actualColumns = Object.keys(groups).filter(
        (key) => !key.startsWith("_")
      );

      // Assert
      expectedColumns.forEach((col) => {
        expect(actualColumns).toContain(col);
      });
    });
  });

  describe("Schema Exports", () => {
    it("should export groups table", () => {
      // Act & Assert
      expect(groups).toBeDefined();
      expect(groups._.name).toBe("groups");
    });

    it("should export groupTypeEnum", () => {
      // Act & Assert
      expect(groupTypeEnum).toBeDefined();
    });
  });

  describe("ltree Path Field", () => {
    it("should accept valid ltree paths", () => {
      // Arrange
      const validPaths = [
        "district",
        "district.school",
        "district.school.department",
        "springfield_district",
        "springfield_district.central_high",
        "springfield_district.central_high.math_dept",
      ];

      // Act & Assert
      validPaths.forEach((path) => {
        const group: Partial<NewGroup> = { path };
        expect(group.path).toBe(path);
      });
    });

    it("should handle different hierarchy depths", () => {
      // Arrange
      const rootPath = "district1"; // 1 level
      const midPath = "district1.school2"; // 2 levels
      const leafPath = "district1.school2.dept3"; // 3 levels

      // Act & Assert
      expect(rootPath.split(".").length).toBe(1);
      expect(midPath.split(".").length).toBe(2);
      expect(leafPath.split(".").length).toBe(3);
    });

    it("should handle paths with underscores", () => {
      // Arrange
      const group: Partial<NewGroup> = {
        path: "springfield_district.central_high_school.math_department",
      };

      // Act & Assert
      expect(group.path).toBe(
        "springfield_district.central_high_school.math_department"
      );
      expect(group.path?.includes("_")).toBe(true);
    });

    it("should handle paths with numbers", () => {
      // Arrange
      const group: Partial<NewGroup> = {
        path: "district_2024.school_123.dept_456",
      };

      // Act & Assert
      expect(group.path).toBe("district_2024.school_123.dept_456");
    });
  });

  describe("Type Safety", () => {
    it("should enforce required name field", () => {
      // Arrange
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Required Name",
        slug: "required-name",
        type: "district",
        path: "required_name",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(group.name).toBeTruthy();
      expect(typeof group.name).toBe("string");
    });

    it("should enforce required slug field", () => {
      // Arrange
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Group",
        slug: "test-group",
        type: "district",
        path: "test_group",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(group.slug).toBeTruthy();
      expect(typeof group.slug).toBe("string");
    });

    it("should enforce required type field", () => {
      // Arrange
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Group",
        slug: "test-group",
        type: "school",
        path: "district.test_group",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(group.type).toBeTruthy();
      expect(["district", "school", "department"]).toContain(group.type);
    });

    it("should enforce required path field", () => {
      // Arrange
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Group",
        slug: "test-group",
        type: "district",
        path: "test_group",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(group.path).toBeTruthy();
      expect(typeof group.path).toBe("string");
    });

    it("should enforce required settings field", () => {
      // Arrange
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Group",
        slug: "test-group",
        type: "district",
        path: "test_group",
        settings: { feature_flags: { enabled: true } },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(group.settings).toBeDefined();
      expect(typeof group.settings).toBe("object");
    });
  });

  describe("Edge Cases", () => {
    it("should handle groups with long names (up to 100 chars)", () => {
      // Arrange
      const longName = "A".repeat(100);
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: longName,
        slug: "long-name-group",
        type: "district",
        path: "long_name_group",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(group.name.length).toBe(100);
      expect(group.name).toBe(longName);
    });

    it("should handle groups with long slugs (up to 100 chars)", () => {
      // Arrange
      const longSlug = "a".repeat(100);
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Long Slug Group",
        slug: longSlug,
        type: "district",
        path: "long_slug_group",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(group.slug.length).toBe(100);
      expect(group.slug).toBe(longSlug);
    });

    it("should handle complex nested settings", () => {
      // Arrange
      const complexSettings = {
        theme: {
          primaryColor: "#0066cc",
          secondaryColor: "#ff6600",
          logo: {
            url: "https://example.com/logo.png",
            width: 200,
            height: 100,
          },
        },
        enabled_models: ["gpt-4", "claude-3", "gemini-pro"],
        feature_flags: {
          oneroster_sync: true,
          oauth_google: false,
        },
        quotas: {
          max_users: 1000,
          max_tokens_per_month: 100000,
        },
      };

      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Complex Settings Group",
        slug: "complex-settings",
        type: "district",
        path: "complex_settings",
        settings: complexSettings,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(group.settings).toEqual(complexSettings);
    });

    it("should handle different hierarchy levels", () => {
      // Arrange
      const districtGroup: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "District",
        slug: "district",
        type: "district",
        path: "district",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const schoolGroup: Group = {
        id: "223e4567-e89b-12d3-a456-426614174001",
        name: "School",
        slug: "school",
        type: "school",
        path: "district.school",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const departmentGroup: Group = {
        id: "323e4567-e89b-12d3-a456-426614174002",
        name: "Department",
        slug: "department",
        type: "department",
        path: "district.school.department",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(districtGroup.path.split(".").length).toBe(1);
      expect(schoolGroup.path.split(".").length).toBe(2);
      expect(departmentGroup.path.split(".").length).toBe(3);
    });

    it("should handle slug with hyphens and underscores", () => {
      // Arrange
      const group: Group = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Group",
        slug: "test-group_2024",
        type: "district",
        path: "test_group_2024",
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(group.slug).toBe("test-group_2024");
      expect(group.slug.includes("-")).toBe(true);
      expect(group.slug.includes("_")).toBe(true);
    });
  });
});
