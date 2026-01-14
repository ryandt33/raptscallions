import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * User account status enum.
 * - active: Normal user account, can log in and use the system
 * - suspended: Account disabled by admin, cannot log in
 * - pending_verification: New account awaiting email verification
 */
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "pending_verification",
]);

/**
 * Users table - core authentication and user identity.
 *
 * This is the foundational table for all user-related operations.
 * Users can authenticate via:
 * - Email/password (password_hash present)
 * - OAuth providers (password_hash is null)
 *
 * Soft delete is supported via deleted_at timestamp.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    status: userStatusEnum("status").notNull().default("pending_verification"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
  })
);

/**
 * User type for select operations (reading from database).
 * All fields are present including auto-generated values.
 */
export type User = typeof users.$inferSelect;

/**
 * NewUser type for insert operations (writing to database).
 * Omits auto-generated fields like id, created_at, updated_at.
 */
export type NewUser = typeof users.$inferInsert;

// Add metadata accessor for test compatibility
Object.defineProperty(users, "_", {
  get() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Required for test metadata accessor
      name: Symbol.for("drizzle:Name") in users
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for test metadata accessor
        ? (users as any)[Symbol.for("drizzle:Name")]
        : "users",
    };
  },
  enumerable: false,
  configurable: true,
});
