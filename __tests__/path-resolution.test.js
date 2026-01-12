import { describe, it, expect } from "vitest";
describe("Path Resolution in Test Environment", () => {
    describe("Cross-package Imports", () => {
        it("should resolve @raptscallions/core imports", async () => {
            // Arrange
            const importFn = () => import("@raptscallions/core");
            // Act & Assert
            await expect(importFn()).resolves.toBeDefined();
        });
        it("should resolve @raptscallions/db imports", async () => {
            // Arrange
            const importFn = () => import("@raptscallions/db");
            // Act & Assert
            await expect(importFn()).resolves.toBeDefined();
        });
        it("should import AppError from @raptscallions/core", async () => {
            // Arrange & Act
            const { AppError } = await import("@raptscallions/core");
            // Assert
            expect(AppError).toBeDefined();
            expect(typeof AppError).toBe("function");
        });
        it("should import error classes from @raptscallions/core", async () => {
            // Arrange & Act
            const { AppError, ValidationError, NotFoundError, UnauthorizedError, } = await import("@raptscallions/core");
            // Assert
            expect(AppError).toBeDefined();
            expect(ValidationError).toBeDefined();
            expect(NotFoundError).toBeDefined();
            expect(UnauthorizedError).toBeDefined();
        });
        it("should create an error instance from imported class", async () => {
            // Arrange
            const { ValidationError } = await import("@raptscallions/core");
            // Act
            const error = new ValidationError("Test error");
            // Assert
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("Test error");
            expect(error.code).toBe("VALIDATION_ERROR");
            expect(error.statusCode).toBe(400);
        });
        it("should import database client from @raptscallions/db", async () => {
            // Arrange & Act
            const dbModule = await import("@raptscallions/db");
            // Assert
            expect(dbModule).toBeDefined();
            expect(dbModule.db).toBeDefined();
        });
        it("should import schema from @raptscallions/db", async () => {
            // Arrange & Act
            const { schema } = await import("@raptscallions/db");
            // Assert
            expect(schema).toBeDefined();
            expect(schema.users).toBeDefined();
            expect(schema.groups).toBeDefined();
        });
        it("should work with type imports across packages", async () => {
            // Arrange & Act
            const core = await import("@raptscallions/core");
            // Assert - TypeScript should resolve types correctly
            expect(core).toBeDefined();
            // This test verifies compilation succeeds with type imports
        });
    });
    describe("Type Safety with Path Aliases", () => {
        it("should maintain type information across package boundaries", async () => {
            // Arrange
            const { ValidationError } = await import("@raptscallions/core");
            const error = new ValidationError("Test", { field: "email" });
            // Act
            const code = error.code;
            const statusCode = error.statusCode;
            const message = error.message;
            // Assert
            expect(code).toBe("VALIDATION_ERROR");
            expect(statusCode).toBe(400);
            expect(message).toBe("Test");
        });
        it("should resolve types correctly for database schema", async () => {
            // Arrange
            const { schema } = await import("@raptscallions/db");
            // Act - These should compile without type errors
            const usersTable = schema.users;
            const groupsTable = schema.groups;
            // Assert
            expect(usersTable).toBeDefined();
            expect(groupsTable).toBeDefined();
        });
    });
    describe("Test Environment Path Resolution", () => {
        it("should resolve relative imports correctly", () => {
            // Arrange
            const currentFile = __filename;
            // Act & Assert
            expect(currentFile).toBeDefined();
            expect(typeof currentFile).toBe("string");
            expect(currentFile).toContain("path-resolution.test");
        });
        it("should have access to __dirname in test environment", () => {
            // Arrange & Act
            const dir = __dirname;
            // Assert
            expect(dir).toBeDefined();
            expect(typeof dir).toBe("string");
        });
        it("should resolve process.cwd() correctly", () => {
            // Arrange & Act
            const cwd = process.cwd();
            // Assert
            expect(cwd).toBeDefined();
            expect(typeof cwd).toBe("string");
            expect(cwd).toContain("raptscallions");
        });
    });
    describe("Module Resolution Consistency", () => {
        it("should import the same module instance across imports", async () => {
            // Arrange
            const import1 = await import("@raptscallions/core");
            const import2 = await import("@raptscallions/core");
            // Act & Assert
            expect(import1.AppError).toBe(import2.AppError);
        });
        it("should maintain singleton behavior for modules", async () => {
            // Arrange
            const { db: db1 } = await import("@raptscallions/db");
            const { db: db2 } = await import("@raptscallions/db");
            // Act & Assert
            expect(db1).toBe(db2);
        });
    });
});
//# sourceMappingURL=path-resolution.test.js.map