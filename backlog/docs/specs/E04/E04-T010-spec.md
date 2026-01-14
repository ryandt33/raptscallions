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
-- STEP 4: Add CHECK constraint to prevent self-reference (AC13)
-- Prevents parent_session_id from pointing to itself (circular reference)
-- ============================================================================

ALTER TABLE "chat_sessions"
  ADD CONSTRAINT "chat_sessions_no_self_fork"
  CHECK (parent_session_id IS NULL OR parent_session_id != id);
--> statement-breakpoint

-- ============================================================================
-- STEP 5: Add partial index for orphaned forks query optimization (AC14)
-- Optimizes queries for "find all orphaned forks"
-- ============================================================================

CREATE INDEX "chat_sessions_orphaned_forks_idx"
  ON "chat_sessions" ("fork_from_seq")
  WHERE parent_session_id IS NULL AND fork_from_seq IS NOT NULL;
--> statement-breakpoint

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Both fields are nullable - most sessions are not forks
-- 2. SET NULL on delete preserves forked sessions as standalone conversations
-- 3. fork_from_seq is informational only - service layer handles message copying
-- 4. Index supports queries like "find all forks of session X"
-- 5. CHECK constraint provides defense in depth against circular references
-- 6. Partial index efficiently supports orphaned fork queries
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
| AC13 | CHECK constraint for self-reference | Add constraint to prevent parent_session_id = id | Constraint in migration, prevents self-fork |
| AC14 | Partial index for orphaned forks | Add index for orphan query optimization | Index in migration, query performance |

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
- [ ] Add CHECK constraint to prevent self-reference (AC13)
- [ ] Add partial index for orphaned forks query (AC14)
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

## Documentation Requirements

**IMPORTANT:** When knowledge base documentation is written for the chat forking feature (in future documentation tasks), it MUST include a dedicated section covering:

### UI Implementation Requirements

Specific guidance for implementing fork user interface:
- **Orphaned Fork Indicators** - Visual badges/icons and messaging for orphaned forks ("Forked from deleted conversation")
- **Fork Creation Prompts** - UI prompts asking "Why are you creating this fork?" with helpful defaults
- **Fork Tree Navigation** - Breadcrumb trails showing lineage, parent/child navigation patterns
- **Soft-Delete vs. Hard-Delete** - Distinguishing deleted parents (restorable) from orphaned forks (parent gone)
- **Deep Fork Chains** - Collapse/expand patterns, depth indicators, "flatten" utilities
- **Fork Comparison** - Side-by-side diff views comparing fork vs. parent at divergence point
- **Accessibility** - Screen reader announcements, keyboard navigation, high-contrast indicators

### Business Logic Requirements

Service layer implementation patterns:
- **Fork Validation Rules** - Depth limits (soft limit at 10), self-reference prevention, message sequence validation
- **Message Copying Strategies** - Approaches for copying parent messages up to fork point
- **Permission Checks** - CASL patterns for fork operations (who can fork whose sessions)
- **Orphaned Fork Queries** - Efficient queries for finding and managing orphaned forks
- **Fork Metadata Auto-Generation** - Patterns for auto-generating fork titles ("Original (fork 1)")
- **Analytics Tracking** - Tracking fork depth, frequency, user patterns for product insights

### Reference

See the **UX Review** section in this specification for complete requirements, edge cases, and detailed recommendations. The UX review provides comprehensive analysis of:
- User mental models and flow analysis
- Data integrity and trust considerations
- Edge case handling (6 scenarios analyzed)
- Accessibility requirements
- Consistency with existing patterns (soft delete interaction)

This documentation will ensure future UI and service layer implementations properly handle the UX concerns identified during planning.

---

**End of Specification**

---

## UX Review

**Reviewer:** designer
**Date:** 2026-01-14
**Verdict:** APPROVED_WITH_RECOMMENDATIONS

### Executive Summary

