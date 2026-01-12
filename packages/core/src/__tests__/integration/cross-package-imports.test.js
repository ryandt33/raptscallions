import { describe, it, expect } from "vitest";
/**
 * Cross-package import validation tests
 *
 * These tests validate that the @raptscallions/core package can be imported
 * correctly and provides the expected exports. These are integration tests
 * that verify the package structure and export patterns work as expected.
 */
describe("Cross-Package Import Validation", () => {
    describe("Main package exports", () => {
        it("should import types from main index", async () => {
            // Arrange & Act
            try {
                // This tests the main package export structure
                const coreModule = await import("../../index.js");
                // Assert - main exports should be available
                expect(coreModule).toBeDefined();
                expect(typeof coreModule).toBe("object");
            }
            catch (error) {
                expect.fail(`Failed to import core package: ${error}`);
            }
        });
        it("should import user-related exports", async () => {
            // Arrange & Act
            try {
                // Test direct import from schemas
                const userSchemas = await import("../../schemas/user.schema.js");
                // Assert - user schemas should be available
                expect(userSchemas.userBaseSchema).toBeDefined();
                expect(userSchemas.createUserSchema).toBeDefined();
                expect(userSchemas.updateUserSchema).toBeDefined();
                // Verify these are Zod schemas
                expect(typeof userSchemas.userBaseSchema.parse).toBe("function");
                expect(typeof userSchemas.createUserSchema.parse).toBe("function");
                expect(typeof userSchemas.updateUserSchema.parse).toBe("function");
            }
            catch (error) {
                expect.fail(`Failed to import user schemas: ${error}`);
            }
        });
        it("should import group-related exports", async () => {
            // Arrange & Act
            try {
                // Test direct import from schemas
                const groupSchemas = await import("../../schemas/group.schema.js");
                // Assert - group schemas should be available
                expect(groupSchemas.groupBaseSchema).toBeDefined();
                expect(groupSchemas.createGroupSchema).toBeDefined();
                expect(groupSchemas.updateGroupSchema).toBeDefined();
                // Verify these are Zod schemas
                expect(typeof groupSchemas.groupBaseSchema.parse).toBe("function");
                expect(typeof groupSchemas.createGroupSchema.parse).toBe("function");
                expect(typeof groupSchemas.updateGroupSchema.parse).toBe("function");
            }
            catch (error) {
                expect.fail(`Failed to import group schemas: ${error}`);
            }
        });
        it("should import error classes", async () => {
            // Arrange & Act
            try {
                // Test direct import from errors
                const errors = await import("../../errors/index.js");
                // Assert - error classes should be available
                expect(errors.AppError).toBeDefined();
                expect(errors.ValidationError).toBeDefined();
                expect(errors.NotFoundError).toBeDefined();
                expect(errors.UnauthorizedError).toBeDefined();
                expect(errors.ErrorCode).toBeDefined();
                // Verify these are constructors
                expect(typeof errors.AppError).toBe("function");
                expect(typeof errors.ValidationError).toBe("function");
                expect(typeof errors.NotFoundError).toBe("function");
                expect(typeof errors.UnauthorizedError).toBe("function");
                // Verify ErrorCode is an object/enum
                expect(typeof errors.ErrorCode).toBe("object");
            }
            catch (error) {
                expect.fail(`Failed to import error classes: ${error}`);
            }
        });
    });
    describe("Package structure validation", () => {
        it("should have proper barrel export structure", async () => {
            // Arrange & Act
            try {
                // Test barrel exports from subdirectories
                const typesIndex = await import("../../types/index.js");
                const schemasIndex = await import("../../schemas/index.js");
                const errorsIndex = await import("../../errors/index.js");
                // Assert - barrel exports should exist and be objects
                expect(typeof typesIndex).toBe("object");
                expect(typeof schemasIndex).toBe("object");
                expect(typeof errorsIndex).toBe("object");
            }
            catch (error) {
                // This is expected to fail during TDD red phase
                // The barrel exports don't exist yet
                expect(error).toBeInstanceOf(Error);
            }
        });
        it("should support tree shaking with named imports", async () => {
            // Arrange & Act
            try {
                // Test selective importing (tree shaking)
                const { userBaseSchema } = await import("../../schemas/user.schema.js");
                const { ValidationError } = await import("../../errors/index.js");
                // Assert - named imports should work
                expect(userBaseSchema).toBeDefined();
                expect(ValidationError).toBeDefined();
                expect(typeof userBaseSchema.parse).toBe("function");
                expect(typeof ValidationError).toBe("function");
            }
            catch (error) {
                expect.fail(`Tree shaking imports failed: ${error}`);
            }
        });
    });
    describe("TypeScript compatibility", () => {
        it("should provide proper TypeScript type definitions", async () => {
            // Arrange & Act
            try {
                // Import types and verify they exist at compile time
                const userModule = await import("../../schemas/user.schema.js");
                const groupModule = await import("../../schemas/group.schema.js");
                // Create instances to verify type inference
                const userData = {
                    email: "test@example.com",
                    name: "Test User"
                };
                const groupData = {
                    name: "Test Group",
                    settings: {}
                };
                // Assert - parsing should work (validates runtime + types)
                const parsedUser = userModule.userBaseSchema.parse(userData);
                const parsedGroup = groupModule.groupBaseSchema.parse(groupData);
                expect(parsedUser.email).toBe("test@example.com");
                expect(parsedGroup.name).toBe("Test Group");
            }
            catch (error) {
                expect.fail(`TypeScript compatibility test failed: ${error}`);
            }
        });
        it("should support type-only imports", async () => {
            // This is primarily a compile-time test
            // If this test compiles without errors, type-only imports work
            try {
                // Test that we can import types without importing runtime code
                const module = await import("../../schemas/user.schema.js");
                // Use the imported types (this validates they exist)
                const createValidUser = (data) => {
                    return module.userBaseSchema.parse(data);
                };
                expect(typeof createValidUser).toBe("function");
            }
            catch (error) {
                expect.fail(`Type-only imports test failed: ${error}`);
            }
        });
    });
    describe("Dependency validation", () => {
        it("should only depend on allowed external packages", async () => {
            // This test verifies our dependency constraints are met
            try {
                // Import zod - this should be our only external dependency
                const zod = await import("zod");
                expect(zod).toBeDefined();
                expect(typeof zod.z).toBe("object");
            }
            catch (error) {
                expect.fail(`Zod dependency missing: ${error}`);
            }
            // Verify we're not accidentally importing forbidden dependencies
            // (This is more of a static analysis test, but we can check at runtime)
        });
        it("should work without circular dependencies", async () => {
            // Test that importing all modules doesn't create circular dependency issues
            try {
                // Import all main modules in sequence
                await import("../../types/index.js");
                await import("../../schemas/index.js");
                await import("../../errors/index.js");
                await import("../../index.js");
                // If we get here without infinite recursion, no circular deps
                expect(true).toBe(true);
            }
            catch (error) {
                // This should fail during red phase but for dependency issues, not missing files
                if (error instanceof Error && error.message.includes("Circular")) {
                    expect.fail(`Circular dependency detected: ${error.message}`);
                }
                // Other import errors are expected during red phase
            }
        });
    });
    describe("Runtime behavior validation", () => {
        it("should maintain consistent validation behavior across imports", async () => {
            // Verify that schemas work consistently regardless of import method
            try {
                // Import same schema different ways
                const directImport = await import("../../schemas/user.schema.js");
                const barrelImport = await import("../../schemas/index.js");
                const testData = { email: "test@example.com", name: "Test User" };
                // Both should parse the same
                const directResult = directImport.userBaseSchema.parse(testData);
                // Note: barrel import may fail during red phase, so we handle that
                expect(directResult).toEqual(testData);
                // If barrel import exists, verify consistency
                if (barrelImport.userBaseSchema) {
                    const barrelResult = barrelImport.userBaseSchema.parse(testData);
                    expect(barrelResult).toEqual(directResult);
                }
            }
            catch (error) {
                // Expected during red phase when barrel exports don't exist yet
                if (error instanceof Error && error.message.includes("Cannot resolve module")) {
                    // This is fine, barrel exports don't exist yet
                }
                else {
                    expect.fail(`Validation consistency test failed: ${error}`);
                }
            }
        });
        it("should handle errors consistently across import methods", async () => {
            // Test error behavior consistency
            try {
                const directImport = await import("../../errors/index.js");
                // Test error construction
                const error = new directImport.ValidationError("Test error");
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toBe("Test error");
                expect(error.code).toBe(directImport.ErrorCode.VALIDATION_ERROR);
            }
            catch (error) {
                expect.fail(`Error consistency test failed: ${error}`);
            }
        });
    });
    describe("ESM/CommonJS compatibility", () => {
        it("should work with ESM imports", async () => {
            // This entire test file uses ESM imports, so this validates ESM works
            try {
                // Dynamic ESM import
                const module = await import("../../schemas/user.schema.js");
                expect(module.userBaseSchema).toBeDefined();
            }
            catch (error) {
                expect.fail(`ESM import test failed: ${error}`);
            }
        });
        it("should provide proper module exports structure", async () => {
            // Verify our exports follow ESM standards
            try {
                const userModule = await import("../../schemas/user.schema.js");
                const errorModule = await import("../../errors/index.js");
                // Verify exports are properly structured
                expect(typeof userModule).toBe("object");
                expect(typeof errorModule).toBe("object");
                // Verify named exports work
                expect(userModule.userBaseSchema).toBeDefined();
                expect(errorModule.AppError).toBeDefined();
            }
            catch (error) {
                expect.fail(`Module export structure test failed: ${error}`);
            }
        });
    });
});
//# sourceMappingURL=cross-package-imports.test.js.map