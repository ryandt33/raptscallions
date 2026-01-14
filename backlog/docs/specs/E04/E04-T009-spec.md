# Implementation Spec: E04-T009 - Chat Schema Enhancements

**Epic:** E04 - Chat Runtime
**Task:** E04-T009
**Status:** ANALYZED
**Created:** 2026-01-14
**Author:** Analyst Agent

---

## Overview

This task implements deferred recommendations from the E04-T001 code review and architecture review. The changes enhance the chat schema with YAGNI cleanup (removing unused "paused" state), soft delete support, session metadata fields, and Zod validation for the message meta field. These improvements enhance type safety, data integrity, and UX of the chat system.

---

## Approach

The implementation follows a careful migration strategy for PostgreSQL enum modification, which requires special handling. The approach:

1. **Enum Alteration**: PostgreSQL does not support removing values from enums directly. We use the rename-recreate-drop pattern.
2. **Schema-First**: Update Drizzle schema files first, then generate corresponding migration.
3. **Zod Validation**: Create message meta schema in `@raptscallions/core/schemas` for runtime validation.
4. **Backward Compatible**: All new fields are nullable or have defaults, ensuring existing data remains valid.

---

## Files to Create

| File | Purpose |
|------|---------|
| `packages/core/src/schemas/message-meta.schema.ts` | Zod schema for message meta field validation |
| `packages/db/src/migrations/0010_enhance_chat_sessions.sql` | Migration for schema changes |

## Files to Modify

| File | Changes |
|------|---------|
| `packages/db/src/schema/chat-sessions.ts` | Remove "paused" from enum; add `deleted_at`, `title`, `last_activity_at` fields |
| `packages/db/src/__tests__/schema/chat-sessions.test.ts` | Update tests for new fields and removed state; add soft delete tests |
| `packages/db/src/__tests__/schema/messages.test.ts` | Add tests for meta field Zod validation |
| `packages/core/src/schemas/index.ts` | Export new message meta schema and types |

---

## Dependencies

- **Requires**: E04-T001 (Sessions and Messages schemas - already implemented)
- **New packages**: None (Zod already in use)

---

## Technical Design

### 1. Remove "paused" State from Enum (YAGNI Cleanup)

The "paused" state was speculatively added but has no defined user flow, UI support, or documented use case. Per YAGNI principle, remove it.

**Current Enum:**
```typescript
export const sessionStateEnum = pgEnum("session_state", [
  "active",
  "paused",
  "completed",
]);
```

**New Enum:**
```typescript
export const sessionStateEnum = pgEnum("session_state", [
  "active",
  "completed",
]);
```

**PostgreSQL Enum Alteration Strategy:**

PostgreSQL does not support `ALTER TYPE ... DROP VALUE`. The safest approach:

```sql
-- Step 1: Update any rows with 'paused' state to 'active' (safety measure)
UPDATE "chat_sessions" SET "state" = 'active' WHERE "state" = 'paused';

-- Step 2: Rename existing enum
ALTER TYPE "session_state" RENAME TO "session_state_old";

-- Step 3: Create new enum without 'paused'
CREATE TYPE "session_state" AS ENUM('active', 'completed');

-- Step 4: Alter column to use new enum (cast through text)
ALTER TABLE "chat_sessions"
  ALTER COLUMN "state" TYPE "session_state"
  USING "state"::text::"session_state";

-- Step 5: Drop old enum
DROP TYPE "session_state_old";
```

**Important Considerations:**
- Must run data migration BEFORE enum alteration
- If any rows have 'paused' state, the cast will fail without the UPDATE
- This is a one-way migration (no simple rollback for enum changes)

### 2. Soft Delete Support for Chat Sessions

Add `deleted_at` timestamp to support "Delete conversation" feature without losing data for audit/recovery.

**Schema Addition:**
```typescript
// In chat-sessions.ts
deletedAt: timestamp("deleted_at", { withTimezone: true }),
```

**Query Pattern:**
```typescript
// Active sessions only (exclude soft-deleted)
const activeSessions = await db.query.chatSessions.findMany({
  where: isNull(chatSessions.deletedAt),
});

// Include soft-deleted for admin/audit
const allSessions = await db.query.chatSessions.findMany();

// Soft delete a session
await db
  .update(chatSessions)
  .set({ deletedAt: new Date() })
  .where(eq(chatSessions.id, sessionId));
```

