---
title: Chat Sessions and Messages Schema
description: Database schema for multi-turn chat conversations with ordered messages and metadata
related_code:
  - packages/db/src/schema/chat-sessions.ts
  - packages/db/src/schema/messages.ts
  - packages/db/src/migrations/0008_create_chat_sessions_messages.sql
  - packages/db/src/migrations/0010_enhance_chat_sessions.sql
  - packages/db/src/migrations/0011_add_chat_forking.sql
  - packages/core/src/schemas/message-meta.schema.ts
last_verified: 2026-01-14
implements_task: E04-T001
---

# Chat Sessions and Messages Schema

The chat system uses two core database tables to track multi-turn conversations: `chat_sessions` for conversation state and `messages` for the ordered message history.

## Overview

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `chat_sessions` | Conversation state tracking | Session lifecycle, soft delete, user/tool binding |
| `messages` | Ordered conversation history | Role-based messages, unique sequencing, metadata storage |

## Chat Sessions Table

### Purpose

Chat sessions represent ongoing or completed conversations between a user and a tool. Each session maintains state and contains an ordered history of messages.

### Schema Definition

```typescript [packages/db/src/schema/chat-sessions.ts]
export const sessionStateEnum = pgEnum("session_state", [
  "active",
  "completed",
]);

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
      .references((): any => chatSessions.id, { onDelete: "set null" }),
    forkFromSeq: integer("fork_from_seq"),

    // Session metadata
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
    // E04-T010: Fork support indexes
    parentSessionIdIdx: index("chat_sessions_parent_session_id_idx")
      .on(table.parentSessionId),
  })
);
```

### Key Fields

| Field | Type | Purpose | Notes |
|-------|------|---------|-------|
| `id` | UUID | Primary key | Auto-generated |
| `toolId` | UUID | Foreign key to tools table | RESTRICT delete prevents orphaned sessions |
| `userId` | UUID | Foreign key to users table | CASCADE delete for GDPR compliance |
| `state` | Enum | Session lifecycle state | `active` or `completed` |
| `parentSessionId` | UUID | Foreign key to chat_sessions (self-reference) | SET NULL delete for orphan-safe forks |
| `forkFromSeq` | integer | Message sequence where fork occurred | Nullable, only set for forked sessions |
| `title` | varchar(200) | User-facing session name | Nullable, e.g. "Math homework - Jan 14" |
| `startedAt` | timestamptz | When session was created | Auto-populated |
| `endedAt` | timestamptz | When session was completed | Nullable until completion |
| `lastActivityAt` | timestamptz | Last message timestamp | For "Last active 5 min ago" display |
| `deletedAt` | timestamptz | Soft delete timestamp | Null for active sessions |

### Session Lifecycle

Sessions progress through two states:

```
[Created] → active → completed
```

- **active**: Session is ongoing, user can send messages (default state)
- **completed**: Session ended by user or system timeout

::: info Removed "Paused" State
The "paused" state was removed in E04-T009 per YAGNI principle. It was speculatively added without a defined user flow or UI support.
:::

### Foreign Key Behavior

**tool_id: RESTRICT delete**
- Prevents deletion of tools that have active chat sessions
- Admin must complete/archive sessions before deleting a tool
- Ensures referential integrity

**user_id: CASCADE delete**
- When a user is deleted, their chat sessions are automatically removed
- Follows GDPR compliance patterns (right to be forgotten)
- Consistent with existing user deletion behavior

**parent_session_id: SET NULL delete** (E04-T010)
- When a parent session is deleted, forked sessions remain intact
- `parentSessionId` is set to NULL, creating an "orphaned fork"
- Preserves user work even if original conversation is deleted
- Critical for educational contexts where forks explore different approaches

### Soft Delete Pattern

Chat sessions support soft delete via the `deletedAt` timestamp:

```typescript
// Query active sessions only (exclude soft-deleted)
const activeSessions = await db.query.chatSessions.findMany({
  where: and(
    eq(chatSessions.userId, userId),
    isNull(chatSessions.deletedAt)
  ),
});

// Soft delete a session
await db
  .update(chatSessions)
  .set({ deletedAt: new Date() })
  .where(eq(chatSessions.id, sessionId));
```

