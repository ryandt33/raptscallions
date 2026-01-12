-- Create sessions table for Lucia authentication
-- Idempotent: safe to run on both fresh and existing databases

-- Create table if not exists
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"context" varchar(20) DEFAULT 'unknown' NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraint (may already exist)
DO $$ BEGIN
	ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Create index (if not exists)
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");
--> statement-breakpoint

-- Ensure defaults are set on existing tables
ALTER TABLE "sessions" ALTER COLUMN "context" SET DEFAULT 'unknown';
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "last_activity_at" SET DEFAULT now();