**Why Soft Delete:**
- Matches pattern used by users, groups, classes, tools tables
- Supports GDPR "right to be forgotten" with retention window
- Allows recovery of accidentally deleted sessions
- Enables audit trail for support/debugging

### 3. Session Metadata Fields

Add user-facing metadata for improved session list UX.

**Schema Additions:**
```typescript
// In chat-sessions.ts
title: varchar("title", { length: 200 }),
lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
```

**Field Purposes:**

| Field | Purpose | Example |
|-------|---------|---------|
| `title` | User-editable session name | "Math homework help - Jan 14" |
| `lastActivityAt` | Auto-updated on each message | Enables "Last active 5 min ago" display |

**Usage Patterns:**
```typescript
// Create session with optional title
const [session] = await db
  .insert(chatSessions)
  .values({
    toolId,
    userId,
    title: "Algebra homework", // Optional user-provided title
    lastActivityAt: new Date(),
  })
  .returning();

// Update last activity when message is added
await db
  .update(chatSessions)
  .set({ lastActivityAt: new Date() })
  .where(eq(chatSessions.id, sessionId));

// Query sessions sorted by recent activity
const recentSessions = await db.query.chatSessions.findMany({
  where: and(
    eq(chatSessions.userId, userId),
    isNull(chatSessions.deletedAt)
  ),
  orderBy: desc(chatSessions.lastActivityAt),
});
```

### 4. Zod Schema for Message Meta Field

Create a Zod schema to validate the JSONB meta field, providing type safety while preserving extensibility.

**File: `packages/core/src/schemas/message-meta.schema.ts`**

```typescript
import { z } from "zod";

/**
 * Schema for extraction data captured by modules during hook execution.
 * Extractions are typed key-value pairs for structured data.
 */
export const extractionSchema = z.object({
  /** Type identifier for the extraction (e.g., "sentiment", "topic", "entity") */
  type: z.string().min(1),
  /** Extracted value - can be any JSON-serializable data */
  value: z.unknown(),
  /** Optional confidence score (0-1) */
  confidence: z.number().min(0).max(1).optional(),
  /** Optional source module identifier */
  source: z.string().optional(),
});

/**
 * Schema for message metadata field.
 *
 * Common fields are explicitly typed for consistency across the codebase.
 * Uses `.passthrough()` to allow additional fields for extensibility.
 *
 * @example
 * ```typescript
 * const meta: MessageMeta = {
 *   tokens: 150,
 *   model: "anthropic/claude-sonnet-4-20250514",
 *   latency_ms: 432,
 * };
 *
 * // Validate unknown data
 * const parsed = messageMetaSchema.parse(jsonData);
 * ```
 */
export const messageMetaSchema = z.object({
  /** Number of tokens used in generation (positive integer) */
  tokens: z.number().int().positive().optional(),

  /** Model identifier used for generation */
  model: z.string().optional(),

  /** Response latency in milliseconds */
  latency_ms: z.number().positive().optional(),

  /** Prompt tokens used (for detailed token tracking) */
  prompt_tokens: z.number().int().nonnegative().optional(),

  /** Completion tokens generated */
  completion_tokens: z.number().int().nonnegative().optional(),

  /** Finish reason from AI response */
  finish_reason: z.enum(["stop", "length", "content_filter", "error"]).optional(),

  /** Structured data extracted by modules during hook execution */
  extractions: z.array(extractionSchema).optional(),
}).passthrough(); // Allow additional fields for extensibility

/**
 * Type inferred from messageMetaSchema.
 * Use this for typed access to common meta fields.
 */
export type MessageMeta = z.infer<typeof messageMetaSchema>;

/**
 * Type for extraction entries within meta.
 */
export type Extraction = z.infer<typeof extractionSchema>;

/**
 * Validates and parses message meta data.
 * Returns a typed MessageMeta object or throws ZodError.
 *
 * @param data - Unknown data to validate
 * @returns Validated MessageMeta object
 * @throws ZodError if validation fails
 */
export function parseMessageMeta(data: unknown): MessageMeta {
  return messageMetaSchema.parse(data);
}

/**
 * Safely validates message meta data.
 * Returns success/error result without throwing.
 *
 * @param data - Unknown data to validate
 * @returns SafeParseResult with data or error
 */
export function safeParseMessageMeta(data: unknown) {
  return messageMetaSchema.safeParse(data);
}
```