**Benefits:**
- Users can "delete" conversations without losing audit trail
- Admins can recover accidentally deleted sessions
- Supports data retention policies (hard delete after X days)

### Session Metadata

**Title Field**
- User-editable session name
- Helps users organize and find conversations
- Example: "Algebra homework help", "Biology quiz prep - Chapter 5"

**Last Activity Tracking**
- `lastActivityAt` is updated whenever a message is added to the session
- Enables UI features like "Last active 5 minutes ago"
- Useful for session list sorting (most recent first)

```typescript
// Update last activity when adding a message
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

### Fork Support (E04-T010)

Chat sessions support forking to create branching conversation paths. Users can fork a session from any message, creating a new session that starts with a copy of the conversation up to that point.

**Schema Fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `parentSessionId` | UUID (nullable) | References the session this was forked from |
| `forkFromSeq` | integer (nullable) | Message sequence number in parent where fork occurred |

**Key Features:**

- **Orphan-safe design**: Forks use `ON DELETE SET NULL` for parent reference
- **Circular reference prevention**: CHECK constraint prevents self-reference
- **Independent sessions**: Forked sessions are fully independent after creation
- **Fork tree queries**: Indexed for efficient "find all forks" queries

**Creating a forked session:**

```typescript
// Fork from message seq 5 in parent session
const forkedSession: NewChatSession = {
  toolId: parentSession.toolId,
  userId: parentSession.userId,
  parentSessionId: parentSession.id,
  forkFromSeq: 5,
  title: `${parentSession.title} (fork)`,
  state: "active",
};

await db.insert(chatSessions).values(forkedSession);

// Copy messages 1-5 from parent to forked session
const parentMessages = await db.query.messages.findMany({
  where: and(
    eq(messages.sessionId, parentSession.id),
    lte(messages.seq, 5)
  ),
  orderBy: asc(messages.seq),
});

// Insert copied messages into forked session
await db.insert(messages).values(
  parentMessages.map((msg) => ({
    sessionId: forkedSession.id,
    role: msg.role,
    content: msg.content,
    seq: msg.seq,
    meta: msg.meta,
  }))
);
```

**Querying forks:**

```typescript
// Find all forks of a session
const forks = await db.query.chatSessions.findMany({
  where: eq(chatSessions.parentSessionId, sessionId),
  orderBy: desc(chatSessions.startedAt),
});

