import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { subject } from "@casl/ability";
import Fastify from "fastify";
import fp from "fastify-plugin";
import { permissionMiddleware } from "../src/permissions.js";
// Mock the database module
vi.mock("@raptscallions/db", () => ({
    db: {
        query: {
            groupMembers: {
                findMany: vi.fn(),
            },
            groups: {
                findMany: vi.fn(),
            },
        },
    },
}));
// Import mocked db after setting up the mock
import { db } from "@raptscallions/db";
// Test factories
function createMockUser(overrides = {}) {
    return {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        ...overrides,
    };
}
function createMockGroupMembership(overrides = {}) {
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
describe("permissionMiddleware", () => {
    let app;
    let mockUser = null;
    beforeEach(async () => {
        app = Fastify();
        // Register mock session middleware BEFORE permission middleware
        // Use fastify-plugin to break encapsulation (allow hook to affect child plugins)
        const mockSessionMiddleware = fp(async (fastify) => {
            fastify.addHook("onRequest", async (request) => {
                request.user = mockUser;
                request.session = mockUser ? { id: "session-123" } : null;
            });
        }, { name: "mockSessionMiddleware" });
        await app.register(mockSessionMiddleware);
        await app.register(permissionMiddleware);
        vi.clearAllMocks();
        mockUser = null; // Reset for each test
    });
    afterEach(async () => {
        mockUser = null;
        await app.close();
    });
    describe("onRequest hook", () => {
        it("should create empty ability for unauthenticated requests", async () => {
            // Arrange
            app.get("/test", async (request) => {
                return {
                    canCreate: request.ability.can("create", "Tool"),
                    canManage: request.ability.can("manage", "all"),
                };
            });
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/test",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.canCreate).toBe(false);
            expect(body.canManage).toBe(false);
        });
        it("should build ability from user memberships for authenticated requests", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({
                    role: "system_admin",
                    groupId: "group-1",
                }),
            ];
            // Mock database query
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.get("/test", async (request) => {
                return {
                    canManage: request.ability.can("manage", "all"),
                    canCreate: request.ability.can("create", "Tool"),
                };
            });
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/test",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.canManage).toBe(true);
            expect(body.canCreate).toBe(true);
            expect(db.query.groupMembers.findMany).toHaveBeenCalledWith({
                where: expect.any(Object),
            });
        });
        it("should attach ability to request object", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
            ];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.get("/test", async (request) => {
                return {
                    hasAbility: request.ability !== null && request.ability !== undefined,
                    abilityType: typeof request.ability,
                };
            });
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/test",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.hasAbility).toBe(true);
            expect(body.abilityType).toBe("object");
        });
    });
    describe("requirePermission decorator", () => {
        it("should expose requirePermission decorator", () => {
            // Assert
            expect(app.requirePermission).toBeDefined();
            expect(typeof app.requirePermission).toBe("function");
        });
        it("should allow request when permission granted", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({
                    role: "system_admin",
                    groupId: "group-1",
                }),
            ];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.get("/protected", {
                preHandler: [app.requirePermission("create", "Tool")],
            }, async () => ({ ok: true }));
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/protected",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body)).toEqual({ ok: true });
        });
        it("should throw ForbiddenError when permission denied", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({ role: "student", groupId: "group-1" }),
            ];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.get("/protected", {
                preHandler: [app.requirePermission("manage", "all")],
            }, async () => ({ ok: true }));
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/protected",
            });
            // Assert
            expect(response.statusCode).toBe(403);
            const body = JSON.parse(response.body);
            expect(body.error).toBeDefined();
            expect(body.code).toBe("FORBIDDEN");
        });
        it("should work with multiple permission checks", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
            ];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.get("/multi-check", {
                preHandler: [
                    app.requirePermission("create", "Tool"),
                    app.requirePermission("read", "Class"),
                ],
            }, async () => ({ ok: true }));
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/multi-check",
            });
            // Assert - Teacher can create tools and read classes
            expect(response.statusCode).toBe(200);
        });
        it("should fail on first denied permission in chain", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({ role: "student", groupId: "group-1" }),
            ];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.get("/multi-check", {
                preHandler: [
                    app.requirePermission("read", "Tool"), // Student can do this
                    app.requirePermission("create", "Tool"), // Student cannot do this
                ],
            }, async () => ({ ok: true }));
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/multi-check",
            });
            // Assert
            expect(response.statusCode).toBe(403);
        });
    });
    describe("checkResourcePermission decorator", () => {
        it("should expose checkResourcePermission decorator", () => {
            // Assert
            expect(app.checkResourcePermission).toBeDefined();
            expect(typeof app.checkResourcePermission).toBe("function");
        });
        it("should return true when resource permission granted", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
            ];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.get("/check-resource", async (request) => {
                const tool = { createdBy: mockUser.id, groupId: "group-1" };
                const canDelete = app.checkResourcePermission(request.ability, "delete", "Tool", tool);
                return { canDelete };
            });
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/check-resource",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body).canDelete).toBe(true);
        });
        it("should return false when resource permission denied", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
            ];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.get("/check-resource", async (request) => {
                const tool = { createdBy: "other-user", groupId: "group-1" };
                const canDelete = app.checkResourcePermission(request.ability, "delete", "Tool", tool);
                return { canDelete };
            });
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/check-resource",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body).canDelete).toBe(false);
        });
        it("should check resource-specific conditions", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
            ];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.get("/check-resource", async (request) => {
                const userInGroup = { id: "user-456", groupId: "group-1" };
                const userInOtherGroup = { id: "user-789", groupId: "group-2" };
                const canManageInGroup = app.checkResourcePermission(request.ability, "manage", "User", userInGroup);
                const canManageOtherGroup = app.checkResourcePermission(request.ability, "manage", "User", userInOtherGroup);
                return { canManageInGroup, canManageOtherGroup };
            });
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/check-resource",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.canManageInGroup).toBe(true);
            expect(body.canManageOtherGroup).toBe(false);
        });
    });
    describe("getGroupPaths decorator", () => {
        it("should expose getGroupPaths decorator", () => {
            // Assert
            expect(app.getGroupPaths).toBeDefined();
            expect(typeof app.getGroupPaths).toBe("function");
        });
        it("should return empty array for empty input", async () => {
            // Act
            const result = await app.getGroupPaths([]);
            // Assert
            expect(result).toEqual([]);
            expect(db.query.groups.findMany).not.toHaveBeenCalled();
        });
        it("should fetch and return group paths", async () => {
            // Arrange
            const mockGroups = [
                { id: "group-1", path: "district.school1" },
                { id: "group-2", path: "district.school2" },
            ];
            vi.mocked(db.query.groups.findMany).mockResolvedValue(mockGroups);
            // Act
            const result = await app.getGroupPaths(["group-1", "group-2"]);
            // Assert
            expect(result).toEqual([
                { groupId: "group-1", path: "district.school1" },
                { groupId: "group-2", path: "district.school2" },
            ]);
            expect(db.query.groups.findMany).toHaveBeenCalledWith({
                where: expect.any(Object),
                columns: {
                    id: true,
                    path: true,
                },
            });
        });
        it("should handle single group ID", async () => {
            // Arrange
            const mockGroups = [{ id: "group-1", path: "district.school1" }];
            vi.mocked(db.query.groups.findMany).mockResolvedValue(mockGroups);
            // Act
            const result = await app.getGroupPaths(["group-1"]);
            // Assert
            expect(result).toEqual([
                { groupId: "group-1", path: "district.school1" },
            ]);
        });
    });
    describe("integration scenarios", () => {
        it("should handle full permission flow for teacher creating tool", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({ role: "teacher", groupId: "group-1" }),
            ];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.post("/tools", {
                preHandler: [app.requirePermission("create", "Tool")],
            }, async (request) => {
                const tool = {
                    groupId: "group-1",
                    createdBy: mockUser.id,
                    name: "Test Tool",
                };
                // Check if user can create tool in this group
                const canCreate = app.checkResourcePermission(request.ability, "create", "Tool", tool);
                if (!canCreate) {
                    throw new Error("Cannot create tool in this group");
                }
                return { tool };
            });
            // Act
            const response = await app.inject({
                method: "POST",
                url: "/tools",
            });
            // Assert
            expect(response.statusCode).toBe(200);
        });
        it("should handle full permission flow for student attempting to create tool", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({ role: "student", groupId: "group-1" }),
            ];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.post("/tools", {
                preHandler: [app.requirePermission("create", "Tool")],
            }, async () => ({ tool: {} }));
            // Act
            const response = await app.inject({
                method: "POST",
                url: "/tools",
            });
            // Assert
            expect(response.statusCode).toBe(403);
        });
        it("should handle unauthenticated user accessing protected route", async () => {
            // Arrange - mockUser is already null
            app.get("/protected", {
                preHandler: [app.requirePermission("read", "User")],
            }, async () => ({ ok: true }));
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/protected",
            });
            // Assert
            expect(response.statusCode).toBe(403);
        });
        it("should handle group hierarchy permission check", async () => {
            // Arrange
            mockUser = createMockUser();
            const mockMemberships = [
                createMockGroupMembership({ role: "group_admin", groupId: "group-1" }),
            ];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            vi.mocked(db.query.groups.findMany).mockResolvedValue([
                { id: "group-1", path: "district.school1" },
            ]);
            app.get("/check-hierarchy", async (request) => {
                const paths = await app.getGroupPaths(["group-1"]);
                return { paths };
            });
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/check-hierarchy",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.paths).toEqual([
                { groupId: "group-1", path: "district.school1" },
            ]);
        });
    });
    describe("edge cases", () => {
        it("should handle database query failures gracefully", async () => {
            // Arrange
            mockUser = createMockUser();
            vi.mocked(db.query.groupMembers.findMany).mockRejectedValue(new Error("Database connection failed"));
            app.get("/test", async (request) => {
                return { canManage: request.ability.can("manage", "all") };
            });
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/test",
            });
            // Assert - Fastify returns 500 for unhandled errors
            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.message).toContain("Database connection failed");
        });
        it("should handle user with deleted group memberships", async () => {
            // Arrange
            mockUser = createMockUser();
            // In real scenario, soft-deleted groups would be filtered out in query
            const mockMemberships = [];
            vi.mocked(db.query.groupMembers.findMany).mockResolvedValue(mockMemberships);
            app.get("/test", async (request) => {
                return {
                    canCreate: request.ability.can("create", "Tool"),
                    canRead: request.ability.can("read", subject("User", { id: mockUser.id })),
                };
            });
            // Act
            const response = await app.inject({
                method: "GET",
                url: "/test",
            });
            // Assert
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.canCreate).toBe(false); // No groups = no tool creation
            expect(body.canRead).toBe(true); // Can still read own profile
        });
    });
});
//# sourceMappingURL=permissions.test.js.map