### 5. Updated Chat Sessions Schema

**File: `packages/db/src/schema/chat-sessions.ts`**

```typescript
import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tools } from "./tools.js";
import { users } from "./users.js";

/**
 * Session state enum representing the lifecycle of a chat session.
 * - active: Session is ongoing, user can send messages
 * - completed: Session ended by user or system
 *
 * Note: "paused" state was removed per YAGNI principle (E04-T009).
 */
export const sessionStateEnum = pgEnum("session_state", [
  "active",
  "completed",
]);

/**
 * Chat sessions table - multi-turn conversations.
 *
 * Chat sessions represent ongoing conversations between a user and a tool.
 * Each session maintains state and contains an ordered history of messages.
 *
 * Lifecycle:
 * - Created with state 'active' when user starts chat
 * - Moved to 'completed' when user ends or session expires
 *
 * Soft Delete:
 * - Sessions support soft delete via deleted_at timestamp
 * - Query with isNull(deletedAt) to exclude deleted sessions
 *
 * Foreign key behavior:
 * - tool_id: RESTRICT delete (cannot delete tools with active sessions)
 * - user_id: CASCADE delete (remove sessions when user is deleted)
 */
export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    state: sessionStateEnum("state").notNull().default("active"),

    // Session metadata (E04-T009)
    title: varchar("title", { length: 200 }),

    // Timestamps
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    toolIdIdx: index("chat_sessions_tool_id_idx").on(table.toolId),
    userIdIdx: index("chat_sessions_user_id_idx").on(table.userId),
    stateIdx: index("chat_sessions_state_idx").on(table.state),
    // Index for efficient soft-delete queries
    deletedAtIdx: index("chat_sessions_deleted_at_idx").on(table.deletedAt),
  })
);

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

// Metadata accessor for test compatibility
Object.defineProperty(chatSessions, "_", {
  get() {
    return {
      name:
        Symbol.for("drizzle:Name") in chatSessions
          ? (chatSessions as unknown as Record<symbol, string>)[Symbol.for("drizzle:Name")]
          : "chat_sessions",
    };
  },
  enumerable: false,
  configurable: true,
});
```

### 6. Migration File

**File: `packages/db/src/migrations/0010_enhance_chat_sessions.sql`**

```sql
-- E04-T009: Chat schema enhancements
-- 1. Remove "paused" state from session_state enum (YAGNI cleanup)
-- 2. Add soft delete support (deleted_at)
-- 3. Add session metadata (title, last_activity_at)

-- ============================================================================
-- STEP 1: Data migration - convert any 'paused' sessions to 'active'
-- This MUST run before enum alteration to avoid cast failures
-- ============================================================================
UPDATE "chat_sessions" SET "state" = 'active' WHERE "state" = 'paused';
--> statement-breakpoint

-- ============================================================================
-- STEP 2: Alter session_state enum to remove 'paused'
-- PostgreSQL doesn't support DROP VALUE, so we use rename-recreate-drop pattern
-- ============================================================================

-- 2a. Rename existing enum
ALTER TYPE "session_state" RENAME TO "session_state_old";
--> statement-breakpoint

-- 2b. Create new enum without 'paused'
CREATE TYPE "session_state" AS ENUM('active', 'completed');
--> statement-breakpoint

-- 2c. Alter column to use new enum (cast through text)
ALTER TABLE "chat_sessions"
  ALTER COLUMN "state" TYPE "session_state"
  USING "state"::text::"session_state";
--> statement-breakpoint

-- 2d. Drop old enum
DROP TYPE "session_state_old";
--> statement-breakpoint

-- ============================================================================
-- STEP 3: Add new columns for session metadata and soft delete
-- ============================================================================

-- 3a. Add title column for user-facing session names
ALTER TABLE "chat_sessions"
  ADD COLUMN "title" varchar(200);
--> statement-breakpoint

-- 3b. Add last_activity_at for "last active X ago" display
ALTER TABLE "chat_sessions"
  ADD COLUMN "last_activity_at" timestamp with time zone;
--> statement-breakpoint

-- 3c. Add deleted_at for soft delete support
ALTER TABLE "chat_sessions"
  ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint

-- ============================================================================
-- STEP 4: Add index for efficient soft-delete queries
-- ============================================================================
CREATE INDEX "chat_sessions_deleted_at_idx" ON "chat_sessions" USING btree ("deleted_at");
--> statement-breakpoint

-- ============================================================================
-- STEP 5: Backfill last_activity_at from existing messages (optional)
-- Sets last_activity_at to the most recent message created_at for each session
-- ============================================================================
UPDATE "chat_sessions" cs
SET "last_activity_at" = (
  SELECT MAX(m."created_at")
  FROM "messages" m
  WHERE m."session_id" = cs."id"
)
WHERE cs."last_activity_at" IS NULL;
```

