-- E04-T009: Chat schema enhancements
-- 1. Remove "paused" state from session_state enum (YAGNI cleanup)
-- 2. Add soft delete support (deleted_at)
-- 3. Add session metadata (title, last_activity_at)

-- ============================================================================
-- STEP 1: Data migration - convert any 'paused' sessions to 'active'
-- This MUST run before enum alteration to avoid cast failures
-- ============================================================================
UPDATE "chat_sessions" SET "state" = 'active' WHERE "state" = 'paused';
--> statement-breakpoint

-- ============================================================================
-- STEP 2: Alter session_state enum to remove 'paused'
-- PostgreSQL doesn't support DROP VALUE, so we use rename-recreate-drop pattern
-- ============================================================================

-- 2a. Rename existing enum
ALTER TYPE "session_state" RENAME TO "session_state_old";
--> statement-breakpoint

-- 2b. Create new enum without 'paused'
CREATE TYPE "session_state" AS ENUM('active', 'completed');
--> statement-breakpoint

-- 2c. Drop default constraint before type change
ALTER TABLE "chat_sessions"
  ALTER COLUMN "state" DROP DEFAULT;
--> statement-breakpoint

-- 2d. Alter column to use new enum (cast through text)
ALTER TABLE "chat_sessions"
  ALTER COLUMN "state" TYPE "session_state"
  USING "state"::text::"session_state";
--> statement-breakpoint

-- 2e. Re-add default constraint with new enum type
ALTER TABLE "chat_sessions"
  ALTER COLUMN "state" SET DEFAULT 'active'::"session_state";
--> statement-breakpoint

-- 2f. Drop old enum
DROP TYPE "session_state_old";
--> statement-breakpoint

-- ============================================================================
-- STEP 3: Add new columns for session metadata and soft delete
-- ============================================================================

-- 3a. Add title column for user-facing session names
ALTER TABLE "chat_sessions"
  ADD COLUMN "title" varchar(200);
--> statement-breakpoint

-- 3b. Add last_activity_at for "last active X ago" display
ALTER TABLE "chat_sessions"
  ADD COLUMN "last_activity_at" timestamp with time zone;
--> statement-breakpoint

-- 3c. Add deleted_at for soft delete support
ALTER TABLE "chat_sessions"
  ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint

-- ============================================================================
-- STEP 4: Add index for efficient soft-delete queries
-- ============================================================================
CREATE INDEX "chat_sessions_deleted_at_idx" ON "chat_sessions" USING btree ("deleted_at");
--> statement-breakpoint

-- ============================================================================
-- STEP 5: Backfill last_activity_at from existing messages (optional)
-- Sets last_activity_at to the most recent message created_at for each session
-- ============================================================================
UPDATE "chat_sessions" cs
SET "last_activity_at" = (
  SELECT MAX(m."created_at")
  FROM "messages" m
  WHERE m."session_id" = cs."id"
)
WHERE cs."last_activity_at" IS NULL;
