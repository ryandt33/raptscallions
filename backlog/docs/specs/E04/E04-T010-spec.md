# Implementation Spec: E04-T010 - Chat Forking Support

**Epic:** E04 - Chat Runtime
**Task:** E04-T010
**Status:** DRAFT
**Created:** 2026-01-14
**Author:** Analyst Agent

---

## Overview

This task implements chat session forking, enabling users to create branching conversation paths from any point in an existing chat session. This is valuable for exploring alternative conversation directions, demonstrating multiple problem-solving approaches, or recovering from mistakes without losing the original conversation thread.

**Key Design Principles:**
1. **Non-destructive** - Forking preserves the original session
2. **Self-documenting** - Fork relationships are explicit in the schema
3. **Orphan-safe** - Forks survive parent session deletion
4. **Query-efficient** - Indexes support fork tree traversal

---

## Approach

The implementation adds two fields to the existing `chat_sessions` table to track fork relationships:

1. **`parent_session_id`** - References the session this was forked from (nullable, self-reference)
2. **`fork_from_seq`** - Message sequence number in parent where fork occurred (nullable)

**Foreign Key Behavior:** SET NULL on parent deletion (not CASCADE) to preserve forked sessions as standalone conversations if the original is deleted.

**Message Handling:** This task implements the schema only. Service-layer logic for copying messages or building fork context is deferred to the SessionService implementation task.

---

## Files to Create

| File | Purpose |
|------|---------|
| `packages/db/src/migrations/0011_add_chat_forking.sql` | Migration to add fork fields and index |

## Files to Modify

| File | Changes |
|------|---------|
| `packages/db/src/schema/chat-sessions.ts` | Add `parentSessionId` and `forkFromSeq` fields; add parent index; update JSDoc |
| `packages/db/src/__tests__/schema/chat-sessions.test.ts` | Add tests for fork fields, relations, and orphan behavior |
| `packages/core/src/schemas/chat-session.schema.ts` | Add fork fields to Zod schema (if schema exists, otherwise defer) |

---

## Dependencies

- **Requires**: E04-T001 (Sessions and Messages schemas)
- **Requires**: E04-T009 (Chat schema enhancements - for consistent schema patterns)
- **New packages**: None

---

## Technical Design

### 1. Updated Chat Sessions Schema

**File: `packages/db/src/schema/chat-sessions.ts`**

```typescript
import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  integer,
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
 * Fork Support (E04-T010):
 * - Sessions can be forked to create branching conversation paths
 * - parent_session_id references the session this was forked from
 * - fork_from_seq indicates the message sequence in parent where fork occurred
 * - Forks are independent sessions that survive parent deletion (orphan-safe)
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
 * - parent_session_id: SET NULL delete (forks become orphans if parent deleted)
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

    // Fork support (E04-T010)
    parentSessionId: uuid("parent_session_id")
      .references(() => chatSessions.id, { onDelete: "set null" }),
    forkFromSeq: integer("fork_from_seq"),

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
    deletedAtIdx: index("chat_sessions_deleted_at_idx").on(table.deletedAt),
    // E04-T010: Index for fork tree queries
    parentSessionIdIdx: index("chat_sessions_parent_session_id_idx")
      .on(table.parentSessionId),
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
          ? (chatSessions as unknown as Record<symbol, string>)[
              Symbol.for("drizzle:Name")
            ]
          : "chat_sessions",
    };
  },
  enumerable: false,
  configurable: true,
});
```

### 2. Drizzle Relations (Optional - for convenience)

**File: `packages/db/src/schema/chat-sessions.ts` (addition)**

```typescript
import { relations } from "drizzle-orm";

/**
 * Relations for chat sessions.
 * Enables convenient querying of session hierarchies and forks.
 */
export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  // Parent session (if this is a fork)
  parentSession: one(chatSessions, {
    fields: [chatSessions.parentSessionId],
    references: [chatSessions.id],
    relationName: "sessionForks",
  }),

  // Child sessions (forks of this session)
  forks: many(chatSessions, {
    relationName: "sessionForks",
  }),

  // Messages in this session
  messages: many(messages),

  // Tool used in this session
  tool: one(tools, {
    fields: [chatSessions.toolId],
    references: [tools.id],
  }),

  // User who owns this session
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
}));
```