---

## Test Strategy

### Unit Tests

**File: `packages/db/src/__tests__/schema/chat-sessions.test.ts` (additions)**

```typescript
describe("Soft Delete Behavior", () => {
  it("should have deletedAt field defined", () => {
    expect(chatSessions.deletedAt).toBeDefined();
  });

  it("should default deletedAt to null for new sessions", async () => {
    const session: ChatSession = {
      id: "session-123",
      toolId: "tool-456",
      userId: "user-789",
      state: "active",
      title: null,
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
      title: null,
      startedAt: new Date(),
      endedAt: new Date(),
      lastActivityAt: new Date(),
      deletedAt: deleteTime,
    };

    expect(session.deletedAt).toEqual(deleteTime);
  });
});

describe("Session Metadata Fields", () => {
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
      startedAt: new Date(),
      endedAt: null,
      lastActivityAt: new Date(),
      deletedAt: null,
    };

    expect(session.title).toBe("Math homework help");
  });
});

describe("Session State Enum (Updated)", () => {
  it("should only allow active and completed states", () => {
    // Compile-time test: these should compile
    const activeSession: ChatSession = {
      id: "session-123",
      toolId: "tool-456",
      userId: "user-789",
      state: "active",
      title: null,
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
```

**File: `packages/core/src/schemas/__tests__/message-meta.schema.test.ts` (new)**

