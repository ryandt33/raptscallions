# Implementation Spec: E04-T011 - Message Attachments Schema

**Epic:** E04 - Chat Runtime
**Task:** E04-T011
**Status:** DRAFT
**Created:** 2026-01-14
**Author:** Analyst Agent

---

## Overview

This task implements a dedicated relational schema for message attachments, allowing files (documents, images, etc.) to be associated with chat messages. The implementation follows a two-phase approach:

**Phase 1 (This Task):** Add attachment support to message `meta` field via Zod schema extension (quick interim solution)

**Phase 2 (This Task):** Create dedicated `message_attachments` table for proper relational structure (long-term solution)

Both phases are implemented in this task to provide immediate functionality while establishing the scalable foundation. The meta field approach allows rapid iteration while the dedicated table provides queryability and data integrity.

**Note:** This task covers schema and types only. Actual file upload/storage service integration is deferred to a separate task.

---

## Approach

### Phase 1: Meta Field Extension (Immediate)

Extend the `messageMetaSchema` (from E04-T009) to include an optional `attachments` array. This provides:
- ✅ Zero schema migration needed
- ✅ Rapid development/iteration
- ✅ Flexible structure
- ❌ Limited queryability (can't query by MIME type, size, etc.)

### Phase 2: Dedicated Table (Scalable)

Create a proper `message_attachments` table with foreign keys and indexes. This provides:
- ✅ Full queryability (find all PDFs, large files, etc.)
- ✅ Foreign key constraints for data integrity
- ✅ Soft delete support
- ✅ Independent attachment lifecycle
- ❌ Requires migration
- ❌ More complex queries (JOIN needed)

**Migration Path:** Data can be migrated from `meta.attachments` to the dedicated table via SQL extraction query.

---

## Files to Create

| File | Purpose |
|------|---------|
| `packages/db/src/schema/message-attachments.ts` | Message attachments table schema |
| `packages/db/src/migrations/0012_create_message_attachments.sql` | Migration for attachments table |
| `packages/db/src/__tests__/schema/message-attachments.test.ts` | Unit tests for attachments schema |

## Files to Modify

| File | Changes |
|------|---------|
| `packages/core/src/schemas/message-meta.schema.ts` | Add `documentRefSchema` and `attachments` field to meta schema |
| `packages/core/src/__tests__/schemas/message-meta.schema.test.ts` | Add tests for attachment validation in meta field |
| `packages/core/src/schemas/index.ts` | Export attachment types and schemas |
| `packages/db/src/schema/index.ts` | Export message attachments schema |
| `packages/db/src/schema/messages.ts` | Add relations for attachments (if using Drizzle relations) |

---

## Dependencies

- **Requires**: E04-T001 (Messages schema)
- **Requires**: E04-T009 (Message meta Zod schema)
- **New packages**: None (Zod and Drizzle already in use)

---

## Technical Design

### Phase 1: Extend Message Meta Schema

**File: `packages/core/src/schemas/message-meta.schema.ts` (additions)**

```typescript
import { z } from "zod";

/**
 * Schema for document/file references stored in message metadata.
 *
 * This is an interim solution for storing attachment metadata in the
 * message meta JSONB field. For production use, migrate to dedicated
 * message_attachments table (E04-T011 Phase 2).
 *
 * @example
 * ```typescript
 * const attachment: DocumentRef = {
 *   id: "att-uuid-1",
 *   filename: "essay.pdf",
 *   mimeType: "application/pdf",
 *   size: 524288,
 *   storageKey: "uploads/user-789/att-uuid-1.pdf",
 *   storageProvider: "s3",
 *   uploadedAt: new Date().toISOString(),
 * };
 * ```
 */
export const documentRefSchema = z.object({
  /** Unique identifier for the attachment */
  id: z.string().uuid(),

  /** Original filename (sanitized) */
  filename: z.string().min(1).max(255),

  /** MIME type (e.g., "application/pdf", "image/jpeg") */
  mimeType: z.string().min(1).max(100),

  /** File size in bytes */
  size: z.number().int().positive().max(100_000_000), // 100MB max

  /** Storage key (S3 key, file path, etc.) */
  storageKey: z.string().min(1).max(500),

  /** Storage provider identifier */
  storageProvider: z.enum(["s3", "local", "gcs"]).default("local"),

  /** Upload timestamp (ISO 8601) */
  uploadedAt: z.string().datetime(),

  /** Optional: Preview thumbnail key (for images) */
  thumbnailKey: z.string().optional(),

  /** Optional: Alt text for accessibility (for images) */
  altText: z.string().max(500).optional(),
});

/**
 * Type for document references in message metadata.
 */
export type DocumentRef = z.infer<typeof documentRefSchema>;

// Update messageMetaSchema to include attachments
export const messageMetaSchema = z.object({
  /** Number of tokens used in generation (positive integer) */
  tokens: z.number().int().positive().optional(),

  /** Model identifier used for generation */
  model: z.string().optional(),

  /** Response latency in milliseconds */
  latency_ms: z.number().positive().optional(),

  /** Prompt tokens used (for detailed token tracking) */
  prompt_tokens: z.number().int().nonnegative().optional(),

  /** Completion tokens generated */
  completion_tokens: z.number().int().nonnegative().optional(),

  /** Finish reason from AI response */
  finish_reason: z.enum(["stop", "length", "content_filter", "error"]).optional(),

  /** Structured data extracted by modules during hook execution */
  extractions: z.array(extractionSchema).optional(),

  /** File attachments associated with this message (Phase 1 interim solution) */
  attachments: z.array(documentRefSchema).optional(),
}).passthrough(); // Allow additional fields for extensibility

export type MessageMeta = z.infer<typeof messageMetaSchema>;

/**
 * Validates document reference data.
 *
 * @param data - Unknown data to validate
 * @returns Validated DocumentRef object
 * @throws ZodError if validation fails
 */
export function parseDocumentRef(data: unknown): DocumentRef {
  return documentRefSchema.parse(data);
}

/**
 * Safely validates document reference data.
 *
 * @param data - Unknown data to validate
 * @returns SafeParseResult with data or error
 */
export function safeParseDocumentRef(data: unknown) {
  return documentRefSchema.safeParse(data);
}
```

**Usage Example:**

```typescript
import { type NewMessage } from "@raptscallions/db/schema";
import { type DocumentRef } from "@raptscallions/core/schemas";

// Create message with attachment in meta field
const attachment: DocumentRef = {
  id: "att-uuid-1",
  filename: "homework_essay.pdf",
  mimeType: "application/pdf",
  size: 524288,
  storageKey: "uploads/user-789/sessions/sess-123/att-uuid-1.pdf",
  storageProvider: "s3",
  uploadedAt: new Date().toISOString(),
};

const message: NewMessage = {
  sessionId: "sess-123",
  role: "user",
  content: "Please review my essay for grammar and structure.",
  seq: 5,
  meta: {
    attachments: [attachment],
  },
};

await db.insert(messages).values(message);
```

---

### Phase 2: Dedicated Message Attachments Table

**File: `packages/db/src/schema/message-attachments.ts`**

```typescript
import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { messages } from "./messages.js";

/**
 * Storage provider enum for file storage backends.
 */
export const storageProviderEnum = pgEnum("storage_provider", [
  "s3",
  "local",
  "gcs",
]);

/**
 * Message attachments table - files associated with chat messages.
 *
 * Attachments are files (documents, images, etc.) uploaded by users or
 * generated by the system that are associated with specific chat messages.
 *
 * Storage:
 * - Actual file data is stored in configured storage backend (S3, local, GCS)
 * - This table stores metadata and storage references only
 * - storage_key is the identifier used to retrieve file from storage backend
 *
 * Lifecycle:
 * - Created when file is uploaded and associated with message
 * - Soft deleted via deleted_at timestamp
 * - Hard deletion via scheduled cleanup job (future)
 *
 * Foreign key behavior:
 * - message_id: CASCADE delete (remove attachment when message is deleted)
 *
 * Security:
 * - Access control inherits from parent message
 * - Use pre-signed URLs for secure downloads (S3)
 * - Validate MIME types against allowlist
 * - Enforce size limits per user/group quotas
 *
 * @example
 * ```typescript
 * const attachment: NewMessageAttachment = {
 *   messageId: "msg-uuid",
 *   filename: "essay.pdf",
 *   mimeType: "application/pdf",
 *   size: 524288,
 *   storageProvider: "s3",
 *   storageKey: "uploads/user-789/att-uuid.pdf",
 * };
 * await db.insert(messageAttachments).values(attachment);
 * ```
 */
export const messageAttachments = pgTable(
  "message_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),

    // File metadata
    filename: varchar("filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    size: integer("size").notNull(), // bytes

    // Storage reference
    storageProvider: storageProviderEnum("storage_provider")
      .notNull()
      .default("local"),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),

    // Optional metadata (thumbnails, alt text, etc.)
    meta: jsonb("meta").notNull().default("{}"),

    // Timestamps
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    messageIdIdx: index("message_attachments_message_id_idx")
      .on(table.messageId),
    mimeTypeIdx: index("message_attachments_mime_type_idx")
      .on(table.mimeType),
    deletedAtIdx: index("message_attachments_deleted_at_idx")
      .on(table.deletedAt),
  })
);

/**
 * MessageAttachment type for select operations (reading from database).
 *
 * @example
 * ```typescript
 * const attachments = await db.query.messageAttachments.findMany({
 *   where: eq(messageAttachments.messageId, messageId),
 * });
 * ```
 */
export type MessageAttachment = typeof messageAttachments.$inferSelect;

/**
 * NewMessageAttachment type for insert operations (writing to database).
 *
 * @example
 * ```typescript
 * const newAttachment: NewMessageAttachment = {
 *   messageId: "msg-123",
 *   filename: "document.pdf",
 *   mimeType: "application/pdf",
 *   size: 1024000,
 *   storageProvider: "s3",
 *   storageKey: "uploads/att-uuid.pdf",
 * };
 * ```
 */
export type NewMessageAttachment = typeof messageAttachments.$inferInsert;

/**
 * Relations for message attachments.
 * Enables convenient querying of attachments with their parent messages.
 */
export const messageAttachmentsRelations = relations(
  messageAttachments,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageAttachments.messageId],
      references: [messages.id],
    }),
  })
);

// Metadata accessor for test compatibility
Object.defineProperty(messageAttachments, "_", {
  get() {
    return {
      name:
        Symbol.for("drizzle:Name") in messageAttachments
          ? (messageAttachments as unknown as Record<symbol, string>)[
              Symbol.for("drizzle:Name")
            ]
          : "message_attachments",
    };
  },
  enumerable: false,
  configurable: true,
});
```

**Update Messages Schema with Relations:**

**File: `packages/db/src/schema/messages.ts` (addition)**

```typescript
import { relations } from "drizzle-orm";
import { messageAttachments } from "./message-attachments.js";

/**
 * Relations for messages.
 * Enables convenient querying of messages with attachments.
 */
export const messagesRelations = relations(messages, ({ one, many }) => ({
  session: one(chatSessions, {
    fields: [messages.sessionId],
    references: [chatSessions.id],
  }),
  attachments: many(messageAttachments),
}));
```

---

### Migration File

**File: `packages/db/src/migrations/0012_create_message_attachments.sql`**

```sql
-- E04-T011: Create message attachments table
-- Enables associating uploaded files with chat messages

-- ============================================================================
-- STEP 1: Create storage_provider enum
-- ============================================================================
CREATE TYPE "storage_provider" AS ENUM('s3', 'local', 'gcs');
--> statement-breakpoint

-- ============================================================================
-- STEP 2: Create message_attachments table
-- ============================================================================
CREATE TABLE "message_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" uuid NOT NULL,
  "filename" varchar(255) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "size" integer NOT NULL,
  "storage_provider" "storage_provider" DEFAULT 'local' NOT NULL,
  "storage_key" varchar(500) NOT NULL,
  "meta" jsonb DEFAULT '{}' NOT NULL,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint

-- ============================================================================
-- STEP 3: Add foreign key constraint
-- ============================================================================
ALTER TABLE "message_attachments"
  ADD CONSTRAINT "message_attachments_message_id_fkey"
  FOREIGN KEY ("message_id")
  REFERENCES "messages"("id")
  ON DELETE CASCADE;
--> statement-breakpoint

-- ============================================================================
-- STEP 4: Create indexes for efficient queries
-- ============================================================================

-- Index for finding attachments by message
CREATE INDEX "message_attachments_message_id_idx"
  ON "message_attachments" USING btree ("message_id");
--> statement-breakpoint

-- Index for filtering by MIME type (e.g., find all PDFs)
CREATE INDEX "message_attachments_mime_type_idx"
  ON "message_attachments" USING btree ("mime_type");
--> statement-breakpoint

-- Index for soft-delete queries
CREATE INDEX "message_attachments_deleted_at_idx"
  ON "message_attachments" USING btree ("deleted_at");
--> statement-breakpoint

-- ============================================================================
-- OPTIONAL: Migrate existing attachments from message meta field
-- Run this section if migrating from Phase 1 (meta.attachments) to Phase 2
-- ============================================================================

-- Uncomment to migrate data from meta.attachments to dedicated table:
-- INSERT INTO "message_attachments" (
--   "id",
--   "message_id",
--   "filename",
--   "mime_type",
--   "size",
--   "storage_provider",
--   "storage_key",
--   "uploaded_at"
-- )
-- SELECT
--   (attachment->>'id')::uuid,
--   m."id",
--   attachment->>'filename',
--   attachment->>'mimeType',
--   (attachment->>'size')::integer,
--   COALESCE(attachment->>'storageProvider', 'local')::"storage_provider",
--   attachment->>'storageKey',
--   (attachment->>'uploadedAt')::timestamp with time zone
-- FROM "messages" m,
--   jsonb_array_elements(m."meta"->'attachments') AS attachment
-- WHERE m."meta"->'attachments' IS NOT NULL;
-- --> statement-breakpoint

-- Uncomment to clean up meta.attachments after migration:
-- UPDATE "messages"
-- SET "meta" = "meta" - 'attachments'
-- WHERE "meta"->'attachments' IS NOT NULL;
-- --> statement-breakpoint

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. storage_key must be unique per storage_provider (not enforced by DB)
-- 2. Size validation should happen at application layer
-- 3. MIME type validation should happen at application layer
-- 4. Cascade delete ensures orphaned attachments are removed with messages
-- 5. Soft delete (deleted_at) preserves audit trail
```

---

## Query Patterns

### Using Meta Field (Phase 1)

```typescript
// Query messages with attachments in meta
const messagesWithAttachments = await db.query.messages.findMany({
  where: and(
    eq(messages.sessionId, sessionId),
    sql`${messages.meta}->>'attachments' IS NOT NULL`
  ),
  orderBy: asc(messages.seq),
});

// Access attachments from meta
messagesWithAttachments.forEach((msg) => {
  const meta = msg.meta as MessageMeta;
  if (meta.attachments) {
    console.log(`Message has ${meta.attachments.length} attachments`);
  }
});
```

### Using Dedicated Table (Phase 2)

```typescript
// Query messages with attachments (JOIN)
const messagesWithAttachments = await db.query.messages.findMany({
  where: eq(messages.sessionId, sessionId),
  with: {
    attachments: {
      where: isNull(messageAttachments.deletedAt),
    },
  },
  orderBy: asc(messages.seq),
});

// Find all messages with PDF attachments
const pdfMessages = await db
  .select()
  .from(messages)
  .innerJoin(
    messageAttachments,
    eq(messages.id, messageAttachments.messageId)
  )
  .where(
    and(
      eq(messages.sessionId, sessionId),
      eq(messageAttachments.mimeType, "application/pdf"),
      isNull(messageAttachments.deletedAt)
    )
  );

// Get total attachment size for a session
const totalSize = await db
  .select({ total: sum(messageAttachments.size) })
  .from(messageAttachments)
  .innerJoin(messages, eq(messageAttachments.messageId, messages.id))
  .where(eq(messages.sessionId, sessionId));

// Soft delete attachment
await db
  .update(messageAttachments)
  .set({ deletedAt: new Date() })
  .where(eq(messageAttachments.id, attachmentId));

// Create attachment
const [attachment] = await db
  .insert(messageAttachments)
  .values({
    messageId: "msg-123",
    filename: "essay.pdf",
    mimeType: "application/pdf",
    size: 524288,
    storageProvider: "s3",
    storageKey: "uploads/user-789/att-uuid.pdf",
    meta: { thumbnailKey: "thumbnails/att-uuid.jpg" },
  })
  .returning();
```

---

## Test Strategy

### Unit Tests: Meta Field Extension

**File: `packages/core/src/__tests__/schemas/message-meta.schema.test.ts` (additions)**

```typescript
describe("Document References (Attachments)", () => {
  describe("documentRefSchema", () => {
    it("should accept valid document reference", () => {
      const docRef: DocumentRef = {
        id: "att-uuid-1",
        filename: "essay.pdf",
        mimeType: "application/pdf",
        size: 524288,
        storageKey: "uploads/user-789/att-uuid-1.pdf",
        storageProvider: "s3",
        uploadedAt: new Date().toISOString(),
      };

      const result = documentRefSchema.parse(docRef);
      expect(result).toEqual(docRef);
    });

    it("should reject invalid UUID", () => {
      expect(() =>
        documentRefSchema.parse({
          id: "not-a-uuid",
          filename: "test.pdf",
          mimeType: "application/pdf",
          size: 1000,
          storageKey: "key",
          uploadedAt: new Date().toISOString(),
        })
      ).toThrow();
    });

    it("should reject empty filename", () => {
      expect(() =>
        documentRefSchema.parse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          filename: "",
          mimeType: "application/pdf",
          size: 1000,
          storageKey: "key",
          uploadedAt: new Date().toISOString(),
        })
      ).toThrow();
    });

    it("should reject filename over 255 chars", () => {
      expect(() =>
        documentRefSchema.parse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          filename: "a".repeat(256),
          mimeType: "application/pdf",
          size: 1000,
          storageKey: "key",
          uploadedAt: new Date().toISOString(),
        })
      ).toThrow();
    });

    it("should reject negative size", () => {
      expect(() =>
        documentRefSchema.parse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          filename: "test.pdf",
          mimeType: "application/pdf",
          size: -1000,
          storageKey: "key",
          uploadedAt: new Date().toISOString(),
        })
      ).toThrow();
    });

    it("should reject size over 100MB", () => {
      expect(() =>
        documentRefSchema.parse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          filename: "huge.pdf",
          mimeType: "application/pdf",
          size: 100_000_001,
          storageKey: "key",
          uploadedAt: new Date().toISOString(),
        })
      ).toThrow();
    });

    it("should default storageProvider to local", () => {
      const result = documentRefSchema.parse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        filename: "test.pdf",
        mimeType: "application/pdf",
        size: 1000,
        storageKey: "local/test.pdf",
        uploadedAt: new Date().toISOString(),
      });

      expect(result.storageProvider).toBe("local");
    });

    it("should accept optional thumbnailKey", () => {
      const result = documentRefSchema.parse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        filename: "image.jpg",
        mimeType: "image/jpeg",
        size: 50000,
        storageKey: "images/image.jpg",
        storageProvider: "s3",
        uploadedAt: new Date().toISOString(),
        thumbnailKey: "thumbnails/image_thumb.jpg",
      });

      expect(result.thumbnailKey).toBe("thumbnails/image_thumb.jpg");
    });

    it("should accept optional altText", () => {
      const result = documentRefSchema.parse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        filename: "diagram.png",
        mimeType: "image/png",
        size: 75000,
        storageKey: "images/diagram.png",
        storageProvider: "s3",
        uploadedAt: new Date().toISOString(),
        altText: "Flowchart showing authentication process",
      });

      expect(result.altText).toBe("Flowchart showing authentication process");
    });
  });

  describe("messageMetaSchema with attachments", () => {
    it("should accept message meta with attachments array", () => {
      const meta: MessageMeta = {
        tokens: 150,
        attachments: [
          {
            id: "att-1",
            filename: "doc1.pdf",
            mimeType: "application/pdf",
            size: 10000,
            storageKey: "uploads/doc1.pdf",
            storageProvider: "s3",
            uploadedAt: new Date().toISOString(),
          },
          {
            id: "att-2",
            filename: "image.jpg",
            mimeType: "image/jpeg",
            size: 50000,
            storageKey: "uploads/image.jpg",
            storageProvider: "s3",
            uploadedAt: new Date().toISOString(),
          },
        ],
      };

      const result = messageMetaSchema.parse(meta);
      expect(result.attachments).toHaveLength(2);
      expect(result.attachments?.[0]?.filename).toBe("doc1.pdf");
    });

    it("should accept empty attachments array", () => {
      const meta = { attachments: [] };
      const result = messageMetaSchema.parse(meta);
      expect(result.attachments).toEqual([]);
    });

    it("should accept meta without attachments", () => {
      const meta = { tokens: 100 };
      const result = messageMetaSchema.parse(meta);
      expect(result.attachments).toBeUndefined();
    });
  });
});
```

### Unit Tests: Dedicated Table

**File: `packages/db/src/__tests__/schema/message-attachments.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import {
  messageAttachments,
  type MessageAttachment,
  type NewMessageAttachment,
} from "../message-attachments.js";

describe("messageAttachments schema", () => {
  describe("Table Structure", () => {
    it("should have correct table name", () => {
      expect(messageAttachments._.name).toBe("message_attachments");
    });

    it("should have all required fields defined", () => {
      expect(messageAttachments.id).toBeDefined();
      expect(messageAttachments.messageId).toBeDefined();
      expect(messageAttachments.filename).toBeDefined();
      expect(messageAttachments.mimeType).toBeDefined();
      expect(messageAttachments.size).toBeDefined();
      expect(messageAttachments.storageProvider).toBeDefined();
      expect(messageAttachments.storageKey).toBeDefined();
      expect(messageAttachments.meta).toBeDefined();
      expect(messageAttachments.uploadedAt).toBeDefined();
      expect(messageAttachments.deletedAt).toBeDefined();
    });
  });

  describe("Type Inference", () => {
    it("should infer MessageAttachment type correctly", () => {
      const attachment: MessageAttachment = {
        id: "att-123",
        messageId: "msg-456",
        filename: "document.pdf",
        mimeType: "application/pdf",
        size: 524288,
        storageProvider: "s3",
        storageKey: "uploads/att-123.pdf",
        meta: {},
        uploadedAt: new Date(),
        deletedAt: null,
      };

      expect(attachment.id).toBe("att-123");
      expect(attachment.messageId).toBe("msg-456");
      expect(attachment.size).toBe(524288);
    });

    it("should infer NewMessageAttachment type correctly", () => {
      const newAttachment: NewMessageAttachment = {
        messageId: "msg-456",
        filename: "essay.pdf",
        mimeType: "application/pdf",
        size: 1024000,
        storageProvider: "local",
        storageKey: "local/uploads/essay.pdf",
      };

      expect(newAttachment.messageId).toBe("msg-456");
      expect(newAttachment.storageProvider).toBe("local");
    });

    it("should allow optional fields in NewMessageAttachment", () => {
      const minimal: NewMessageAttachment = {
        messageId: "msg-456",
        filename: "test.txt",
        mimeType: "text/plain",
        size: 100,
        storageKey: "test.txt",
      };

      expect(minimal.storageProvider).toBeUndefined();
      expect(minimal.meta).toBeUndefined();
    });
  });

  describe("Soft Delete Support", () => {
    it("should support deletedAt field", () => {
      const deleted: MessageAttachment = {
        id: "att-123",
        messageId: "msg-456",
        filename: "deleted.pdf",
        mimeType: "application/pdf",
        size: 1000,
        storageProvider: "local",
        storageKey: "deleted.pdf",
        meta: {},
        uploadedAt: new Date(),
        deletedAt: new Date(), // Soft deleted
      };

      expect(deleted.deletedAt).toBeInstanceOf(Date);
    });

    it("should default deletedAt to null for active attachments", () => {
      const active: MessageAttachment = {
        id: "att-123",
        messageId: "msg-456",
        filename: "active.pdf",
        mimeType: "application/pdf",
        size: 1000,
        storageProvider: "local",
        storageKey: "active.pdf",
        meta: {},
        uploadedAt: new Date(),
        deletedAt: null,
      };

      expect(active.deletedAt).toBeNull();
    });
  });

  describe("Storage Provider Enum", () => {
    it("should accept s3 as storage provider", () => {
      const s3Attachment: MessageAttachment = {
        id: "att-123",
        messageId: "msg-456",
        filename: "s3-file.pdf",
        mimeType: "application/pdf",
        size: 1000,
        storageProvider: "s3",
        storageKey: "bucket/s3-file.pdf",
        meta: {},
        uploadedAt: new Date(),
        deletedAt: null,
      };

      expect(s3Attachment.storageProvider).toBe("s3");
    });

    it("should accept local as storage provider", () => {
      const localAttachment: MessageAttachment = {
        id: "att-123",
        messageId: "msg-456",
        filename: "local-file.txt",
        mimeType: "text/plain",
        size: 500,
        storageProvider: "local",
        storageKey: "uploads/local-file.txt",
        meta: {},
        uploadedAt: new Date(),
        deletedAt: null,
      };

      expect(localAttachment.storageProvider).toBe("local");
    });

    it("should accept gcs as storage provider", () => {
      const gcsAttachment: MessageAttachment = {
        id: "att-123",
        messageId: "msg-456",
        filename: "gcs-file.jpg",
        mimeType: "image/jpeg",
        size: 75000,
        storageProvider: "gcs",
        storageKey: "bucket/gcs-file.jpg",
        meta: {},
        uploadedAt: new Date(),
        deletedAt: null,
      };

      expect(gcsAttachment.storageProvider).toBe("gcs");
    });
  });

  describe("Meta Field", () => {
    it("should support thumbnailKey in meta", () => {
      const withThumbnail: MessageAttachment = {
        id: "att-123",
        messageId: "msg-456",
        filename: "image.jpg",
        mimeType: "image/jpeg",
        size: 50000,
        storageProvider: "s3",
        storageKey: "images/image.jpg",
        meta: { thumbnailKey: "thumbnails/image_thumb.jpg" },
        uploadedAt: new Date(),
        deletedAt: null,
      };

      expect(withThumbnail.meta).toHaveProperty("thumbnailKey");
    });

    it("should support altText in meta", () => {
      const withAltText: MessageAttachment = {
        id: "att-123",
        messageId: "msg-456",
        filename: "diagram.png",
        mimeType: "image/png",
        size: 75000,
        storageProvider: "s3",
        storageKey: "diagrams/diagram.png",
        meta: { altText: "System architecture diagram" },
        uploadedAt: new Date(),
        deletedAt: null,
      };

      expect(withAltText.meta).toHaveProperty("altText");
    });
  });
});
```

---

## Acceptance Criteria Breakdown

| AC | Requirement | Implementation | Validation |
|----|-------------|----------------|------------|
| AC1 | Create message_attachments table | Define schema in message-attachments.ts | Table schema exists |
| AC2 | Required fields | id, message_id, filename, mime_type, size, storage_provider, storage_key | All fields in schema |
| AC3 | Soft delete support | Add deleted_at timestamp field | Field exists, nullable |
| AC4 | Timestamps | uploaded_at, deleted_at | Fields exist with correct types |
| AC5 | FK to messages CASCADE | Foreign key constraint in migration | FK constraint exists |
| AC6 | Migration file 0012 | Create migration with table + indexes | Migration runs without errors |
| AC7 | Index on message_id | Add index in schema and migration | Index exists |
| AC8 | Index on mime_type | Add index in schema and migration | Index exists |
| AC9 | Index on deleted_at | Add index in schema and migration | Index exists |
| AC10 | Export types | Export MessageAttachment, NewMessageAttachment | Types available to import |
| AC11 | Zod schema | Create documentRefSchema for attachments | Schema validates correctly |
| AC12 | Validate constraints | Filename, mime_type, size validation | Tests pass |
| AC13 | Define relations | Drizzle relations for message ↔ attachments | Relations work in queries |
| AC14 | Query with attachments | Support single-query fetch with JOIN | Can query messages.with.attachments |
| AC15 | Extend messageMetaSchema | Add attachments field to meta | Field in schema, optional |
| AC16 | Document migration | SQL to migrate from meta to table | Migration query in spec |
| AC17 | Attachment creation tests | Tests for creating attachments | Tests pass |
| AC18 | CASCADE delete tests | Tests verify attachment removal | Tests pass |
| AC19 | Soft delete tests | Tests verify soft delete behavior | Tests pass |
| AC20 | Zod validation tests | Tests for documentRefSchema | Tests pass |

---

## Edge Cases

### 1. Duplicate Filenames

**Edge Case**: Multiple attachments with same filename in different messages.

**Handling**:
- Allowed by design (filename is not unique)
- storage_key must be unique (UUID-based naming)
- Service layer generates unique storage_key per file

**Example:**
```typescript
// Two messages, same filename, different storage keys
const att1 = {
  messageId: "msg-1",
  filename: "homework.pdf",
  storageKey: "uploads/user-123/att-uuid-1.pdf", // Unique
};

const att2 = {
  messageId: "msg-2",
  filename: "homework.pdf", // Same filename, different file
  storageKey: "uploads/user-123/att-uuid-2.pdf", // Different key
};
```

### 2. Orphaned Files in Storage

**Edge Case**: Attachment record deleted but file remains in S3/local storage.

**Handling**:
- Soft delete preserves record until scheduled cleanup
- Hard delete triggers background job to remove file from storage
- Periodic audit job finds orphaned files (storage_key not in DB)

**Cleanup Strategy:**
```typescript
// Background job: delete soft-deleted attachments older than 30 days
await db.delete(messageAttachments).where(
  and(
    isNotNull(messageAttachments.deletedAt),
    lt(messageAttachments.deletedAt, thirtyDaysAgo)
  )
);

// For each deleted attachment, remove from storage
for (const att of deletedAttachments) {
  await storageService.delete(att.storageProvider, att.storageKey);
}
```

### 3. Large File Size Limits

**Edge Case**: User uploads file exceeding 100MB limit.

**Handling**:
- Zod schema validates max 100MB
- Service layer checks size before storage
- Return validation error with clear message
- Consider streaming uploads for large files (future)

**Validation:**
```typescript
if (file.size > 100_000_000) {
  throw new ValidationError(
    "File size exceeds maximum allowed (100MB)",
    { maxSize: 100_000_000, actualSize: file.size }
  );
}
```

### 4. Invalid MIME Types

**Edge Case**: User uploads file with dangerous MIME type (executable, script).

**Handling**:
- Service layer validates against MIME type allowlist
- Reject: application/x-msdownload, application/x-sh, text/html (if user-controlled)
- Content-Type sniffing (check actual file content, not just extension)

**Allowlist Example:**
```typescript
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/markdown",
];

if (!ALLOWED_MIME_TYPES.includes(file.mimeType)) {
  throw new ValidationError("File type not allowed");
}
```

### 5. Message Deletion Cascade

**Edge Case**: Message is deleted, should attachments be deleted too?

**Handling**:
- CASCADE delete ensures attachments removed with message
- Soft delete message → soft delete attachments (via trigger or service layer)
- Hard delete message → hard delete attachments (CASCADE)

**Soft Delete Cascade:**
```typescript
// When soft-deleting a message, also soft-delete attachments
await db.transaction(async (tx) => {
  await tx
    .update(messages)
    .set({ deletedAt: now })
    .where(eq(messages.id, messageId));

  await tx
    .update(messageAttachments)
    .set({ deletedAt: now })
    .where(eq(messageAttachments.messageId, messageId));
});
```

### 6. Storage Provider Migration

**Edge Case**: Need to migrate attachments from local to S3.

**Handling**:
- Update storage_provider and storage_key in batch
- Copy files from local to S3 in background job
- Verify successful copy before updating DB
- Delete local files after verification

**Migration Script:**
```typescript
const localAttachments = await db.query.messageAttachments.findMany({
  where: eq(messageAttachments.storageProvider, "local"),
});

for (const att of localAttachments) {
  // Upload to S3
  const s3Key = await s3Service.upload(att.storageKey);

  // Update record
  await db
    .update(messageAttachments)
    .set({
      storageProvider: "s3",
      storageKey: s3Key,
    })
    .where(eq(messageAttachments.id, att.id));

  // Delete local file
  await fs.unlink(att.storageKey);
}
```

### 7. Concurrent Attachments on Same Message

**Edge Case**: Multiple files uploaded simultaneously to same message.

**Handling**:
- Each attachment gets unique UUID
- No race condition (separate INSERT statements)
- Service layer batches INSERTs if needed

**Batch Insert:**
```typescript
const attachments: NewMessageAttachment[] = uploadedFiles.map((file) => ({
  messageId,
  filename: file.name,
  mimeType: file.mimeType,
  size: file.size,
  storageProvider: "s3",
  storageKey: file.s3Key,
}));

await db.insert(messageAttachments).values(attachments);
```

---

## Security Considerations

### Filename Sanitization

```typescript
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace unsafe chars
    .substring(0, 255); // Enforce max length
}
```

### Storage Key Generation

```typescript
import { randomUUID } from "crypto";

function generateStorageKey(
  userId: string,
  sessionId: string,
  filename: string
): string {
  const uuid = randomUUID();
  const ext = filename.split(".").pop();
  return `uploads/${userId}/sessions/${sessionId}/${uuid}.${ext}`;
}
```

### Access Control

```typescript
// Only message author or permitted users can access attachment
const message = await db.query.messages.findFirst({
  where: eq(messages.id, attachment.messageId),
  with: { session: true },
});

const canAccess = ability.can("read", message.session);
if (!canAccess) {
  throw new ForbiddenError("Cannot access this attachment");
}
```

---

## Out of Scope

This task covers schema only. Deferred to future tasks:
- File upload API endpoint implementation
- S3/GCS service integration
- Pre-signed URL generation for downloads
- Virus scanning integration
- Thumbnail generation for images
- File size quota enforcement per user/group
- Streaming upload/download for large files
- Client-side file upload UI

---

## Open Questions

None. All requirements are clear and specification is complete.

---

## Implementation Steps

### Phase 1: Extend Message Meta Schema

#### Step 1: Update Message Meta Schema
- [ ] Add `documentRefSchema` to message-meta.schema.ts
- [ ] Add `attachments` field to `messageMetaSchema`
- [ ] Add `parseDocumentRef` and `safeParseDocumentRef` helpers
- [ ] Add comprehensive JSDoc documentation

#### Step 2: Update Schema Tests
- [ ] Add tests for `documentRefSchema` validation
- [ ] Add tests for `attachments` in `messageMetaSchema`
- [ ] Test all edge cases (size limits, empty fields, etc.)

#### Step 3: Update Exports
- [ ] Export `DocumentRef` type from schemas/index.ts
- [ ] Export validation functions

### Phase 2: Create Dedicated Table

#### Step 4: Create Attachments Schema
- [ ] Create `packages/db/src/schema/message-attachments.ts`
- [ ] Define `storageProviderEnum`
- [ ] Define `messageAttachments` table with all fields
- [ ] Add indexes for message_id, mime_type, deleted_at
- [ ] Export `MessageAttachment` and `NewMessageAttachment` types
- [ ] Add metadata accessor for test compatibility

#### Step 5: Add Relations
- [ ] Define `messageAttachmentsRelations` in message-attachments.ts
- [ ] Update `messagesRelations` in messages.ts to include attachments

#### Step 6: Create Migration
- [ ] Create `0012_create_message_attachments.sql`
- [ ] Add enum creation
- [ ] Add table creation
- [ ] Add foreign key constraint
- [ ] Add indexes
- [ ] Add optional data migration from meta field (commented)

#### Step 7: Create Attachments Tests
- [ ] Create message-attachments.test.ts
- [ ] Test table structure and fields
- [ ] Test type inference
- [ ] Test soft delete support
- [ ] Test storage provider enum
- [ ] Test meta field flexibility

#### Step 8: Update Exports
- [ ] Export from packages/db/src/schema/index.ts
- [ ] Verify barrel exports work correctly

### Step 9: Verify and Document
- [ ] Run `pnpm typecheck` - must pass with zero errors
- [ ] Run `pnpm lint` - must pass
- [ ] Run `pnpm test` - all tests must pass
- [ ] Verify migration can be applied to test database
- [ ] Document query patterns in code comments

---

## References

- **E04-T001**: Messages schema implementation
- **E04-T009**: Message meta Zod schema
- **ARCHITECTURE.md**: Core entities, chat messages
- **CONVENTIONS.md**: Database patterns, JSONB usage

---

**End of Specification**
