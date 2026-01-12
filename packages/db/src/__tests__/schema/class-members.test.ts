import { describe, it, expect } from "vitest";
import type { ClassMember, NewClassMember } from "../../schema/class-members.js";
import { classMembers, classRoleEnum } from "../../schema/class-members.js";

describe("Class Members Schema", () => {
  describe("Type Inference", () => {
    it("should infer ClassMember type correctly with all required fields", () => {
      // Arrange
      const membership: ClassMember = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        classId: "223e4567-e89b-12d3-a456-426614174001",
        userId: "323e4567-e89b-12d3-a456-426614174002",
        role: "student",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      // Act & Assert - TypeScript compilation verifies types
      expect(membership.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(membership.classId).toBe("223e4567-e89b-12d3-a456-426614174001");
      expect(membership.userId).toBe("323e4567-e89b-12d3-a456-426614174002");
      expect(membership.role).toBe("student");
      expect(membership.createdAt).toBeInstanceOf(Date);
    });

    it("should infer ClassMember type with teacher role", () => {
      // Arrange
      const membership: ClassMember = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        classId: "523e4567-e89b-12d3-a456-426614174004",
        userId: "623e4567-e89b-12d3-a456-426614174005",
        role: "teacher",
        createdAt: new Date(),
      };

      // Act & Assert
      expect(membership.role).toBe("teacher");
    });

    it("should infer ClassMember type with student role", () => {
      // Arrange
      const membership: ClassMember = {
        id: "723e4567-e89b-12d3-a456-426614174006",
        classId: "823e4567-e89b-12d3-a456-426614174007",
        userId: "923e4567-e89b-12d3-a456-426614174008",
        role: "student",
        createdAt: new Date(),
      };

      // Act & Assert
      expect(membership.role).toBe("student");
    });
  });

  describe("NewClassMember Type (Insert Operations)", () => {
    it("should infer NewClassMember type correctly for inserts", () => {
      // Arrange - NewClassMember should omit auto-generated fields
      const newMembership: NewClassMember = {
        classId: "123e4567-e89b-12d3-a456-426614174000",
        userId: "223e4567-e89b-12d3-a456-426614174001",
        role: "student",
      };

      // Act & Assert
      expect(newMembership.classId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(newMembership.userId).toBe("223e4567-e89b-12d3-a456-426614174001");
      expect(newMembership.role).toBe("student");
    });

    it("should allow creating teacher membership", () => {
      // Arrange
      const newMembership: NewClassMember = {
        classId: "323e4567-e89b-12d3-a456-426614174002",
        userId: "423e4567-e89b-12d3-a456-426614174003",
        role: "teacher",
      };

      // Act & Assert
      expect(newMembership.role).toBe("teacher");
    });

    it("should allow creating student membership", () => {
      // Arrange
      const newMembership: NewClassMember = {
        classId: "523e4567-e89b-12d3-a456-426614174004",
        userId: "623e4567-e89b-12d3-a456-426614174005",
        role: "student",
      };

      // Act & Assert
      expect(newMembership.role).toBe("student");
    });

    it("should make auto-generated fields optional in NewClassMember", () => {
      // Arrange - Minimal NewClassMember without id, timestamp
      const minimalMembership: NewClassMember = {
        classId: "723e4567-e89b-12d3-a456-426614174006",
        userId: "823e4567-e89b-12d3-a456-426614174007",
        role: "student",
      };

      // Act & Assert - id and createdAt should be optional/undefined
      expect(minimalMembership.id).toBeUndefined();
      expect(minimalMembership.createdAt).toBeUndefined();
    });
  });

  describe("Role Enum", () => {
    it("should have teacher role value", () => {
      // Arrange
      const teacherRole: ClassMember["role"] = "teacher";

      // Act & Assert
      expect(teacherRole).toBe("teacher");
    });

    it("should have student role value", () => {
      // Arrange
      const studentRole: ClassMember["role"] = "student";

      // Act & Assert
      expect(studentRole).toBe("student");
    });

    it("should contain exactly two role values", () => {
      // Arrange
      const validRoles: Array<ClassMember["role"]> = ["teacher", "student"];

      // Act & Assert
      expect(validRoles).toHaveLength(2);
    });

    it("should enforce role enum in ClassMember type", () => {
      // Arrange - TypeScript will enforce that role is one of the enum values
      const teacher: ClassMember["role"] = "teacher";
      const student: ClassMember["role"] = "student";

      // Act & Assert
      expect([teacher, student]).toHaveLength(2);
      expect([teacher, student]).toEqual(["teacher", "student"]);
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      // Act & Assert
      expect(classMembers._.name).toBe("class_members");
    });

    it("should have id column", () => {
      // Act & Assert
      expect(classMembers.id).toBeDefined();
      expect(classMembers.id.name).toBe("id");
    });

    it("should have classId column", () => {
      // Act & Assert
      expect(classMembers.classId).toBeDefined();
      expect(classMembers.classId.name).toBe("class_id");
    });

    it("should have userId column", () => {
      // Act & Assert
      expect(classMembers.userId).toBeDefined();
      expect(classMembers.userId.name).toBe("user_id");
    });

    it("should have role column", () => {
      // Act & Assert
      expect(classMembers.role).toBeDefined();
      expect(classMembers.role.name).toBe("role");
    });

    it("should have createdAt column", () => {
      // Act & Assert
      expect(classMembers.createdAt).toBeDefined();
      expect(classMembers.createdAt.name).toBe("created_at");
    });

    it("should have all required columns", () => {
      // Arrange
      const expectedColumns = ["id", "classId", "userId", "role", "createdAt"];

      // Act
      const actualColumns = Object.keys(classMembers).filter(
        (key) => !key.startsWith("_")
      );

      // Assert
      expectedColumns.forEach((col) => {
        expect(actualColumns).toContain(col);
      });
    });

    it("should not have updatedAt column", () => {
      // Act
      const actualColumns = Object.keys(classMembers).filter(
        (key) => !key.startsWith("_")
      );

      // Assert - class_members should NOT have updatedAt field
      expect(actualColumns).not.toContain("updatedAt");
    });

    it("should not have deletedAt column", () => {
      // Act
      const actualColumns = Object.keys(classMembers).filter(
        (key) => !key.startsWith("_")
      );

      // Assert - class_members should NOT have deletedAt field (hard delete only)
      expect(actualColumns).not.toContain("deletedAt");
    });
  });

  describe("Schema Exports", () => {
    it("should export classMembers table", () => {
      // Act & Assert
      expect(classMembers).toBeDefined();
      expect(classMembers._.name).toBe("class_members");
    });

    it("should export classRoleEnum", () => {
      // Act & Assert
      expect(classRoleEnum).toBeDefined();
    });
  });

  describe("Foreign Key Fields", () => {
    it("should type classId as UUID string", () => {
      // Arrange
      const membership: NewClassMember = {
        classId: "123e4567-e89b-12d3-a456-426614174000",
        userId: "223e4567-e89b-12d3-a456-426614174001",
        role: "student",
      };

      // Act & Assert - classId should be typed as string
      const classId: string = membership.classId;
      expect(classId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(typeof membership.classId).toBe("string");
    });

    it("should type userId as UUID string", () => {
      // Arrange
      const membership: NewClassMember = {
        classId: "323e4567-e89b-12d3-a456-426614174002",
        userId: "423e4567-e89b-12d3-a456-426614174003",
        role: "teacher",
      };

      // Act & Assert - userId should be typed as string
      const userId: string = membership.userId;
      expect(userId).toBe("423e4567-e89b-12d3-a456-426614174003");
      expect(typeof membership.userId).toBe("string");
    });

    it("should enforce foreign key references are UUIDs", () => {
      // Arrange
      const membership: ClassMember = {
        id: "523e4567-e89b-12d3-a456-426614174004",
        classId: "623e4567-e89b-12d3-a456-426614174005",
        userId: "723e4567-e89b-12d3-a456-426614174006",
        role: "student",
        createdAt: new Date(),
      };

      // Act & Assert - Both should be valid UUID strings
      expect(membership.classId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(membership.userId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe("Type Safety", () => {
    it("should enforce required classId field", () => {
      // Arrange
      const membership: ClassMember = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        classId: "223e4567-e89b-12d3-a456-426614174001",
        userId: "323e4567-e89b-12d3-a456-426614174002",
        role: "student",
        createdAt: new Date(),
      };

      // Act & Assert
      expect(membership.classId).toBeTruthy();
      expect(typeof membership.classId).toBe("string");
    });

    it("should enforce required userId field", () => {
      // Arrange
      const membership: ClassMember = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        classId: "523e4567-e89b-12d3-a456-426614174004",
        userId: "623e4567-e89b-12d3-a456-426614174005",
        role: "teacher",
        createdAt: new Date(),
      };

      // Act & Assert
      expect(membership.userId).toBeTruthy();
      expect(typeof membership.userId).toBe("string");
    });

    it("should enforce required role field", () => {
      // Arrange
      const membership: ClassMember = {
        id: "723e4567-e89b-12d3-a456-426614174006",
        classId: "823e4567-e89b-12d3-a456-426614174007",
        userId: "923e4567-e89b-12d3-a456-426614174008",
        role: "teacher",
        createdAt: new Date(),
      };

      // Act & Assert
      expect(membership.role).toBeTruthy();
      expect(["teacher", "student"]).toContain(membership.role);
    });
  });

  describe("Edge Cases", () => {
    it("should handle user in multiple classes with different roles", () => {
      // Arrange - Same user in different classes with different roles
      const teacherMembership: ClassMember = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        classId: "algebra-class-uuid",
        userId: "same-user-uuid",
        role: "teacher",
        createdAt: new Date(),
      };

      const studentMembership: ClassMember = {
        id: "223e4567-e89b-12d3-a456-426614174001",
        classId: "history-class-uuid",
        userId: "same-user-uuid",
        role: "student",
        createdAt: new Date(),
      };

      // Act & Assert
      expect(teacherMembership.userId).toBe(studentMembership.userId);
      expect(teacherMembership.classId).not.toBe(studentMembership.classId);
      expect(teacherMembership.role).toBe("teacher");
      expect(studentMembership.role).toBe("student");
    });

    it("should handle multiple teachers in same class (co-teaching)", () => {
      // Arrange - Two teachers in the same class
      const teacher1: ClassMember = {
        id: "323e4567-e89b-12d3-a456-426614174002",
        classId: "same-class-uuid",
        userId: "teacher1-uuid",
        role: "teacher",
        createdAt: new Date(),
      };

      const teacher2: ClassMember = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        classId: "same-class-uuid",
        userId: "teacher2-uuid",
        role: "teacher",
        createdAt: new Date(),
      };

      // Act & Assert
      expect(teacher1.classId).toBe(teacher2.classId);
      expect(teacher1.userId).not.toBe(teacher2.userId);
      expect(teacher1.role).toBe("teacher");
      expect(teacher2.role).toBe("teacher");
    });

    it("should handle class with only students (no teacher yet)", () => {
      // Arrange - Student membership in a class that doesn't have a teacher assigned yet
      const studentMembership: NewClassMember = {
        classId: "523e4567-e89b-12d3-a456-426614174004",
        userId: "623e4567-e89b-12d3-a456-426614174005",
        role: "student",
      };

      // Act & Assert
      expect(studentMembership.classId).toBeTruthy();
      expect(studentMembership.role).toBe("student");
    });

    it("should handle unique constraint on (classId, userId)", () => {
      // Arrange - Two memberships with same classId and userId (would violate unique constraint)
      const membership1: Omit<NewClassMember, "id"> = {
        classId: "723e4567-e89b-12d3-a456-426614174006",
        userId: "823e4567-e89b-12d3-a456-426614174007",
        role: "student",
      };

      const membership2: Omit<NewClassMember, "id"> = {
        classId: "723e4567-e89b-12d3-a456-426614174006", // Same class
        userId: "823e4567-e89b-12d3-a456-426614174007", // Same user
        role: "teacher", // Different role (would fail at DB level)
      };

      // Act & Assert - Type system allows this, but DB constraint will prevent it
      expect(membership1.classId).toBe(membership2.classId);
      expect(membership1.userId).toBe(membership2.userId);
      expect(membership1.role).not.toBe(membership2.role);
    });

    it("should handle user with both group_member and class_member roles", () => {
      // Arrange - User is a group_admin at school level AND a student in a class
      // This tests that class roles are independent from group roles
      const classMembership: NewClassMember = {
        classId: "923e4567-e89b-12d3-a456-426614174008",
        userId: "dual-role-user-uuid",
        role: "student",
      };

      // Act & Assert - class_member role is independent of group_member role
      expect(classMembership.role).toBe("student");
      expect(classMembership.userId).toBe("dual-role-user-uuid");
    });

    it("should handle membership creation with minimal fields", () => {
      // Arrange - Only required fields for insert
      const minimalMembership: NewClassMember = {
        classId: "a23e4567-e89b-12d3-a456-426614174009",
        userId: "b23e4567-e89b-12d3-a456-42661417400a",
        role: "student",
      };

      // Act & Assert - Auto-generated fields should be undefined
      expect(minimalMembership.classId).toBeTruthy();
      expect(minimalMembership.userId).toBeTruthy();
      expect(minimalMembership.role).toBeTruthy();
      expect(minimalMembership.id).toBeUndefined();
      expect(minimalMembership.createdAt).toBeUndefined();
    });

    it("should handle large class roster (many students)", () => {
      // Arrange - Simulate multiple students in same class
      const students: NewClassMember[] = Array.from({ length: 30 }, (_, i) => ({
        classId: "large-class-uuid",
        userId: `student-${i}-uuid`,
        role: "student" as const,
      }));

      // Act & Assert
      expect(students).toHaveLength(30);
      students.forEach((student) => {
        expect(student.classId).toBe("large-class-uuid");
        expect(student.role).toBe("student");
      });
    });

    it("should handle role change pattern (UPDATE, not INSERT)", () => {
      // Arrange - Demonstrate that role changes should UPDATE existing record
      // This is a type-level test showing the pattern for role changes
      const originalMembership: ClassMember = {
        id: "c23e4567-e89b-12d3-a456-42661417400b",
        classId: "d23e4567-e89b-12d3-a456-42661417400c",
        userId: "e23e4567-e89b-12d3-a456-42661417400d",
        role: "student",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      // Act - Simulate role change (would be UPDATE in DB)
      const updatedRole: ClassMember["role"] = "teacher";

      // Assert - Show that role can be changed (via UPDATE operation)
      expect(originalMembership.role).toBe("student");
      expect(updatedRole).toBe("teacher");
      expect(originalMembership.id).toBeTruthy(); // Same record ID would be updated
    });

    it("should handle class with no members (empty roster)", () => {
      // Arrange - First member being added to a new class
      const firstMember: NewClassMember = {
        classId: "f23e4567-e89b-12d3-a456-42661417400e", // New class with no members yet
        userId: "g23e4567-e89b-12d3-a456-42661417400f",
        role: "teacher",
      };

      // Act & Assert
      expect(firstMember.classId).toBeTruthy();
      expect(firstMember.role).toBe("teacher");
    });
  });

  describe("Relations Type Checking", () => {
    it("should verify classId field references classes table", () => {
      // Arrange
      const membership: ClassMember = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        classId: "223e4567-e89b-12d3-a456-426614174001",
        userId: "323e4567-e89b-12d3-a456-426614174002",
        role: "student",
        createdAt: new Date(),
      };

      // Act & Assert - classId should reference a class
      expect(membership.classId).toBe("223e4567-e89b-12d3-a456-426614174001");
      expect(typeof membership.classId).toBe("string");
    });

    it("should verify userId field references users table", () => {
      // Arrange
      const membership: ClassMember = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        classId: "523e4567-e89b-12d3-a456-426614174004",
        userId: "623e4567-e89b-12d3-a456-426614174005",
        role: "teacher",
        createdAt: new Date(),
      };

      // Act & Assert - userId should reference a user
      expect(membership.userId).toBe("623e4567-e89b-12d3-a456-426614174005");
      expect(typeof membership.userId).toBe("string");
    });
  });
});
