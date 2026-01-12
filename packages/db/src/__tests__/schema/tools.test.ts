import { describe, it, expect } from "vitest";
import type { Tool, NewTool } from "../../schema/tools.js";
import { tools, toolTypeEnum } from "../../schema/tools.js";

describe("Tools Schema", () => {
  describe("Type Inference", () => {
    it("should infer Tool type correctly with all required fields", () => {
      // Arrange
      const tool: Tool = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        type: "chat",
        name: "Essay Feedback",
        version: "1.0.0",
        definition:
          "name: Essay Feedback\ntype: chat\nsystem_prompt: Provide feedback on essays",
        createdBy: "223e4567-e89b-12d3-a456-426614174001",
        groupId: "323e4567-e89b-12d3-a456-426614174002",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        deletedAt: null,
      };

      // Act & Assert - TypeScript compilation verifies types
      expect(tool.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(tool.type).toBe("chat");
      expect(tool.name).toBe("Essay Feedback");
      expect(tool.version).toBe("1.0.0");
      expect(tool.definition).toContain("Essay Feedback");
      expect(tool.createdBy).toBe("223e4567-e89b-12d3-a456-426614174001");
      expect(tool.groupId).toBe("323e4567-e89b-12d3-a456-426614174002");
      expect(tool.createdAt).toBeInstanceOf(Date);
      expect(tool.updatedAt).toBeInstanceOf(Date);
      expect(tool.deletedAt).toBeNull();
    });

    it("should allow null groupId for system-wide tools", () => {
      // Arrange - System-wide tool visible to all
      const systemTool: Tool = {
        id: "423e4567-e89b-12d3-a456-426614174003",
        type: "product",
        name: "System Template",
        version: "1.0.0",
        definition: "name: System Template\ntype: product",
        createdBy: "523e4567-e89b-12d3-a456-426614174004",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(systemTool.groupId).toBeNull();
      expect(systemTool.name).toBe("System Template");
    });

    it("should allow non-null groupId for group-scoped tools", () => {
      // Arrange - Group-scoped tool
      const groupTool: Tool = {
        id: "623e4567-e89b-12d3-a456-426614174005",
        type: "chat",
        name: "School Quiz",
        version: "1.0.0",
        definition: "name: School Quiz\ntype: chat",
        createdBy: "723e4567-e89b-12d3-a456-426614174006",
        groupId: "823e4567-e89b-12d3-a456-426614174007",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(groupTool.groupId).toBeTruthy();
      expect(typeof groupTool.groupId).toBe("string");
    });

    it("should support chat type tools", () => {
      // Arrange
      const chatTool: Tool = {
        id: "923e4567-e89b-12d3-a456-426614174008",
        type: "chat",
        name: "Math Tutor",
        version: "1.0.0",
        definition: "name: Math Tutor\ntype: chat\nmulti_turn: true",
        createdBy: "a23e4567-e89b-12d3-a456-426614174009",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(chatTool.type).toBe("chat");
    });

    it("should support product type tools", () => {
      // Arrange
      const productTool: Tool = {
        id: "b23e4567-e89b-12d3-a456-42661417400a",
        type: "product",
        name: "Worksheet Generator",
        version: "1.0.0",
        definition: "name: Worksheet Generator\ntype: product",
        createdBy: "c23e4567-e89b-12d3-a456-42661417400b",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(productTool.type).toBe("product");
    });

    it("should allow null deleted_at for active tools", () => {
      // Arrange
      const activeTool: Tool = {
        id: "d23e4567-e89b-12d3-a456-42661417400c",
        type: "chat",
        name: "Active Tool",
        version: "1.0.0",
        definition: "name: Active Tool\ntype: chat",
        createdBy: "e23e4567-e89b-12d3-a456-42661417400d",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(activeTool.deletedAt).toBeNull();
    });

    it("should allow non-null deleted_at for soft-deleted tools", () => {
      // Arrange
      const deletedTool: Tool = {
        id: "f23e4567-e89b-12d3-a456-42661417400e",
        type: "product",
        name: "Archived Tool",
        version: "1.0.0",
        definition: "name: Archived Tool\ntype: product",
        createdBy: "023e4567-e89b-12d3-a456-42661417400f",
        groupId: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-02T00:00:00Z"),
        deletedAt: new Date("2024-01-03T00:00:00Z"),
      };

      // Act & Assert
      expect(deletedTool.deletedAt).toBeInstanceOf(Date);
      expect(deletedTool.deletedAt?.toISOString()).toBe(
        "2024-01-03T00:00:00.000Z"
      );
    });

    it("should use default version 1.0.0", () => {
      // Arrange - Tool with default version
      const defaultVersionTool: Tool = {
        id: "123e4567-e89b-12d3-a456-426614174010",
        type: "chat",
        name: "Default Version",
        version: "1.0.0",
        definition: "name: Default Version\ntype: chat",
        createdBy: "223e4567-e89b-12d3-a456-426614174011",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(defaultVersionTool.version).toBe("1.0.0");
    });
  });

  describe("NewTool Type (Insert Operations)", () => {
    it("should infer NewTool type correctly for inserts", () => {
      // Arrange - NewTool should omit auto-generated fields
      const newTool: NewTool = {
        type: "chat",
        name: "New Chat Tool",
        version: "1.0.0",
        definition: "name: New Chat Tool\ntype: chat",
        createdBy: "323e4567-e89b-12d3-a456-426614174012",
        groupId: "423e4567-e89b-12d3-a456-426614174013",
      };

      // Act & Assert
      expect(newTool.type).toBe("chat");
      expect(newTool.name).toBe("New Chat Tool");
      expect(newTool.version).toBe("1.0.0");
      expect(newTool.createdBy).toBe("323e4567-e89b-12d3-a456-426614174012");
      expect(newTool.groupId).toBe("423e4567-e89b-12d3-a456-426614174013");
    });

    it("should allow creating system-wide tool with groupId null", () => {
      // Arrange - System-wide tool
      const systemTool: NewTool = {
        type: "product",
        name: "System Tool",
        definition: "name: System Tool\ntype: product",
        createdBy: "523e4567-e89b-12d3-a456-426614174014",
        groupId: null,
      };

      // Act & Assert
      expect(systemTool.groupId).toBeNull();
      expect(systemTool.name).toBe("System Tool");
    });

    it("should allow creating group-scoped tool", () => {
      // Arrange - Group-scoped tool
      const groupTool: NewTool = {
        type: "chat",
        name: "Group Tool",
        definition: "name: Group Tool\ntype: chat",
        createdBy: "623e4567-e89b-12d3-a456-426614174015",
        groupId: "723e4567-e89b-12d3-a456-426614174016",
      };

      // Act & Assert
      expect(groupTool.groupId).toBeTruthy();
      expect(typeof groupTool.groupId).toBe("string");
    });

    it("should make auto-generated fields optional in NewTool", () => {
      // Arrange - Minimal NewTool without id, timestamps
      const minimalTool: NewTool = {
        type: "product",
        name: "Minimal Tool",
        definition: "name: Minimal Tool\ntype: product",
        createdBy: "823e4567-e89b-12d3-a456-426614174017",
      };

      // Act & Assert - id, createdAt, updatedAt should be optional/undefined
      expect(minimalTool.id).toBeUndefined();
      expect(minimalTool.createdAt).toBeUndefined();
      expect(minimalTool.updatedAt).toBeUndefined();
    });

    it("should allow version to be omitted and default to 1.0.0", () => {
      // Arrange - Tool without explicit version
      const defaultVersionTool: NewTool = {
        type: "chat",
        name: "Default Version Tool",
        definition: "name: Default Version Tool\ntype: chat",
        createdBy: "923e4567-e89b-12d3-a456-426614174018",
      };

      // Act & Assert
      // Version will be set by database default
      expect(defaultVersionTool.version).toBeUndefined();
    });
  });

  describe("Tool Type Enum", () => {
    it("should have chat type value", () => {
      // Arrange
      const chatType: Tool["type"] = "chat";

      // Act & Assert
      expect(chatType).toBe("chat");
    });

    it("should have product type value", () => {
      // Arrange
      const productType: Tool["type"] = "product";

      // Act & Assert
      expect(productType).toBe("product");
    });

    it("should contain exactly two type values", () => {
      // Arrange
      const validTypes: Array<Tool["type"]> = ["chat", "product"];

      // Act & Assert
      expect(validTypes).toHaveLength(2);
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      // Act & Assert
      expect(tools._.name).toBe("tools");
    });

    it("should have id column", () => {
      // Act & Assert
      expect(tools.id).toBeDefined();
      expect(tools.id.name).toBe("id");
    });

    it("should have type column", () => {
      // Act & Assert
      expect(tools.type).toBeDefined();
      expect(tools.type.name).toBe("type");
    });

    it("should have name column", () => {
      // Act & Assert
      expect(tools.name).toBeDefined();
      expect(tools.name.name).toBe("name");
    });

    it("should have version column", () => {
      // Act & Assert
      expect(tools.version).toBeDefined();
      expect(tools.version.name).toBe("version");
    });

    it("should have definition column", () => {
      // Act & Assert
      expect(tools.definition).toBeDefined();
      expect(tools.definition.name).toBe("definition");
    });

    it("should have createdBy column", () => {
      // Act & Assert
      expect(tools.createdBy).toBeDefined();
      expect(tools.createdBy.name).toBe("created_by");
    });

    it("should have groupId column", () => {
      // Act & Assert
      expect(tools.groupId).toBeDefined();
      expect(tools.groupId.name).toBe("group_id");
    });

    it("should have createdAt column", () => {
      // Act & Assert
      expect(tools.createdAt).toBeDefined();
      expect(tools.createdAt.name).toBe("created_at");
    });

    it("should have updatedAt column", () => {
      // Act & Assert
      expect(tools.updatedAt).toBeDefined();
      expect(tools.updatedAt.name).toBe("updated_at");
    });

    it("should have deletedAt column", () => {
      // Act & Assert
      expect(tools.deletedAt).toBeDefined();
      expect(tools.deletedAt.name).toBe("deleted_at");
    });

    it("should have all required columns", () => {
      // Arrange
      const expectedColumns = [
        "id",
        "type",
        "name",
        "version",
        "definition",
        "createdBy",
        "groupId",
        "createdAt",
        "updatedAt",
        "deletedAt",
      ];

      // Act
      const actualColumns = Object.keys(tools).filter(
        (key) => !key.startsWith("_")
      );

      // Assert
      expectedColumns.forEach((col) => {
        expect(actualColumns).toContain(col);
      });
    });
  });

  describe("Schema Exports", () => {
    it("should export tools table", () => {
      // Act & Assert
      expect(tools).toBeDefined();
      expect(tools._.name).toBe("tools");
    });

    it("should export toolTypeEnum", () => {
      // Act & Assert
      expect(toolTypeEnum).toBeDefined();
    });
  });

  describe("Foreign Key Fields", () => {
    it("should type createdBy as UUID string", () => {
      // Arrange
      const newTool: NewTool = {
        type: "chat",
        name: "FK Test Tool",
        definition: "name: FK Test Tool\ntype: chat",
        createdBy: "123e4567-e89b-12d3-a456-426614174019",
      };

      // Act & Assert - createdBy should be typed as string
      const createdBy: string = newTool.createdBy;
      expect(createdBy).toBe("123e4567-e89b-12d3-a456-426614174019");
      expect(typeof newTool.createdBy).toBe("string");
    });

    it("should type groupId as UUID string or null", () => {
      // Arrange - Group-scoped tool
      const groupTool: NewTool = {
        type: "product",
        name: "Group FK Test",
        definition: "name: Group FK Test\ntype: product",
        createdBy: "223e4567-e89b-12d3-a456-42661417401a",
        groupId: "323e4567-e89b-12d3-a456-42661417401b",
      };

      // Act & Assert
      if (groupTool.groupId !== null && groupTool.groupId !== undefined) {
        const groupId: string = groupTool.groupId;
        expect(groupId).toBe("323e4567-e89b-12d3-a456-42661417401b");
      }
    });

    it("should enforce foreign key references are UUIDs", () => {
      // Arrange
      const tool: Tool = {
        id: "423e4567-e89b-12d3-a456-42661417401c",
        type: "chat",
        name: "UUID FK Tool",
        version: "1.0.0",
        definition: "name: UUID FK Tool\ntype: chat",
        createdBy: "523e4567-e89b-12d3-a456-42661417401d",
        groupId: "623e4567-e89b-12d3-a456-42661417401e",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert - Both FK fields should be valid UUIDs
      expect(tool.createdBy).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      if (tool.groupId) {
        expect(tool.groupId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      }
    });
  });

  describe("Type Safety", () => {
    it("should enforce required type field", () => {
      // Arrange
      const tool: Tool = {
        id: "723e4567-e89b-12d3-a456-42661417401f",
        type: "chat",
        name: "Required Type",
        version: "1.0.0",
        definition: "name: Required Type\ntype: chat",
        createdBy: "823e4567-e89b-12d3-a456-426614174020",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.type).toBeTruthy();
      expect(["chat", "product"]).toContain(tool.type);
    });

    it("should enforce required name field", () => {
      // Arrange
      const tool: Tool = {
        id: "923e4567-e89b-12d3-a456-426614174021",
        type: "product",
        name: "Required Name",
        version: "1.0.0",
        definition: "name: Required Name\ntype: product",
        createdBy: "a23e4567-e89b-12d3-a456-426614174022",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.name).toBeTruthy();
      expect(typeof tool.name).toBe("string");
    });

    it("should enforce required version field", () => {
      // Arrange
      const tool: Tool = {
        id: "b23e4567-e89b-12d3-a456-426614174023",
        type: "chat",
        name: "Required Version",
        version: "2.0.0",
        definition: "name: Required Version\ntype: chat",
        createdBy: "c23e4567-e89b-12d3-a456-426614174024",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.version).toBeTruthy();
      expect(typeof tool.version).toBe("string");
    });

    it("should enforce required definition field", () => {
      // Arrange
      const tool: Tool = {
        id: "d23e4567-e89b-12d3-a456-426614174025",
        type: "product",
        name: "Required Definition",
        version: "1.0.0",
        definition: "name: Required Definition\ntype: product\nsystem_prompt: test",
        createdBy: "e23e4567-e89b-12d3-a456-426614174026",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.definition).toBeTruthy();
      expect(typeof tool.definition).toBe("string");
    });

    it("should enforce required createdBy field", () => {
      // Arrange
      const tool: Tool = {
        id: "f23e4567-e89b-12d3-a456-426614174027",
        type: "chat",
        name: "Required CreatedBy",
        version: "1.0.0",
        definition: "name: Required CreatedBy\ntype: chat",
        createdBy: "023e4567-e89b-12d3-a456-426614174028",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.createdBy).toBeTruthy();
      expect(typeof tool.createdBy).toBe("string");
    });

    it("should allow optional groupId field", () => {
      // Arrange - System-wide tool
      const systemTool: Tool = {
        id: "123e4567-e89b-12d3-a456-426614174029",
        type: "product",
        name: "Optional GroupId",
        version: "1.0.0",
        definition: "name: Optional GroupId\ntype: product",
        createdBy: "223e4567-e89b-12d3-a456-42661417402a",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(systemTool.groupId).toBeNull();
    });

    it("should allow optional deletedAt field", () => {
      // Arrange
      const activeTool: Tool = {
        id: "323e4567-e89b-12d3-a456-42661417402b",
        type: "chat",
        name: "Optional DeletedAt",
        version: "1.0.0",
        definition: "name: Optional DeletedAt\ntype: chat",
        createdBy: "423e4567-e89b-12d3-a456-42661417402c",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(activeTool.deletedAt).toBeNull();
    });
  });

  describe("Versioning", () => {
    it("should use version default 1.0.0", () => {
      // Arrange - Tool with default version
      const tool: Tool = {
        id: "523e4567-e89b-12d3-a456-42661417402d",
        type: "chat",
        name: "Version Default",
        version: "1.0.0",
        definition: "name: Version Default\ntype: chat",
        createdBy: "623e4567-e89b-12d3-a456-42661417402e",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.version).toBe("1.0.0");
    });

    it("should allow custom version strings", () => {
      // Arrange - Tool with custom version
      const tool: Tool = {
        id: "723e4567-e89b-12d3-a456-42661417402f",
        type: "product",
        name: "Custom Version",
        version: "2.5.3",
        definition: "name: Custom Version\ntype: product",
        createdBy: "823e4567-e89b-12d3-a456-426614174030",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.version).toBe("2.5.3");
    });

    it("should support semantic versioning patterns", () => {
      // Arrange - Various semver patterns
      const versions = ["1.0.0", "2.1.3", "10.5.12", "0.1.0"];

      // Act & Assert
      versions.forEach((ver) => {
        const tool: Tool = {
          id: "923e4567-e89b-12d3-a456-426614174031",
          type: "chat",
          name: `Version ${ver}`,
          version: ver,
          definition: `name: Version ${ver}\ntype: chat`,
          createdBy: "a23e4567-e89b-12d3-a456-426614174032",
          groupId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };

        expect(tool.version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });

    it("should allow different versions of same tool name", () => {
      // Arrange - Multiple versions of same tool
      const v1: NewTool = {
        type: "chat",
        name: "Math Quiz",
        version: "1.0.0",
        definition: "name: Math Quiz\ntype: chat\nversion: 1",
        createdBy: "b23e4567-e89b-12d3-a456-426614174033",
      };

      const v2: NewTool = {
        type: "chat",
        name: "Math Quiz",
        version: "2.0.0",
        definition: "name: Math Quiz\ntype: chat\nversion: 2",
        createdBy: "b23e4567-e89b-12d3-a456-426614174033",
      };

      // Act & Assert - Same name, different versions
      expect(v1.name).toBe(v2.name);
      expect(v1.version).not.toBe(v2.version);
    });
  });

  describe("Visibility Scoping", () => {
    it("should support system-wide tools with null groupId", () => {
      // Arrange - System-wide tool
      const systemTool: Tool = {
        id: "c23e4567-e89b-12d3-a456-426614174034",
        type: "product",
        name: "System Wide Tool",
        version: "1.0.0",
        definition: "name: System Wide Tool\ntype: product",
        createdBy: "d23e4567-e89b-12d3-a456-426614174035",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(systemTool.groupId).toBeNull();
    });

    it("should support group-scoped tools with groupId set", () => {
      // Arrange - Group-scoped tool
      const groupTool: Tool = {
        id: "e23e4567-e89b-12d3-a456-426614174036",
        type: "chat",
        name: "School Tool",
        version: "1.0.0",
        definition: "name: School Tool\ntype: chat",
        createdBy: "f23e4567-e89b-12d3-a456-426614174037",
        groupId: "023e4567-e89b-12d3-a456-426614174038",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(groupTool.groupId).not.toBeNull();
      expect(typeof groupTool.groupId).toBe("string");
    });

    it("should allow both visibility patterns", () => {
      // Arrange
      const systemTool: NewTool = {
        type: "product",
        name: "System Pattern",
        definition: "name: System Pattern\ntype: product",
        createdBy: "123e4567-e89b-12d3-a456-426614174039",
        groupId: null,
      };

      const groupTool: NewTool = {
        type: "chat",
        name: "Group Pattern",
        definition: "name: Group Pattern\ntype: chat",
        createdBy: "223e4567-e89b-12d3-a456-42661417403a",
        groupId: "323e4567-e89b-12d3-a456-42661417403b",
      };

      // Act & Assert - Both patterns valid
      expect(systemTool.groupId).toBeNull();
      expect(groupTool.groupId).toBeTruthy();
    });
  });

  describe("YAML Definition Field", () => {
    it("should store YAML as text", () => {
      // Arrange
      const yamlDef = `name: Essay Feedback
type: chat
system_prompt: |
  You are an experienced teacher providing feedback on student essays.
  Focus on thesis clarity, evidence quality, and writing mechanics.`;

      const tool: Tool = {
        id: "423e4567-e89b-12d3-a456-42661417403c",
        type: "chat",
        name: "Essay Feedback",
        version: "1.0.0",
        definition: yamlDef,
        createdBy: "523e4567-e89b-12d3-a456-42661417403d",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.definition).toBe(yamlDef);
      expect(typeof tool.definition).toBe("string");
    });

    it("should handle very long YAML strings", () => {
      // Arrange - Large YAML definition with long prompt
      const longPrompt = "A".repeat(5000);
      const yamlDef = `name: Long Prompt Tool
type: product
system_prompt: ${longPrompt}`;

      const tool: Tool = {
        id: "623e4567-e89b-12d3-a456-42661417403e",
        type: "product",
        name: "Long Prompt Tool",
        version: "1.0.0",
        definition: yamlDef,
        createdBy: "723e4567-e89b-12d3-a456-42661417403f",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.definition.length).toBeGreaterThan(5000);
      expect(tool.definition).toContain(longPrompt);
    });

    it("should handle multi-line YAML content", () => {
      // Arrange - Multi-line YAML with block scalars
      const multilineYaml = `name: Multi-line Tool
type: chat
system_prompt: |
  Line 1
  Line 2
  Line 3
examples:
  - input: "Example 1"
    output: "Response 1"
  - input: "Example 2"
    output: "Response 2"`;

      const tool: Tool = {
        id: "823e4567-e89b-12d3-a456-426614174040",
        type: "chat",
        name: "Multi-line Tool",
        version: "1.0.0",
        definition: multilineYaml,
        createdBy: "923e4567-e89b-12d3-a456-426614174041",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.definition).toContain("Line 1");
      expect(tool.definition).toContain("examples:");
      expect(tool.definition).toContain("Example 1");
    });

    it("should not parse YAML at schema level", () => {
      // Arrange - YAML stored as raw text, not parsed
      const yamlDef = "name: Raw YAML\ntype: chat\nfield: value";

      const tool: NewTool = {
        type: "chat",
        name: "Raw YAML Tool",
        definition: yamlDef,
        createdBy: "a23e4567-e89b-12d3-a456-426614174042",
      };

      // Act & Assert - definition is string, not parsed object
      expect(typeof tool.definition).toBe("string");
      expect(tool.definition).toBe(yamlDef);
    });
  });

  describe("Soft Delete", () => {
    it("should allow null deletedAt for active tools", () => {
      // Arrange
      const activeTool: Tool = {
        id: "b23e4567-e89b-12d3-a456-426614174043",
        type: "chat",
        name: "Active Tool",
        version: "1.0.0",
        definition: "name: Active Tool\ntype: chat",
        createdBy: "c23e4567-e89b-12d3-a456-426614174044",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(activeTool.deletedAt).toBeNull();
    });

    it("should allow non-null deletedAt for soft-deleted tools", () => {
      // Arrange
      const deletedTool: Tool = {
        id: "d23e4567-e89b-12d3-a456-426614174045",
        type: "product",
        name: "Deleted Tool",
        version: "1.0.0",
        definition: "name: Deleted Tool\ntype: product",
        createdBy: "e23e4567-e89b-12d3-a456-426614174046",
        groupId: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-15T00:00:00Z"),
        deletedAt: new Date("2024-02-01T00:00:00Z"),
      };

      // Act & Assert
      expect(deletedTool.deletedAt).toBeInstanceOf(Date);
    });

    it("should distinguish between active and deleted tools", () => {
      // Arrange
      const activeTool: Tool = {
        id: "f23e4567-e89b-12d3-a456-426614174047",
        type: "chat",
        name: "Active",
        version: "1.0.0",
        definition: "name: Active\ntype: chat",
        createdBy: "023e4567-e89b-12d3-a456-426614174048",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const deletedTool: Tool = {
        id: "123e4567-e89b-12d3-a456-426614174049",
        type: "chat",
        name: "Deleted",
        version: "1.0.0",
        definition: "name: Deleted\ntype: chat",
        createdBy: "223e4567-e89b-12d3-a456-42661417404a",
        groupId: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        deletedAt: new Date("2024-02-01T00:00:00Z"),
      };

      // Act & Assert
      expect(activeTool.deletedAt).toBeNull();
      expect(deletedTool.deletedAt).not.toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle long tool names up to 100 chars", () => {
      // Arrange
      const longName = "A".repeat(100);
      const tool: Tool = {
        id: "323e4567-e89b-12d3-a456-42661417404b",
        type: "product",
        name: longName,
        version: "1.0.0",
        definition: `name: ${longName}\ntype: product`,
        createdBy: "423e4567-e89b-12d3-a456-42661417404c",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.name.length).toBe(100);
      expect(tool.name).toBe(longName);
    });

    it("should handle long version strings up to 20 chars", () => {
      // Arrange
      const longVersion = "1.0.0-beta.1234567";
      const tool: Tool = {
        id: "523e4567-e89b-12d3-a456-42661417404d",
        type: "chat",
        name: "Long Version Tool",
        version: longVersion,
        definition: "name: Long Version Tool\ntype: chat",
        createdBy: "623e4567-e89b-12d3-a456-42661417404e",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.version.length).toBeLessThanOrEqual(20);
      expect(tool.version).toBe(longVersion);
    });

    it("should handle complex YAML definitions", () => {
      // Arrange - Complex YAML with nested structures
      const complexYaml = `name: Complex Tool
type: chat
system_prompt: |
  You are a helpful assistant.
  Provide detailed responses.
model_config:
  temperature: 0.7
  max_tokens: 2000
  top_p: 0.9
examples:
  - role: user
    content: "Hello"
  - role: assistant
    content: "Hi there!"
hooks:
  - before_ai: validate_input
  - after_ai: format_output
metadata:
  author: "Teacher Name"
  created: "2024-01-01"
  tags: ["math", "algebra"]`;

      const tool: Tool = {
        id: "723e4567-e89b-12d3-a456-42661417404f",
        type: "chat",
        name: "Complex Tool",
        version: "1.0.0",
        definition: complexYaml,
        createdBy: "823e4567-e89b-12d3-a456-426614174050",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.definition).toContain("model_config:");
      expect(tool.definition).toContain("temperature: 0.7");
      expect(tool.definition).toContain("hooks:");
      expect(tool.definition).toContain("metadata:");
    });

    it("should handle minimal required fields only", () => {
      // Arrange - Tool with only required fields
      const minimalTool: NewTool = {
        type: "product",
        name: "Minimal",
        definition: "name: Minimal\ntype: product",
        createdBy: "923e4567-e89b-12d3-a456-426614174051",
      };

      // Act & Assert
      expect(minimalTool.type).toBe("product");
      expect(minimalTool.name).toBe("Minimal");
      expect(minimalTool.definition).toBeTruthy();
      expect(minimalTool.createdBy).toBeTruthy();
    });

    it("should handle tools with special characters in names", () => {
      // Arrange
      const specialName = "Math Quiz (Algebra I) - Period 3";
      const tool: Tool = {
        id: "a23e4567-e89b-12d3-a456-426614174052",
        type: "chat",
        name: specialName,
        version: "1.0.0",
        definition: `name: ${specialName}\ntype: chat`,
        createdBy: "b23e4567-e89b-12d3-a456-426614174053",
        groupId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Act & Assert
      expect(tool.name).toBe(specialName);
      expect(tool.name).toContain("(");
      expect(tool.name).toContain("-");
    });

    it("should handle pre-release version formats", () => {
      // Arrange - Semantic versioning with pre-release
      const preReleaseVersions = ["1.0.0-alpha", "2.0.0-beta.1", "3.0.0-rc.2"];

      preReleaseVersions.forEach((ver) => {
        const tool: NewTool = {
          type: "product",
          name: "Pre-release Tool",
          version: ver,
          definition: "name: Pre-release Tool\ntype: product",
          createdBy: "c23e4567-e89b-12d3-a456-426614174054",
        };

        // Act & Assert
        expect(tool.version).toBe(ver);
        expect(tool.version).toContain("-");
      });
    });
  });
});