// Find orphaned forks (parent was deleted)
const orphanedForks = await db.query.chatSessions.findMany({
  where: and(
    isNull(chatSessions.parentSessionId),
    isNotNull(chatSessions.forkFromSeq)
  ),
});
```

**Foreign Key Behavior:**

When a parent session is deleted:
- `parentSessionId` is automatically set to NULL
- Forked session remains intact as a standalone conversation
- `forkFromSeq` is preserved for audit trail

::: tip Preserving User Work
The SET NULL behavior ensures that users never lose their forked conversations, even if they delete the original session. This is critical for educational contexts where students may fork conversations to explore different approaches.
:::

::: warning Circular Reference Protection
The CHECK constraint `chat_sessions_no_self_fork` prevents a session from referencing itself as a parent. This provides defense in depth against circular references at the database level.
:::

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `chat_sessions_tool_id_idx` | `tool_id` | Optimizes "get sessions for tool" queries |
| `chat_sessions_user_id_idx` | `user_id` | Optimizes "get user's sessions" queries |
| `chat_sessions_state_idx` | `state` | Optimizes filtering by session state |
| `chat_sessions_deleted_at_idx` | `deleted_at` | Optimizes soft-delete queries (`WHERE deleted_at IS NULL`) |
| `chat_sessions_parent_session_id_idx` | `parent_session_id` | Optimizes fork tree queries ("find all forks of session X") |
| `chat_sessions_orphaned_forks_idx` | `fork_from_seq` (partial) | Optimizes orphaned fork queries (WHERE parent_session_id IS NULL AND fork_from_seq IS NOT NULL) |

## Messages Table

### Purpose

Messages store the ordered conversation history within chat sessions. Each message has a role (user, assistant, or system) and is sequenced for chronological display.

### Schema Definition

```typescript [packages/db/src/schema/messages.ts]
export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

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
    sessionSeqUnique: unique("messages_session_seq_unique").on(
      table.sessionId,
      table.seq
    ),
  })
);
```

### Key Fields

| Field | Type | Purpose | Notes |
|-------|------|---------|-------|
| `id` | UUID | Primary key | Auto-generated |
| `sessionId` | UUID | Foreign key to chat_sessions | CASCADE delete removes messages when session deleted |
| `role` | Enum | Who sent the message | `user`, `assistant`, or `system` |
| `content` | text | The message text content | No length limit |
| `seq` | integer | Sequence number for ordering | Starts at 1, increments per session |
| `createdAt` | timestamptz | When message was created | Auto-populated |
| `meta` | jsonb | Extensible metadata | Defaults to `{}`, see [Message Meta Validation](/api/patterns/validation#message-meta-validation) |

### Message Roles

| Role | Purpose | Example |
|------|---------|---------|
| `user` | Message from the human user | "How do I solve this equation?" |
| `assistant` | Message from the AI assistant | "To solve this equation, start by isolating x..." |
| `system` | System-level message | "Tool context: This is a math tutoring tool for 8th grade" |

### Message Sequencing

**Ordered by seq field:**
- Messages are ordered by `seq` within each session
- `seq` starts at 1 and increments for each message
- Application layer is responsible for assigning correct seq values

**Unique Constraint:**
- `(session_id, seq)` unique constraint prevents duplicate sequence numbers
- Enforced at database level (fail-fast principle)
- Prevents message ordering bugs caused by race conditions

```typescript
// Query messages in chronological order
const sessionMessages = await db.query.messages.findMany({
  where: eq(messages.sessionId, sessionId),
  orderBy: asc(messages.seq),
});

// Insert next message with correct seq
const nextSeq = (await getLastSeq(sessionId)) + 1;
await db.insert(messages).values({
  sessionId,
  role: "user",
  content: "My question here",
  seq: nextSeq,
});
```

::: warning Sequence Integrity
The unique constraint on `(session_id, seq)` is critical for data integrity. Always ensure your service layer assigns unique seq values before insertion to avoid constraint violations.
:::

### Message Metadata

The `meta` JSONB field provides extensibility for tracking:

- Token usage (`tokens`, `prompt_tokens`, `completion_tokens`)
- Model identification (`model`)
- Latency metrics (`latency_ms`)
- Finish reason (`finish_reason`)
- Module extractions (`extractions`)

**Example metadata:**

```typescript
const messageMeta = {
  tokens: 150,
  model: "anthropic/claude-sonnet-4-20250514",
  latency_ms: 432,
  finish_reason: "stop",
  extractions: [
    {
      type: "sentiment",
      value: "positive",
      confidence: 0.95,
      source: "sentiment-analyzer-module"
    }
  ]
};
```

::: tip Validation
See [Message Meta Validation](/api/patterns/validation#message-meta-validation) for Zod schema validation patterns for the meta field.
:::

### Indexes and Constraints

| Index/Constraint | Type | Columns | Purpose |
|------------------|------|---------|---------|
| `messages_session_seq_idx` | Composite Index | `(session_id, seq)` | Fast ordered retrieval of messages |
| `messages_session_seq_unique` | Unique Constraint | `(session_id, seq)` | Prevents duplicate sequence numbers |

## Relations

### Chat Sessions Relations

```typescript
// From chat sessions
chatSessions.tool      // Many-to-one to tools
chatSessions.user      // Many-to-one to users
chatSessions.messages  // One-to-many to messages

// To chat sessions
tools.chatSessions     // One-to-many for tool's sessions
users.chatSessions     // One-to-many for user's sessions
```

### Messages Relations

```typescript
// From messages
messages.session      // Many-to-one to chat_sessions

