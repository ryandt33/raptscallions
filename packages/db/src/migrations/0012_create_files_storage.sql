-- Migration: 0012_create_files_storage.sql
-- Creates files table and user_storage_limits table for file storage infrastructure

-- Create file_status enum
CREATE TYPE "public"."file_status" AS ENUM('active', 'soft_deleted');--> statement-breakpoint

-- Create storage_backend enum
CREATE TYPE "public"."storage_backend" AS ENUM('s3', 'local');--> statement-breakpoint

-- Create files table
CREATE TABLE "files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "original_name" varchar(255) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "size_bytes" bigint NOT NULL,
  "storage_key" varchar(500) NOT NULL,
  "storage_backend" "storage_backend" NOT NULL DEFAULT 's3',
  "uploaded_by" uuid NOT NULL,
  "group_id" uuid,
  "purpose" varchar(50) NOT NULL DEFAULT 'general',
  "status" "file_status" NOT NULL DEFAULT 'active',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

-- Create user_storage_limits table
CREATE TABLE "user_storage_limits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "max_file_size_bytes" bigint,
  "storage_quota_bytes" bigint,
  "used_bytes" bigint NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  "set_by" uuid,
  "reason" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Foreign key constraints for files table
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk"
  FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "files" ADD CONSTRAINT "files_group_id_groups_id_fk"
  FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Foreign key constraints for user_storage_limits table
ALTER TABLE "user_storage_limits" ADD CONSTRAINT "user_storage_limits_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "user_storage_limits" ADD CONSTRAINT "user_storage_limits_set_by_users_id_fk"
  FOREIGN KEY ("set_by") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Unique constraints
ALTER TABLE "files" ADD CONSTRAINT "files_storage_key_unique" UNIQUE("storage_key");--> statement-breakpoint

ALTER TABLE "user_storage_limits" ADD CONSTRAINT "user_storage_limits_user_id_unique" UNIQUE("user_id");--> statement-breakpoint

-- Indexes for files table
CREATE INDEX "files_uploaded_by_idx" ON "files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "files_group_id_idx" ON "files" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "files_purpose_idx" ON "files" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "files_deleted_at_idx" ON "files" USING btree ("deleted_at");--> statement-breakpoint

-- Triggers for updated_at (reuse existing function from 0009)
-- Note: update_updated_at_column() function already exists from migration 0009
DROP TRIGGER IF EXISTS update_files_updated_at ON files;--> statement-breakpoint
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint

DROP TRIGGER IF EXISTS update_user_storage_limits_updated_at ON user_storage_limits;--> statement-breakpoint
CREATE TRIGGER update_user_storage_limits_updated_at
  BEFORE UPDATE ON user_storage_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
