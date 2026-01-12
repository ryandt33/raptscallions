-- Enable ltree extension (required for hierarchical data)
CREATE EXTENSION IF NOT EXISTS ltree;
--> statement-breakpoint

-- Create group type enum
CREATE TYPE "public"."group_type" AS ENUM('district', 'school', 'department');
--> statement-breakpoint

-- Create groups table
CREATE TABLE "groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "type" "group_type" NOT NULL,
  "path" ltree NOT NULL,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- Create GiST index for ltree path operations
CREATE INDEX "groups_path_gist_idx" ON "groups" USING gist ("path");
--> statement-breakpoint

-- Create index on slug for fast lookups
CREATE INDEX "groups_slug_idx" ON "groups" USING btree ("slug");
