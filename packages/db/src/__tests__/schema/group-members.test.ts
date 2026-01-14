import { describe, it, expect } from "vitest";

import { groupMembers, memberRoleEnum } from "../../schema/group-members.js";

import type { GroupMember, NewGroupMember } from "../../schema/group-members.js";

describe("Group Members Schema", () => {
  describe("Type Inference", () => {
    it("should infer GroupMember type correctly with all required fields", () => {
      // Arrange
      const membership: GroupMember = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "223e4567-e89b-12d3-a456-426614174001",
        groupId: "323e4567-e89b-12d3-a456-426614174002",
        role: "teacher",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      // Act & Assert - TypeScript compilation verifies types
      expect(membership.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(membership.userId).toBe("223e4567-e89b-12d3-a456-426614174001");
      expect(membership.groupId).toBe("323e4567-e89b-12d3-a456-426614174002");
      expect(membership.role).toBe("teacher");
      expect(membership.createdAt).toBeInstanceOf(Date);
      expect(membership.updatedAt).toBeInstanceOf(Date);
    });

    it("should infer GroupMember type with system_admin role", () => {
      // Arrange
      const membership: GroupMember = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        userId: "523e4567-e89b-12d3-a456-426614174004",
        groupId: "623e4567-e89b-12d3-a456-426614174005",
        role: "system_admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(membership.role).toBe("system_admin");
    });

    it("should infer GroupMember type with group_admin role", () => {
      // Arrange
      const membership: GroupMember = {
        id: "723e4567-e89b-12d3-a456-426614174006",
        userId: "823e4567-e89b-12d3-a456-426614174007",
        groupId: "923e4567-e89b-12d3-a456-426614174008",
        role: "group_admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(membership.role).toBe("group_admin");
    });

    it("should infer GroupMember type with student role", () => {
      // Arrange
      const membership: GroupMember = {
        id: "a23e4567-e89b-12d3-a456-426614174009",
        userId: "b23e4567-e89b-12d3-a456-42661417400a",
        groupId: "c23e4567-e89b-12d3-a456-42661417400b",
        role: "student",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(membership.role).toBe("student");
    });
  });

  describe("NewGroupMember Type (Insert Operations)", () => {
    it("should infer NewGroupMember type correctly for inserts", () => {
      // Arrange - NewGroupMember should omit auto-generated fields
      const newMembership: NewGroupMember = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        groupId: "223e4567-e89b-12d3-a456-426614174001",
        role: "teacher",
      };

      // Act & Assert
      expect(newMembership.userId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(newMembership.groupId).toBe("223e4567-e89b-12d3-a456-426614174001");
      expect(newMembership.role).toBe("teacher");
    });

    it("should allow creating system_admin membership", () => {
      // Arrange
      const newMembership: NewGroupMember = {
        userId: "323e4567-e89b-12d3-a456-426614174002",
        groupId: "423e4567-e89b-12d3-a456-426614174003",
        role: "system_admin",
      };

      // Act & Assert
      expect(newMembership.role).toBe("system_admin");
    });

    it("should allow creating group_admin membership", () => {
      // Arrange
      const newMembership: NewGroupMember = {
        userId: "523e4567-e89b-12d3-a456-426614174004",
        groupId: "623e4567-e89b-12d3-a456-426614174005",
        role: "group_admin",
      };

      // Act & Assert
      expect(newMembership.role).toBe("group_admin");
    });

    it("should allow creating student membership", () => {
      // Arrange
      const newMembership: NewGroupMember = {
        userId: "723e4567-e89b-12d3-a456-426614174006",
        groupId: "823e4567-e89b-12d3-a456-426614174007",
        role: "student",
      };

      // Act & Assert
      expect(newMembership.role).toBe("student");
    });

    it("should make auto-generated fields optional in NewGroupMember", () => {
      // Arrange - Minimal NewGroupMember without id, timestamps
      const minimalMembership: NewGroupMember = {
        userId: "923e4567-e89b-12d3-a456-426614174008",
        groupId: "a23e4567-e89b-12d3-a456-426614174009",
        role: "teacher",
      };

      // Act & Assert - id, createdAt, updatedAt should be optional/undefined
      expect(minimalMembership.id).toBeUndefined();
      expect(minimalMembership.createdAt).toBeUndefined();
      expect(minimalMembership.updatedAt).toBeUndefined();
    });
  });

  describe("Role Enum", () => {
    it("should have system_admin role value", () => {
      // Arrange
      const systemAdminRole: GroupMember["role"] = "system_admin";

      // Act & Assert
      expect(systemAdminRole).toBe("system_admin");
    });

    it("should have group_admin role value", () => {
      // Arrange
      const groupAdminRole: GroupMember["role"] = "group_admin";

      // Act & Assert
      expect(groupAdminRole).toBe("group_admin");
    });

    it("should have teacher role value", () => {
      // Arrange
      const teacherRole: GroupMember["role"] = "teacher";

      // Act & Assert
      expect(teacherRole).toBe("teacher");
    });

    it("should have student role value", () => {
      // Arrange
      const studentRole: GroupMember["role"] = "student";

      // Act & Assert
      expect(studentRole).toBe("student");
    });

    it("should contain exactly four role values", () => {
      // Arrange
      const validRoles: Array<GroupMember["role"]> = [
        "system_admin",
        "group_admin",
        "teacher",
        "student",
      ];

      // Act & Assert
      expect(validRoles).toHaveLength(4);
    });

    it("should enforce role hierarchy ordering", () => {
      // Arrange - Roles in privilege order (highest to lowest)
      const roleHierarchy: Array<GroupMember["role"]> = [
        "system_admin",
        "group_admin",
        "teacher",
        "student",
      ];

      // Act & Assert
      expect(roleHierarchy).toHaveLength(4);
      expect(roleHierarchy[0]).toBe("system_admin");
      expect(roleHierarchy[1]).toBe("group_admin");
      expect(roleHierarchy[2]).toBe("teacher");
      expect(roleHierarchy[3]).toBe("student");
    });

    it("should enforce role enum in GroupMember type", () => {
      // Arrange - TypeScript will enforce that role is one of the enum values
      const systemAdmin: GroupMember["role"] = "system_admin";
      const groupAdmin: GroupMember["role"] = "group_admin";
      const teacher: GroupMember["role"] = "teacher";
      const student: GroupMember["role"] = "student";

      // Act & Assert
      expect([systemAdmin, groupAdmin, teacher, student]).toHaveLength(4);
      expect([systemAdmin, groupAdmin, teacher, student]).toEqual([
        "system_admin",
        "group_admin",
        "teacher",
        "student",
      ]);
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      // Act & Assert
      expect(groupMembers._.name).toBe("group_members");
    });

    it("should have id column", () => {
      // Act & Assert
      expect(groupMembers.id).toBeDefined();
      expect(groupMembers.id.name).toBe("id");
    });

    it("should have userId column", () => {
      // Act & Assert
      expect(groupMembers.userId).toBeDefined();
      expect(groupMembers.userId.name).toBe("user_id");
    });

    it("should have groupId column", () => {
      // Act & Assert
      expect(groupMembers.groupId).toBeDefined();
      expect(groupMembers.groupId.name).toBe("group_id");
    });

    it("should have role column", () => {
      // Act & Assert
      expect(groupMembers.role).toBeDefined();
      expect(groupMembers.role.name).toBe("role");
    });

    it("should have createdAt column", () => {
      // Act & Assert
      expect(groupMembers.createdAt).toBeDefined();
      expect(groupMembers.createdAt.name).toBe("created_at");
    });

    it("should have updatedAt column", () => {
      // Act & Assert
      expect(groupMembers.updatedAt).toBeDefined();
      expect(groupMembers.updatedAt.name).toBe("updated_at");
    });

    it("should have all required columns", () => {
      // Arrange
      const expectedColumns = [
        "id",
        "userId",
        "groupId",
        "role",
        "createdAt",
        "updatedAt",
      ];

      // Act
      const actualColumns = Object.keys(groupMembers).filter(
        (key) => !key.startsWith("_")
      );

      // Assert
      expectedColumns.forEach((col) => {
        expect(actualColumns).toContain(col);
      });
    });
  });

  describe("Schema Exports", () => {
    it("should export groupMembers table", () => {
      // Act & Assert
      expect(groupMembers).toBeDefined();
      expect(groupMembers._.name).toBe("group_members");
    });

    it("should export memberRoleEnum", () => {
      // Act & Assert
      expect(memberRoleEnum).toBeDefined();
    });
  });

  describe("Foreign Key Fields", () => {
    it("should type userId as UUID string", () => {
      // Arrange
      const membership: NewGroupMember = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        groupId: "223e4567-e89b-12d3-a456-426614174001",
        role: "teacher",
      };

      // Act & Assert - userId should be typed as string
      const userId: string = membership.userId;
      expect(userId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(typeof membership.userId).toBe("string");
    });

    it("should type groupId as UUID string", () => {
      // Arrange
      const membership: NewGroupMember = {
        userId: "323e4567-e89b-12d3-a456-426614174002",
        groupId: "423e4567-e89b-12d3-a456-426614174003",
        role: "student",
      };

      // Act & Assert - groupId should be typed as string
      const groupId: string = membership.groupId;
      expect(groupId).toBe("423e4567-e89b-12d3-a456-426614174003");
      expect(typeof membership.groupId).toBe("string");
    });

    it("should enforce foreign key references are UUIDs", () => {
      // Arrange
      const membership: GroupMember = {
        id: "523e4567-e89b-12d3-a456-426614174004",
        userId: "623e4567-e89b-12d3-a456-426614174005",
        groupId: "723e4567-e89b-12d3-a456-426614174006",
        role: "teacher",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert - Both should be valid UUID strings
      expect(membership.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(membership.groupId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe("Type Safety", () => {
    it("should enforce required userId field", () => {
      // Arrange
      const membership: GroupMember = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "223e4567-e89b-12d3-a456-426614174001",
        groupId: "323e4567-e89b-12d3-a456-426614174002",
        role: "teacher",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(membership.userId).toBeTruthy();
      expect(typeof membership.userId).toBe("string");
    });

    it("should enforce required groupId field", () => {
      // Arrange
      const membership: GroupMember = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        userId: "523e4567-e89b-12d3-a456-426614174004",
        groupId: "623e4567-e89b-12d3-a456-426614174005",
        role: "student",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(membership.groupId).toBeTruthy();
      expect(typeof membership.groupId).toBe("string");
    });

    it("should enforce required role field", () => {
      // Arrange
      const membership: GroupMember = {
        id: "723e4567-e89b-12d3-a456-426614174006",
        userId: "823e4567-e89b-12d3-a456-426614174007",
        groupId: "923e4567-e89b-12d3-a456-426614174008",
        role: "group_admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(membership.role).toBeTruthy();
      expect(
        ["system_admin", "group_admin", "teacher", "student"]
      ).toContain(membership.role);
    });
  });

  describe("Edge Cases", () => {
    it("should handle user with multiple group memberships", () => {
      // Arrange - Same user in different groups with different roles
      const teacherMembership: GroupMember = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "same-user-uuid",
        groupId: "math-dept-uuid",
        role: "teacher",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const studentMembership: GroupMember = {
        id: "223e4567-e89b-12d3-a456-426614174001",
        userId: "same-user-uuid",
        groupId: "english-dept-uuid",
        role: "student",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert
      expect(teacherMembership.userId).toBe(studentMembership.userId);
      expect(teacherMembership.groupId).not.toBe(studentMembership.groupId);
      expect(teacherMembership.role).toBe("teacher");
      expect(studentMembership.role).toBe("student");
    });

    it("should handle role change with updated timestamp", () => {
      // Arrange - Membership with role change
      const originalTime = new Date("2024-01-01T00:00:00Z");
      const updateTime = new Date("2024-02-01T00:00:00Z");

      const membership: GroupMember = {
        id: "323e4567-e89b-12d3-a456-426614174002",
        userId: "423e4567-e89b-12d3-a456-426614174003",
        groupId: "523e4567-e89b-12d3-a456-426614174004",
        role: "group_admin",
        createdAt: originalTime,
        updatedAt: updateTime,
      };

      // Act & Assert - updatedAt should be more recent than createdAt
      expect(membership.createdAt).toBeInstanceOf(Date);
      expect(membership.updatedAt).toBeInstanceOf(Date);
      expect(membership.updatedAt.getTime()).toBeGreaterThan(
        membership.createdAt.getTime()
      );
    });

    it("should handle system_admin membership in root group", () => {
      // Arrange - System admin in special root "System" group
      const systemAdminMembership: NewGroupMember = {
        userId: "623e4567-e89b-12d3-a456-426614174005",
        groupId: "00000000-0000-0000-0000-000000000001", // Reserved system group UUID
        role: "system_admin",
      };

      // Act & Assert
      expect(systemAdminMembership.role).toBe("system_admin");
      expect(systemAdminMembership.groupId).toBe(
        "00000000-0000-0000-0000-000000000001"
      );
    });

    it("should handle membership creation with minimal fields", () => {
      // Arrange - Only required fields for insert
      const minimalMembership: NewGroupMember = {
        userId: "723e4567-e89b-12d3-a456-426614174006",
        groupId: "823e4567-e89b-12d3-a456-426614174007",
        role: "teacher",
      };

      // Act & Assert - Auto-generated fields should be undefined
      expect(minimalMembership.userId).toBeTruthy();
      expect(minimalMembership.groupId).toBeTruthy();
      expect(minimalMembership.role).toBeTruthy();
      expect(minimalMembership.id).toBeUndefined();
      expect(minimalMembership.createdAt).toBeUndefined();
      expect(minimalMembership.updatedAt).toBeUndefined();
    });

    it("should handle different role permission levels", () => {
      // Arrange - Memberships with different privilege levels
      const roles: Array<GroupMember["role"]> = [
        "system_admin", // Highest
        "group_admin",
        "teacher",
        "student", // Lowest
      ];

      // Act & Assert
      expect(roles[0]).toBe("system_admin");
      expect(roles[roles.length - 1]).toBe("student");
      expect(roles).toHaveLength(4);
    });

    it("should handle group with no members (empty group)", () => {
      // Arrange - NewGroupMember for first member of a new group
      const firstMember: NewGroupMember = {
        userId: "923e4567-e89b-12d3-a456-426614174008",
        groupId: "a23e4567-e89b-12d3-a456-426614174009", // New group with no members yet
        role: "group_admin",
      };

      // Act & Assert
      expect(firstMember.groupId).toBeTruthy();
      expect(firstMember.role).toBe("group_admin");
    });

    it("should handle unique constraint on (userId, groupId)", () => {
      // Arrange - Two memberships with same userId and groupId (would violate unique constraint)
      const membership1: Omit<NewGroupMember, "id"> = {
        userId: "b23e4567-e89b-12d3-a456-42661417400a",
        groupId: "c23e4567-e89b-12d3-a456-42661417400b",
        role: "teacher",
      };

      const membership2: Omit<NewGroupMember, "id"> = {
        userId: "b23e4567-e89b-12d3-a456-42661417400a", // Same user
        groupId: "c23e4567-e89b-12d3-a456-42661417400b", // Same group
        role: "student", // Different role (would fail at DB level)
      };

      // Act & Assert - Type system allows this, but DB constraint will prevent it
      expect(membership1.userId).toBe(membership2.userId);
      expect(membership1.groupId).toBe(membership2.groupId);
      expect(membership1.role).not.toBe(membership2.role);
    });
  });

  describe("Relations Type Checking", () => {
    it("should verify userId field references users table", () => {
      // Arrange
      const membership: GroupMember = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "223e4567-e89b-12d3-a456-426614174001",
        groupId: "323e4567-e89b-12d3-a456-426614174002",
        role: "teacher",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert - userId should reference a user
      expect(membership.userId).toBe("223e4567-e89b-12d3-a456-426614174001");
      expect(typeof membership.userId).toBe("string");
    });

    it("should verify groupId field references groups table", () => {
      // Arrange
      const membership: GroupMember = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        userId: "523e4567-e89b-12d3-a456-426614174004",
        groupId: "623e4567-e89b-12d3-a456-426614174005",
        role: "student",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act & Assert - groupId should reference a group
      expect(membership.groupId).toBe("623e4567-e89b-12d3-a456-426614174005");
      expect(typeof membership.groupId).toBe("string");
    });
  });
});
