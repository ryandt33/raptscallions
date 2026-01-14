import { describe, it, expect } from "vitest";
import { z } from "zod";

import {
  groupBaseSchema,
  createGroupSchema,
  updateGroupSchema,
} from "../../schemas/group.schema.js";
import {
  userBaseSchema,
  createUserSchema,
  updateUserSchema,
} from "../../schemas/user.schema.js";
import { createMockUser, createMockGroup } from "../factories.js";

describe("Schema Composition Integration", () => {
  describe("Base schema extension patterns", () => {
    it("should demonstrate schema composition with extend()", () => {
      // Arrange - extend user schema with additional fields
      const userWithMetadata = userBaseSchema.extend({
        createdAt: z.date(),
        updatedAt: z.date(),
        isActive: z.boolean().default(true),
      });

      const userData = {
        ...createMockUser(),
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
      };

      // Act
      const result = userWithMetadata.parse(userData);

      // Assert
      expect(result.email).toBe("test@example.com");
      expect(result.name).toBe("Test User");
      expect(result.createdAt).toEqual(new Date("2023-01-01"));
      expect(result.updatedAt).toEqual(new Date("2023-01-02"));
      expect(result.isActive).toBe(true); // default value
    });

    it("should demonstrate schema composition with merge()", () => {
      // Arrange - merge user and group schemas for user-group relationships
      const timestampSchema = z.object({
        createdAt: z.date(),
        updatedAt: z.date().optional(),
      });

      const userWithTimestamps = userBaseSchema.merge(timestampSchema);
      const groupWithTimestamps = groupBaseSchema.merge(timestampSchema);

      const userData = {
        ...createMockUser(),
        createdAt: new Date(),
      };

      const groupData = {
        ...createMockGroup(),
        createdAt: new Date(),
      };

      // Act & Assert
      expect(() => userWithTimestamps.parse(userData)).not.toThrow();
      expect(() => groupWithTimestamps.parse(groupData)).not.toThrow();

      const userResult = userWithTimestamps.parse(userData);
      const groupResult = groupWithTimestamps.parse(groupData);

      expect(userResult.createdAt).toBeInstanceOf(Date);
      expect(groupResult.createdAt).toBeInstanceOf(Date);
    });

    it("should compose complex nested schemas", () => {
      // Arrange - create a schema for user with groups
      const userWithGroups = userBaseSchema.extend({
        groups: z.array(groupBaseSchema),
        primaryGroupId: z.string().uuid().optional(),
      });

      const userData = {
        ...createMockUser(),
        groups: [
          createMockGroup({ name: "Group 1" }),
          createMockGroup({ name: "Group 2" }),
        ],
        primaryGroupId: "550e8400-e29b-41d4-a716-446655440000",
      };

      // Act
      const result = userWithGroups.parse(userData);

      // Assert
      expect(result.groups).toHaveLength(2);
      expect(result.groups[0]!.name).toBe("Group 1");
      expect(result.groups[1]!.name).toBe("Group 2");
      expect(result.primaryGroupId).toBe("550e8400-e29b-41d4-a716-446655440000");
    });
  });

  describe("Create/Update schema relationships", () => {
    it("should ensure update schemas are proper partials of base schemas", () => {
      // Arrange
      const fullUser = createMockUser();
      const fullGroup = createMockGroup();

      // Act - partial updates should work
      const partialUserUpdate = { name: "Updated Name" };
      const partialGroupUpdate = { settings: { theme: "dark" } };

      // Assert
      expect(() => updateUserSchema.parse(partialUserUpdate)).not.toThrow();
      expect(() => updateGroupSchema.parse(partialGroupUpdate)).not.toThrow();

      // Full objects should also work with update schemas
      expect(() => updateUserSchema.parse(fullUser)).not.toThrow();
      expect(() => updateGroupSchema.parse(fullGroup)).not.toThrow();
    });

    it("should ensure create schemas match base schemas", () => {
      // Arrange
      const userData = createMockUser();
      const groupData = createMockGroup();

      // Act & Assert - create schemas should accept same data as base
      expect(createUserSchema.parse(userData)).toEqual(userBaseSchema.parse(userData));
      expect(createGroupSchema.parse(groupData)).toEqual(groupBaseSchema.parse(groupData));
    });

    it("should maintain validation rules across create/update schemas", () => {
      // Arrange
      const invalidEmail = "not-an-email";
      const invalidUuid = "not-a-uuid";

      // Act & Assert - validation should work consistently
      expect(() => createUserSchema.parse({ email: invalidEmail, name: "Test" })).toThrow();
      expect(() => updateUserSchema.parse({ email: invalidEmail })).toThrow();

      expect(() => createGroupSchema.parse({ name: "Test", parentId: invalidUuid })).toThrow();
      expect(() => updateGroupSchema.parse({ parentId: invalidUuid })).toThrow();
    });
  });

  describe("Cross-schema validation patterns", () => {
    it("should validate relationships between schemas", () => {
      // Arrange - schema for group membership
      const groupMemberSchema = z.object({
        userId: z.string().uuid(),
        groupId: z.string().uuid(),
        role: z.enum(["member", "admin", "owner"]),
        joinedAt: z.date(),
      });

      const membershipData = {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        groupId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        role: "member" as const,
        joinedAt: new Date(),
      };

      // Act & Assert
      expect(() => groupMemberSchema.parse(membershipData)).not.toThrow();

      const result = groupMemberSchema.parse(membershipData);
      expect(result.role).toBe("member");
    });

    it("should support discriminated unions with base schemas", () => {
      // Arrange - event schema that can reference users or groups
      const entityEventSchema = z.discriminatedUnion("entityType", [
        z.object({
          entityType: z.literal("user"),
          entityId: z.string().uuid(),
          entityData: userBaseSchema,
        }),
        z.object({
          entityType: z.literal("group"),
          entityId: z.string().uuid(),
          entityData: groupBaseSchema,
        }),
      ]);

      const userEvent = {
        entityType: "user" as const,
        entityId: "550e8400-e29b-41d4-a716-446655440000",
        entityData: createMockUser(),
      };

      const groupEvent = {
        entityType: "group" as const,
        entityId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        entityData: createMockGroup(),
      };

      // Act & Assert
      expect(() => entityEventSchema.parse(userEvent)).not.toThrow();
      expect(() => entityEventSchema.parse(groupEvent)).not.toThrow();

      const parsedUserEvent = entityEventSchema.parse(userEvent);
      const parsedGroupEvent = entityEventSchema.parse(groupEvent);

      expect(parsedUserEvent.entityType).toBe("user");
      expect(parsedGroupEvent.entityType).toBe("group");
    });
  });

  describe("Schema transformation and preprocessing", () => {
    it("should support preprocessing in composed schemas", () => {
      // Arrange - schema with preprocessing
      const userWithPreprocessing = userBaseSchema
        .extend({
          email: z.string().email().transform(email => email.toLowerCase()),
          name: z.string().transform(name => name.trim()),
        });

      const userData = {
        email: "TEST@EXAMPLE.COM",
        name: "  Test User  ",
      };

      // Act
      const result = userWithPreprocessing.parse(userData);

      // Assert
      expect(result.email).toBe("test@example.com"); // toLowerCase applied
      expect(result.name).toBe("Test User"); // trim applied
    });

    it("should support refinements in composed schemas", () => {
      // Arrange - schema with custom refinement
      const userWithAgeValidation = userBaseSchema.extend({
        age: z.number().int().positive(),
      }).refine(
        (data) => {
          // Custom business rule: if email contains "admin", age must be >= 21
          if (data.email.includes("admin") && data.age < 21) {
            return false;
          }
          return true;
        },
        {
          message: "Admin users must be at least 21 years old",
          path: ["age"],
        }
      );

      const regularUser = {
        ...createMockUser({ email: "user@example.com" }),
        age: 18,
      };

      const youngAdmin = {
        ...createMockUser({ email: "admin@example.com" }),
        age: 18,
      };

      const oldAdmin = {
        ...createMockUser({ email: "admin@example.com" }),
        age: 25,
      };

      // Act & Assert
      expect(() => userWithAgeValidation.parse(regularUser)).not.toThrow();
      expect(() => userWithAgeValidation.parse(youngAdmin)).toThrow();
      expect(() => userWithAgeValidation.parse(oldAdmin)).not.toThrow();
    });
  });

  describe("Type inference with composed schemas", () => {
    it("should maintain correct type inference with schema composition", () => {
      // Arrange - composed schema
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used in typeof for type inference
      const userWithProfile = userBaseSchema.extend({
        profile: z.object({
          bio: z.string().optional(),
          avatar: z.string().url().optional(),
          preferences: z.record(z.string(), z.unknown()).default({}),
        }).optional(),
      });

      type _UserWithProfile = z.infer<typeof userWithProfile>;

      // Act - this is a compile-time test
      const user: _UserWithProfile = {
        email: "test@example.com",
        name: "Test User",
        profile: {
          bio: "Developer",
          avatar: "https://example.com/avatar.jpg",
          preferences: { theme: "dark" },
        },
      };

      // Assert - if this compiles, types are correct
      expect(user.email).toBe("test@example.com");
      expect(user.profile?.bio).toBe("Developer");
      expect(user.profile?.preferences).toEqual({ theme: "dark" });
    });
  });
});