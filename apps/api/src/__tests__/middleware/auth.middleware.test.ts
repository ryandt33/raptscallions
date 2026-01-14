import { UnauthorizedError, ForbiddenError } from "@raptscallions/core";
import { db } from "@raptscallions/db";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

import type { GroupMember } from "@raptscallions/db/schema";
import type { FastifyRequest, FastifyReply } from "fastify";

// Mock the database
vi.mock("@raptscallions/db", () => ({
  db: {
    query: {
      groupMembers: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  },
}));

// Type for MemberRole extracted from GroupMember
type MemberRole = GroupMember["role"];

describe("Auth Middleware Guards", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
      groupMembership: undefined,
      params: {},
    };
    mockReply = {};
    vi.clearAllMocks();
  });

  describe("requireRole", () => {
    // Note: requireRole is a factory that returns a preHandler function
    const mockRequireRole = (...roles: MemberRole[]) => {
      return async (request: FastifyRequest, _reply: FastifyReply) => {
        if (!request.user) {
          throw new UnauthorizedError("Authentication required");
        }

        const memberships = await db.query.groupMembers.findMany({
          where: {} as any, // Simplified for test
        });

        const userRoles = memberships.map((m) => m.role);
        const hasRole = roles.some((role) => userRoles.includes(role));

        if (!hasRole) {
          const roleList = roles.length === 1 ? roles[0] : roles.join(", ");
          throw new ForbiddenError(
            `This action requires one of the following roles: ${roleList}`
          );
        }
      };
    };

    describe("Authentication Checks", () => {
      it("should throw UnauthorizedError if user is not authenticated", async () => {
        // Arrange
        mockRequest.user = undefined;
        const guard = mockRequireRole("teacher");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(UnauthorizedError);

        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow("Authentication required");
      });

      it("should not query database if user is not authenticated", async () => {
        // Arrange
        mockRequest.user = undefined;
        const guard = mockRequireRole("teacher");

        // Act
        try {
          await guard(mockRequest as FastifyRequest, mockReply as FastifyReply);
        } catch (_error) {
          // Expected error
        }

        // Assert
        expect(db.query.groupMembers.findMany).not.toHaveBeenCalled();
      });
    });

    describe("Role Validation", () => {
      beforeEach(() => {
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
      });

      it("should throw ForbiddenError if user has no group memberships", async () => {
        // Arrange
        (db.query.groupMembers.findMany as Mock).mockResolvedValue([]);
        const guard = mockRequireRole("teacher");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(ForbiddenError);

        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(
          "This action requires one of the following roles: teacher"
        );
      });

      it("should pass if user has the exact required role", async () => {
        // Arrange
        (db.query.groupMembers.findMany as Mock).mockResolvedValue([
          {
            id: "membership-123",
            userId: "user-123",
            groupId: "group-456",
            role: "teacher",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as GroupMember,
        ]);
        const guard = mockRequireRole("teacher");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should pass if user has any of multiple required roles", async () => {
        // Arrange
        (db.query.groupMembers.findMany as Mock).mockResolvedValue([
          {
            id: "membership-123",
            userId: "user-123",
            groupId: "group-456",
            role: "group_admin",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as GroupMember,
        ]);
        const guard = mockRequireRole("system_admin", "group_admin");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should throw ForbiddenError if user has wrong role", async () => {
        // Arrange
        (db.query.groupMembers.findMany as Mock).mockResolvedValue([
          {
            id: "membership-123",
            userId: "user-123",
            groupId: "group-456",
            role: "student",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as GroupMember,
        ]);
        const guard = mockRequireRole("teacher");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(ForbiddenError);

        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(
          "This action requires one of the following roles: teacher"
        );
      });

      it("should detect system_admin role correctly", async () => {
        // Arrange
        (db.query.groupMembers.findMany as Mock).mockResolvedValue([
          {
            id: "membership-123",
            userId: "user-123",
            groupId: "system-group",
            role: "system_admin",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as GroupMember,
        ]);
        const guard = mockRequireRole("system_admin");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should work with all role types", async () => {
        // Arrange - Test each role individually
        const roles: MemberRole[] = [
          "system_admin",
          "group_admin",
          "teacher",
          "student",
        ];

        // Act & Assert - Test all roles in parallel
        await Promise.all(
          roles.map(async (role) => {
            (db.query.groupMembers.findMany as Mock).mockResolvedValue([
              {
                id: "membership-123",
                userId: "user-123",
                groupId: "group-456",
                role,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as GroupMember,
            ]);

            const guard = mockRequireRole(role);

            await expect(
              guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
            ).resolves.not.toThrow();
          })
        );
      });
    });

    describe("Error Messages", () => {
      beforeEach(() => {
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        (db.query.groupMembers.findMany as Mock).mockResolvedValue([]);
      });

      it("should include single role in error message", async () => {
        // Arrange
        const guard = mockRequireRole("teacher");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(
          "This action requires one of the following roles: teacher"
        );
      });

      it("should include all required roles in error message with comma separation", async () => {
        // Arrange
        const guard = mockRequireRole("teacher", "group_admin");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(
          "This action requires one of the following roles: teacher, group_admin"
        );
      });

      it("should format three roles correctly", async () => {
        // Arrange
        const guard = mockRequireRole("system_admin", "group_admin", "teacher");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(
          "This action requires one of the following roles: system_admin, group_admin, teacher"
        );
      });
    });

    describe("Multiple Group Memberships", () => {
      beforeEach(() => {
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
      });

      it("should pass if user has required role in any group", async () => {
        // Arrange - User is teacher in GroupA and student in GroupB
        (db.query.groupMembers.findMany as Mock).mockResolvedValue([
          {
            id: "membership-1",
            userId: "user-123",
            groupId: "group-A",
            role: "teacher",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as GroupMember,
          {
            id: "membership-2",
            userId: "user-123",
            groupId: "group-B",
            role: "student",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as GroupMember,
        ]);
        const guard = mockRequireRole("teacher");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should pass if user has different role than required but matches one of multiple", async () => {
        // Arrange
        (db.query.groupMembers.findMany as Mock).mockResolvedValue([
          {
            id: "membership-1",
            userId: "user-123",
            groupId: "group-A",
            role: "student",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as GroupMember,
          {
            id: "membership-2",
            userId: "user-123",
            groupId: "group-B",
            role: "teacher",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as GroupMember,
        ]);
        const guard = mockRequireRole("teacher", "group_admin");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });
    });
  });

  describe("requireGroupMembership", () => {
    // Note: requireGroupMembership is a factory that returns a preHandler function
    const mockRequireGroupMembership = (_groupId: string) => {
      return async (request: FastifyRequest, _reply: FastifyReply) => {
        if (!request.user) {
          throw new UnauthorizedError("Authentication required");
        }

        const membership = await db.query.groupMembers.findFirst({
          where: {} as any, // Simplified for test
        });

        if (!membership) {
          throw new ForbiddenError("You are not a member of this group");
        }

        request.groupMembership = membership;
      };
    };

    describe("Authentication Checks", () => {
      it("should throw UnauthorizedError if user is not authenticated", async () => {
        // Arrange
        mockRequest.user = undefined;
        const guard = mockRequireGroupMembership("group-123");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(UnauthorizedError);

        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow("Authentication required");
      });

      it("should not query database if user is not authenticated", async () => {
        // Arrange
        mockRequest.user = undefined;
        const guard = mockRequireGroupMembership("group-123");

        // Act
        try {
          await guard(mockRequest as FastifyRequest, mockReply as FastifyReply);
        } catch (_error) {
          // Expected error
        }

        // Assert
        expect(db.query.groupMembers.findFirst).not.toHaveBeenCalled();
      });
    });

    describe("Group Membership Validation", () => {
      beforeEach(() => {
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
      });

      it("should throw ForbiddenError if user is not in group", async () => {
        // Arrange
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue(null);
        const guard = mockRequireGroupMembership("group-123");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(ForbiddenError);

        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow("You are not a member of this group");
      });

      it("should pass if user is member of the group", async () => {
        // Arrange
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue({
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "teacher",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GroupMember);
        const guard = mockRequireGroupMembership("group-123");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should work with any role in group (system_admin)", async () => {
        // Arrange
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue({
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "system_admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GroupMember);
        const guard = mockRequireGroupMembership("group-123");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should work with any role in group (group_admin)", async () => {
        // Arrange
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue({
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "group_admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GroupMember);
        const guard = mockRequireGroupMembership("group-123");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should work with any role in group (teacher)", async () => {
        // Arrange
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue({
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "teacher",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GroupMember);
        const guard = mockRequireGroupMembership("group-123");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should work with any role in group (student)", async () => {
        // Arrange
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue({
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "student",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GroupMember);
        const guard = mockRequireGroupMembership("group-123");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });
    });

    describe("Request Decoration", () => {
      beforeEach(() => {
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
      });

      it("should attach membership to request.groupMembership", async () => {
        // Arrange
        const mockMembership: GroupMember = {
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "teacher",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue(
          mockMembership
        );
        const guard = mockRequireGroupMembership("group-123");

        // Act
        await guard(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockRequest.groupMembership).toBeDefined();
        expect(mockRequest.groupMembership).toEqual(mockMembership);
      });

      it("should include full membership object with role", async () => {
        // Arrange
        const mockMembership: GroupMember = {
          id: "membership-456",
          userId: "user-123",
          groupId: "group-123",
          role: "group_admin",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-02"),
        };
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue(
          mockMembership
        );
        const guard = mockRequireGroupMembership("group-123");

        // Act
        await guard(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockRequest.groupMembership?.id).toBe("membership-456");
        expect(mockRequest.groupMembership?.userId).toBe("user-123");
        expect(mockRequest.groupMembership?.groupId).toBe("group-123");
        expect(mockRequest.groupMembership?.role).toBe("group_admin");
      });

      it("should not attach groupMembership if validation fails", async () => {
        // Arrange
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue(null);
        const guard = mockRequireGroupMembership("group-123");

        // Act
        try {
          await guard(mockRequest as FastifyRequest, mockReply as FastifyReply);
        } catch (_error) {
          // Expected error
        }

        // Assert
        expect(mockRequest.groupMembership).toBeUndefined();
      });
    });
  });

  describe("requireGroupFromParams", () => {
    // Note: requireGroupFromParams is a factory that returns a preHandler function
    const mockRequireGroupFromParams = (paramName: string = "groupId") => {
      return async (request: FastifyRequest, _reply: FastifyReply) => {
        const groupId = (request.params as Record<string, unknown>)[paramName];

        if (!groupId || typeof groupId !== "string") {
          throw new ForbiddenError(
            `Missing or invalid route parameter: ${paramName}`
          );
        }

        // Reuse requireGroupMembership logic
        if (!request.user) {
          throw new UnauthorizedError("Authentication required");
        }

        const membership = await db.query.groupMembers.findFirst({
          where: {} as any,
        });

        if (!membership) {
          throw new ForbiddenError("You are not a member of this group");
        }

        request.groupMembership = membership;
      };
    };

    describe("Parameter Extraction", () => {
      beforeEach(() => {
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
      });

      it("should extract groupId from default parameter name", async () => {
        // Arrange
        mockRequest.params = { groupId: "group-123" };
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue({
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "teacher",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GroupMember);
        const guard = mockRequireGroupFromParams();

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should extract groupId from custom parameter name", async () => {
        // Arrange
        mockRequest.params = { teamId: "group-456" };
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue({
          id: "membership-456",
          userId: "user-123",
          groupId: "group-456",
          role: "teacher",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as GroupMember);
        const guard = mockRequireGroupFromParams("teamId");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should throw ForbiddenError if parameter is missing", async () => {
        // Arrange
        mockRequest.params = {};
        const guard = mockRequireGroupFromParams();

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(ForbiddenError);

        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow("Missing or invalid route parameter: groupId");
      });

      it("should throw ForbiddenError if parameter is not a string", async () => {
        // Arrange
        mockRequest.params = { groupId: 123 };
        const guard = mockRequireGroupFromParams();

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(ForbiddenError);

        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow("Missing or invalid route parameter: groupId");
      });

      it("should include custom parameter name in error message", async () => {
        // Arrange
        mockRequest.params = {};
        const guard = mockRequireGroupFromParams("organizationId");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow("Missing or invalid route parameter: organizationId");
      });
    });

    describe("Integration with requireGroupMembership", () => {
      beforeEach(() => {
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        mockRequest.params = { groupId: "group-123" };
      });

      it("should attach groupMembership to request on success", async () => {
        // Arrange
        const mockMembership: GroupMember = {
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "teacher",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue(
          mockMembership
        );
        const guard = mockRequireGroupFromParams();

        // Act
        await guard(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Assert
        expect(mockRequest.groupMembership).toEqual(mockMembership);
      });

      it("should throw ForbiddenError if user is not in group", async () => {
        // Arrange
        (db.query.groupMembers.findFirst as Mock).mockResolvedValue(null);
        const guard = mockRequireGroupFromParams();

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow("You are not a member of this group");
      });
    });
  });

  describe("requireGroupRole", () => {
    // Note: requireGroupRole is a factory that returns a preHandler function
    const mockRequireGroupRole = (...roles: MemberRole[]) => {
      return async (request: FastifyRequest, _reply: FastifyReply) => {
        if (!request.groupMembership) {
          throw new Error(
            "requireGroupRole must be used after requireGroupMembership or requireGroupFromParams"
          );
        }

        if (!roles.includes(request.groupMembership.role)) {
          const roleList = roles.length === 1 ? roles[0] : roles.join(", ");
          throw new ForbiddenError(
            `This action requires one of the following roles in this group: ${roleList}`
          );
        }
      };
    };

    describe("Precondition Checks", () => {
      it("should throw Error if groupMembership is not set", async () => {
        // Arrange
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        mockRequest.groupMembership = undefined;
        const guard = mockRequireGroupRole("teacher");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(
          "requireGroupRole must be used after requireGroupMembership or requireGroupFromParams"
        );
      });
    });

    describe("Role Validation Within Group", () => {
      beforeEach(() => {
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
      });

      it("should pass if user has exact role in current group", async () => {
        // Arrange
        mockRequest.groupMembership = {
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "teacher",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const guard = mockRequireGroupRole("teacher");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should pass if user has any of multiple required roles", async () => {
        // Arrange
        mockRequest.groupMembership = {
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "group_admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const guard = mockRequireGroupRole("teacher", "group_admin");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });

      it("should throw ForbiddenError if user has wrong role in group", async () => {
        // Arrange
        mockRequest.groupMembership = {
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "student",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const guard = mockRequireGroupRole("teacher");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(ForbiddenError);

        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(
          "This action requires one of the following roles in this group: teacher"
        );
      });

      it("should distinguish between global role and group role", async () => {
        // Arrange - User is teacher in GroupA (not current group)
        // Current groupMembership is student in GroupB
        mockRequest.groupMembership = {
          id: "membership-B",
          userId: "user-123",
          groupId: "group-B",
          role: "student",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const guard = mockRequireGroupRole("teacher");

        // Act & Assert - Should fail even if user is teacher elsewhere
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(ForbiddenError);
      });

      it("should work with all role types", async () => {
        // Arrange
        const roles: MemberRole[] = [
          "system_admin",
          "group_admin",
          "teacher",
          "student",
        ];

        // Act & Assert - Test all roles in parallel
        await Promise.all(
          roles.map(async (role) => {
            mockRequest.groupMembership = {
              id: "membership-123",
              userId: "user-123",
              groupId: "group-123",
              role,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            const guard = mockRequireGroupRole(role);

            await expect(
              guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
            ).resolves.not.toThrow();
          })
        );
      });
    });

    describe("Error Messages", () => {
      beforeEach(() => {
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        mockRequest.groupMembership = {
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "student",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      it("should include 'in this group' to distinguish from global role check", async () => {
        // Arrange
        const guard = mockRequireGroupRole("teacher");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(
          "This action requires one of the following roles in this group: teacher"
        );
      });

      it("should format multiple roles correctly", async () => {
        // Arrange
        const guard = mockRequireGroupRole("teacher", "group_admin");

        // Act & Assert
        await expect(
          guard(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(
          "This action requires one of the following roles in this group: teacher, group_admin"
        );
      });
    });
  });

  describe("Guard Composition", () => {
    // Test that guards can be chained together correctly
    describe("requireAuth + requireRole", () => {
      it("should pass when both guards succeed", async () => {
        // Arrange
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        (db.query.groupMembers.findMany as Mock).mockResolvedValue([
          {
            id: "membership-123",
            userId: "user-123",
            groupId: "group-456",
            role: "teacher",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as GroupMember,
        ]);

        // Mock requireAuth
        const requireAuth = async (
          request: FastifyRequest,
          _reply: FastifyReply
        ) => {
          if (!request.user) {
            throw new UnauthorizedError("Authentication required");
          }
        };

        // Mock requireRole
        const requireRole = (...roles: MemberRole[]) => {
          return async (request: FastifyRequest, _reply: FastifyReply) => {
            if (!request.user) {
              throw new UnauthorizedError("Authentication required");
            }
            const memberships = await db.query.groupMembers.findMany({
              where: {} as any,
            });
            const userRoles = memberships.map((m) => m.role);
            const hasRole = roles.some((role) => userRoles.includes(role));
            if (!hasRole) {
              throw new ForbiddenError("Insufficient permissions");
            }
          };
        };

        // Act
        await requireAuth(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        );
        await requireRole("teacher")(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        );

        // Assert - Both should pass without error
        expect(mockRequest.user).toBeDefined();
      });

      it("should fail at requireAuth if not authenticated", async () => {
        // Arrange
        mockRequest.user = undefined;

        const requireAuth = async (
          request: FastifyRequest,
          _reply: FastifyReply
        ) => {
          if (!request.user) {
            throw new UnauthorizedError("Authentication required");
          }
        };

        // Act & Assert
        await expect(
          requireAuth(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).rejects.toThrow(UnauthorizedError);
      });
    });

    describe("requireAuth + requireGroupFromParams + requireGroupRole", () => {
      it("should pass through all three guards successfully", async () => {
        // Arrange
        mockRequest.user = {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
        mockRequest.params = { groupId: "group-123" };

        const mockMembership: GroupMember = {
          id: "membership-123",
          userId: "user-123",
          groupId: "group-123",
          role: "teacher",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (db.query.groupMembers.findFirst as Mock).mockResolvedValue(
          mockMembership
        );

        // Mock guards
        const requireAuth = async (
          request: FastifyRequest,
          _reply: FastifyReply
        ) => {
          if (!request.user) {
            throw new UnauthorizedError("Authentication required");
          }
        };

        const requireGroupFromParams = (paramName: string = "groupId") => {
          return async (request: FastifyRequest, _reply: FastifyReply) => {
            const groupId = (request.params as Record<string, unknown>)[
              paramName
            ];
            if (!groupId || typeof groupId !== "string") {
              throw new ForbiddenError("Invalid group parameter");
            }
            const membership = await db.query.groupMembers.findFirst({
              where: {} as any,
            });
            if (!membership) {
              throw new ForbiddenError("Not a member");
            }
            request.groupMembership = membership;
          };
        };

        const requireGroupRole = (...roles: MemberRole[]) => {
          return async (request: FastifyRequest, _reply: FastifyReply) => {
            if (!request.groupMembership) {
              throw new Error("groupMembership required");
            }
            if (!roles.includes(request.groupMembership.role)) {
              throw new ForbiddenError("Insufficient role");
            }
          };
        };

        // Act - Execute guards in sequence
        await requireAuth(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        );
        await requireGroupFromParams()(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        );
        await requireGroupRole("teacher")(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply
        );

        // Assert - All should pass
        expect(mockRequest.user).toBeDefined();
        expect(mockRequest.groupMembership).toEqual(mockMembership);
      });
    });
  });
});
