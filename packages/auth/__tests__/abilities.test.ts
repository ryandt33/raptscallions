import { describe, it, expect, beforeEach } from "vitest";
import { subject } from "@casl/ability";
import { buildAbility, canManageGroupHierarchy } from "../src/abilities.js";
import type { BuildAbilityContext, GroupPath } from "../src/types.js";
import type { GroupMember } from "@raptscallions/db/schema";
import type { SessionUser } from "../src/types.js";

// Test factories
function createMockUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    ...overrides,
  } as SessionUser;
}

function createMockGroupMembership(
  overrides: Partial<GroupMember> = {}
): GroupMember {
  return {
    id: "membership-123",
    userId: "user-123",
    groupId: "group-1",
    role: "student",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("buildAbility", () => {
  let mockUser: SessionUser;

  beforeEach(() => {
    mockUser = createMockUser();
  });

  describe("system_admin", () => {
    it("should allow manage all when user has system_admin role", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({
          role: "system_admin",
          groupId: "group-1",
        }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("manage", "all")).toBe(true);
      expect(ability.can("delete", "User")).toBe(true);
      expect(ability.can("create", "Group")).toBe(true);
      expect(ability.can("manage", "Tool")).toBe(true);
    });

    it("should allow manage all when user has system_admin in any group", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "student", groupId: "group-1" }),
        createMockGroupMembership({
          role: "system_admin",
          groupId: "group-2",
        }),
        createMockGroupMembership({ role: "teacher", groupId: "group-3" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("manage", "all")).toBe(true);
    });

    it("should bypass all other permissions when system_admin", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({
          role: "system_admin",
          groupId: "group-1",
        }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert - Can do anything regardless of resource attributes
      expect(
        ability.can("delete", subject("Tool", { createdBy: "other-user" }))
      ).toBe(true);
      expect(ability.can("manage", subject("Group", { id: "random-group" }))).toBe(true);
    });
  });

  describe("group_admin", () => {
    it("should allow managing groups they administer", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("manage", subject("Group", { id: "group-1" }))).toBe(true);
      expect(ability.can("manage", subject("Group", { id: "group-2" }))).toBe(false);
    });

    it("should allow managing users in their groups", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("create", subject("User", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("update", subject("User", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("delete", subject("User", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("create", subject("User", { groupId: "group-2" }))).toBe(false);
    });

    it("should allow managing classes in their groups", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("create", subject("Class", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("manage", subject("Class", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("create", subject("Class", { groupId: "group-2" }))).toBe(
        false
      );
    });

    it("should allow reading tools in their groups", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("read", subject("Tool", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("read", subject("Tool", { groupId: "group-2" }))).toBe(false);
    });

    it("should allow managing assignments in their groups", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("create", subject("Assignment", { groupId: "group-1" }))).toBe(
        true
      );
      expect(ability.can("manage", subject("Assignment", { groupId: "group-1" }))).toBe(
        true
      );
      expect(ability.can("create", subject("Assignment", { groupId: "group-2" }))).toBe(
        false
      );
    });

    it("should work with multiple group admin roles", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
        createMockGroupMembership({ role: "group_admin", groupId: "group-2" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("manage", subject("Group", { id: "group-1" }))).toBe(true);
      expect(ability.can("manage", subject("Group", { id: "group-2" }))).toBe(true);
      expect(ability.can("manage", subject("User", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("manage", subject("User", { groupId: "group-2" }))).toBe(true);
    });
  });

  describe("teacher", () => {
    it("should allow creating tools in their groups", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("create", subject("Tool", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("create", subject("Tool", { groupId: "group-2" }))).toBe(false);
    });

    it("should allow managing their own tools", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(
        ability.can("read", subject("Tool", { createdBy: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("update", subject("Tool", { createdBy: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("delete", subject("Tool", { createdBy: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("delete", subject("Tool", { createdBy: "other-user" }))
      ).toBe(false);
    });

    it("should allow creating assignments in their groups", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(
        ability.can("create", subject("Assignment", { groupId: "group-1" }))
      ).toBe(true);
      expect(
        ability.can("create", subject("Assignment", { groupId: "group-2" }))
      ).toBe(false);
    });

    it("should allow managing their own assignments", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(
        ability.can("read", subject("Assignment", { createdBy: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("update", subject("Assignment", { createdBy: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("delete", subject("Assignment", { createdBy: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("delete", subject("Assignment", { createdBy: "other-user" }))
      ).toBe(false);
    });

    it("should allow reading classes in their groups", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("read", subject("Class", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("read", subject("Class", { groupId: "group-2" }))).toBe(false);
    });

    it("should allow reading users in their groups", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("read", subject("User", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("read", subject("User", { groupId: "group-2" }))).toBe(false);
    });

    it("should allow reading sessions for their tools", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(
        ability.can("read", subject("Session", { toolCreatedBy: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("read", subject("Session", { toolCreatedBy: "other-user" }))
      ).toBe(false);
    });

    it("should work with multiple teacher roles in different groups", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
        createMockGroupMembership({ role: "teacher", groupId: "group-2" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("create", subject("Tool", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("create", subject("Tool", { groupId: "group-2" }))).toBe(true);
      expect(ability.can("create", subject("Tool", { groupId: "group-3" }))).toBe(false);
    });
  });

  describe("student", () => {
    it("should allow reading assigned tools", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "student", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(
        ability.can("read", subject("Tool", { assignedTo: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("read", subject("Tool", { assignedTo: "other-user" }))
      ).toBe(false);
    });

    it("should allow reading assigned assignments", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "student", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(
        ability.can("read", subject("Assignment", { assignedTo: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("read", subject("Assignment", { assignedTo: "other-user" }))
      ).toBe(false);
    });

    it("should allow managing own sessions", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "student", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(
        ability.can("create", subject("Session", { userId: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("read", subject("Session", { userId: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("update", subject("Session", { userId: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("delete", subject("Session", { userId: mockUser.id }))
      ).toBe(true);
      expect(
        ability.can("delete", subject("Session", { userId: "other-user" }))
      ).toBe(false);
    });

    it("should allow managing own product runs", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "student", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("create", subject("Run", { userId: mockUser.id }))).toBe(true);
      expect(ability.can("read", subject("Run", { userId: mockUser.id }))).toBe(true);
      expect(ability.can("read", subject("Run", { userId: "other-user" }))).toBe(false);
    });

    it("should not allow creating tools", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "student", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("create", subject("Tool", { groupId: "group-1" }))).toBe(false);
    });

    it("should not allow managing other users", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "student", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("create", subject("User", { groupId: "group-1" }))).toBe(false);
      expect(ability.can("update", subject("User", { groupId: "group-1" }))).toBe(false);
      expect(ability.can("delete", subject("User", { groupId: "group-1" }))).toBe(false);
    });
  });

  describe("all users (base permissions)", () => {
    it("should allow reading own profile", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "student", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("read", subject("User", { id: mockUser.id }))).toBe(true);
      expect(ability.can("read", subject("User", { id: "other-user" }))).toBe(false);
    });

    it("should allow updating own profile", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "student", groupId: "group-1" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert
      expect(ability.can("update", subject("User", { id: mockUser.id }))).toBe(true);
      expect(ability.can("update", subject("User", { id: "other-user" }))).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle user with no group memberships", () => {
      // Arrange
      const memberships: GroupMember[] = [];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert - Should only have base permissions (own profile, own sessions)
      expect(ability.can("read", subject("User", { id: mockUser.id }))).toBe(true);
      expect(
        ability.can("create", subject("Session", { userId: mockUser.id }))
      ).toBe(true);
      expect(ability.can("create", subject("Tool", { groupId: "any" }))).toBe(false);
      expect(ability.can("manage", "all")).toBe(false);
    });

    it("should handle user with multiple roles in different groups", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
        createMockGroupMembership({ role: "student", groupId: "group-2" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert - Should aggregate permissions from both roles
      expect(ability.can("create", subject("Tool", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("create", subject("Tool", { groupId: "group-2" }))).toBe(false);
      expect(
        ability.can("read", subject("Tool", { assignedTo: mockUser.id }))
      ).toBe(true);
    });

    it("should handle user with multiple roles in same group", () => {
      // Arrange - This shouldn't happen due to unique constraint, but test behavior
      const memberships = [
        createMockGroupMembership({
          role: "teacher",
          groupId: "group-1",
          id: "membership-1",
        }),
        createMockGroupMembership({
          role: "group_admin",
          groupId: "group-1",
          id: "membership-2",
        }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert - Should have all permissions from both roles
      expect(ability.can("create", subject("Tool", { groupId: "group-1" }))).toBe(true);
      expect(ability.can("manage", subject("User", { groupId: "group-1" }))).toBe(true);
    });

    it("should prioritize system_admin over all other roles", () => {
      // Arrange
      const memberships = [
        createMockGroupMembership({ role: "student", groupId: "group-1" }),
        createMockGroupMembership({
          role: "system_admin",
          groupId: "group-2",
        }),
        createMockGroupMembership({ role: "teacher", groupId: "group-3" }),
      ];

      // Act
      const ability = buildAbility({ user: mockUser, memberships });

      // Assert - System admin bypass should win
      expect(ability.can("manage", "all")).toBe(true);
      expect(ability.can("delete", subject("Group", { id: "any-group" }))).toBe(true);
    });
  });
});

describe("canManageGroupHierarchy", () => {
  let mockUser: SessionUser;

  beforeEach(() => {
    mockUser = createMockUser();
  });

  it("should allow managing exact group", () => {
    // Arrange
    const memberships = [
      createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
    ];
    const ability = buildAbility({ user: mockUser, memberships });
    const userGroupPaths: GroupPath[] = [
      { groupId: "group-1", path: "district.school1" },
    ];

    // Act
    const result = canManageGroupHierarchy(
      ability,
      "group-1",
      userGroupPaths,
      "district.school1"
    );

    // Assert
    expect(result).toBe(true);
  });

  it("should allow managing descendant groups", () => {
    // Arrange
    const memberships = [
      createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
    ];
    const ability = buildAbility({ user: mockUser, memberships });
    const userGroupPaths: GroupPath[] = [
      { groupId: "group-1", path: "district.school1" },
    ];

    // Act
    const result = canManageGroupHierarchy(
      ability,
      "group-2",
      userGroupPaths,
      "district.school1.dept_math"
    );

    // Assert
    expect(result).toBe(true);
  });

  it("should deny managing sibling groups", () => {
    // Arrange
    const memberships = [
      createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
    ];
    const ability = buildAbility({ user: mockUser, memberships });
    const userGroupPaths: GroupPath[] = [
      { groupId: "group-1", path: "district.school1" },
    ];

    // Act
    const result = canManageGroupHierarchy(
      ability,
      "group-2",
      userGroupPaths,
      "district.school2"
    );

    // Assert
    expect(result).toBe(false);
  });

  it("should deny managing parent groups", () => {
    // Arrange
    const memberships = [
      createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
    ];
    const ability = buildAbility({ user: mockUser, memberships });
    const userGroupPaths: GroupPath[] = [
      { groupId: "group-1", path: "district.school1.dept_math" },
    ];

    // Act
    const result = canManageGroupHierarchy(
      ability,
      "group-2",
      userGroupPaths,
      "district.school1"
    );

    // Assert
    expect(result).toBe(false);
  });

  it("should handle multiple managed group paths", () => {
    // Arrange
    const memberships = [
      createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
      createMockGroupMembership({ role: "group_admin", groupId: "group-2" }),
    ];
    const ability = buildAbility({ user: mockUser, memberships });
    const userGroupPaths: GroupPath[] = [
      { groupId: "group-1", path: "district.school1" },
      { groupId: "group-2", path: "district.school2" },
    ];

    // Act & Assert
    expect(
      canManageGroupHierarchy(
        ability,
        "group-3",
        userGroupPaths,
        "district.school1.dept_math"
      )
    ).toBe(true);
    expect(
      canManageGroupHierarchy(
        ability,
        "group-4",
        userGroupPaths,
        "district.school2.dept_science"
      )
    ).toBe(true);
    expect(
      canManageGroupHierarchy(
        ability,
        "group-5",
        userGroupPaths,
        "district.school3.dept_arts"
      )
    ).toBe(false);
  });

  it("should handle empty user group paths array", () => {
    // Arrange
    const memberships = [
      createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
    ];
    const ability = buildAbility({ user: mockUser, memberships });
    const userGroupPaths: GroupPath[] = [];

    // Act
    const result = canManageGroupHierarchy(
      ability,
      "group-2",
      userGroupPaths,
      "district.school1"
    );

    // Assert
    expect(result).toBe(false);
  });

  it("should handle deeply nested hierarchy", () => {
    // Arrange
    const memberships = [
      createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
    ];
    const ability = buildAbility({ user: mockUser, memberships });
    const userGroupPaths: GroupPath[] = [
      { groupId: "group-1", path: "district.school1" },
    ];

    // Act & Assert - Deep descendant should work
    expect(
      canManageGroupHierarchy(
        ability,
        "group-2",
        userGroupPaths,
        "district.school1.dept_math.grade_9.section_a"
      )
    ).toBe(true);
  });

  it("should use ability check as first priority", () => {
    // Arrange - System admin should bypass hierarchy check
    const memberships = [
      createMockGroupMembership({
        role: "system_admin",
        groupId: "group-1",
      }),
    ];
    const ability = buildAbility({ user: mockUser, memberships });
    const userGroupPaths: GroupPath[] = [];

    // Act
    const result = canManageGroupHierarchy(
      ability,
      "any-group",
      userGroupPaths,
      "any.path"
    );

    // Assert - System admin can manage without hierarchy check
    expect(result).toBe(true);
  });
});