### 3. Migration File

**File: `packages/db/src/migrations/0011_add_chat_forking.sql`**

```sql
-- E04-T010: Add chat session forking support
-- Enables users to create branching conversation paths from any point in a chat

-- ============================================================================
-- STEP 1: Add fork tracking fields
-- ============================================================================

-- Add parent_session_id - references the session this was forked from
ALTER TABLE "chat_sessions"
  ADD COLUMN "parent_session_id" uuid;
--> statement-breakpoint

-- Add fork_from_seq - message sequence in parent where fork occurred
ALTER TABLE "chat_sessions"
  ADD COLUMN "fork_from_seq" integer;
--> statement-breakpoint

-- ============================================================================
-- STEP 2: Add foreign key constraint with SET NULL behavior
-- Forks survive parent session deletion (become orphans)
-- ============================================================================

ALTER TABLE "chat_sessions"
  ADD CONSTRAINT "chat_sessions_parent_session_id_fkey"
  FOREIGN KEY ("parent_session_id")
  REFERENCES "chat_sessions"("id")
  ON DELETE SET NULL;
--> statement-breakpoint

-- ============================================================================
-- STEP 3: Add index for efficient fork tree queries
-- ============================================================================

CREATE INDEX "chat_sessions_parent_session_id_idx"
  ON "chat_sessions" USING btree ("parent_session_id");
--> statement-breakpoint

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Both fields are nullable - most sessions are not forks
-- 2. SET NULL on delete preserves forked sessions as standalone conversations
-- 3. fork_from_seq is informational only - service layer handles message copying
-- 4. Index supports queries like "find all forks of session X"
```

### 4. Query Patterns

**Service-layer examples (implementation in SessionService task):**

```typescript
// Find all direct forks of a session
async function getSessionForks(sessionId: string): Promise<ChatSession[]> {
  return db.query.chatSessions.findMany({
    where: and(
      eq(chatSessions.parentSessionId, sessionId),
      isNull(chatSessions.deletedAt)
    ),
    orderBy: desc(chatSessions.startedAt),
  });
}

// Get complete fork lineage (parent chain)
async function getSessionLineage(sessionId: string): Promise<ChatSession[]> {
  const lineage: ChatSession[] = [];
  let currentId: string | null = sessionId;

  while (currentId) {
    const session = await db.query.chatSessions.findFirst({
      where: eq(chatSessions.id, currentId),
    });

    if (!session) break;
    lineage.unshift(session);
    currentId = session.parentSessionId;
  }

  return lineage;
}

// Create a fork from an existing session
async function createFork(
  parentSessionId: string,
  forkFromSeq: number,
  userId: string
): Promise<ChatSession> {
  // Get parent session details
  const parentSession = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, parentSessionId),
  });

  if (!parentSession) {
    throw new NotFoundError("Parent session not found");
  }

  // Create forked session
  const [forkedSession] = await db
    .insert(chatSessions)
    .values({
      parentSessionId,
      forkFromSeq,
      toolId: parentSession.toolId,
      userId,
      state: "active",
      title: parentSession.title
        ? `${parentSession.title} (fork)`
        : undefined,
      lastActivityAt: new Date(),
    })
    .returning();

  return forkedSession;
}

// Get full fork tree (parent + all descendants)
async function getSessionTree(sessionId: string): Promise<{
  session: ChatSession;
  forks: ChatSession[];
  parent: ChatSession | null;
}> {
  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, sessionId),
    with: {
      forks: {
        where: isNull(chatSessions.deletedAt),
      },
      parentSession: true,
    },
  });

  if (!session) {
    throw new NotFoundError("Session not found");
  }

  return {
    session,
    forks: session.forks || [],
    parent: session.parentSession || null,
  };
}
```

---

