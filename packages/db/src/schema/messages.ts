import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  unique,
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
 * - Unique constraint prevents duplicate sequence numbers
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
    sessionSeqUnique: unique("messages_session_seq_unique").on(
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Required for test metadata accessor
      name:
        Symbol.for("drizzle:Name") in messages
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for test metadata accessor
          ? (messages as any)[Symbol.for("drizzle:Name")]
          : "messages",
    };
  },
  enumerable: false,
  configurable: true,
});