```typescript
import { describe, it, expect } from "vitest";
import {
  messageMetaSchema,
  parseMessageMeta,
  safeParseMessageMeta,
  type MessageMeta,
  type Extraction,
} from "../message-meta.schema.js";

describe("messageMetaSchema", () => {
  describe("Basic Validation", () => {
    it("should accept empty object", () => {
      const result = messageMetaSchema.parse({});
      expect(result).toEqual({});
    });

    it("should accept all common fields", () => {
      const meta: MessageMeta = {
        tokens: 150,
        model: "anthropic/claude-sonnet-4-20250514",
        latency_ms: 432,
        prompt_tokens: 50,
        completion_tokens: 100,
        finish_reason: "stop",
      };

      const result = messageMetaSchema.parse(meta);
      expect(result).toEqual(meta);
    });

    it("should allow additional fields via passthrough", () => {
      const meta = {
        tokens: 150,
        custom_field: "custom_value",
        nested: { data: 123 },
      };

      const result = messageMetaSchema.parse(meta);
      expect(result.custom_field).toBe("custom_value");
      expect(result.nested).toEqual({ data: 123 });
    });
  });

  describe("Field Validation", () => {
    it("should reject negative tokens", () => {
      expect(() => messageMetaSchema.parse({ tokens: -1 })).toThrow();
    });

    it("should reject non-integer tokens", () => {
      expect(() => messageMetaSchema.parse({ tokens: 150.5 })).toThrow();
    });

    it("should reject negative latency_ms", () => {
      expect(() => messageMetaSchema.parse({ latency_ms: -100 })).toThrow();
    });

    it("should accept valid finish_reason values", () => {
      const validReasons = ["stop", "length", "content_filter", "error"];
      for (const reason of validReasons) {
        const result = messageMetaSchema.parse({ finish_reason: reason });
        expect(result.finish_reason).toBe(reason);
      }
    });

    it("should reject invalid finish_reason", () => {
      expect(() =>
        messageMetaSchema.parse({ finish_reason: "invalid" })
      ).toThrow();
    });
  });

  describe("Extractions Validation", () => {
    it("should accept valid extractions array", () => {
      const meta = {
        extractions: [
          { type: "sentiment", value: "positive" },
          { type: "topic", value: ["math", "algebra"], confidence: 0.95 },
        ],
      };

      const result = messageMetaSchema.parse(meta);
      expect(result.extractions).toHaveLength(2);
    });

    it("should reject extraction with empty type", () => {
      expect(() =>
        messageMetaSchema.parse({
          extractions: [{ type: "", value: "test" }],
        })
      ).toThrow();
    });

    it("should reject extraction confidence outside 0-1 range", () => {
      expect(() =>
        messageMetaSchema.parse({
          extractions: [{ type: "test", value: "x", confidence: 1.5 }],
        })
      ).toThrow();
    });

    it("should accept extraction with source module", () => {
      const meta = {
        extractions: [
          {
            type: "entity",
            value: { name: "John", type: "person" },
            source: "ner-module",
          },
        ],
      };

      const result = messageMetaSchema.parse(meta);
      expect(result.extractions?.[0]?.source).toBe("ner-module");
    });
  });

  describe("Helper Functions", () => {
    it("parseMessageMeta should return typed result", () => {
      const data = { tokens: 100, model: "test-model" };
      const result = parseMessageMeta(data);

      expect(result.tokens).toBe(100);
      expect(result.model).toBe("test-model");
    });

    it("parseMessageMeta should throw on invalid data", () => {
      expect(() => parseMessageMeta({ tokens: "not-a-number" })).toThrow();
    });

    it("safeParseMessageMeta should return success on valid data", () => {
      const data = { tokens: 100 };
      const result = safeParseMessageMeta(data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokens).toBe(100);
      }
    });

    it("safeParseMessageMeta should return error on invalid data", () => {
      const result = safeParseMessageMeta({ tokens: "invalid" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("Type Safety", () => {
    it("should properly type MessageMeta", () => {
      // Compile-time test - these should all compile
      const meta: MessageMeta = {
        tokens: 150,
        model: "test",
        latency_ms: 100,
        prompt_tokens: 50,
        completion_tokens: 100,
        finish_reason: "stop",
        extractions: [{ type: "test", value: 123 }],
      };

      expect(meta.tokens).toBe(150);
    });

    it("should properly type Extraction", () => {
      // Compile-time test
      const extraction: Extraction = {
        type: "sentiment",
        value: { score: 0.8, label: "positive" },
        confidence: 0.95,
        source: "sentiment-analyzer",
      };

      expect(extraction.type).toBe("sentiment");
    });
  });
});
```

### Integration Tests

Tests that should be verified against a real database:

1. **Enum Migration**: Verify "paused" state is successfully removed
2. **Soft Delete Queries**: Verify `WHERE deleted_at IS NULL` excludes deleted sessions
3. **Index Performance**: Verify `deleted_at_idx` is used in query plans
4. **Data Backfill**: Verify `last_activity_at` is correctly populated from messages

---

## Acceptance Criteria Breakdown

| AC | Requirement | Implementation | Validation |
|----|-------------|----------------|------------|
| AC1 | Remove "paused" from session_state enum | Update `sessionStateEnum` in chat-sessions.ts; migration steps 1-2d | TypeScript compile-time check; migration tests |
| AC2 | Add `deleted_at` to chat_sessions | Add field to schema; migration step 3c | Unit test for field; soft delete query test |
| AC3 | Add `title` field (varchar 200) | Add field to schema; migration step 3a | Unit test for field; nullable verification |
| AC4 | Add `last_activity_at` timestamp | Add field to schema; migration step 3b | Unit test for field; backfill verification |
| AC5 | Migration file 0010_enhance_chat_sessions.sql | Create migration with all changes | Migration runs without errors |
| AC6 | Create Zod schema for message meta | Create message-meta.schema.ts | Unit tests for validation |
| AC7 | Export MessageMeta type | Export from schemas/index.ts | Import verification in tests |
| AC8 | Document meta field patterns | JSDoc comments in schema file | Documentation review |
| AC9 | Tests verify soft delete behavior | Add tests to chat-sessions.test.ts | Test suite passes |
| AC10 | Tests verify meta field validation | Create message-meta.schema.test.ts | Test suite passes |

---

## Edge Cases

### 1. Existing "paused" Sessions During Migration

**Edge Case**: Sessions exist with state = 'paused' when migration runs.

