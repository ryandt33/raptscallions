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
