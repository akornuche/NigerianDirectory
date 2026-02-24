-- Migration: Add content_sources column to schools table if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='schools' AND column_name='content_sources'
    ) THEN
        ALTER TABLE schools ADD COLUMN content_sources JSONB DEFAULT '[]';
    END IF;
END$$;
