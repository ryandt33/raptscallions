-- Add updated_at trigger to tools table
-- Idempotent: safe to run on both fresh and existing databases

-- Create function to auto-update updated_at timestamp on row modification
-- This function is reusable across tables and is created if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- Create trigger to automatically update updated_at on tools table
-- Drop first in case it already exists (idempotent)
DROP TRIGGER IF EXISTS update_tools_updated_at ON tools;
--> statement-breakpoint

CREATE TRIGGER update_tools_updated_at
BEFORE UPDATE ON tools
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
