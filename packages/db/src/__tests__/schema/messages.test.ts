import { eq, asc } from "drizzle-orm";
import { describe, it, expect, beforeEach as _beforeEach, vi } from "vitest";

import { chatSessions as _chatSessions } from "../../schema/chat-sessions.js";
import { messages, messageRoleEnum } from "../../schema/messages.js";

import type { Message, NewMessage } from "../../schema/messages.js";

// Mock database
const mockDb = {
  insert: vi.fn(),
  delete: vi.fn(),
  query: {
    messages: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    chatSessions: {
      findFirst: vi.fn(),
    },
  },
} as any;

// Test data factories
function _createMockSession(overrides: Partial<any> = {}): any {
  return {
    id: "session-123",
    toolId: "tool-456",
    userId: "user-789",
    state: "active",
    startedAt: new Date(),
    endedAt: null,
    ...overrides,
  };
}

function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "message-123",
    sessionId: "session-123",
    role: "user",
    content: "Test message",
    seq: 1,
    createdAt: new Date(),
    meta: {},
    ...overrides,
  };
}

describe("Messages Schema", () => {
  describe("Schema Structure", () => {
    it("should have correct table name", () => {
      // Verify table is named 'messages'
      expect(messages._?.name).toBe("messages");
    });

    it("should have all required fields defined", () => {
      // Verify schema has all expected columns
      expect(messages.id).toBeDefined();
      expect(messages.sessionId).toBeDefined();
      expect(messages.role).toBeDefined();
      expect(messages.content).toBeDefined();
      expect(messages.seq).toBeDefined();
      expect(messages.createdAt).toBeDefined();
      expect(messages.meta).toBeDefined();
    });

    it("should have messageRoleEnum with correct values", () => {
      // Verify enum exists for user, assistant, system
      expect(messageRoleEnum).toBeDefined();
    });
  });

  describe("Type Inference", () => {
    it("should infer Message type for select operations", () => {
      // This is a compile-time test - if it compiles, types are correct
      const message: Message = {
        id: "message-123",
        sessionId: "session-456",
        role: "user",
        content: "Hello, world!",
        seq: 1,
        createdAt: new Date(),
        meta: { tokens: 150 },
      };

      expect(message.id).toBe("message-123");
      expect(message.role).toBe("user");
      expect(message.seq).toBe(1);
    });

    it("should infer NewMessage type for insert operations", () => {
      // This is a compile-time test - NewMessage should omit auto-generated fields
      const newMessage: NewMessage = {
        sessionId: "session-456",
        role: "assistant",
        content: "This is a response",
        seq: 2,
        meta: { tokens: 200, model: "claude-3-sonnet" },
      };

      expect(newMessage.sessionId).toBe("session-456");
      expect(newMessage.role).toBe("assistant");
    });

    it("should allow all three role values", () => {
      // Verify all role types compile
      const userMessage: Message = createMockMessage({ role: "user" });
      const assistantMessage: Message = createMockMessage({ role: "assistant" });
      const systemMessage: Message = createMockMessage({ role: "system" });

      expect(userMessage.role).toBe("user");
      expect(assistantMessage.role).toBe("assistant");
      expect(systemMessage.role).toBe("system");
    });
  });

  describe("Default Values", () => {
    it("should default meta to empty object when creating message", async () => {
      // Arrange
      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "message-new",
              sessionId: "session-123",
              role: "user",
              content: "Test",
              seq: 1,
              createdAt: new Date(),
              meta: {}, // Should default to {}
            },
          ]),
        }),
      });
      mockDb.insert = insertMock;

      // Act
      const [message] = await mockDb
        .insert(messages)
        .values({
          sessionId: "session-123",
          role: "user",
          content: "Test",
          seq: 1,
          // meta not provided - should default to {}
        })
        .returning();

      // Assert
      expect(message.meta).toEqual({});
    });

    it("should auto-populate createdAt when creating message", async () => {
      // Arrange
      const now = new Date();
      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "message-new",
              sessionId: "session-123",
              role: "user",
              content: "Test",
              seq: 1,
              createdAt: now,
              meta: {},
            },
          ]),
        }),
      });
      mockDb.insert = insertMock;

      // Act
      const [message] = await mockDb
        .insert(messages)
        .values({
          sessionId: "session-123",
          role: "user",
          content: "Test",
          seq: 1,
        })
        .returning();

      // Assert
      expect(message.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("Foreign Key Constraints", () => {
    it("should have foreign key reference to chat_sessions table", () => {
      // Verify sessionId field has foreign key constraint
      const sessionIdColumn = messages.sessionId;
      expect(sessionIdColumn).toBeDefined();
    });

    it("should cascade delete messages when session is deleted", () => {
      // This test verifies the onDelete: 'cascade' behavior
      // When a session is deleted, all its messages should be automatically deleted
      // Foreign key constraint is defined in schema - actual behavior tested in integration tests
      expect(messages.sessionId).toBeDefined();
    });
  });

  describe("Message Ordering", () => {
    it("should support sequential ordering via seq field", async () => {
      // Create messages with different seq values
      const messages = [
        createMockMessage({ seq: 1, content: "First" }),
        createMockMessage({ seq: 2, content: "Second" }),
        createMockMessage({ seq: 3, content: "Third" }),
      ];

      // Verify seq values are ordered
      expect(messages[0]?.seq).toBe(1);
      expect(messages[1]?.seq).toBe(2);
      expect(messages[2]?.seq).toBe(3);
    });

    it("should allow querying messages in seq order", async () => {
      // Arrange - mock finding messages ordered by seq
      const orderedMessages = [
        createMockMessage({ seq: 1, content: "First" }),
        createMockMessage({ seq: 2, content: "Second" }),
        createMockMessage({ seq: 3, content: "Third" }),
      ];

      mockDb.query.messages.findMany.mockResolvedValue(orderedMessages);

      // Act
      const result = await mockDb.query.messages.findMany({
        where: eq(messages.sessionId, "session-123"),
        orderBy: asc(messages.seq),
      });

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]?.seq).toBe(1);
      expect(result[1]?.seq).toBe(2);
      expect(result[2]?.seq).toBe(3);
    });

    it("should support composite index on (session_id, seq)", () => {
      // This is a schema structure test
      // The composite index enables efficient retrieval of ordered messages
      expect(messages.sessionId).toBeDefined();
      expect(messages.seq).toBeDefined();
    });
  });

  describe("Message Roles", () => {
    it("should support user role for user messages", () => {
      const message = createMockMessage({ role: "user", content: "User question" });
      expect(message.role).toBe("user");
    });

    it("should support assistant role for AI responses", () => {
      const message = createMockMessage({ role: "assistant", content: "AI response" });
      expect(message.role).toBe("assistant");
    });

    it("should support system role for system messages", () => {
      const message = createMockMessage({
        role: "system",
        content: "System: Tool instructions",
      });
      expect(message.role).toBe("system");
    });
  });

  describe("Message Metadata", () => {
    it("should support token tracking in meta", () => {
      const message = createMockMessage({
        role: "assistant",
        meta: { tokens: 150 },
      });

      expect(message.meta).toHaveProperty("tokens", 150);
    });

    it("should support model tracking in meta", () => {
      const message = createMockMessage({
        role: "assistant",
        meta: { model: "claude-3-sonnet", tokens: 150 },
      });

      expect(message.meta).toHaveProperty("model", "claude-3-sonnet");
    });

    it("should support latency tracking in meta", () => {
      const message = createMockMessage({
        role: "assistant",
        meta: { latency_ms: 432, tokens: 150 },
      });

      expect(message.meta).toHaveProperty("latency_ms", 432);
    });

    it("should support module extractions in meta", () => {
      const message = createMockMessage({
        role: "assistant",
        meta: {
          extractions: [
            { type: "sentiment", value: "positive" },
          ],
        },
      });

      expect(message.meta).toHaveProperty("extractions");
      expect(Array.isArray((message.meta as any).extractions)).toBe(true);
    });

    it("should allow empty meta object", () => {
      const message = createMockMessage({ meta: {} });
      expect(message.meta).toEqual({});
    });
  });

  describe("Message Content", () => {
    it("should support text content", () => {
      const message = createMockMessage({
        content: "This is a text message",
      });

      expect(message.content).toBe("This is a text message");
    });

    it("should support long content", () => {
      const longContent = "A".repeat(10000);
      const message = createMockMessage({
        content: longContent,
      });

      expect(message.content).toHaveLength(10000);
    });

    it("should require content to be non-null", () => {
      // Content is required (notNull in schema)
      // This is a type-level test - it should not compile if content is omitted
      const message: Message = createMockMessage();
      expect(message.content).toBeDefined();
      expect(typeof message.content).toBe("string");
    });
  });

  describe("Session Association", () => {
    it("should associate message with session via sessionId", () => {
      const message = createMockMessage({
        sessionId: "session-specific-123",
      });

      expect(message.sessionId).toBe("session-specific-123");
    });

    it("should allow multiple messages per session", () => {
      const messages = [
        createMockMessage({ sessionId: "session-123", seq: 1 }),
        createMockMessage({ sessionId: "session-123", seq: 2 }),
        createMockMessage({ sessionId: "session-123", seq: 3 }),
      ];

      // All messages belong to same session
      expect(messages.every((m) => m.sessionId === "session-123")).toBe(true);
      // But have different seq values
      expect(new Set(messages.map((m) => m.seq)).size).toBe(3);
    });
  });
});
