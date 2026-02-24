-- Migration 002: Consolidate enriched content columns
-- This migration brings existing databases in line with the consolidated init.sql
-- All statements use IF NOT EXISTS / IF EXISTS for idempotent execution

-- Enriched content columns (web-sourced / AI-generated)
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_history TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_academics TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_campus_info TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_student_life TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_notable_alumni JSONB DEFAULT '[]';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_recent_news JSONB DEFAULT '[]';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS content_sources JSONB DEFAULT '[]';

-- Enrichment workflow status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='schools' AND column_name='enrichment_status'
    ) THEN
        ALTER TABLE schools ADD COLUMN enrichment_status VARCHAR(20) DEFAULT 'pending'
            CHECK (enrichment_status IN ('pending', 'processing', 'completed', 'failed'));
    END IF;
END$$;

-- Featured flag (used by frontend)
ALTER TABLE schools ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schools_featured ON schools(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_schools_enrichment_status ON schools(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_schools_enriched ON schools(enriched_history) WHERE enriched_history IS NULL;

-- Set enrichment status for schools that have been enriched
UPDATE schools SET enrichment_status = 'completed' WHERE enriched_history IS NOT NULL AND enrichment_status = 'pending';

-- Mark un-enriched schools
UPDATE schools SET needs_ai_enrichment = TRUE WHERE enriched_history IS NULL AND needs_ai_enrichment IS NULL;

-- Column comments
COMMENT ON COLUMN schools.enriched_history IS 'Web-sourced history content about the school';
COMMENT ON COLUMN schools.enriched_academics IS 'Web-sourced academic program information';
COMMENT ON COLUMN schools.enriched_campus_info IS 'Web-sourced campus and facilities information';
COMMENT ON COLUMN schools.enriched_student_life IS 'Web-sourced student life description';
COMMENT ON COLUMN schools.enriched_notable_alumni IS 'JSON array of notable alumni names found online';
COMMENT ON COLUMN schools.enriched_recent_news IS 'JSON array of recent news/achievements found online';
COMMENT ON COLUMN schools.enrichment_status IS 'Workflow status: pending, processing, completed, failed';
COMMENT ON COLUMN schools.featured IS 'Whether this school appears in featured listings';
COMMENT ON COLUMN schools.content_sources IS 'JSON array of source URLs for attribution and outbound links';
