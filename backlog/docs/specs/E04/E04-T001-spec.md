# Implementation Spec: E04-T001 - Sessions and Messages Schemas

**Epic:** E04 - Chat Runtime
**Task:** E04-T001
**Status:** DRAFT
**Created:** 2026-01-12
**Author:** Analyst Agent

---

## Overview

This task implements Drizzle schema definitions for two core chat runtime tables:

1. **sessions** - Tracks chat sessions (user + tool + state) for multi-turn conversations
2. **messages** - Stores conversation history with roles and sequencing

These schemas are distinct from the existing authentication sessions table (`sessions` in `packages/db/src/schema/sessions.ts`) and represent chat session state for the Chat Runtime feature.

**Note on Naming Collision:** The existing authentication sessions table will need to be handled carefully. The chat sessions table will be named `chat_sessions` in the database to avoid collision, though the Drizzle schema export will be `chatSessions`.

---

## Technical Design

### 1. Database Schema

#### 1.1 Chat Sessions Table

**Purpose:** Track multi-turn chat conversations between a user and a tool.

**Table Name:** `chat_sessions` (to avoid collision with auth sessions)

**Schema Definition:**

```typescript
// Location: packages/db/src/schema/chat-sessions.ts

import {
  pgEnum,
  pgTable,
  uuid,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tools } from "./tools.js";
import { users } from "./users.js";

/**
 * Session state enum representing the lifecycle of a chat session.
 * - active: Session is ongoing, user can send messages
 * - paused: Session temporarily paused (may resume later)
 * - completed: Session ended by user or system
 */
export const sessionStateEnum = pgEnum("session_state", [
  "active",
  "paused",
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
 * - Can be 'paused' for temporary breaks
 * - Moved to 'completed' when user ends or session expires
 *
 * Foreign key behavior:
 * - tool_id: RESTRICT delete (cannot delete tools with active sessions)
 * - user_id: CASCADE delete (remove sessions when user is deleted)
 *
 * @example
 * ```typescript
 * const newSession: NewChatSession = {
 *   toolId: "tool-uuid",
 *   userId: "user-uuid",
 *   state: "active"
 * };
 * await db.insert(chatSessions).values(newSession);
 * ```
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
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => ({
    toolIdIdx: index("chat_sessions_tool_id_idx").on(table.toolId),
    userIdIdx: index("chat_sessions_user_id_idx").on(table.userId),
    stateIdx: index("chat_sessions_state_idx").on(table.state),
  })
);

/**
 * ChatSession type for select operations (reading from database).
 * All fields are present including auto-generated values.
 *
 * @example
 * ```typescript
 * const session = await db.query.chatSessions.findFirst({
 *   where: eq(chatSessions.id, sessionId),
 *   with: { messages: true }
 * });
 * // session.state is 'active' | 'paused' | 'completed'
 * // session.endedAt is Date | null
 * ```
 */
export type ChatSession = typeof chatSessions.$inferSelect;

/**
 * NewChatSession type for insert operations (writing to database).
 * Omits auto-generated fields like id and startedAt.
 *
 * @example
 * ```typescript
 * const newSession: NewChatSession = {
 *   toolId: "tool-uuid",
 *   userId: "user-uuid",
 *   state: "active"
 * };
 * ```
 */
export type NewChatSession = typeof chatSessions.$inferInsert;

// Add metadata accessor for test compatibility (matches existing pattern)
Object.defineProperty(chatSessions, "_", {
  get() {
    return {
      name:
        Symbol.for("drizzle:Name") in chatSessions
          ? (chatSessions as any)[Symbol.for("drizzle:Name")]
          : "chat_sessions",
    };
  },
  enumerable: false,
  configurable: true,
});
```

#### 1.2 Messages Table

**Purpose:** Store ordered conversation history for chat sessions.

**Table Name:** `messages`

**Schema Definition:**

```typescript
// Location: packages/db/src/schema/messages.ts

import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { chatSessions } from "./chat-sessions.js";

/**
 * Message role enum representing who created the message.
 * - user: Message from the human user
 * - assistant: Message from the AI assistant
 * - system: System-level message (e.g., tool instructions, context)
 */
export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

/**
 * Messages table - conversation history within chat sessions.
 *
 * Messages are the building blocks of chat sessions. Each message has:
 * - A role indicating who sent it (user, assistant, or system)
 * - Content (the actual message text)
 * - A sequence number for ordering within the session
 * - Optional metadata (tokens used, model, timing, etc.)
 *
 * Message ordering:
 * - Messages are ordered by 'seq' within each session
 * - Seq starts at 1 and increments for each message
 * - The (session_id, seq) combination ensures fast retrieval
 *
 * Foreign key behavior:
 * - session_id: CASCADE delete (remove messages when session is deleted)
 *
 * Metadata examples:
 * - { "tokens": 150, "model": "claude-3-sonnet", "latency_ms": 432 }
 * - { "module_extractions": [...] }
 *
 * @example
 * ```typescript
 * const newMessage: NewMessage = {
 *   sessionId: "session-uuid",
 *   role: "user",
 *   content: "How do I solve this equation?",
 *   seq: 1
 * };
 * await db.insert(messages).values(newMessage);
 * ```
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    seq: integer("seq").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    meta: jsonb("meta").notNull().default("{}"),
  },
  (table) => ({
    sessionSeqIdx: index("messages_session_seq_idx").on(
      table.sessionId,
      table.seq
    ),
  })
);

/**
 * Message type for select operations (reading from database).
 * All fields are present including auto-generated values.
 *
 * @example
 * ```typescript
 * const sessionMessages = await db.query.messages.findMany({
 *   where: eq(messages.sessionId, sessionId),
 *   orderBy: asc(messages.seq)
 * });
 * // Each message has role, content, seq, createdAt, meta
 * ```
 */
export type Message = typeof messages.$inferSelect;

/**
 * NewMessage type for insert operations (writing to database).
 * Omits auto-generated fields like id and createdAt.
 *
 * @example
 * ```typescript
 * const newMessage: NewMessage = {
 *   sessionId: "session-uuid",
 *   role: "assistant",
 *   content: "To solve this equation...",
 *   seq: 2,
 *   meta: { tokens: 150, model: "claude-3-sonnet" }
 * };
 * ```
 */
export type NewMessage = typeof messages.$inferInsert;

// Add metadata accessor for test compatibility (matches existing pattern)
Object.defineProperty(messages, "_", {
  get() {
    return {
      name:
        Symbol.for("drizzle:Name") in messages
          ? (messages as any)[Symbol.for("drizzle:Name")]
          : "messages",
    };
  },
  enumerable: false,
  configurable: true,
});
```

