import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  bigint,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { groups } from "./groups.js";
import { users } from "./users.js";

/**
 * File status enum for soft delete lifecycle.
 * - active: File is available for download
 * - soft_deleted: File is marked for deletion (cleanup after 30 days)
 */
export const fileStatusEnum = pgEnum("file_status", [
  "active",
  "soft_deleted",
]);

/**
 * Storage backend enum for multi-backend support.
 * - s3: S3-compatible storage (AWS, MinIO, DigitalOcean Spaces, etc.)
 * - local: Local filesystem storage (development/testing)
 */
export const storageBackendEnum = pgEnum("storage_backend", [
  "s3",
  "local",
]);

/**
 * Files table - tracks uploaded file metadata.
 *
 * Files are decoupled from specific entities (classes, assignments) via
 * the purpose field. This allows file infrastructure to be used before
 * E03 entities are defined. Entity associations will be added later
 * via separate tables (e.g., user_avatars, assignment_attachments).
 *
 * Soft delete workflow:
 * 1. status='active' - Normal state, file accessible
 * 2. status='soft_deleted', deleted_at set - Marked for deletion
 * 3. Background job (30 days) - Hard deletes from storage and database
 */
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // File metadata
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),

    // Storage location
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    storageBackend: storageBackendEnum("storage_backend").notNull().default("s3"),

    // Ownership and scoping
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "set null" }),

    // Categorization (avoids FK to non-existent entities)
    purpose: varchar("purpose", { length: 50 }).notNull().default("general"),

    // Soft delete
    status: fileStatusEnum("status").notNull().default("active"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    // Unique constraint for storage key
    storageKeyUnique: unique("files_storage_key_unique").on(table.storageKey),

    // Query pattern indexes
    uploadedByIdx: index("files_uploaded_by_idx").on(table.uploadedBy),
    groupIdIdx: index("files_group_id_idx").on(table.groupId),
    purposeIdx: index("files_purpose_idx").on(table.purpose),
    statusIdx: index("files_status_idx").on(table.status),
    deletedAtIdx: index("files_deleted_at_idx").on(table.deletedAt),
  })
);

/**
 * File type for select operations (reading from database).
 * All fields are present including auto-generated values.
 */
export type File = typeof files.$inferSelect;

/**
 * NewFile type for insert operations (writing to database).
 * Omits auto-generated fields like id, created_at, updated_at.
 */
export type NewFile = typeof files.$inferInsert;

// Relations
export const filesRelations = relations(files, ({ one }) => ({
  uploader: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [files.groupId],
    references: [groups.id],
  }),
}));

// Add metadata accessor for test compatibility (matches users.ts pattern)
Object.defineProperty(files, "_", {
  get() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Required for test metadata accessor
      name: Symbol.for("drizzle:Name") in files
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for test metadata accessor
        ? (files as any)[Symbol.for("drizzle:Name")]
        : "files",
    };
  },
  enumerable: false,
  configurable: true,
});
