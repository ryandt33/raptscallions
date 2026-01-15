import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  bigint,
  varchar,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";

/**
 * User storage limits table - per-user quota overrides.
 *
 * This table enables the third tier of the three-tier limit system:
 * 1. System defaults (environment variables)
 * 2. Role-based limits (groups.settings JSONB)
 * 3. User-specific overrides (this table)
 *
 * NULL values mean "inherit from role or system default".
 * Non-NULL values override the inherited limit.
 *
 * Audit trail tracks who set the override and why, enabling
 * accountability for admin actions.
 */
export const userStorageLimits = pgTable(
  "user_storage_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // User reference (one record per user)
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Limit overrides (NULL = inherit)
    maxFileSizeBytes: bigint("max_file_size_bytes", { mode: "number" }),
    storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number" }),

    // Current usage tracking
    usedBytes: bigint("used_bytes", { mode: "number" }).notNull().default(0),

    // Audit trail
    setBy: uuid("set_by")
      .references(() => users.id, { onDelete: "set null" }),
    reason: varchar("reason", { length: 500 }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // One record per user
    userIdUnique: unique("user_storage_limits_user_id_unique").on(table.userId),
  })
);

/**
 * UserStorageLimit type for select operations (reading from database).
 * All fields are present including auto-generated values.
 */
export type UserStorageLimit = typeof userStorageLimits.$inferSelect;

/**
 * NewUserStorageLimit type for insert operations (writing to database).
 * Omits auto-generated fields like id, created_at, updated_at.
 */
export type NewUserStorageLimit = typeof userStorageLimits.$inferInsert;

// Relations
export const userStorageLimitsRelations = relations(userStorageLimits, ({ one }) => ({
  user: one(users, {
    fields: [userStorageLimits.userId],
    references: [users.id],
  }),
  setter: one(users, {
    fields: [userStorageLimits.setBy],
    references: [users.id],
    relationName: "limitsSetBy",
  }),
}));

// Add metadata accessor for test compatibility (matches users.ts pattern)
Object.defineProperty(userStorageLimits, "_", {
  get() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Required for test metadata accessor
      name: Symbol.for("drizzle:Name") in userStorageLimits
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for test metadata accessor
        ? (userStorageLimits as any)[Symbol.for("drizzle:Name")]
        : "user_storage_limits",
    };
  },
  enumerable: false,
  configurable: true,
});
