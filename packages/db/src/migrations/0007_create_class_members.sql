-- Create class_members table and class_role enum
-- Idempotent: safe to run on both fresh and existing databases

-- Create enum type (if not exists)
DO $$ BEGIN
	CREATE TYPE "public"."class_role" AS ENUM('teacher', 'student');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "class_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "class_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints (may already exist)
DO $$ BEGIN
	ALTER TABLE "class_members" ADD CONSTRAINT "class_members_class_id_classes_id_fk"
		FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "class_members" ADD CONSTRAINT "class_members_user_id_users_id_fk"
		FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Create indexes (if not exists)
CREATE INDEX IF NOT EXISTS "class_members_class_id_idx" ON "class_members" USING btree ("class_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "class_members_user_id_idx" ON "class_members" USING btree ("user_id");
--> statement-breakpoint

-- Add unique constraint (may already exist)
DO $$ BEGIN
	ALTER TABLE "class_members" ADD CONSTRAINT "class_members_class_user_unique"
		UNIQUE ("class_id", "user_id");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
