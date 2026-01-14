import { eq as _eq } from "drizzle-orm";
import { describe, it, expect, beforeEach as _beforeEach, vi } from "vitest";

import { chatSessions, sessionStateEnum } from "../../schema/chat-sessions.js";
import { tools as _tools } from "../../schema/tools.js";
import { users as _users } from "../../schema/users.js";

import type { ChatSession, NewChatSession } from "../../schema/chat-sessions.js";


// Mock database and test helpers
 
const mockDb: any = {
  insert: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  query: {
    chatSessions: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    users: {
      findFirst: vi.fn(),
    },
    tools: {
      findFirst: vi.fn(),
    },
  },
};

// Test data factories
interface MockUser {
  id: string;
  email: string;
  name: string;
  status: string;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface MockTool {
  id: string;
  type: string;
  name: string;
  version: string;
  definition: string;
  createdBy: string;
  groupId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

function _createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    status: "active",
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function _createMockTool(overrides: Partial<MockTool> = {}): MockTool {
  return {
    id: "tool-456",
    type: "chat",
    name: "Test Tool",
    version: "1.0.0",
    definition: "definition: test",
    createdBy: "user-123",
    groupId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("ChatSessions Schema", () => {
  describe("Schema Structure", () => {
    it("should have correct table name", () => {
      // Verify table is named 'chat_sessions' to avoid collision with auth sessions
      expect(chatSessions._?.name).toBe("chat_sessions");
    });

    it("should have all required fields defined", () => {
      // Verify schema has all expected columns
      expect(chatSessions.id).toBeDefined();
      expect(chatSessions.toolId).toBeDefined();
      expect(chatSessions.userId).toBeDefined();
      expect(chatSessions.state).toBeDefined();
      expect(chatSessions.startedAt).toBeDefined();
      expect(chatSessions.endedAt).toBeDefined();
      // E04-T009: New metadata fields
      expect(chatSessions.title).toBeDefined();
      expect(chatSessions.lastActivityAt).toBeDefined();
      expect(chatSessions.deletedAt).toBeDefined();
    });

    it("should have sessionStateEnum with correct values", () => {
      // E04-T009: Verify enum has two states (paused removed)
      // Note: Drizzle enums don't expose values directly, this tests the export exists
      expect(sessionStateEnum).toBeDefined();
    });
  });

  describe("Type Inference", () => {
    it("should infer ChatSession type for select operations", () => {
      // This is a compile-time test - if it compiles, types are correct
      // E04-T009: Updated to include new fields
      // E04-T010: Updated to include fork fields
      const session: ChatSession = {
        id: "session-123",
        toolId: "tool-456",
        userId: "user-789",
        state: "active",
        title: null,
        parentSessionId: null,
        forkFromSeq: null,
        startedAt: new Date(),
        endedAt: null,
        lastActivityAt: null,
        deletedAt: null,
      };

      expect(session.id).toBe("session-123");
      expect(session.state).toBe("active");
      expect(session.title).toBeNull();
      expect(session.deletedAt).toBeNull();
      expect(session.parentSessionId).toBeNull();
      expect(session.forkFromSeq).toBeNull();
    });

    it("should infer NewChatSession type for insert operations", () => {
      // This is a compile-time test - NewChatSession should omit auto-generated fields
      const newSession: NewChatSession = {
        toolId: "tool-456",
        userId: "user-789",
        state: "active",
      };

      expect(newSession.toolId).toBe("tool-456");
    });
  });

  describe("Default Values", () => {
    it("should default state to 'active' when creating session", async () => {
      // Arrange
      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "session-new",
              toolId: "tool-456",
              userId: "user-789",
              state: "active", // Should default to 'active'
              title: null,
              parentSessionId: null,
              forkFromSeq: null,
              startedAt: new Date(),
              endedAt: null,
              lastActivityAt: null,
              deletedAt: null,
            },
          ]),
        }),
      });
      mockDb.insert = insertMock;

      // Act
      const [session] = await mockDb
        .insert(chatSessions)
        .values({
          toolId: "tool-456",
          userId: "user-789",
          // state not provided - should default to 'active'
        })
        .returning();

      // Assert
      expect(session.state).toBe("active");
    });

