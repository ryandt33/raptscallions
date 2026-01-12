import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../../services/auth.service.js";
import { ConflictError, UnauthorizedError } from "@raptscallions/core";
// Mock dependencies
vi.mock("@node-rs/argon2", () => ({
    hash: vi.fn(),
    verify: vi.fn(),
}));
vi.mock("@raptscallions/db", () => ({
    db: {
        query: {
            users: {
                findFirst: vi.fn(),
            },
        },
        insert: vi.fn(),
    },
}));
vi.mock("@raptscallions/auth", () => ({
    lucia: {
        createSession: vi.fn(),
        invalidateSession: vi.fn(),
        validateSession: vi.fn(),
        createSessionCookie: vi.fn(),
        createBlankSessionCookie: vi.fn(),
        sessionAdapter: {}, // Mock adapter to prevent initialization errors
    },
}));
// Import mocked modules
import { hash, verify } from "@node-rs/argon2";
import { db } from "@raptscallions/db";
import { lucia } from "@raptscallions/auth";
describe("AuthService", () => {
    let service;
    beforeEach(() => {
        service = new AuthService();
        vi.clearAllMocks();
    });
    describe("register", () => {
        it("should create user with hashed password and return session", async () => {
            // Arrange
            const input = {
                email: "test@example.com",
                name: "Test User",
                password: "password123",
            };
            const mockUser = {
                id: "user-123",
                email: input.email,
                name: input.name,
                passwordHash: "hashed-password",
                status: "pending_verification",
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };
            const mockSession = {
                id: "session-123",
                userId: mockUser.id,
                expiresAt: new Date(),
            };
            vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);
            vi.mocked(hash).mockResolvedValue("hashed-password");
            vi.mocked(db.insert).mockReturnValue({
                values: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([mockUser]),
                }),
            });
            vi.mocked(lucia.createSession).mockResolvedValue(mockSession);
            // Act
            const result = await service.register(input);
            // Assert
            expect(result).toEqual({
                user: mockUser,
                sessionId: "session-123",
            });
            expect(hash).toHaveBeenCalledWith(input.password, expect.any(Object));
            expect(lucia.createSession).toHaveBeenCalledWith(mockUser.id, {
                context: "unknown",
                last_activity_at: expect.any(Date),
            });
        });
        it("should throw ConflictError if email already exists", async () => {
            // Arrange
            const input = {
                email: "existing@example.com",
                name: "Test User",
                password: "password123",
            };
            const existingUser = {
                id: "existing-user-id",
                email: input.email,
                name: "Existing User",
                passwordHash: "hash",
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };
            vi.mocked(db.query.users.findFirst).mockResolvedValue(existingUser);
            // Act & Assert
            await expect(service.register(input)).rejects.toThrow(ConflictError);
            await expect(service.register(input)).rejects.toThrow("Email already registered");
            expect(hash).not.toHaveBeenCalled();
        });
        it("should throw error if user creation fails", async () => {
            // Arrange
            const input = {
                email: "test@example.com",
                name: "Test User",
                password: "password123",
            };
            vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);
            vi.mocked(hash).mockResolvedValue("hashed-password");
            vi.mocked(db.insert).mockReturnValue({
                values: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([]), // Empty array = failed
                }),
            });
            // Act & Assert
            await expect(service.register(input)).rejects.toThrow("Failed to create user");
        });
        it("should create session after user registration", async () => {
            // Arrange
            const input = {
                email: "test@example.com",
                name: "Test User",
                password: "password123",
            };
            const mockUser = {
                id: "user-123",
                email: input.email,
                name: input.name,
                passwordHash: "hashed-password",
                status: "pending_verification",
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };
            const mockSession = {
                id: "session-123",
                userId: mockUser.id,
                expiresAt: new Date(),
            };
            vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);
            vi.mocked(hash).mockResolvedValue("hashed-password");
            vi.mocked(db.insert).mockReturnValue({
                values: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([mockUser]),
                }),
            });
            vi.mocked(lucia.createSession).mockResolvedValue(mockSession);
            // Act
            await service.register(input);
            // Assert
            expect(lucia.createSession).toHaveBeenCalledTimes(1);
            expect(lucia.createSession).toHaveBeenCalledWith(mockUser.id, {
                context: "unknown",
                last_activity_at: expect.any(Date),
            });
        });
    });
    describe("login", () => {
        it("should return user and session for valid credentials", async () => {
            // Arrange
            const input = {
                email: "test@example.com",
                password: "password123",
            };
            const mockUser = {
                id: "user-123",
                email: input.email,
                name: "Test User",
                passwordHash: "hashed-password",
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };
            const mockSession = {
                id: "session-123",
                userId: mockUser.id,
                expiresAt: new Date(),
            };
            vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
            vi.mocked(verify).mockResolvedValue(true);
            vi.mocked(lucia.createSession).mockResolvedValue(mockSession);
            // Act
            const result = await service.login(input);
            // Assert
            expect(result).toEqual({
                user: mockUser,
                sessionId: "session-123",
            });
            expect(verify).toHaveBeenCalledWith(mockUser.passwordHash, input.password, expect.any(Object));
        });
        it("should throw UnauthorizedError for non-existent email", async () => {
            // Arrange
            const input = {
                email: "nonexistent@example.com",
                password: "password123",
            };
            vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);
            // Act & Assert
            await expect(service.login(input)).rejects.toThrow(UnauthorizedError);
            await expect(service.login(input)).rejects.toThrow("Invalid credentials");
            expect(verify).not.toHaveBeenCalled();
        });
        it("should throw UnauthorizedError for user without password hash", async () => {
            // Arrange
            const input = {
                email: "oauth@example.com",
                password: "password123",
            };
            const mockUser = {
                id: "user-123",
                email: input.email,
                name: "OAuth User",
                passwordHash: null, // OAuth user without password
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };
            vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
            // Act & Assert
            await expect(service.login(input)).rejects.toThrow(UnauthorizedError);
            await expect(service.login(input)).rejects.toThrow("Invalid credentials");
            expect(verify).not.toHaveBeenCalled();
        });
        it("should throw UnauthorizedError for invalid password", async () => {
            // Arrange
            const input = {
                email: "test@example.com",
                password: "wrong-password",
            };
            const mockUser = {
                id: "user-123",
                email: input.email,
                name: "Test User",
                passwordHash: "hashed-password",
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };
            vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
            vi.mocked(verify).mockResolvedValue(false);
            // Act & Assert
            await expect(service.login(input)).rejects.toThrow(UnauthorizedError);
            await expect(service.login(input)).rejects.toThrow("Invalid credentials");
        });
        it("should create session after successful login", async () => {
            // Arrange
            const input = {
                email: "test@example.com",
                password: "password123",
            };
            const mockUser = {
                id: "user-123",
                email: input.email,
                name: "Test User",
                passwordHash: "hashed-password",
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            };
            const mockSession = {
                id: "session-123",
                userId: mockUser.id,
                expiresAt: new Date(),
            };
            vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
            vi.mocked(verify).mockResolvedValue(true);
            vi.mocked(lucia.createSession).mockResolvedValue(mockSession);
            // Act
            await service.login(input);
            // Assert
            expect(lucia.createSession).toHaveBeenCalledTimes(1);
            expect(lucia.createSession).toHaveBeenCalledWith(mockUser.id, {
                context: "unknown",
                last_activity_at: expect.any(Date),
            });
        });
    });
    describe("logout", () => {
        it("should invalidate session", async () => {
            // Arrange
            const sessionId = "session-123";
            vi.mocked(lucia.invalidateSession).mockResolvedValue();
            // Act
            await service.logout(sessionId);
            // Assert
            expect(lucia.invalidateSession).toHaveBeenCalledWith(sessionId);
            expect(lucia.invalidateSession).toHaveBeenCalledTimes(1);
        });
        it("should handle logout for already invalid session", async () => {
            // Arrange
            const sessionId = "invalid-session";
            vi.mocked(lucia.invalidateSession).mockResolvedValue();
            // Act & Assert
            await expect(service.logout(sessionId)).resolves.toBeUndefined();
            expect(lucia.invalidateSession).toHaveBeenCalledWith(sessionId);
        });
    });
});
//# sourceMappingURL=auth.service.test.js.map