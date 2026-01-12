import { describe, it, expect } from "vitest";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";
describe("Vitest Configuration", () => {
    describe("Root Configuration Files", () => {
        it("should have vitest.config.ts at root level", () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            // Act
            const exists = existsSync(configPath);
            // Assert
            expect(exists).toBe(true);
        });
        it("should have vitest.workspace.ts at root level", () => {
            // Arrange
            const workspacePath = resolve(process.cwd(), "vitest.workspace.ts");
            // Act
            const exists = existsSync(workspacePath);
            // Assert
            expect(exists).toBe(true);
        });
    });
    describe("Root Dependencies", () => {
        it("should have vitest installed at root level", () => {
            // Arrange
            const packageJsonPath = resolve(process.cwd(), "package.json");
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
            // Act
            const hasVitest = Boolean(packageJson.devDependencies?.vitest ||
                packageJson.dependencies?.vitest);
            // Assert
            expect(hasVitest).toBe(true);
        });
        it("should have @vitest/coverage-v8 installed at root level", () => {
            // Arrange
            const packageJsonPath = resolve(process.cwd(), "package.json");
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
            // Act
            const hasCoverage = Boolean(packageJson.devDependencies?.["@vitest/coverage-v8"] ||
                packageJson.dependencies?.["@vitest/coverage-v8"]);
            // Assert
            expect(hasCoverage).toBe(true);
        });
        it("should have @vitest/ui installed at root level", () => {
            // Arrange
            const packageJsonPath = resolve(process.cwd(), "package.json");
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
            // Act
            const hasUI = Boolean(packageJson.devDependencies?.["@vitest/ui"] ||
                packageJson.dependencies?.["@vitest/ui"]);
            // Assert
            expect(hasUI).toBe(true);
        });
    });
    describe("Root Scripts", () => {
        it("should have test script in root package.json", () => {
            // Arrange
            const packageJsonPath = resolve(process.cwd(), "package.json");
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
            // Act
            const testScript = packageJson.scripts?.test;
            // Assert
            expect(testScript).toBeDefined();
            expect(testScript).toContain("vitest");
        });
        it("should have test:coverage script in root package.json", () => {
            // Arrange
            const packageJsonPath = resolve(process.cwd(), "package.json");
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
            // Act
            const coverageScript = packageJson.scripts?.["test:coverage"];
            // Assert
            expect(coverageScript).toBeDefined();
            expect(coverageScript).toContain("coverage");
        });
        it("should have test:watch script in root package.json", () => {
            // Arrange
            const packageJsonPath = resolve(process.cwd(), "package.json");
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
            // Act
            const watchScript = packageJson.scripts?.["test:watch"];
            // Assert
            expect(watchScript).toBeDefined();
            expect(watchScript).toContain("vitest");
        });
        it("should have test:ui script in root package.json", () => {
            // Arrange
            const packageJsonPath = resolve(process.cwd(), "package.json");
            const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
            // Act
            const uiScript = packageJson.scripts?.["test:ui"];
            // Assert
            expect(uiScript).toBeDefined();
            expect(uiScript).toContain("ui");
        });
    });
    describe("Package Configurations", () => {
        const packages = ["core", "db", "modules", "telemetry"];
        packages.forEach((packageName) => {
            it(`should have vitest.config.ts in packages/${packageName}`, () => {
                // Arrange
                const configPath = resolve(process.cwd(), `packages/${packageName}/vitest.config.ts`);
                // Act
                const exists = existsSync(configPath);
                // Assert
                expect(exists).toBe(true);
            });
            it(`packages/${packageName} vitest.config.ts should extend root config`, () => {
                // Arrange
                const configPath = resolve(process.cwd(), `packages/${packageName}/vitest.config.ts`);
                // Act
                const configContent = readFileSync(configPath, "utf-8");
                // Assert
                expect(configContent).toContain("mergeConfig");
                expect(configContent).toContain("baseConfig");
                expect(configContent).toContain("../../vitest.config");
            });
            it(`packages/${packageName} should have test scripts in package.json`, () => {
                // Arrange
                const packageJsonPath = resolve(process.cwd(), `packages/${packageName}/package.json`);
                const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
                // Act
                const testScript = packageJson.scripts?.test;
                const watchScript = packageJson.scripts?.["test:watch"];
                // Assert
                expect(testScript).toBeDefined();
                expect(testScript).toContain("vitest");
                expect(watchScript).toBeDefined();
                expect(watchScript).toContain("vitest");
            });
        });
    });
    describe("Workspace Configuration", () => {
        it("should define all packages in workspace", async () => {
            // Arrange
            const workspacePath = resolve(process.cwd(), "vitest.workspace.ts");
            const workspaceContent = readFileSync(workspacePath, "utf-8");
            // Act & Assert
            expect(workspaceContent).toContain("packages/core");
            expect(workspaceContent).toContain("packages/db");
            expect(workspaceContent).toContain("packages/modules");
            expect(workspaceContent).toContain("packages/telemetry");
        });
    });
    describe("Root Config Structure", () => {
        it("should configure globals: true", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("globals: true");
        });
        it("should configure environment: node", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("environment: 'node'");
        });
        it("should include test file patterns", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("*.test.ts");
            expect(configContent).toContain("__tests__");
        });
        it("should configure v8 coverage provider", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("provider: 'v8'");
        });
        it("should configure coverage thresholds at 80%", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("lines: 80");
            expect(configContent).toContain("functions: 80");
            expect(configContent).toContain("branches: 80");
            expect(configContent).toContain("statements: 80");
        });
        it("should configure coverage reporters", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("reporter:");
            expect(configContent).toContain("text");
            expect(configContent).toContain("json-summary");
            expect(configContent).toContain("html");
        });
        it("should exclude node_modules from coverage", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("**/node_modules/**");
        });
        it("should exclude dist from coverage", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("**/dist/**");
        });
        it("should exclude config files from coverage", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("**/*.config.*");
        });
        it("should exclude migrations from coverage", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("**/migrations/**");
        });
        it("should exclude test files from coverage", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("**/__tests__/**");
        });
    });
    describe("Path Aliases", () => {
        it("should configure @raptscallions/core alias", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("@raptscallions/core");
            expect(configContent).toContain("packages/core/src");
        });
        it("should configure @raptscallions/db alias", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("@raptscallions/db");
            expect(configContent).toContain("packages/db/src");
        });
        it("should configure @raptscallions/modules alias", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("@raptscallions/modules");
            expect(configContent).toContain("packages/modules/src");
        });
        it("should configure @raptscallions/telemetry alias", async () => {
            // Arrange
            const configPath = resolve(process.cwd(), "vitest.config.ts");
            const configContent = readFileSync(configPath, "utf-8");
            // Act & Assert
            expect(configContent).toContain("@raptscallions/telemetry");
            expect(configContent).toContain("packages/telemetry/src");
        });
    });
});
//# sourceMappingURL=vitest-config.test.js.map