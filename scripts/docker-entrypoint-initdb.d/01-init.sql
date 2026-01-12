-- Enable ltree extension for hierarchical group paths
-- This extension is required for the groups table path column
CREATE EXTENSION IF NOT EXISTS ltree;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL initialized with ltree extension for Raptscallions';
END $$;