// To messages
chatSessions.messages // One-to-many for session's messages
```

## Migrations

### Initial Schema (E04-T001)

Migration: `0008_create_chat_sessions_messages.sql`

Created:
- `session_state` enum with values: `active`, `paused`, `completed`
- `message_role` enum with values: `user`, `assistant`, `system`
- `chat_sessions` table with basic fields
- `messages` table with role, content, seq, meta
- All foreign keys and indexes

### Schema Enhancements (E04-T009)

Migration: `0010_enhance_chat_sessions.sql`

Changes:
- Removed `paused` value from `session_state` enum (YAGNI cleanup)
- Added `title` field to chat_sessions
- Added `lastActivityAt` field to chat_sessions
- Added `deletedAt` field to chat_sessions for soft delete support
- Added index on `deletedAt` for efficient soft-delete queries
- Backfilled `lastActivityAt` from existing messages

::: warning Enum Alteration Strategy
PostgreSQL does not support `ALTER TYPE ... DROP VALUE`. The migration uses a rename-recreate-drop pattern:
1. Update any existing 'paused' sessions to 'active'
2. Rename existing enum to `session_state_old`
3. Create new enum without 'paused'
4. Alter column to use new enum (cast through text)
5. Drop old enum
:::

### Fork Support (E04-T010)

Migration: `0011_add_chat_forking.sql`

Changes:
- Added `parent_session_id` field (UUID self-reference)
- Added `fork_from_seq` field (integer)
- Added foreign key constraint with `ON DELETE SET NULL` behavior
- Added `chat_sessions_parent_session_id_idx` for fork tree queries
- Added `chat_sessions_no_self_fork` CHECK constraint to prevent circular references
- Added partial index `chat_sessions_orphaned_forks_idx` for orphaned fork queries

::: tip Partial Index Optimization
The orphaned forks index uses a `WHERE` clause to only index rows where `parent_session_id IS NULL AND fork_from_seq IS NOT NULL`. This creates a smaller, more efficient index specifically for the "find orphaned forks" query pattern.
:::

## Query Patterns

### Get Active Sessions for User

```typescript
const userSessions = await db.query.chatSessions.findMany({
  where: and(
    eq(chatSessions.userId, userId),
    isNull(chatSessions.deletedAt),
    eq(chatSessions.state, "active")
  ),
  with: {
    tool: true,
  },
  orderBy: desc(chatSessions.lastActivityAt),
});
```

### Get Session with Messages

```typescript
const session = await db.query.chatSessions.findFirst({
  where: eq(chatSessions.id, sessionId),
  with: {
    messages: {
      orderBy: asc(messages.seq),
    },
  },
});
```

### Add Message to Session

```typescript
// Get next seq number
const lastMessage = await db.query.messages.findFirst({
  where: eq(messages.sessionId, sessionId),
  orderBy: desc(messages.seq),
});
const nextSeq = (lastMessage?.seq ?? 0) + 1;

// Insert message
const [newMessage] = await db.insert(messages).values({
  sessionId,
  role: "assistant",
  content: "Response here",
  seq: nextSeq,
  meta: {
    tokens: 150,
    model: "claude-sonnet-4",
    latency_ms: 432,
  },
}).returning();

// Update session last activity
await db.update(chatSessions)
  .set({ lastActivityAt: new Date() })
  .where(eq(chatSessions.id, sessionId));
```

### Complete Session

```typescript
await db.update(chatSessions)
  .set({
    state: "completed",
    endedAt: new Date(),
  })
  .where(eq(chatSessions.id, sessionId));
```

## Related Documentation

- [Message Meta Validation](/api/patterns/validation#message-meta-validation) — Zod schema for message metadata
- [Validation Patterns](/api/patterns/validation) — Zod validation patterns with Fastify integration

## Implementation History

- **E04-T001** (2026-01-12): Initial chat sessions and messages schema implementation
- **E04-T009** (2026-01-14): Schema enhancements (removed paused state, added soft delete, session metadata, Zod validation for meta field)
- **E04-T010** (2026-01-14): Fork support (parent_session_id, fork_from_seq, SET NULL FK behavior, CHECK constraint, partial index for orphaned forks)