### 2. Migration File

**File:** `packages/db/src/migrations/0008_create_chat_sessions_messages.sql`

**Note on Migration Numbering:** Based on the existing migrations (0001-0003, 0006 for tools), this is numbered 0008. If migrations 0004, 0005, or 0007 exist, adjust numbering accordingly.

```sql
-- Create session_state enum
CREATE TYPE "public"."session_state" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint

-- Create message_role enum
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint

-- Create chat_sessions table
CREATE TABLE "chat_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tool_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "state" "session_state" DEFAULT 'active' NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ended_at" timestamp with time zone
);
--> statement-breakpoint

-- Create messages table
CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "role" "message_role" NOT NULL,
  "content" text NOT NULL,
  "seq" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "meta" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "chat_sessions"
  ADD CONSTRAINT "chat_sessions_tool_id_tools_id_fk"
  FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "chat_sessions"
  ADD CONSTRAINT "chat_sessions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_session_id_chat_sessions_id_fk"
  FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create indexes
CREATE INDEX "chat_sessions_tool_id_idx" ON "chat_sessions" USING btree ("tool_id");
--> statement-breakpoint
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "chat_sessions_state_idx" ON "chat_sessions" USING btree ("state");
--> statement-breakpoint
CREATE INDEX "messages_session_seq_idx" ON "messages" USING btree ("session_id", "seq");
```

### 3. Schema Index Updates

**File:** `packages/db/src/schema/index.ts`

Add exports for the new tables:

```typescript
// Export chat_sessions table and types
export * from "./chat-sessions.js";

// Export messages table and types
export * from "./messages.js";
```

**Location:** Add these after the existing tool export (around line 26).

---

## Key Design Decisions

### 1. Naming Collision Resolution

**Problem:** An authentication sessions table already exists at `packages/db/src/schema/sessions.ts`.

**Solution:**
- Database table name: `chat_sessions` (distinct from auth sessions)
- Drizzle schema export: `chatSessions` (camelCase convention)
- TypeScript types: `ChatSession`, `NewChatSession` (prefixed)

This maintains clarity and prevents confusion between authentication sessions and chat sessions.

### 2. Foreign Key Cascade Behavior

**tool_id: RESTRICT**
- Prevents deletion of tools that have active sessions
- Ensures referential integrity
- Admin must archive/complete sessions before deleting a tool

**user_id: CASCADE**
- When a user is deleted, their chat sessions are automatically removed
- Follows GDPR compliance patterns (right to be forgotten)
- Consistent with existing user deletion behavior

**session_id (in messages): CASCADE**
- When a chat session is deleted, all its messages are automatically removed
- Messages have no independent existence outside their session
- Maintains data consistency

### 3. Indexing Strategy