## Test Strategy

### Unit Tests

**File: `packages/db/src/__tests__/schema/chat-sessions.test.ts` (additions)**

```typescript
describe("Fork Support (E04-T010)", () => {
  describe("Schema Fields", () => {
    it("should have parentSessionId field defined", () => {
      expect(chatSessions.parentSessionId).toBeDefined();
    });

    it("should have forkFromSeq field defined", () => {
      expect(chatSessions.forkFromSeq).toBeDefined();
    });

    it("should allow null parentSessionId for non-forked sessions", () => {
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
      const newSession: NewChatSession = {
        toolId: "tool-456",
        userId: "user-789",
      };

      expect(newSession.parentSessionId).toBeUndefined();
      expect(newSession.forkFromSeq).toBeUndefined();
    });
  });

  describe("Foreign Key Behavior", () => {
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
  });
});
```

### Integration Tests (Deferred to SessionService Task)

Tests requiring actual database:

1. **Fork Creation**: Create fork, verify parent reference persists
2. **Fork Tree Query**: Query all forks of a session
3. **Parent Deletion**: Delete parent, verify fork becomes orphan (parent_session_id = null)
4. **Lineage Query**: Traverse parent chain to root session
5. **Permissions**: Verify user can only fork their own sessions (CASL check)

---

## Acceptance Criteria Breakdown

| AC | Requirement | Implementation | Validation |
|----|-------------|----------------|------------|
| AC1 | Add parent_session_id field | Add field to schema, nullable UUID self-reference | Field exists in type, nullable |
| AC2 | Add fork_from_seq field | Add field to schema, nullable integer | Field exists in type, nullable |
| AC3 | Foreign key with SET NULL | Add FK constraint in migration | FK constraint in schema, SET NULL behavior |
| AC4 | Index on parent_session_id | Add index in schema and migration | Index exists, query plan uses it |
| AC5 | Migration file 0011 | Create migration with all changes | Migration runs without errors |
| AC6 | Update types | ChatSession includes fork fields | TypeScript compiles, types correct |
| AC7 | Zod schema validation | Create/update Zod schema (if exists) | Validation tests pass |
| AC8 | Define relations | Add Drizzle relations for parent/forks | Relations work in queries |
| AC9 | Support tree queries | Relations enable fork tree queries | Can query with forks/parent |
| AC10 | Fork creation tests | Tests for creating forks with valid data | Tests pass |
| AC11 | Orphan behavior tests | Tests for parent deletion behavior | Tests pass |
| AC12 | Tree query tests | Tests for fork tree structure | Tests pass |

---

## Edge Cases

### 1. Circular Fork References

**Edge Case**: User attempts to create fork with parent_session_id pointing to itself.

**Handling**:
- Database constraint prevents self-reference (if we add CHECK constraint)
- Service layer should validate: `parentSessionId !== sessionId`
- Return validation error: "Cannot fork a session to itself"

**Prevention:**
```typescript
// In fork validation
if (parentSessionId === sessionId) {
  throw new ValidationError("Cannot create circular fork reference");
}
```

### 2. Fork from Non-existent Message Sequence

**Edge Case**: User specifies `forkFromSeq = 10` but parent session only has 5 messages.

**Handling**:
- Service layer validation: query max seq from parent session
- Return validation error: "Fork point exceeds parent message count"
- Alternative: Allow and treat as "fork from end of parent"

**Validation:**
```typescript
const maxSeq = await db
  .select({ maxSeq: max(messages.seq) })
  .from(messages)
  .where(eq(messages.sessionId, parentSessionId));

if (forkFromSeq > maxSeq[0].maxSeq) {
  throw new ValidationError(
    `Fork point ${forkFromSeq} exceeds parent session length ${maxSeq[0].maxSeq}`
  );
}
```

### 3. Deep Fork Chains

**Edge Case**: User creates fork → fork → fork → ... (deep nesting).

**Handling**:
- No schema limit on fork depth
- Service layer could enforce max depth (e.g., 10 levels)
- UI should handle deep trees gracefully (collapse/expand)
- Query performance: indexed parent_session_id makes traversal efficient