The fork schema design provides a **solid foundation** for a powerful branching conversation feature. The data model supports the core UX requirements: preserving original work, allowing exploration of alternatives, and maintaining context about fork relationships.

**Schema Strengths:**
- Non-destructive forking preserves user confidence
- Orphan-safe design protects student/teacher work
- Fork point tracking enables meaningful UI context
- Query-efficient structure supports responsive UI

**UX Risks Identified:**
- Orphaned forks could confuse users if UI doesn't clarify state
- Deep fork trees may be cognitively overwhelming
- Missing metadata fields limit UI's ability to explain fork purpose
- Soft delete + forking interaction needs careful UX handling

This schema is **approved for implementation** with strong recommendations for future UI tasks to address the UX concerns identified below.

---

### Mental Model Analysis

#### Fork Metaphor Clarity

**Strength:** The "fork" concept aligns well with user mental models from:
- Git branching (familiar to teachers who code)
- "What if" scenarios in educational contexts
- Undo/redo patterns in creative software

**Concern:** The schema doesn't capture *why* someone forked. When a user returns to a session list with 5 forks, they won't remember which fork was "trying a different approach" vs. "recovering from a mistake" vs. "demonstrating to students."

**Recommendation for Future UI Tasks:**
- Add optional `fork_reason` or `fork_description` field in future schema enhancement
- UI should prompt "Why are you creating this fork?" with helpful defaults:
  - "Explore a different approach"
  - "Start over from this point"
  - "Demonstrate alternative solution"
  - Custom text input

---

### User Flow Analysis

#### Creating a Fork

**Happy Path (Well-Supported):**
1. User identifies pivot point in conversation (message seq)
2. Clicks "Fork from here"
3. New session created with full parent context
4. User continues conversation in new direction

**Schema Support:** Excellent - `fork_from_seq` preserves exact fork point, `parent_session_id` enables context retrieval.

**Potential UX Friction:**
- **Message Context Copying:** Schema defers "how messages are copied" to service layer. UI needs to clearly communicate: "This fork starts with messages 1-5 from the parent session."
- **Initial State Visibility:** When fork opens, user should immediately understand they're in a fork (not the original). Schema supports this via `parent_session_id`, but UI must surface it prominently.

#### Navigating Fork Relationships

**User Needs:**
- "Show me all branches from this conversation"
- "Go back to the original conversation"
- "Compare this fork with the original"
- "See where I forked from"

**Schema Support:**
- Relations enable querying parent and children (GOOD)
- `fork_from_seq` allows UI to highlight fork divergence point (EXCELLENT)
- Query patterns support lineage traversal (GOOD)

**Missing Schema Support:**
- No timestamp for when fork was created (uses `started_at`, which is fine)
- No way to mark a fork as "preferred" or "archived" (future enhancement)

**Recommendation:** Schema is sufficient. Future UI should implement:
- Visual fork tree/graph in session list
- Breadcrumb navigation showing lineage
- Diff view comparing fork vs. parent at divergence point

#### Orphaned Forks (Parent Deletion)

**Critical UX Decision:** SET NULL on parent deletion

**Strengths:**
- Preserves student work when teacher deletes original
- Non-destructive approach builds user trust
- Maintains fork history via `fork_from_seq`

**UX Challenges:**
- **Confusing State:** User sees `fork_from_seq: 5` but `parent_session_id: null`. What does this mean to them?
- **Lost Context:** Parent messages are gone. Fork's context becomes incomplete.
- **UI Clarity:** Must communicate "This was forked from a conversation that no longer exists."

**Recommendations for Future UI:**
1. **Visual Indicator:** Show orphaned forks with clear badge/icon:
   - "Forked from deleted conversation"
   - Include original fork date for context
2. **Soft Delete Integration:** When user soft-deletes a parent session:
   - Warn: "This session has 3 forks. They will lose their connection to this parent."
   - Option: "Delete parent but keep forks" vs. "Delete all (parent + forks)"