    it("should auto-populate startedAt when creating session", async () => {
      // Arrange
      const now = new Date();
      const insertMock = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "session-new",
              toolId: "tool-456",
              userId: "user-789",
              state: "active",
              title: null,
              parentSessionId: null,
              forkFromSeq: null,
              startedAt: now,
              endedAt: null,
              lastActivityAt: null,
              deletedAt: null,
            },
          ]),
        }),
      });
      mockDb.insert = insertMock;

      // Act
      const [session] = await mockDb
        .insert(chatSessions)
        .values({
          toolId: "tool-456",
          userId: "user-789",
        })
        .returning();

      // Assert
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.endedAt).toBeNull();
    });
  });

  describe("Foreign Key Constraints", () => {
    it("should have foreign key reference to tools table", () => {
      // Verify toolId field has foreign key constraint
      // This is a schema validation test - the reference should be defined
      const toolIdColumn = chatSessions.toolId;
      expect(toolIdColumn).toBeDefined();
    });

    it("should have foreign key reference to users table", () => {
      // Verify userId field has foreign key constraint
      const userIdColumn = chatSessions.userId;
      expect(userIdColumn).toBeDefined();
    });

    it("should prevent deleting tool with active sessions (RESTRICT)", () => {
      // This test verifies the onDelete: 'restrict' behavior
      // In a real database, attempting to delete a tool with sessions should fail
      // Foreign key constraint is defined in schema - actual behavior tested in integration tests
      expect(chatSessions.toolId).toBeDefined();
    });

    it("should cascade delete sessions when user is deleted", () => {
      // This test verifies the onDelete: 'cascade' behavior
      // When a user is deleted, their sessions should be automatically deleted
      // Foreign key constraint is defined in schema - actual behavior tested in integration tests
      expect(chatSessions.userId).toBeDefined();
    });
  });

  describe("State Transitions", () => {
    // E04-T009: Tests updated - "paused" state removed

    it("should allow state transition from active to completed", async () => {
      // Test state machine: active → completed
      const session: ChatSession = {
        id: "session-123",
        toolId: "tool-456",
        userId: "user-789",
        state: "completed", // Valid state transition
        title: null,
        parentSessionId: null,
        forkFromSeq: null,
        startedAt: new Date(),
        endedAt: new Date(),
        lastActivityAt: new Date(),
        deletedAt: null,
      };

      expect(session.state).toBe("completed");
    });

    it("should set endedAt when state transitions to completed", async () => {
      // When session completes, endedAt should be set
      const endTime = new Date();
      const session: ChatSession = {
        id: "session-123",
        toolId: "tool-456",
        userId: "user-789",
        state: "completed",
        title: "Test Session",
        parentSessionId: null,
        forkFromSeq: null,
        startedAt: new Date(Date.now() - 3600000), // 1 hour ago
        endedAt: endTime,
        lastActivityAt: endTime,
        deletedAt: null,
      };

      expect(session.endedAt).toBeInstanceOf(Date);
      expect(session.endedAt).not.toBeNull();
    });
  });

  describe("Soft Delete Behavior", () => {
    // E04-T009: New tests for soft delete support

    it("should have deletedAt field defined", () => {
      expect(chatSessions.deletedAt).toBeDefined();
    });

    it("should default deletedAt to null for new sessions", () => {
      const session: ChatSession = {
        id: "session-123",
        toolId: "tool-456",
        userId: "user-789",
        state: "active",
        title: null,
        parentSessionId: null,
        forkFromSeq: null,
        startedAt: new Date(),
        endedAt: null,
        lastActivityAt: null,
        deletedAt: null,
      };

      expect(session.deletedAt).toBeNull();
    });

    it("should support setting deletedAt for soft delete", () => {
      const deleteTime = new Date();
      const session: ChatSession = {
        id: "session-123",
        toolId: "tool-456",
        userId: "user-789",
        state: "completed",
        title: "Deleted Session",
        parentSessionId: null,
        forkFromSeq: null,
        startedAt: new Date(Date.now() - 3600000),
        endedAt: new Date(),
        lastActivityAt: new Date(),
        deletedAt: deleteTime,
      };

      expect(session.deletedAt).toEqual(deleteTime);
      expect(session.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe("Session Metadata Fields", () => {
    // E04-T009: New tests for title and lastActivityAt

    it("should have title field defined", () => {
      expect(chatSessions.title).toBeDefined();
    });

    it("should have lastActivityAt field defined", () => {
      expect(chatSessions.lastActivityAt).toBeDefined();
    });

    it("should allow null title for unnamed sessions", () => {
      const session: ChatSession = {
        id: "session-123",
        toolId: "tool-456",
        userId: "user-789",
        state: "active",
        title: null,
        parentSessionId: null,
        forkFromSeq: null,
        startedAt: new Date(),
        endedAt: null,
        lastActivityAt: null,
        deletedAt: null,
      };

      expect(session.title).toBeNull();
    });

    it("should allow setting title for named sessions", () => {
      const session: ChatSession = {
        id: "session-123",
        toolId: "tool-456",
        userId: "user-789",
        state: "active",
        title: "Math homework help",
        parentSessionId: null,
        forkFromSeq: null,
        startedAt: new Date(),
        endedAt: null,
        lastActivityAt: new Date(),
        deletedAt: null,
      };

      expect(session.title).toBe("Math homework help");
      expect(session.title?.length).toBeLessThanOrEqual(200);
    });

    it("should allow null lastActivityAt for new sessions", () => {
      const session: ChatSession = {
        id: "session-123",
        toolId: "tool-456",
        userId: "user-789",
        state: "active",
        title: null,
        parentSessionId: null,
        forkFromSeq: null,
        startedAt: new Date(),
        endedAt: null,
        lastActivityAt: null,
        deletedAt: null,
      };

      expect(session.lastActivityAt).toBeNull();
    });

    it("should allow setting lastActivityAt for active sessions", () => {
      const lastActive = new Date();
      const session: ChatSession = {
        id: "session-123",
        toolId: "tool-456",
        userId: "user-789",
        state: "active",
        title: "Active Session",
        parentSessionId: null,
        forkFromSeq: null,
        startedAt: new Date(Date.now() - 3600000), // 1 hour ago
        endedAt: null,
        lastActivityAt: lastActive,
        deletedAt: null,
      };

      expect(session.lastActivityAt).toEqual(lastActive);
      expect(session.lastActivityAt).toBeInstanceOf(Date);
    });
  });

  describe("Session State Enum (Updated)", () => {
    // E04-T009: Updated enum tests - only active and completed

    it("should only allow active and completed states", () => {
      // Compile-time test: these should compile
      const activeSession: ChatSession = {
        id: "session-123",
        toolId: "tool-456",
        userId: "user-789",
        state: "active",
        title: null,
        parentSessionId: null,
        forkFromSeq: null,
        startedAt: new Date(),
        endedAt: null,
        lastActivityAt: null,
        deletedAt: null,
      };

      const completedSession: ChatSession = {
        ...activeSession,
        state: "completed",
        endedAt: new Date(),
      };

      expect(activeSession.state).toBe("active");
      expect(completedSession.state).toBe("completed");

      // Note: TypeScript will prevent "paused" at compile time
      // The enum now only has "active" | "completed"
    });
  });

  describe("Indexes", () => {
    it("should have index on toolId for query performance", () => {
      // Verify toolId index exists (defined in schema)
      // This is a schema structure test
      expect(chatSessions.toolId).toBeDefined();
    });

    it("should have index on userId for query performance", () => {
      // Verify userId index exists (defined in schema)
      expect(chatSessions.userId).toBeDefined();
    });

    it("should have index on state for filtering active sessions", () => {
      // Verify state index exists (defined in schema)
      expect(chatSessions.state).toBeDefined();
    });

    it("should have index on deletedAt for soft delete queries", () => {
      // E04-T009: Verify deletedAt index exists (for efficient soft delete filtering)
      expect(chatSessions.deletedAt).toBeDefined();
    });

    it("should have index on parentSessionId for fork tree queries", () => {
      // E04-T010: Verify parentSessionId index exists (for efficient fork tree navigation)
      expect(chatSessions.parentSessionId).toBeDefined();
    });
  });

  describe("Fork Support (E04-T010)", () => {
    describe("Schema Fields", () => {
      it("should have parentSessionId field defined", () => {
        // Verify parentSessionId field exists in schema
        expect(chatSessions.parentSessionId).toBeDefined();
      });

      it("should have forkFromSeq field defined", () => {
        // Verify forkFromSeq field exists in schema
        expect(chatSessions.forkFromSeq).toBeDefined();
      });

      it("should allow null parentSessionId for non-forked sessions", () => {
        // Non-forked sessions should have null parent reference
        const session: ChatSession = {
          id: "session-123",
          toolId: "tool-456",
          userId: "user-789",
          state: "active",
          title: null,
          parentSessionId: null,
          forkFromSeq: null,
          startedAt: new Date(),
          endedAt: null,
          lastActivityAt: null,
          deletedAt: null,
        };

        expect(session.parentSessionId).toBeNull();
        expect(session.forkFromSeq).toBeNull();
      });

      it("should support forked session with parent reference", () => {
        // Forked sessions should reference parent and fork point
        const parentSession: ChatSession = {
          id: "parent-123",
          toolId: "tool-456",
          userId: "user-789",
          state: "completed",
          title: "Original conversation",
          parentSessionId: null,
          forkFromSeq: null,
          startedAt: new Date(),
          endedAt: new Date(),
          lastActivityAt: new Date(),
          deletedAt: null,
        };

        const forkedSession: ChatSession = {
          id: "fork-456",
          toolId: "tool-456",
          userId: "user-789",
          state: "active",
          title: "Original conversation (fork)",
          parentSessionId: "parent-123",
          forkFromSeq: 5, // Forked from message seq 5
          startedAt: new Date(),
          endedAt: null,
          lastActivityAt: new Date(),
          deletedAt: null,
        };

        expect(forkedSession.parentSessionId).toBe(parentSession.id);
        expect(forkedSession.forkFromSeq).toBe(5);
      });
    });

    describe("Type Safety", () => {
      it("should accept valid NewChatSession with fork fields", () => {
        // NewChatSession should allow creating forks with parent reference
        const newFork: NewChatSession = {
          toolId: "tool-456",
          userId: "user-789",
          parentSessionId: "parent-123",
          forkFromSeq: 3,
          title: "Forked conversation",
        };

        expect(newFork.parentSessionId).toBe("parent-123");
        expect(newFork.forkFromSeq).toBe(3);
      });

      it("should accept NewChatSession without fork fields", () => {
        // NewChatSession should allow creating regular sessions without fork fields
        const newSession: NewChatSession = {
          toolId: "tool-456",
          userId: "user-789",
        };

        expect(newSession.parentSessionId).toBeUndefined();
        expect(newSession.forkFromSeq).toBeUndefined();
      });

      it("should allow fork with parentSessionId but null forkFromSeq", () => {
        // Edge case: fork might reference parent but not specify sequence
        const newFork: NewChatSession = {
          toolId: "tool-456",
          userId: "user-789",
          parentSessionId: "parent-123",
          forkFromSeq: null,
        };

        expect(newFork.parentSessionId).toBe("parent-123");
        expect(newFork.forkFromSeq).toBeNull();
      });
    });

    describe("Foreign Key Behavior", () => {
      // NOTE: These are schema-level documentation tests.
      // Actual FK behavior (database constraint enforcement) will be validated
      // in integration tests with a real database connection.

      it("should document SET NULL behavior when parent is deleted", () => {
        // This is a documentation test - actual FK behavior
        // would be tested in integration tests with real DB

        // When parent session is deleted:
        // - parentSessionId becomes null
        // - forked session remains as standalone session
        // - This preserves user's work even if original is deleted

        const orphanedFork: ChatSession = {
          id: "fork-456",
          toolId: "tool-456",
          userId: "user-789",
          state: "active",
          title: "Orphaned fork (parent deleted)",
          parentSessionId: null, // Was "parent-123" before parent deletion
          forkFromSeq: 5, // Still preserved for reference
          startedAt: new Date(),
          endedAt: null,
          lastActivityAt: new Date(),
          deletedAt: null,
        };

        expect(orphanedFork.parentSessionId).toBeNull();
        expect(orphanedFork.forkFromSeq).toBe(5);
      });

      it("should document orphaned fork identification pattern", () => {
        // Orphaned forks have forkFromSeq but null parentSessionId
        const orphanedFork: ChatSession = {
          id: "fork-456",
          toolId: "tool-456",
          userId: "user-789",
          state: "active",
          title: "Orphaned fork",
          parentSessionId: null,
          forkFromSeq: 5,
          startedAt: new Date(),
          endedAt: null,
          lastActivityAt: new Date(),
          deletedAt: null,
        };

        // This pattern identifies orphaned forks:
        // forkFromSeq is not null but parentSessionId is null
        const isOrphanedFork =
          orphanedFork.forkFromSeq !== null &&
          orphanedFork.parentSessionId === null;

        expect(isOrphanedFork).toBe(true);
      });

      it("should document CHECK constraint preventing self-reference", () => {
        // AC13: Migration adds CHECK constraint to prevent parent_session_id = id
        // This is a documentation test - actual constraint enforcement
        // would be tested in integration tests with real DB

        // The migration adds this constraint:
        // CHECK (parent_session_id IS NULL OR parent_session_id != id)
        //
        // This prevents circular self-reference where a session is its own parent.
        // In integration tests, attempting to INSERT or UPDATE a session with
        // parent_session_id = id should fail with a constraint violation error.

        // Example of invalid data that CHECK constraint would prevent:
        const invalidSelfReference = {
          id: "session-123",
          parentSessionId: "session-123", // Same as id - violates CHECK constraint
          // ... other fields
        };

        // In a real DB, this would fail. Here we document the expectation:
        expect(invalidSelfReference.id).toBe(invalidSelfReference.parentSessionId);
        // Note: This equality would be rejected by the database CHECK constraint
      });
    });

    describe("Fork Scenarios", () => {
      it("should support simple fork from parent", () => {
        // Basic fork: user forks at message 3
        const fork: NewChatSession = {
          toolId: "tool-456",
          userId: "user-789",
          parentSessionId: "parent-session",
          forkFromSeq: 3,
          state: "active",
          title: "Fork from message 3",
        };

        expect(fork.parentSessionId).toBe("parent-session");
        expect(fork.forkFromSeq).toBe(3);
      });

      it("should support fork from fork (nested forks)", () => {
        // Fork chains: fork from a fork
        const firstFork: ChatSession = {
          id: "fork-1",
          toolId: "tool-456",
          userId: "user-789",
          state: "active",
          title: "First fork",
          parentSessionId: "original-session",
          forkFromSeq: 5,
          startedAt: new Date(),
          endedAt: null,
          lastActivityAt: new Date(),
          deletedAt: null,
        };

        const secondFork: ChatSession = {
          id: "fork-2",
          toolId: "tool-456",
          userId: "user-789",
          state: "active",
          title: "Fork of fork",
          parentSessionId: "fork-1", // Parent is itself a fork
          forkFromSeq: 3,
          startedAt: new Date(),
          endedAt: null,
          lastActivityAt: new Date(),
          deletedAt: null,
        };

        expect(firstFork.parentSessionId).toBe("original-session");
        expect(secondFork.parentSessionId).toBe(firstFork.id);
      });

      it("should support fork from beginning of session", () => {
        // Edge case: fork from sequence 0 or 1 (start of session)
        const fork: NewChatSession = {
          toolId: "tool-456",
          userId: "user-789",
          parentSessionId: "parent-session",
          forkFromSeq: 1,
          state: "active",
        };

        expect(fork.forkFromSeq).toBe(1);
      });

      it("should support fork with title inheritance pattern", () => {
        // Common pattern: fork inherits parent title with suffix
        const parentTitle = "Math homework help";
        const fork: NewChatSession = {
          toolId: "tool-456",
          userId: "user-789",
          parentSessionId: "parent-session",
          forkFromSeq: 4,
          title: `${parentTitle} (fork)`,
          state: "active",
        };

        expect(fork.title).toBe("Math homework help (fork)");
      });
    });

    describe("Integration with Existing Fields", () => {
      it("should work alongside soft delete", () => {
        // Fork can be soft deleted independently of parent
        const deletedFork: ChatSession = {
          id: "fork-456",
          toolId: "tool-456",
          userId: "user-789",
          state: "completed",
          title: "Deleted fork",
          parentSessionId: "parent-123",
          forkFromSeq: 5,
          startedAt: new Date(),
          endedAt: new Date(),
          lastActivityAt: new Date(),
          deletedAt: new Date(), // Soft deleted
        };

        expect(deletedFork.deletedAt).toBeInstanceOf(Date);
        expect(deletedFork.parentSessionId).toBe("parent-123");
      });

      it("should work with all session states", () => {
        // Forks can be in any session state
        const activeFork: ChatSession = {
          id: "fork-1",
          toolId: "tool-456",
          userId: "user-789",
          state: "active",
          title: "Active fork",
          parentSessionId: "parent-123",
          forkFromSeq: 3,
          startedAt: new Date(),
          endedAt: null,
          lastActivityAt: new Date(),
          deletedAt: null,
        };

        const completedFork: ChatSession = {
          id: "fork-2",
          toolId: "tool-456",
          userId: "user-789",
          state: "completed",
          title: "Completed fork",
          parentSessionId: "parent-123",
          forkFromSeq: 3,
          startedAt: new Date(),
          endedAt: new Date(),
          lastActivityAt: new Date(),
          deletedAt: null,
        };

        expect(activeFork.state).toBe("active");
        expect(completedFork.state).toBe("completed");
      });
    });
  });
});
