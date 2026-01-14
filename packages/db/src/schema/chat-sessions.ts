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

    // Fork support (E04-T010)
    // Note: Self-reference requires explicit type annotation to avoid TS circular reference error
    parentSessionId: uuid("parent_session_id")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for Drizzle self-reference
      .references((): any => chatSessions.id, { onDelete: "set null" }),
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
    // Index for efficient soft-delete queries
    deletedAtIdx: index("chat_sessions_deleted_at_idx").on(table.deletedAt),
    // E04-T010: Index for fork tree queries
    parentSessionIdIdx: index("chat_sessions_parent_session_id_idx")
      .on(table.parentSessionId),
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
 * // session.state is 'active' | 'completed'
 * // session.endedAt is Date | null
 * // session.deletedAt is Date | null
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