**Optional Depth Limit:**
```typescript
async function validateForkDepth(
  parentSessionId: string,
  maxDepth: number = 10
): Promise<void> {
  const lineage = await getSessionLineage(parentSessionId);

  if (lineage.length >= maxDepth) {
    throw new ValidationError(`Fork depth limit (${maxDepth}) exceeded`);
  }
}
```

### 4. Orphaned Forks (Parent Deleted)

**Edge Case**: Parent session is deleted, fork becomes orphan.

**Handling**:
- By design: SET NULL preserves fork as standalone session
- UI should indicate "Forked from deleted session"
- fork_from_seq preserved for reference (though parent messages lost)

**Query Pattern:**
```typescript
// Find orphaned forks (parent deleted)
const orphanedForks = await db.query.chatSessions.findMany({
  where: and(
    isNotNull(chatSessions.forkFromSeq), // Was a fork
    isNull(chatSessions.parentSessionId) // But parent is gone
  ),
});
```

### 5. Fork Across Different Tools

**Edge Case**: User attempts to fork session using different tool.

**Handling**:
- Schema allows (no constraint)
- Service layer should enforce: fork inherits parent's toolId
- Prevents confusing UX where fork uses different tool

**Validation:**
```typescript
// Always inherit parent's toolId
const [forkedSession] = await db.insert(chatSessions).values({
  parentSessionId,
  forkFromSeq,
  toolId: parentSession.toolId, // Inherit from parent
  userId,
});
```

### 6. Permissions on Forking

**Edge Case**: User attempts to fork another user's session.

**Handling**:
- CASL permission check: user must own parent session OR have read access
- Teacher can fork student session (for demonstration)
- Student cannot fork teacher's session (unless shared)

**Permission Example:**
```typescript
// Check if user can fork this session
const canFork = ability.can("fork", parentSession);
if (!canFork) {
  throw new ForbiddenError("Cannot fork this session");
}
```

---

## Open Questions

None. All requirements are clear and specification is complete.

---

## Implementation Steps

### Step 1: Update Chat Sessions Schema
- [ ] Add `parentSessionId` field (nullable UUID, self-reference)
- [ ] Add `forkFromSeq` field (nullable integer)
- [ ] Add index on `parentSessionId`
- [ ] Update JSDoc comments with fork documentation
- [ ] Add import for `integer` type from drizzle-orm

### Step 2: Add Drizzle Relations (Optional)
- [ ] Define `chatSessionsRelations` with parent/forks relations
- [ ] Test relation queries work correctly

### Step 3: Create Migration File
- [ ] Create `0011_add_chat_forking.sql`
- [ ] Add columns for parent_session_id and fork_from_seq
- [ ] Add foreign key constraint with SET NULL
- [ ] Add index on parent_session_id
- [ ] Add detailed comments explaining fork behavior

### Step 4: Update Tests
- [ ] Add tests for fork fields existence
- [ ] Add tests for type safety with fork fields
- [ ] Add tests documenting FK behavior (SET NULL)
- [ ] Update existing tests to include null fork fields in fixtures

### Step 5: Update Zod Schema (If Exists)
- [ ] Add `parentSessionId` to schema (optional UUID)
- [ ] Add `forkFromSeq` to schema (optional positive integer)
- [ ] Add validation: if forkFromSeq present, parentSessionId required

### Step 6: Verify and Document
- [ ] Run `pnpm typecheck` - must pass with zero errors
- [ ] Run `pnpm lint` - must pass
- [ ] Run `pnpm test` - all tests must pass
- [ ] Verify migration can be applied to test database
- [ ] Document query patterns in code comments

---

## References

- **E04-T001**: Original sessions schema implementation
- **E04-T009**: Chat schema enhancements (soft delete, metadata)
- **ARCHITECTURE.md**: Core entities section for chat sessions
- **CONVENTIONS.md**: Database patterns, foreign key behaviors

---

**End of Specification**