**Handling**: Migration step 1 explicitly updates all 'paused' sessions to 'active' before enum alteration. This ensures the cast succeeds.

**Test**: Verify migration on database with 'paused' sessions.

### 2. Soft Delete vs Hard Delete

**Edge Case**: User expects permanent deletion but soft delete preserves data.

**Handling**:
- Service layer should support both soft delete (default) and hard delete (admin/GDPR)
- Document the distinction in API
- Consider scheduled job for permanent deletion after retention period

### 3. Empty Meta Object vs Null

**Edge Case**: Meta field could be null or empty object `{}`.

**Handling**:
- Schema default is `{}` (empty object), not null
- Zod schema accepts empty object as valid
- Service layer should always pass at least `{}` to avoid null checks

### 4. Title Length Exceeds 200 Characters

**Edge Case**: User provides title longer than 200 characters.

**Handling**:
- Database constraint enforces max 200 chars
- Service layer should validate/truncate before insert
- API should return validation error for long titles

### 5. Concurrent Session Updates

**Edge Case**: Multiple requests update `last_activity_at` simultaneously.

**Handling**:
- Last write wins (acceptable for activity timestamp)
- No optimistic locking needed for this field
- Consider atomic update in high-concurrency scenarios

### 6. Migration Rollback

**Edge Case**: Need to rollback enum change.

**Handling**:
- Enum changes are difficult to rollback in PostgreSQL
- If rollback needed: create new migration to add 'paused' back
- Document that this is a one-way migration

---

## Open Questions

None. All requirements are clear and specification is complete.

---

## Implementation Steps

### Step 1: Create Message Meta Zod Schema
- [ ] Create `packages/core/src/schemas/message-meta.schema.ts`
- [ ] Define `extractionSchema` for extraction entries
- [ ] Define `messageMetaSchema` with common fields
- [ ] Add `.passthrough()` for extensibility
- [ ] Export `MessageMeta` and `Extraction` types
- [ ] Export `parseMessageMeta` and `safeParseMessageMeta` helpers
- [ ] Add comprehensive JSDoc documentation

### Step 2: Update Schema Exports
- [ ] Add exports to `packages/core/src/schemas/index.ts`
- [ ] Verify barrel exports work correctly

### Step 3: Update Chat Sessions Schema
- [ ] Modify `sessionStateEnum` to remove "paused"
- [ ] Add `title` field (varchar 200, nullable)
- [ ] Add `lastActivityAt` field (timestamp with timezone, nullable)
- [ ] Add `deletedAt` field (timestamp with timezone, nullable)
- [ ] Add index on `deletedAt` for soft delete queries
- [ ] Update JSDoc comments to reflect changes
- [ ] Fix type assertion to avoid `any`

### Step 4: Create Migration File
- [ ] Create `packages/db/src/migrations/0010_enhance_chat_sessions.sql`
- [ ] Add data migration for 'paused' state cleanup
- [ ] Add enum rename-recreate-drop sequence
- [ ] Add new column definitions
- [ ] Add index creation
- [ ] Add optional backfill for `last_activity_at`

### Step 5: Update Chat Sessions Tests
- [ ] Remove tests for "paused" state
- [ ] Add tests for soft delete behavior
- [ ] Add tests for new metadata fields
- [ ] Update type assertions to match new schema
- [ ] Verify all existing tests still pass

### Step 6: Create Message Meta Schema Tests
- [ ] Create `packages/core/src/schemas/__tests__/message-meta.schema.test.ts`
- [ ] Add tests for basic validation
- [ ] Add tests for field constraints
- [ ] Add tests for extractions array
- [ ] Add tests for helper functions
- [ ] Add compile-time type safety tests

### Step 7: Verify and Document
- [ ] Run `pnpm typecheck` - must pass with zero errors
- [ ] Run `pnpm lint` - must pass
- [ ] Run `pnpm test` - all tests must pass
- [ ] Verify migration can be applied to test database

---

## References

- **E04-T001 Spec**: Original implementation with review recommendations
- **ARCHITECTURE.md**: Core entities section for chat sessions/messages
- **CONVENTIONS.md**: TypeScript patterns, testing, schema conventions
- **docs/references/initial_planning/CHAT_IMPLEMENTATION.md**: Chat runtime vision

---

**End of Specification**
