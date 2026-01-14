import { describe, it, expect } from "vitest";
import { ZodError } from "zod";

import {
  groupBaseSchema,
  createGroupSchema,
  updateGroupSchema,
  type Group,
  type CreateGroup,
  type UpdateGroup
} from "../../schemas/group.schema.js";
import {
  createMockGroup,
  createMockCreateGroup,
  invalidGroupData
} from "../factories.js";

describe("Group Schemas", () => {
  describe("groupBaseSchema", () => {
    it("should validate valid group data", () => {
      // Arrange
      const validGroup = createMockGroup();

      // Act
      const result = groupBaseSchema.parse(validGroup);

      // Assert
      expect(result).toEqual(validGroup);
      expect(result.name).toBe("Test Group");
      expect(result.parentId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.settings).toEqual({});
    });

    it("should accept group with no parentId", () => {
      // Arrange
      const groupData = createMockGroup({ parentId: undefined });

      // Act & Assert
      expect(() => groupBaseSchema.parse(groupData)).not.toThrow();
    });

    it("should default empty object for settings when not provided", () => {
      // Arrange
      const groupData = {
        name: "Test Group",
        parentId: "550e8400-e29b-41d4-a716-446655440000"
        // settings omitted
      };

      // Act
      const result = groupBaseSchema.parse(groupData);

      // Assert
      expect(result.settings).toEqual({});
    });

    it("should accept custom settings object", () => {
      // Arrange
      const customSettings = { theme: "dark", notifications: true };
      const groupData = createMockGroup({ settings: customSettings });

      // Act
      const result = groupBaseSchema.parse(groupData);

      // Assert
      expect(result.settings).toEqual(customSettings);
    });

    it("should accept name at minimum length (1 character)", () => {
      // Arrange
      const groupData = createMockGroup({ name: "A" });

      // Act & Assert
      expect(() => groupBaseSchema.parse(groupData)).not.toThrow();
    });

    it("should accept name at maximum length (100 characters)", () => {
      // Arrange
      const groupData = createMockGroup({ name: "a".repeat(100) });

      // Act & Assert
      expect(() => groupBaseSchema.parse(groupData)).not.toThrow();
    });

    it("should accept valid UUID formats for parentId", () => {
      // Arrange
      const validUuids = [
        "550e8400-e29b-41d4-a716-446655440000", // standard
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8", // different format
        "12345678-1234-5678-1234-123456789012", // numeric
      ];

      for (const uuid of validUuids) {
        const groupData = createMockGroup({ parentId: uuid });

        // Act & Assert
        expect(() => groupBaseSchema.parse(groupData)).not.toThrow();
      }
    });

    it("should fail validation when name is missing", () => {
      // Arrange
      const invalidData = invalidGroupData.missingName;

      // Act & Assert
      expect(() => groupBaseSchema.parse(invalidData)).toThrow(ZodError);
    });

    it("should fail validation when name is empty", () => {
      // Arrange
      const invalidData = invalidGroupData.emptyName;

      // Act & Assert
      expect(() => groupBaseSchema.parse(invalidData)).toThrow(ZodError);
    });

    it("should fail validation when name exceeds 100 characters", () => {
      // Arrange
      const invalidData = invalidGroupData.nameTooLong;

      // Act & Assert
      expect(() => groupBaseSchema.parse(invalidData)).toThrow(ZodError);
    });

    it("should fail validation when parentId is not a valid UUID", () => {
      // Arrange
      const invalidData = invalidGroupData.invalidParentId;

      // Act & Assert
      expect(() => groupBaseSchema.parse(invalidData)).toThrow(ZodError);
    });

    it("should provide detailed error messages for validation failures", () => {
      // Arrange
      const invalidData = {
        name: "",
        parentId: "not-a-uuid",
        settings: {}
      };

      // Act & Assert
      try {
        groupBaseSchema.parse(invalidData);
        expect.fail("Should have thrown ZodError");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.errors).toHaveLength(2); // Both name and parentId errors

        const nameError = zodError.errors.find(e => e.path[0] === "name");
        const parentIdError = zodError.errors.find(e => e.path[0] === "parentId");

        expect(nameError).toBeDefined();
        expect(nameError?.message).toContain("at least 1");
        expect(parentIdError).toBeDefined();
        expect(parentIdError?.message).toContain("uuid");
      }
    });

    it("should accept complex nested settings objects", () => {
      // Arrange
      const complexSettings = {
        ui: { theme: "dark", lang: "en" },
        features: { oauth: true, sso: false },
        limits: { maxUsers: 100 },
        nested: { deep: { value: "test" } }
      };
      const groupData = createMockGroup({ settings: complexSettings });

      // Act & Assert
      expect(() => groupBaseSchema.parse(groupData)).not.toThrow();

      const result = groupBaseSchema.parse(groupData);
      expect(result.settings).toEqual(complexSettings);
    });
  });

  describe("createGroupSchema", () => {
    it("should be identical to groupBaseSchema", () => {
      // Arrange
      const groupData = createMockCreateGroup();

      // Act
      const baseResult = groupBaseSchema.parse(groupData);
      const createResult = createGroupSchema.parse(groupData);

      // Assert
      expect(createResult).toEqual(baseResult);
    });

    it("should require name field", () => {
      // Arrange
      const incompleteData = { settings: {} }; // Missing name

      // Act & Assert
      expect(() => createGroupSchema.parse(incompleteData)).toThrow(ZodError);
    });

    it("should allow optional parentId", () => {
      // Arrange
      const dataWithoutParent = { name: "Root Group", settings: {} };

      // Act & Assert
      expect(() => createGroupSchema.parse(dataWithoutParent)).not.toThrow();
    });
  });

  describe("updateGroupSchema", () => {
    it("should accept partial data (all fields optional)", () => {
      // Arrange
      const partialData = { name: "Updated Group Name" };

      // Act
      const result = updateGroupSchema.parse(partialData);

      // Assert
      expect(result).toEqual(partialData);
    });

    it("should accept empty object (all fields optional)", () => {
      // Arrange
      const emptyData = {};

      // Act & Assert
      expect(() => updateGroupSchema.parse(emptyData)).not.toThrow();
    });

    it("should validate individual fields when present", () => {
      // Arrange
      const invalidPartial = { name: "" }; // Empty name

      // Act & Assert
      expect(() => updateGroupSchema.parse(invalidPartial)).toThrow(ZodError);
    });

    it("should accept only name update", () => {
      // Arrange
      const nameOnly = { name: "New Group Name" };

      // Act & Assert
      expect(() => updateGroupSchema.parse(nameOnly)).not.toThrow();
    });

    it("should accept only parentId update", () => {
      // Arrange
      const parentIdOnly = { parentId: "550e8400-e29b-41d4-a716-446655440000" };

      // Act & Assert
      expect(() => updateGroupSchema.parse(parentIdOnly)).not.toThrow();
    });

    it("should accept only settings update", () => {
      // Arrange
      const settingsOnly = { settings: { theme: "light" } };

      // Act & Assert
      expect(() => updateGroupSchema.parse(settingsOnly)).not.toThrow();
    });

    it("should fail when parentId is invalid UUID", () => {
      // Arrange
      const invalidParentId = { parentId: "not-a-uuid" };

      // Act & Assert
      expect(() => updateGroupSchema.parse(invalidParentId)).toThrow(ZodError);
    });
  });

  describe("TypeScript type inference", () => {
    it("should infer correct Group type from groupBaseSchema", () => {
      // This is a compile-time test - if it compiles, the types are correct
      const group: Group = {
        name: "Test Group",
        parentId: "550e8400-e29b-41d4-a716-446655440000",
        settings: { theme: "dark" },
      };

      expect(group.name).toBe("Test Group");
      expect(group.parentId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(group.settings).toEqual({ theme: "dark" });
    });

    it("should infer correct CreateGroup type from createGroupSchema", () => {
      // This is a compile-time test - if it compiles, the types are correct
      const createGroup: CreateGroup = {
        name: "New Group",
        // parentId is optional
        settings: {},
      };

      expect(createGroup.name).toBe("New Group");
      expect(createGroup.parentId).toBeUndefined();
      expect(createGroup.settings).toEqual({});
    });

    it("should infer correct UpdateGroup type from updateGroupSchema", () => {
      // This is a compile-time test - if it compiles, the types are correct
      const updateGroup: UpdateGroup = {
        name: "Updated Group",
        // parentId and settings are optional
      };

      expect(updateGroup.name).toBe("Updated Group");
      expect(updateGroup.parentId).toBeUndefined();
      expect(updateGroup.settings).toBeUndefined();
    });

    it("should allow undefined parentId in Group type", () => {
      // This is a compile-time test - if it compiles, the types are correct
      const groupWithoutParent: Group = {
        name: "Root Group",
        settings: {},
        // parentId is optional and can be undefined
      };

      expect(groupWithoutParent.parentId).toBeUndefined();
    });
  });
});