3. **Orphan Query:** UI should have "Show orphaned forks" filter to help users clean up

---

### Data Integrity and User Trust

#### Scenario: Teacher Demonstrates Forking to Class

**Use Case:** Teacher shows multiple problem-solving approaches by forking a session three times.

**Schema Support:**
- Teacher can fork → fork → fork (no depth limit)
- All forks reference parent via `parent_session_id`
- Students can see fork tree if permissions allow

**UX Concern:**
- **Cognitive Overload:** Without titles/descriptions, fork tree becomes "Session 1, Session 2, Session 3..."
- **Missing Metadata:** Schema has `title` field (good), but no "fork_number" or "fork_label" to help UI auto-generate helpful names

**Recommendation:**
- Service layer should auto-generate titles: `{parent.title} (fork 1)`, `{parent.title} (fork 2)`
- Spec already shows this pattern in `createFork()` example (line 325-327) - EXCELLENT!
- UI should make title editable immediately after fork creation

#### Scenario: Student Makes Mistake, Wants to Fork Back

**Use Case:** Student tries approach A (fails), forks to try approach B, then wants to return to approach A to revise.

**Schema Support:**
- Both branches preserved as independent sessions
- Student can navigate between forks via parent relationship
- History is non-destructive

**UX Concern:**
- **Re-forking from a Fork:** Schema allows it (no constraint). Is this intuitive?
- **Fork vs. Session Ambiguity:** Are forks just "normal sessions with a parent" or a special category?

**Recommendation:**
- Schema treats forks as normal sessions (correct decision - keeps model simple)
- UI should visually distinguish forks from root sessions in session list
- Allow "fork from fork" but show lineage clearly (breadcrumb trail)

---

### Edge Case UX Review

The spec identifies 6 edge cases. Here's the UX perspective on each:

#### 1. Circular Fork References (Self-Reference)

**Schema Handling:** Service layer validates `parentSessionId !== sessionId`

**UX Impact:** Low - users won't naturally attempt this. Error message should be clear if it happens due to bug.

**Recommendation:** Error message should be user-friendly: "A session cannot be forked from itself" (not "Circular reference detected").

#### 2. Fork from Non-Existent Message Sequence

**Schema Handling:** Service layer validates `forkFromSeq <= maxSeq`

**UX Impact:** Medium - could happen if UI shows stale message count or has race condition.

**UX Risk:** User clicks "Fork from here" on message 10, but in the time between page load and click, parent session was trimmed to 5 messages (unlikely but possible with concurrent edits).

**Recommendation:**
- UI should fetch current max seq before allowing fork
- Error message: "This message is no longer available. Please refresh and try again."
- Alternative approach (from spec line 548): Allow fork from end if seq exceeds. This is MORE user-friendly (principle of least surprise).

**Verdict:** Spec's alternative approach is better UX. **Recommendation: Default to "fork from end" rather than erroring.**

#### 3. Deep Fork Chains

**Schema Handling:** No limit, but spec suggests optional 10-level depth limit.

**UX Impact:** High - deep trees are cognitively overwhelming.

**Real-World Scenario:**
- Teacher forks for demo → Student forks to try → Student forks again → Student forks again...
- Lineage: Root → Fork 1 → Fork 2 → Fork 3 → Fork 4 → ...

