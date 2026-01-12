CREATE TYPE "public"."tool_type" AS ENUM('chat', 'product');--> statement-breakpoint
CREATE TABLE "tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "tool_type" NOT NULL,
	"name" varchar(100) NOT NULL,
	"version" varchar(20) DEFAULT '1.0.0' NOT NULL,
	"definition" text NOT NULL,
	"created_by" uuid NOT NULL,
	"group_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tools_name_version_unique" UNIQUE("name","version")
);
--> statement-breakpoint
ALTER TABLE "tools" ADD CONSTRAINT "tools_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tools" ADD CONSTRAINT "tools_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tools_group_id_idx" ON "tools" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "tools_created_by_idx" ON "tools" USING btree ("created_by");--> statement-breakpoint

-- Create function to auto-update updated_at timestamp on row modification
-- This function is reusable across tables and is created if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Create trigger to automatically update updated_at on tools table
CREATE TRIGGER update_tools_updated_at
BEFORE UPDATE ON tools
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
