-- Create session_state enum
CREATE TYPE "public"."session_state" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint

-- Create message_role enum
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint

-- Create chat_sessions table
CREATE TABLE "chat_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tool_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "state" "session_state" DEFAULT 'active' NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ended_at" timestamp with time zone
);
--> statement-breakpoint

-- Create messages table
CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "role" "message_role" NOT NULL,
  "content" text NOT NULL,
  "seq" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "meta" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "chat_sessions"
  ADD CONSTRAINT "chat_sessions_tool_id_tools_id_fk"
  FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "chat_sessions"
  ADD CONSTRAINT "chat_sessions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_session_id_chat_sessions_id_fk"
  FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Add unique constraint on (session_id, seq) to ensure message ordering integrity
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_session_seq_unique"
  UNIQUE ("session_id", "seq");
--> statement-breakpoint

-- Create indexes
CREATE INDEX "chat_sessions_tool_id_idx" ON "chat_sessions" USING btree ("tool_id");
--> statement-breakpoint
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "chat_sessions_state_idx" ON "chat_sessions" USING btree ("state");
--> statement-breakpoint
CREATE INDEX "messages_session_seq_idx" ON "messages" USING btree ("session_id", "seq");