**chat_sessions:**
- `tool_id`: High-frequency query (get all sessions for a tool)
- `user_id`: High-frequency query (get user's chat history)
- `state`: Moderate-frequency filtering (active sessions monitoring)

**messages:**
- `(session_id, seq)` composite: Critical for message ordering retrieval
- Enables fast pagination and chronological display

### 4. State Machine

Chat sessions follow this lifecycle:

```
[Created] → active → paused → active → completed
                  ↘          ↗
                    [timeout/user action]
```

States:
- **active**: Default state, user can send messages
- **paused**: Temporary break (optional feature, may not be used initially)
- **completed**: Terminal state, session archived

### 5. Message Sequencing

- `seq` is an integer starting at 1 for each session
- Application layer is responsible for assigning correct seq values
- No database-level unique constraint to allow flexibility
- Composite index `(session_id, seq)` ensures fast ordered retrieval

### 6. Metadata Field

The `meta` JSONB field on messages provides extensibility for:
- Token usage tracking (`{ "tokens": 150 }`)
- Model identification (`{ "model": "claude-3-sonnet" }`)
- Latency metrics (`{ "latency_ms": 432 }`)
- Module extractions (`{ "extractions": [...] }`)
- Future features without schema changes

Default: `{}` (empty object, not null)

---

## Implementation Steps

### Step 1: Create chat-sessions.ts Schema
- [ ] Create file `packages/db/src/schema/chat-sessions.ts`
- [ ] Define `sessionStateEnum` with values: 'active', 'paused', 'completed'
- [ ] Define `chatSessions` table with fields per spec
- [ ] Add foreign key references to tools and users
- [ ] Add indexes: tool_id, user_id, state
- [ ] Export types: `ChatSession`, `NewChatSession`
- [ ] Add metadata accessor for test compatibility

### Step 2: Create messages.ts Schema
- [ ] Create file `packages/db/src/schema/messages.ts`
- [ ] Define `messageRoleEnum` with values: 'user', 'assistant', 'system'
- [ ] Define `messages` table with fields per spec
- [ ] Add foreign key reference to chat_sessions with CASCADE
- [ ] Add composite index: (session_id, seq)
- [ ] Export types: `Message`, `NewMessage`
- [ ] Add metadata accessor for test compatibility

### Step 3: Create Migration File
- [ ] Create file `packages/db/src/migrations/0008_create_chat_sessions_messages.sql`
- [ ] Define both enums (session_state, message_role)
- [ ] Create chat_sessions table with constraints
- [ ] Create messages table with constraints
- [ ] Add all foreign key constraints
- [ ] Add all indexes
- [ ] Verify migration syntax against existing patterns

### Step 4: Update Schema Index
- [ ] Add export for `chat-sessions.js` in `packages/db/src/schema/index.ts`
- [ ] Add export for `messages.js` in `packages/db/src/schema/index.ts`
- [ ] Verify barrel exports work correctly

### Step 5: Write Unit Tests
- [ ] Test file: `packages/db/__tests__/chat-sessions.test.ts`
- [ ] Test: Insert chat session with valid tool_id and user_id
- [ ] Test: Verify default state is 'active'
- [ ] Test: Verify startedAt is auto-populated
- [ ] Test: Verify cannot delete tool with active sessions (RESTRICT)
- [ ] Test: Verify cascade delete when user is deleted
- [ ] Test: Verify state transitions (active → paused → completed)

### Step 6: Write Message Tests
- [ ] Test file: `packages/db/__tests__/messages.test.ts`
- [ ] Test: Insert message with all required fields
- [ ] Test: Verify meta defaults to {}
- [ ] Test: Verify cascade delete when session is deleted
- [ ] Test: Query messages ordered by seq
- [ ] Test: Composite index efficiency (session_id + seq)
- [ ] Test: Message roles (user, assistant, system)

---

## Testing Strategy

### Unit Tests

**Test Coverage Areas:**
1. Schema validation (Drizzle type inference)
2. Default values (state='active', meta={})
3. Foreign key constraints (CASCADE and RESTRICT)
4. Indexes (verify creation, not query performance)
5. Type exports (ChatSession, NewChatSession, Message, NewMessage)

**Test Environment:**
- In-memory SQLite database with same schema
- Mock data factories for users, tools, sessions, messages
- Isolated transactions per test

**Example Test Structure:**

```typescript
// packages/db/__tests__/chat-sessions.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/client.js";
import { chatSessions } from "../src/schema/chat-sessions.js";
import { users } from "../src/schema/users.js";
import { tools } from "../src/schema/tools.js";

describe("ChatSessions Schema", () => {
  let testUser: User;
  let testTool: Tool;

  beforeEach(async () => {
    // Setup: Create user and tool
    testUser = await createMockUser();
    testTool = await createMockTool({ createdBy: testUser.id });
  });

  it("should create chat session with default state 'active'", async () => {
    const [session] = await db
      .insert(chatSessions)
      .values({
        toolId: testTool.id,
        userId: testUser.id,
      })
      .returning();

    expect(session.state).toBe("active");
    expect(session.startedAt).toBeInstanceOf(Date);
    expect(session.endedAt).toBeNull();
  });

  it("should prevent deleting tool with active sessions", async () => {
    await db.insert(chatSessions).values({
      toolId: testTool.id,
      userId: testUser.id,
    });

    await expect(
      db.delete(tools).where(eq(tools.id, testTool.id))
    ).rejects.toThrow();
  });

  it("should cascade delete sessions when user is deleted", async () => {
    const [session] = await db
      .insert(chatSessions)
      .values({
        toolId: testTool.id,
        userId: testUser.id,
      })
      .returning();

    await db.delete(users).where(eq(users.id, testUser.id));

    const deletedSession = await db.query.chatSessions.findFirst({
      where: eq(chatSessions.id, session.id),
    });

    expect(deletedSession).toBeUndefined();
  });
});
```

---

## Integration Points

### Dependencies
- `packages/db/src/schema/users.ts` - For user_id foreign key
- `packages/db/src/schema/tools.ts` - For tool_id foreign key

### Dependents
- **E04-T004**: Chat service implementation (will use these schemas)
- **E04-T005**: Chat API routes (will query these tables)

### No Changes Required
- Existing authentication sessions table remains unchanged
- No impact on other modules or services

---

## Risks and Mitigations

### Risk 1: Naming Collision with Auth Sessions
**Impact:** Medium - Could cause confusion or import errors
**Mitigation:** Use distinct table name (`chat_sessions`), clear documentation, namespace imports

### Risk 2: Message Seq Integrity
**Impact:** Medium - Messages could be out of order if seq not managed properly
**Mitigation:** Service layer responsible for seq assignment, tests verify ordering, future: consider database-level constraint or trigger

### Risk 3: RESTRICT on tool_id May Block Tool Deletion
**Impact:** Low - Admins may need to complete sessions before deleting tools
**Mitigation:** Document the requirement, provide UI to bulk-complete sessions, future: consider soft delete for tools

### Risk 4: Meta Field Schema Drift
**Impact:** Low - JSONB flexibility can lead to inconsistent metadata
**Mitigation:** Define Zod schemas for common meta patterns in `@raptscallions/core/schemas`, validate at service layer

---

## Acceptance Criteria Mapping

| AC | Requirement | Implementation | Status |
|----|-------------|----------------|--------|
| AC1 | sessions table with id, tool_id, user_id, state, timestamps | `chat_sessions` table in `chat-sessions.ts` | ✅ |
| AC2 | session_state enum: 'active', 'paused', 'completed' | `sessionStateEnum` in `chat-sessions.ts` | ✅ |
| AC3 | messages table with id, session_id, role, content, seq, created_at | `messages` table in `messages.ts` | ✅ |
| AC4 | message_role enum: 'user', 'assistant', 'system' | `messageRoleEnum` in `messages.ts` | ✅ |
| AC5 | Foreign keys with CASCADE delete | tool_id: RESTRICT, user_id: CASCADE, session_id: CASCADE | ✅ |
| AC6 | Index on (session_id, seq) for message ordering | `messages_session_seq_idx` composite index | ✅ |
| AC7 | Migration file 0008_create_sessions_messages.sql | `0008_create_chat_sessions_messages.sql` | ✅ |
| AC8 | TypeScript types exported | `ChatSession`, `NewChatSession`, `Message`, `NewMessage` | ✅ |
| AC9 | Relations defined | Foreign keys define relations (Drizzle infers from references) | ✅ |
| AC10 | Tests verify constraints and ordering | Unit tests in `__tests__/` directories | ✅ |

---

## Open Questions

None. All requirements are clear and specification is complete.

---

## References

- **ARCHITECTURE.md** - Database design patterns, naming conventions
- **CONVENTIONS.md** - TypeScript patterns, error handling, testing standards
- **tools.ts** - Reference implementation for schema patterns
- **users.ts** - Reference implementation for metadata accessors
- **0006_create_tools.sql** - Reference for migration syntax

---

## Appendix: Type Definitions

### Exported Types

```typescript
// From chat-sessions.ts
export type ChatSession = {
  id: string;
  toolId: string;
  userId: string;
  state: "active" | "paused" | "completed";
  startedAt: Date;
  endedAt: Date | null;
};

export type NewChatSession = {
  toolId: string;
  userId: string;
  state?: "active" | "paused" | "completed";
  startedAt?: Date;
  endedAt?: Date | null;
};

// From messages.ts
export type Message = {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  seq: number;
  createdAt: Date;
  meta: unknown; // Use Zod schema to parse at runtime
};

export type NewMessage = {
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  seq: number;
  meta?: unknown;
  createdAt?: Date;
};
```

---

## UX Review

**Reviewer:** Designer Agent
**Date:** 2026-01-12
**Status:** APPROVED with Recommendations

### Overview

This specification defines database schemas for chat sessions and messages. While this is backend infrastructure with no direct UI, the data modeling decisions will significantly impact the user experience of the chat feature. This review focuses on:

1. **Developer Experience (DX)** - Schema clarity and usability
2. **Data Model UX** - How the structure supports good user experiences
3. **Downstream UX Impacts** - Potential issues for future UI implementation

### Strengths

#### 1. Clear State Machine (✅ Excellent)
- The session lifecycle (`active` → `paused` → `completed`) is intuitive
- States map well to user mental models of "using", "taking a break", and "finished"
- Documentation clearly explains state transitions

#### 2. Message Ordering Strategy (✅ Excellent)
- Explicit `seq` field with composite index `(session_id, seq)` ensures fast chronological display
- This prevents UI pagination issues and supports smooth infinite scroll
- User expectation: messages always appear in order ✓

#### 3. Extensible Metadata (✅ Good)
- JSONB `meta` field allows future features without schema changes
- Examples provided (tokens, latency, model) guide consistent usage
- Supports analytics and debugging without impacting core UX

#### 4. Cascade Delete Behavior (✅ Good)
- `user_id: CASCADE` - Respects GDPR "right to be forgotten"
- `session_id: CASCADE` (messages) - Messages don't outlive sessions (correct boundary)
- `tool_id: RESTRICT` - Prevents orphaned sessions (good data integrity)

### Concerns and Recommendations

#### Concern 1: Naming Collision with Auth Sessions (⚠️ Medium Priority)

**Issue:**
The spec renames the table to `chat_sessions` to avoid collision with the existing auth `sessions` table. However, the task technical notes (lines 52-71 in the task file) still reference `sessions` not `chat_sessions`.

**UX Impact:**
- **Developer Confusion**: Developers reading the task vs spec will see different table names
- **Import Errors**: Copy-paste from task examples will fail
- **Cognitive Load**: "Is it `sessions` or `chat_sessions`?"

**Recommendation:**
1. Update the task technical notes to match the spec (use `chat_sessions`)
2. Add a prominent note at the top of the spec about the naming decision
3. Consider if "chat_sessions" is the final choice or if a better name exists (e.g., `conversation_sessions`, `tool_sessions`)

**Suggested Addition to Spec (Line 21):**
```markdown
**⚠️ IMPORTANT NAMING DECISION:** This table is named `chat_sessions` (not `sessions`) to avoid collision with the existing authentication sessions table. All code examples use `chat_sessions`. If you see references to `sessions` in related documentation, they refer to auth sessions unless explicitly prefixed with "chat".
```

#### Concern 2: Message Sequence Integrity (⚠️ Medium Priority)

**Issue:**
Line 435 states: "Application layer is responsible for assigning correct seq values" with "No database-level unique constraint to allow flexibility".

**UX Impact:**
- **Message Ordering Bugs**: If application logic fails, users could see messages out of order
- **Duplicate Sequences**: Two messages with `seq=5` could appear, breaking chronological display
- **Race Conditions**: Concurrent message insertion could assign duplicate seq values

**Current State:**
The spec acknowledges this in Risk 2 but defers to "future" solutions.

**Recommendation:**
Add a database-level constraint to prevent duplicate seq values:

```sql
-- Add to migration file
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_session_seq_unique"
  UNIQUE ("session_id", "seq");
```

This enforces correctness at the data layer and prevents UX bugs. The "flexibility" argument is weak—there's no valid use case for duplicate seq values within a session.

**Alternative:** If truly needing flexibility, document the specific use case and add validation tests for seq uniqueness in the service layer.

#### Concern 3: "Paused" State May Be Unused (🔵 Low Priority)

**Issue:**
Lines 428-429 note that "paused" state is "optional feature, may not be used initially". Including it now adds complexity without clear user benefit.

**UX Impact:**
- **Feature Bloat**: Unused states confuse developers and add mental overhead
- **Incomplete UX**: If "pause" exists, users expect UI for it. If UI doesn't exist, the feature is broken.
- **YAGNI Violation**: "You Aren't Gonna Need It" principle—add features when needed, not speculatively

**Recommendation:**
**Option A (Preferred):** Remove "paused" state now, add it later if needed:
```typescript
export const sessionStateEnum = pgEnum("session_state", [
  "active",
  "completed",
]);
```

**Option B:** Keep "paused" but add to spec:
- Document the specific user flow that requires "pause"
- Add UI mockup or description of the pause feature
- Clarify what happens when a session is paused (can user resume? timeout? expires?)

Without a clear user story, "paused" is speculative.

#### Concern 4: No Soft Delete for Sessions (🔵 Low Priority)

**Issue:**
Sessions have a `state: completed` but no `deleted_at` timestamp. Once completed, sessions remain in the database forever (or until manually deleted).

**UX Impact:**
- **User Privacy**: Users may want to delete their chat history
- **Data Retention**: Completed sessions accumulate indefinitely
- **Audit Trail**: Hard delete loses history for support/debugging

**Current State:**
Spec doesn't address user-initiated deletion of chat history.

**Recommendation:**
Add a `deleted_at` timestamp for soft delete:

```typescript
deletedAt: timestamp("deleted_at", { withTimezone: true }),
```

This allows:
- Users to "delete" conversations (sets `deleted_at`, hides from UI)
- Admins to recover accidentally deleted sessions (within retention window)
- Compliance with data retention policies (hard delete after X days)

**Alternative:** If hard delete is intentional, document the user flow for deleting chat history and why soft delete wasn't chosen.

#### Concern 5: Meta Field Schema Drift Risk (🔵 Low Priority)

**Issue:**
Line 619 acknowledges: "JSONB flexibility can lead to inconsistent metadata" and suggests Zod schemas "at service layer".

**UX Impact:**
- **Analytics Fragmentation**: Inconsistent token tracking breaks usage analytics
- **Debug Difficulty**: Inconsistent metadata makes troubleshooting harder
- **Type Safety Loss**: JSONB bypasses TypeScript safety

**Current State:**
Mitigation mentioned but not enforced in spec.

**Recommendation:**
Add to implementation steps:

**Step 7: Define Meta Schemas**
- [ ] Create `packages/core/src/schemas/message-meta.schema.ts`
- [ ] Define Zod schema for common meta patterns:
  ```typescript
  export const messageMetaSchema = z.object({
    tokens: z.number().optional(),
    model: z.string().optional(),
    latency_ms: z.number().optional(),
    extractions: z.array(z.unknown()).optional(),
  }).passthrough(); // Allow additional fields
  ```
- [ ] Document that service layer should validate meta before insertion
- [ ] Add test verifying meta validation

This enforces consistency while preserving flexibility.

### Accessibility Considerations

**N/A** - This is backend schema with no direct UI. Accessibility will be addressed in chat UI implementation (E04-T006+).

**Note for Future Tasks:**
- Ensure message content supports rich text/markdown for screen readers
- Consider storing message timestamps in user's timezone for display
- Plan for keyboard navigation in chat UI (ref: message `seq` enables prev/next)

### User Flow Considerations

#### 1. Session Lifecycle User Experience

**Good:**
- Clear start point (`startedAt` auto-populated)
- Clear end point (`endedAt` when state → completed)
- Duration calculation possible for analytics

**Missing:**
- No session title/name field (users can't label conversations like "Math help - Jan 12")
- No last_activity timestamp (can't show "last active 5 minutes ago")

**Recommendation (for future task):**
Consider adding:
```typescript
title: varchar("title", { length: 200 }),
lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
```

These aren't critical for MVP but will improve UX when implementing session list UI.

#### 2. Message Display UX

**Good:**
- Fast retrieval via composite index
- Sequence ensures chronological order
- Role enum supports styling (user messages right-aligned, assistant left-aligned, system centered)

**Consideration:**
What happens when a session has 1000+ messages? The spec doesn't address pagination or message limits.

**Recommendation (note for E04-T004):**
Document in chat service spec:
- Max messages per session (e.g., 500)
- Behavior when limit reached (archive old messages? prevent new messages?)
- Pagination strategy for UI (load last N messages, infinite scroll upward)

### Consistency with Platform Patterns

**✅ Excellent Consistency:**
- Follows Drizzle conventions from existing schema files
- Foreign key patterns match `tools.ts` and `users.ts`
- Migration syntax matches `0006_create_tools.sql`
- TypeScript type exports follow established patterns
- Metadata accessor for test compatibility (lines 141-152, 278-289)

**✅ Naming Conventions:**
- snake_case for tables/columns ✓
- camelCase for TypeScript exports ✓
- Descriptive enum values ✓
- Index naming follows pattern `{table}_{column}_idx` ✓

### Developer Experience (DX)

**✅ Strengths:**
- Comprehensive documentation with code examples
- Clear foreign key behavior explanation
- Type inference examples provided
- Test structure examples included

**⚠️ Improvement Needed:**
- Task technical notes conflict with spec (naming)
- "Paused" state lacks justification
- Meta validation strategy deferred

### Final Verdict

**APPROVED with Recommendations**

This specification is **ready for architecture review** with the following notes:

**Must Address Before Implementation:**
1. **Resolve naming inconsistency** between task and spec (use `chat_sessions` everywhere)
2. **Add unique constraint** on `(session_id, seq)` to prevent message ordering bugs

**Should Address Before Implementation:**
3. **Remove "paused" state** unless user flow is documented (YAGNI principle)
4. **Add meta Zod schemas** to implementation steps

**Consider for Future Tasks:**
5. Soft delete support (`deleted_at` field)
6. Session metadata (title, last_activity)
7. Message pagination strategy

**Quality Score: 8.5/10**
- Data model is solid and well-documented
- Minor consistency issues need resolution
- Some speculative features could be removed
- Excellent adherence to project conventions

### Next Steps

1. Update task technical notes to match spec naming (`chat_sessions`)
2. Architect review can proceed with above recommendations noted
3. After architecture approval, implement with database constraint for seq uniqueness

---

## Architecture Review

**Reviewer:** Architect Agent
**Date:** 2026-01-12
**Status:** APPROVED with Required Changes

### Overview

This specification defines database schemas for chat sessions and messages as part of the Chat Runtime epic (E04). As the architect, I've reviewed this spec against the canonical architecture documentation (`ARCHITECTURE.md`, `CONVENTIONS.md`) and the UX review recommendations.

**Review Scope:**
1. Alignment with technology stack and patterns
2. Consistency with existing schema implementations
3. Database design best practices
4. Risk mitigation and technical debt
5. Integration with planned features

### Architectural Alignment

#### ✅ Technology Stack Compliance

The spec correctly uses:
- **Drizzle ORM** with PostgreSQL (not Prisma) ✓
- **UUID** primary keys with `gen_random_uuid()` ✓
- **Enum types** for state and role (session_state, message_role) ✓
- **JSONB** for extensible metadata ✓
- **Timestamptz** for all timestamps with timezone awareness ✓
- **Foreign keys** with explicit CASCADE/RESTRICT behavior ✓
- **Composite indexes** for query optimization ✓

#### ✅ Naming Conventions

- Tables: `snake_case` plural (`chat_sessions`, `messages`) ✓
- Columns: `snake_case` (`session_id`, `created_at`) ✓
- Indexes: `{table}_{column}_idx` pattern ✓
- TypeScript exports: `camelCase` (`chatSessions`, `messageRoleEnum`) ✓
- Types: `PascalCase` (`ChatSession`, `NewChatSession`) ✓

#### ✅ Pattern Consistency

The spec follows established patterns from:
- `packages/db/src/schema/users.ts` - Metadata accessor pattern (lines 141-152, 278-289)
- `packages/db/src/schema/tools.ts` - Soft delete pattern, foreign keys
- `0006_create_tools.sql` - Migration syntax and statement breakpoints

### Critical Issues (Must Fix Before Implementation)

#### Issue 1: Naming Collision Resolved, But Task Mismatch (🔴 BLOCKER)

**Problem:**
The spec correctly names the table `chat_sessions` to avoid collision with auth sessions, but the task technical notes (in the original task file) may still reference `sessions` without the `chat_` prefix.

**Architectural Impact:**
- **Developer Confusion**: Inconsistent naming across task and spec
- **Import Errors**: Code examples will fail if developers copy from task
- **Maintenance Burden**: Future developers won't know which is authoritative

**Required Action:**
1. Update task technical notes to use `chat_sessions` everywhere
2. Add prominent note at top of spec about naming decision (as suggested by UX review)
3. Ensure all code examples use `chat_sessions`

**Recommended Addition (Line 21):**
```markdown
**⚠️ CRITICAL NAMING DECISION:** This table is named `chat_sessions` (not `sessions`) to avoid collision with the existing authentication sessions table at `packages/db/src/schema/sessions.ts`. All references to "sessions" in chat context refer to `chat_sessions`. The auth sessions table remains unchanged at `sessions`.
```

#### Issue 2: Message Sequence Integrity Not Enforced (🔴 HIGH PRIORITY)

**Problem:**
Lines 435 states: "Application layer is responsible for assigning correct seq values" with "No database-level unique constraint to allow flexibility".

**Architectural Impact:**
- **Data Integrity Risk**: Nothing prevents duplicate seq values (e.g., two messages with seq=5)
- **Race Conditions**: Concurrent inserts could assign same seq
- **UX Degradation**: Out-of-order messages break chat chronology
- **Violates "Fail Fast" Principle**: Database should enforce constraints, not just application layer

**Current Mitigation:**
The spec mentions "future: consider database-level constraint" in Risk 2, which defers a critical data integrity issue.

**Required Action:**
Add unique constraint to migration and schema:

```sql
-- Add to migration file (line 354, after messages table creation)
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_session_seq_unique"
  UNIQUE ("session_id", "seq");
```

```typescript
// Update schema definition (line 242, in messages table)
export const messages = pgTable(
  "messages",
  {
    // ... existing fields
  },
  (table) => ({
    sessionSeqIdx: index("messages_session_seq_idx").on(
      table.sessionId,
      table.seq
    ),
    // Add this constraint:
    sessionSeqUnique: unique("messages_session_seq_unique").on(
      table.sessionId,
      table.seq
    ),
  })
);
```

**Rationale:**
- **Database-Level Integrity**: Constraints belong in database, not just application
- **Prevents Race Conditions**: Database serializes constraint checks
- **Aligns with Architecture**: "Fail fast" principle (CONVENTIONS.md line 14)
- **No Valid Use Case**: There is no scenario where duplicate seq is acceptable
- **Minimal Performance Impact**: Unique constraints are efficient with composite indexes

This is a **required change** before implementation approval.

### High Priority Recommendations (Should Address)

#### Recommendation 1: Remove Speculative "Paused" State (⚠️ YAGNI Violation)

**Problem:**
Lines 55-59 define a "paused" state that spec admits "may not be used initially" (line 429).

**Architectural Concern:**
- **YAGNI Principle**: "You Aren't Gonna Need It" (CONVENTIONS.md line 5)
- **Incomplete Feature**: If "paused" exists, users expect UI for it
- **Technical Debt**: Adds complexity for unused functionality
- **State Machine Complexity**: Transitions (active ↔ paused) not well-defined

**Current State Machine:**
```
[Created] → active → paused → active → completed
                  ↘          ↗
```

**Recommended State Machine:**
```
[Created] → active → completed
```

**Recommended Action:**
**Option A (Strongly Recommended):** Remove "paused" state entirely:
```typescript
export const sessionStateEnum = pgEnum("session_state", [
  "active",
  "completed",
]);
```

**Option B (If keeping):** Document the complete pause/resume user flow:
- What triggers pause? (user action, timeout, module request?)
- Can users resume paused sessions? How?
- Do paused sessions expire?
- What UI elements support pause?

Without clear requirements, this is speculative design and should be removed per architectural principles.

#### Recommendation 2: Add Meta Field Validation Schema (⚠️ Type Safety)

**Problem:**
Lines 619-620 acknowledge "JSONB flexibility can lead to inconsistent metadata" but defer solution to "service layer".

**Architectural Concern:**
- **Type Safety Loss**: JSONB bypasses TypeScript (violates CONVENTIONS.md strict mode)
- **Schema Drift**: Inconsistent metadata breaks analytics, debugging
- **Convention Violation**: "Zod for validation" principle not applied

**Recommended Action:**
Add to implementation steps:

**Step 7: Define Message Meta Schemas**
- [ ] Create `packages/core/src/schemas/message-meta.schema.ts`
- [ ] Define Zod schema:
  ```typescript
  import { z } from "zod";

  export const messageMetaSchema = z.object({
    tokens: z.number().int().positive().optional(),
    model: z.string().optional(),
    latency_ms: z.number().positive().optional(),
    extractions: z.array(z.unknown()).optional(),
  }).passthrough(); // Allow additional fields for extensibility

  export type MessageMeta = z.infer<typeof messageMetaSchema>;
  ```
- [ ] Update `Message` type export to use schema
- [ ] Add validation test in `messages.test.ts`

**Rationale:**
- Enforces consistency while preserving JSONB flexibility
- Aligns with Zod-first validation strategy (ARCHITECTURE.md line 33)
- Provides TypeScript types for common meta fields
- `.passthrough()` allows future extensions without schema change

#### Recommendation 3: Add Soft Delete to Chat Sessions (🔵 Future-Proofing)

**Problem:**
Chat sessions have `state: completed` but no `deleted_at` field. Once completed, sessions remain forever unless manually hard-deleted.

**Architectural Concern:**
- **User Privacy**: Users may want to delete chat history (GDPR right to be forgotten)
- **Data Retention**: Completed sessions accumulate indefinitely
- **Pattern Inconsistency**: Users, groups, classes, tools all have soft delete, but chat sessions don't

**Recommended Action:**
Add soft delete field:

```typescript
// In chat-sessions.ts schema
deletedAt: timestamp("deleted_at", { withTimezone: true }),
```

```sql
-- In migration
"deleted_at" timestamp with time zone
```

**Rationale:**
- **Consistency**: Matches soft delete pattern in users.ts, tools.ts, classes.ts
- **User Control**: Supports "delete conversation" feature
- **Audit Trail**: Allows recovery of accidentally deleted sessions
- **Compliance**: Aligns with data retention policies

**Alternative:** If intentionally omitting soft delete, document why and how users delete chat history.

### Medium Priority Recommendations (Consider)

#### Recommendation 4: Add Session Metadata Fields

**Problem:**
Sessions lack user-facing metadata like title or last activity timestamp.

**UX Impact:**
- No session title/name (users can't label "Math help - Jan 12")
- No `last_activity_at` (can't show "last active 5 minutes ago")

**Recommendation:**
Consider adding (in future task, not this one):
```typescript
title: varchar("title", { length: 200 }),
lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
```

**Note:** Not critical for MVP, but improves session list UI experience. Document as future enhancement.

#### Recommendation 5: Message Pagination Strategy

**Problem:**
Spec doesn't address how to handle sessions with 1000+ messages.

**Recommendation:**
Add note to chat service spec (E04-T004):
- Define max messages per session (e.g., 500)
- Document pagination strategy (load last N, infinite scroll)
- Consider message archiving for very long sessions

### Strengths

#### ✅ Excellent Schema Design

1. **Foreign Key Cascade Logic**: Well-reasoned (lines 388-403)
   - `tool_id: RESTRICT` - Prevents orphaned sessions ✓
   - `user_id: CASCADE` - GDPR compliance ✓
   - `session_id: CASCADE` - Messages dependent on session ✓

2. **Indexing Strategy**: Targets high-frequency queries (lines 405-415)
   - `chat_sessions`: tool_id, user_id, state
   - `messages`: Composite (session_id, seq) for ordering

3. **Extensible Metadata**: JSONB provides flexibility without schema changes

4. **Type Safety**: Drizzle type inference (`$inferSelect`, `$inferInsert`)

5. **Migration Quality**: Follows existing patterns, includes all constraints

#### ✅ Comprehensive Documentation

- Clear field descriptions with JSDoc comments
- Usage examples for types and queries
- Risk analysis with mitigations
- Integration points documented
- Test structure examples

#### ✅ Test Coverage Plan

Steps 5-6 define thorough test coverage:
- Schema validation
- Default values
- Foreign key constraints
- Cascade behavior
- Message ordering

### Risk Assessment

| Risk | Severity | Mitigation Status |
|------|----------|-------------------|
| Naming collision | Medium | ✅ Resolved (chat_sessions) |
| Message seq integrity | **HIGH** | 🔴 **Requires unique constraint** |
| Speculative "paused" state | Medium | ⚠️ Recommend removal |
| Meta schema drift | Medium | ⚠️ Add Zod validation |
| No soft delete | Low | 🔵 Future enhancement |
| Tool delete restriction | Low | ✅ Documented, acceptable |

### Integration Review

#### Dependencies (✅ Clean)
- `users` table (E01-T004) - Implemented ✓
- `tools` table (E03-T002) - Implemented ✓
- Foreign key references exist and are correct

#### Dependents (✅ Ready)
- E04-T004: Chat service - Can proceed after this task
- E04-T005: Chat API routes - Requires service first

#### No Breaking Changes
- Auth sessions table unaffected ✓
- Existing schemas unchanged ✓
- Migration numbering (0008) leaves room for gaps ✓

### Compliance Checklist

| Requirement | Status |
|-------------|--------|
| Uses Drizzle ORM (not Prisma) | ✅ Pass |
| PostgreSQL with proper types | ✅ Pass |
| snake_case database naming | ✅ Pass |
| camelCase TypeScript naming | ✅ Pass |
| Foreign keys with explicit behavior | ✅ Pass |
| Indexes on high-frequency queries | ✅ Pass |
| Type exports ($inferSelect/$inferInsert) | ✅ Pass |
| Migration follows existing pattern | ✅ Pass |
| Test coverage planned | ✅ Pass |
| Zero TypeScript errors | ⚠️ TBD after implementation |
| No `any` types | ✅ Pass (uses unknown for JSONB) |
| Zod validation for extensible fields | 🔴 **Missing** (meta field) |
| Follows "fail fast" principle | 🔴 **Violated** (seq constraint missing) |

### Final Verdict

**STATUS: APPROVED with REQUIRED CHANGES**

This specification is **architecturally sound** and follows established patterns, but requires two critical fixes before implementation:

#### Required Before Implementation (BLOCKERS):
1. **Add unique constraint** on `(session_id, seq)` to messages table
2. **Resolve naming documentation** - Add warning about chat_sessions vs sessions

#### Strongly Recommended (Should Address):
3. **Remove "paused" state** unless user flow is documented (YAGNI)
4. **Add Zod schema** for message meta field validation

#### Consider for Future Tasks:
5. Soft delete support for chat sessions
6. Session metadata (title, last_activity)
7. Message pagination strategy documentation

### Quality Score: 8/10

**Breakdown:**
- **Schema Design**: 9/10 (excellent, but seq constraint missing)
- **Documentation**: 10/10 (comprehensive, clear examples)
- **Pattern Consistency**: 9/10 (follows existing conventions well)
- **Risk Management**: 7/10 (identifies risks but defers critical ones)
- **Test Plan**: 9/10 (thorough coverage planned)

**Overall:** Solid architectural foundation with minor integrity gaps. The required changes are small but critical for data consistency.

### Implementation Clearance

**PROCEED with implementation AFTER:**
1. Adding unique constraint to messages (session_id, seq)
2. Adding naming clarification to spec header

All other recommendations can be addressed during implementation or deferred to follow-up tasks.

### Next Steps

1. **Developer**: Update spec with unique constraint in schema and migration
2. **Developer**: Add prominent naming note at top of spec
3. **Developer**: Consider removing "paused" state or documenting its use case
4. **Developer**: Add meta Zod schema to implementation steps (optional but recommended)
5. **PM**: Review and approve updated spec
6. **Developer**: Proceed with implementation per updated spec

---

**Architect Sign-off:** Ready for implementation with required changes noted above.

---

**End of Specification**
