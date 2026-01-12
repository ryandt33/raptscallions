-- Create classes table
-- Idempotent: safe to run on both fresh and existing databases

CREATE TABLE IF NOT EXISTS "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint

-- Add foreign key constraint (may already exist)
DO $$ BEGIN
	ALTER TABLE "classes" ADD CONSTRAINT "classes_group_id_groups_id_fk"
		FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Create index (if not exists)
CREATE INDEX IF NOT EXISTS "classes_group_id_idx" ON "classes" USING btree ("group_id");
