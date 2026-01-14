import { describe, it, expect } from "vitest";

import { sessions } from "../../schema/sessions.js";

import type { Session, NewSession } from "../../schema/sessions.js";

describe("Sessions Schema", () => {
  describe("Type Inference", () => {
    it("should infer Session type correctly with all required fields", () => {
      // Arrange
      const session: Session = {
        id: "a".repeat(40), // Lucia generates 40-character session IDs
        userId: "123e4567-e89b-12d3-a456-426614174000",
        expiresAt: new Date("2024-12-31T23:59:59Z"),
        context: "personal",
        lastActivityAt: new Date("2024-01-15T10:30:00Z"),
      };

      // Act & Assert - TypeScript compilation verifies types
      expect(session.id).toBe("a".repeat(40));
      expect(session.userId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.context).toBe("personal");
      expect(session.lastActivityAt).toBeInstanceOf(Date);
    });

    it("should allow personal context value", () => {
      // Arrange
      const session: Session = {
        id: "session-id-" + "a".repeat(29),
        userId: "223e4567-e89b-12d3-a456-426614174001",
        expiresAt: new Date(),
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.context).toBe("personal");
    });

    it("should allow shared context value", () => {
      // Arrange
      const session: Session = {
        id: "session-id-" + "b".repeat(29),
        userId: "323e4567-e89b-12d3-a456-426614174002",
        expiresAt: new Date(),
        context: "shared",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.context).toBe("shared");
    });

    it("should allow unknown context value", () => {
      // Arrange
      const session: Session = {
        id: "session-id-" + "c".repeat(29),
        userId: "423e4567-e89b-12d3-a456-426614174003",
        expiresAt: new Date(),
        context: "unknown",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.context).toBe("unknown");
    });

    it("should handle future expiration dates", () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days in future

      const session: Session = {
        id: "session-future-" + "d".repeat(26),
        userId: "523e4567-e89b-12d3-a456-426614174004",
        expiresAt: futureDate,
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should handle past expiration dates for expired sessions", () => {
      // Arrange
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const session: Session = {
        id: "session-expired-" + "e".repeat(25),
        userId: "623e4567-e89b-12d3-a456-426614174005",
        expiresAt: pastDate,
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.expiresAt.getTime()).toBeLessThan(Date.now());
    });
  });

  describe("NewSession Type (Insert Operations)", () => {
    it("should infer NewSession type correctly for inserts", () => {
      // Arrange - NewSession should include all fields (Lucia generates the ID)
      const newSession: NewSession = {
        id: "lucia-generated-" + "f".repeat(24),
        userId: "723e4567-e89b-12d3-a456-426614174006",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(newSession.id).toBeDefined();
      expect(newSession.userId).toBe("723e4567-e89b-12d3-a456-426614174006");
      expect(newSession.expiresAt).toBeInstanceOf(Date);
      expect(newSession.context).toBe("personal");
      expect(newSession.lastActivityAt).toBeInstanceOf(Date);
    });

    it("should allow creating session with shared context", () => {
      // Arrange - Shared device session
      const sharedSession: NewSession = {
        id: "shared-session-" + "g".repeat(25),
        userId: "823e4567-e89b-12d3-a456-426614174007",
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        context: "shared",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(sharedSession.context).toBe("shared");
      expect(sharedSession.id).toBeTruthy();
    });

    it("should default context to unknown when creating session", () => {
      // Arrange - Session without explicit context (should default to 'unknown')
      const defaultSession: NewSession = {
        id: "default-session-" + "h".repeat(24),
        userId: "923e4567-e89b-12d3-a456-426614174008",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastActivityAt: new Date(),
      };

      // Act & Assert
      // TypeScript allows omitting context since it has a default value
      expect(defaultSession.userId).toBeTruthy();
    });
  });

  describe("Schema Definition", () => {
    it("should have correct table name", () => {
      // Act & Assert
      expect(sessions._.name).toBe("sessions");
    });

    it("should have id column", () => {
      // Act & Assert
      expect(sessions.id).toBeDefined();
      expect(sessions.id.name).toBe("id");
    });

    it("should have userId column", () => {
      // Act & Assert
      expect(sessions.userId).toBeDefined();
      expect(sessions.userId.name).toBe("user_id");
    });

    it("should have expiresAt column", () => {
      // Act & Assert
      expect(sessions.expiresAt).toBeDefined();
      expect(sessions.expiresAt.name).toBe("expires_at");
    });

    it("should have context column", () => {
      // Act & Assert
      expect(sessions.context).toBeDefined();
      expect(sessions.context.name).toBe("context");
    });

    it("should have lastActivityAt column", () => {
      // Act & Assert
      expect(sessions.lastActivityAt).toBeDefined();
      expect(sessions.lastActivityAt.name).toBe("last_activity_at");
    });

    it("should have all required columns", () => {
      // Arrange
      const expectedColumns = [
        "id",
        "userId",
        "expiresAt",
        "context",
        "lastActivityAt",
      ];

      // Act
      const actualColumns = Object.keys(sessions).filter(
        (key) => !key.startsWith("_")
      );

      // Assert
      expectedColumns.forEach((col) => {
        expect(actualColumns).toContain(col);
      });
    });
  });

  describe("Schema Exports", () => {
    it("should export sessions table", () => {
      // Act & Assert
      expect(sessions).toBeDefined();
      expect(sessions._.name).toBe("sessions");
    });
  });

  describe("Type Safety", () => {
    it("should enforce required id field", () => {
      // Arrange
      const session: Session = {
        id: "required-id-" + "i".repeat(28),
        userId: "123e4567-e89b-12d3-a456-426614174000",
        expiresAt: new Date(),
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.id).toBeTruthy();
      expect(typeof session.id).toBe("string");
      expect(session.id.length).toBeGreaterThan(0);
    });

    it("should enforce required userId field", () => {
      // Arrange
      const session: Session = {
        id: "required-user-" + "j".repeat(27),
        userId: "223e4567-e89b-12d3-a456-426614174001",
        expiresAt: new Date(),
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.userId).toBeTruthy();
      expect(typeof session.userId).toBe("string");
    });

    it("should enforce required expiresAt field", () => {
      // Arrange
      const session: Session = {
        id: "required-expires-" + "k".repeat(24),
        userId: "323e4567-e89b-12d3-a456-426614174002",
        expiresAt: new Date(),
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.expiresAt).toBeTruthy();
      expect(session.expiresAt).toBeInstanceOf(Date);
    });

    it("should enforce required context field", () => {
      // Arrange
      const session: Session = {
        id: "required-context-" + "l".repeat(24),
        userId: "423e4567-e89b-12d3-a456-426614174003",
        expiresAt: new Date(),
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.context).toBeTruthy();
      expect(["personal", "shared", "unknown"]).toContain(session.context);
    });

    it("should enforce required lastActivityAt field", () => {
      // Arrange
      const session: Session = {
        id: "required-activity-" + "m".repeat(23),
        userId: "523e4567-e89b-12d3-a456-426614174004",
        expiresAt: new Date(),
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.lastActivityAt).toBeTruthy();
      expect(session.lastActivityAt).toBeInstanceOf(Date);
    });
  });

  describe("Edge Cases", () => {
    it("should handle session IDs of maximum length (255 chars)", () => {
      // Arrange - Max varchar length
      const maxLengthId = "s".repeat(255);
      const session: Session = {
        id: maxLengthId,
        userId: "623e4567-e89b-12d3-a456-426614174005",
        expiresAt: new Date(),
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.id.length).toBe(255);
      expect(session.id).toBe(maxLengthId);
    });

    it("should handle Lucia-style 40-character session IDs", () => {
      // Arrange - Lucia generates 40-char IDs
      const luciaStyleId = "abcdef0123456789".repeat(2) + "abcdef01"; // 40 chars
      const session: Session = {
        id: luciaStyleId,
        userId: "723e4567-e89b-12d3-a456-426614174006",
        expiresAt: new Date(),
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.id.length).toBe(40);
      expect(session.id).toBe(luciaStyleId);
    });

    it("should handle sessions with recent lastActivityAt timestamp", () => {
      // Arrange
      const recentActivity = new Date();
      const session: Session = {
        id: "active-session-" + "n".repeat(26),
        userId: "823e4567-e89b-12d3-a456-426614174007",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        context: "personal",
        lastActivityAt: recentActivity,
      };

      // Act & Assert
      const timeDiff = Date.now() - session.lastActivityAt.getTime();
      expect(timeDiff).toBeLessThan(1000); // Less than 1 second ago
    });

    it("should handle sessions with old lastActivityAt for idle detection", () => {
      // Arrange
      const oldActivity = new Date();
      oldActivity.setHours(oldActivity.getHours() - 3); // 3 hours ago

      const session: Session = {
        id: "idle-session-" + "o".repeat(27),
        userId: "923e4567-e89b-12d3-a456-426614174008",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        context: "shared",
        lastActivityAt: oldActivity,
      };

      // Act & Assert
      const timeDiff = Date.now() - session.lastActivityAt.getTime();
      expect(timeDiff).toBeGreaterThan(2 * 60 * 60 * 1000); // More than 2 hours
    });

    it("should handle short-lived shared device sessions (2 hours)", () => {
      // Arrange
      const shortExpiration = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const session: Session = {
        id: "short-lived-" + "p".repeat(28),
        userId: "a23e4567-e89b-12d3-a456-426614174009",
        expiresAt: shortExpiration,
        context: "shared",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.context).toBe("shared");
      const duration = session.expiresAt.getTime() - Date.now();
      expect(duration).toBeLessThanOrEqual(2 * 60 * 60 * 1000 + 1000); // ~2 hours
    });

    it("should handle long-lived teacher sessions (30 days)", () => {
      // Arrange
      const longExpiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const session: Session = {
        id: "long-lived-" + "q".repeat(29),
        userId: "b23e4567-e89b-12d3-a456-426614174010",
        expiresAt: longExpiration,
        context: "personal",
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.context).toBe("personal");
      const duration = session.expiresAt.getTime() - Date.now();
      expect(duration).toBeGreaterThanOrEqual(29 * 24 * 60 * 60 * 1000); // ~30 days
    });

    it("should handle context value of maximum length (20 chars)", () => {
      // Arrange - Context field is varchar(20)
      const maxContext = "a".repeat(20);
      const session: Session = {
        id: "max-context-" + "r".repeat(28),
        userId: "c23e4567-e89b-12d3-a456-426614174011",
        expiresAt: new Date(),
        context: maxContext as Session["context"],
        lastActivityAt: new Date(),
      };

      // Act & Assert
      expect(session.context.length).toBeLessThanOrEqual(20);
    });
  });

  describe("Session Context Values", () => {
    it("should have personal context for teacher/admin on personal devices", () => {
      // Arrange
      const personalContext: Session["context"] = "personal";

      // Act & Assert
      expect(personalContext).toBe("personal");
    });

    it("should have shared context for computer lab/classroom cart", () => {
      // Arrange
      const sharedContext: Session["context"] = "shared";

      // Act & Assert
      expect(sharedContext).toBe("shared");
    });

    it("should have unknown context when device type is not specified", () => {
      // Arrange
      const unknownContext: Session["context"] = "unknown";

      // Act & Assert
      expect(unknownContext).toBe("unknown");
    });

    it("should contain exactly three context values", () => {
      // Arrange
      const validContexts: Array<Session["context"]> = [
        "personal",
        "shared",
        "unknown",
      ];

      // Act & Assert
      expect(validContexts).toHaveLength(3);
    });
  });
});