**Recommendation:**
- **Schema:** Keep unlimited (don't artificially constrain)
- **Service Layer:** Log warning at depth 5, soft error at depth 10
- **UI:** Collapse deep trees by default, show "5 levels deep" indicator, provide "flatten" action to copy current state as new root session

**Verdict:** Schema is correct. UI must handle gracefully.

#### 4. Orphaned Forks (Parent Deleted)

Already covered in "User Flow Analysis" section above. Key point: **UI must make orphan state visible and understandable.**

#### 5. Fork Across Different Tools

**Schema Handling:** Spec says service layer enforces `fork.toolId = parent.toolId`

**UX Impact:** High - forking to a different tool would be very confusing.

**Scenario:** User in "Math Tutor" session forks, suddenly in "Science Tutor" session with same history? Nonsensical.

**Recommendation:** Spec is correct. Always inherit `toolId`. UI should never offer option to change tool when forking.

**Verdict:** Correct design decision.

#### 6. Permissions on Forking

**Schema Handling:** CASL permission check at service layer

**UX Scenarios:**
1. **Student forks own session:** Allowed (should always work)
2. **Teacher forks student session (for demo):** Should be allowed
3. **Student forks teacher's session:** Depends on sharing permissions

**UX Concern:** What happens to fork ownership? Does the fork inherit parent's `userId` or use the forking user's `userId`?

**Schema Review (line 323):**
```typescript
userId,  // The user creating the fork (not parent's userId)
```

**Verdict:** Correct - fork is owned by user who creates it. This prevents permission escalation (student forks teacher session → student owns fork → student can edit).

**UI Recommendation:**
- When teacher forks student session, UI should show: "You are creating a copy of [Student Name]'s session"
- When student forks shared teacher session, UI should show: "Creating your own version of [Teacher Name]'s session"

---

### Accessibility Considerations

#### Screen Reader Support (Future UI)

**Requirements:**
- Fork relationships must be announced: "This session was forked from [Parent Title] at message 5"
- Fork tree navigation must be keyboard-accessible
- Visual fork graph must have text alternative: "Fork tree: 1 parent session with 3 child forks"

**Schema Support:** Excellent - all data needed for a11y descriptions is present.

#### Keyboard Navigation

**Requirements:**
- "Fork from here" action must be keyboard-accessible on each message
- Navigate up/down fork tree with keyboard shortcuts
- Expand/collapse fork tree branches with Enter/Space

**Schema Support:** Schema is navigation-agnostic (good). UI implementation must handle.

#### Visual Accessibility

**Requirements:**
- Fork relationships should not rely solely on color
- Use icons, labels, indentation for fork hierarchy
- High contrast for orphaned fork indicators

**Schema Support:** N/A (schema doesn't constrain UI). No concerns.

---

### Consistency with Existing Patterns

#### Soft Delete Interaction

**Existing Pattern:** Sessions have `deleted_at` for soft delete (E04-T009).

**Fork Interaction Question:** What happens when:
1. User soft-deletes parent session (deleted_at set)
2. Forks still reference parent via `parent_session_id`
3. User tries to load fork and navigate to parent

**Expected Behavior:**
- Parent session is "deleted" but `parent_session_id` is still set (not null)
- Query with `isNull(deletedAt)` would hide parent
- Fork's parent appears "missing" even though it exists in DB

**UX Implication:**
- Similar to orphaned fork, but different cause
- User might think parent was "permanently deleted" when it's actually in trash

**Recommendation:**
- UI should distinguish:
  - **Orphaned Fork:** `parent_session_id: null` → "Parent was deleted"
  - **Deleted Parent:** `parent_session_id: <uuid>` but parent has `deleted_at` → "Parent is in trash"
- UI should offer "Restore parent from trash" action in second case

**Schema Impact:** None needed. Spec should note this interaction in edge cases.

**Action:** Add this as Edge Case #7 in spec or document in service layer.

---

### Recommendations for Future Implementation

#### High Priority (Should Address)

1. **Fork Reason/Description Field**
   - Add optional `fork_description` field to capture user intent
   - Helps users remember why they created each fork
   - Could be added in future schema enhancement task

2. **Soft Delete + Fork Interaction Documentation**
   - Document behavior when parent is soft-deleted vs. hard-deleted
   - Service layer should provide `getParentSession({ includeDeleted: true })` option
   - UI should distinguish deleted vs. missing parents

3. **Fork Depth Soft Limit**
   - Implement 10-level soft limit in service layer (as spec suggests)
   - Log analytics when users hit depth 5+ (indicates use case we should study)
   - UI should provide "flatten fork chain" utility

#### Medium Priority (Nice to Have)

4. **Fork Metadata**
   - Add `fork_count` to parent session (denormalized for performance)
   - Add `fork_depth` to track position in lineage (denormalized)
   - Enables UI to show "This session has 3 forks" without query

5. **Fork State Indicators**
   - Optional `fork_status` enum: "active" | "archived" | "merged"
   - Allows users to mark forks they've explored and abandoned
   - Reduces clutter in fork tree UI

6. **Fork Comparison Support**
   - Schema already supports this via message queries
   - Future UI task should implement side-by-side fork comparison
   - Show divergence point highlighting

#### Low Priority (Future Enhancements)

7. **Fork Merging**
   - Advanced feature: allow users to merge insights from fork back into parent
   - Would require message copying/appending logic
   - Schema supports this (can query messages from both sessions)

8. **Fork Templates**
   - Allow teachers to create "template forks" that students can use as starting points
   - Schema supports via permissions on parent session
   - Purely service layer + UI work

---

### Schema-Level Recommendations

#### Recommended Addition: CHECK Constraint for Self-Reference

**Current:** Spec mentions service layer validation for circular references.

**Recommendation:** Add database-level CHECK constraint for safety:

```sql
ALTER TABLE "chat_sessions"
  ADD CONSTRAINT "chat_sessions_no_self_fork"
  CHECK (parent_session_id IS NULL OR parent_session_id != id);
```

**Rationale:**
- Defense in depth (validates even if service layer has bug)
- Prevents data corruption
- Clear error at DB level

**Verdict:** Should add to migration.

#### Recommended Addition: Partial Index for Orphans

**Current:** Index on `parent_session_id` for fork tree queries.

**Recommendation:** Add partial index for orphaned forks query:

```sql
CREATE INDEX "chat_sessions_orphaned_forks_idx"
  ON "chat_sessions" (fork_from_seq)
  WHERE parent_session_id IS NULL AND fork_from_seq IS NOT NULL;
```

**Rationale:**
- Optimizes the orphaned fork query (spec line 600-605)
- Small index (only orphaned forks)
- Supports "show me all orphaned forks" UI feature

**Verdict:** Optional but recommended for query performance.

---

### Verdict Reasoning

**APPROVED_WITH_RECOMMENDATIONS** because:

**Strengths (Approval Justification):**
1. Schema supports all core fork UX patterns (create, navigate, preserve)
2. Non-destructive design builds user trust
3. Orphan-safe approach protects work in multi-user scenarios
4. Query patterns enable responsive, intuitive UI
5. Edge cases are well-identified and handled
6. Type safety and validation support error prevention

**Recommendations (Not Blocking):**
1. Future UI tasks MUST address orphaned fork visibility
2. Consider adding fork description/reason in future enhancement
3. Document soft-delete + fork interaction for service layer
4. Add CHECK constraint for self-reference prevention
5. Implement depth soft limit in service layer (not schema)

**No Blocking Issues Identified.** The schema provides a solid foundation for implementing fork UX in future tasks. The recommendations above will improve the user experience but are not prerequisites for approving this schema design.

---

### Next Steps for Future UI Implementation

When UI tasks for forking are created, they should reference this review and address:

1. **Visual Fork Tree/Graph** - Show relationships clearly
2. **Fork Navigation** - Breadcrumb trail, "go to parent" action
3. **Orphan State Communication** - Clear indicators for orphaned forks
4. **Fork Creation UX** - Prompt for description, show context being copied
5. **Accessibility** - Screen reader announcements, keyboard navigation
6. **Soft Delete Integration** - Distinguish deleted vs. missing parents
7. **Deep Tree Handling** - Collapse, expand, flatten actions
8. **Comparison View** - Side-by-side fork vs. parent diff

**Schema is APPROVED.** UX concerns are noted for future implementation.
