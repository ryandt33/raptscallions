-- E04-T010: Add chat session forking support
-- Enables users to create branching conversation paths from any point in a chat

-- ============================================================================
-- STEP 1: Add fork tracking fields
-- ============================================================================

-- Add parent_session_id - references the session this was forked from
ALTER TABLE "chat_sessions"
  ADD COLUMN "parent_session_id" uuid;
--> statement-breakpoint

-- Add fork_from_seq - message sequence in parent where fork occurred
ALTER TABLE "chat_sessions"
  ADD COLUMN "fork_from_seq" integer;
--> statement-breakpoint

-- ============================================================================
-- STEP 2: Add foreign key constraint with SET NULL behavior
-- Forks survive parent session deletion (become orphans)
-- ============================================================================

ALTER TABLE "chat_sessions"
  ADD CONSTRAINT "chat_sessions_parent_session_id_fkey"
  FOREIGN KEY ("parent_session_id")
  REFERENCES "chat_sessions"("id")
  ON DELETE SET NULL;
--> statement-breakpoint

-- ============================================================================
-- STEP 3: Add index for efficient fork tree queries
-- ============================================================================

CREATE INDEX "chat_sessions_parent_session_id_idx"
  ON "chat_sessions" USING btree ("parent_session_id");
--> statement-breakpoint

-- ============================================================================
-- STEP 4: Add CHECK constraint to prevent self-reference (AC13)
-- Prevents parent_session_id from pointing to itself (circular reference)
-- ============================================================================

ALTER TABLE "chat_sessions"
  ADD CONSTRAINT "chat_sessions_no_self_fork"
  CHECK (parent_session_id IS NULL OR parent_session_id != id);
--> statement-breakpoint

-- ============================================================================
-- STEP 5: Add partial index for orphaned forks query optimization (AC14)
-- Optimizes queries for "find all orphaned forks"
-- ============================================================================

CREATE INDEX "chat_sessions_orphaned_forks_idx"
  ON "chat_sessions" ("fork_from_seq")
  WHERE parent_session_id IS NULL AND fork_from_seq IS NOT NULL;
--> statement-breakpoint

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Both fields are nullable - most sessions are not forks
-- 2. SET NULL on delete preserves forked sessions as standalone conversations
-- 3. fork_from_seq is informational only - service layer handles message copying
-- 4. Index supports queries like "find all forks of session X"
-- 5. CHECK constraint provides defense in depth against circular references
-- 6. Partial index efficiently supports orphaned fork queries
