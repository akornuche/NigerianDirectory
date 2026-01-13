-- Migration: Add enriched content fields to schools table
-- Run this migration to add fields for web-sourced content

-- Add enriched content columns
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_history TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_academics TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_campus_info TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_student_life TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_notable_alumni JSONB DEFAULT '[]';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_recent_news JSONB DEFAULT '[]';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS content_sources JSONB DEFAULT '[]';

-- Add index for enrichment status
CREATE INDEX IF NOT EXISTS idx_schools_enriched ON schools(enriched_history) WHERE enriched_history IS NULL;

-- Update needs_ai_enrichment flag for schools that need enrichment
UPDATE schools SET needs_ai_enrichment = TRUE WHERE enriched_history IS NULL;

COMMENT ON COLUMN schools.enriched_history IS 'Web-sourced history content about the school';
COMMENT ON COLUMN schools.enriched_academics IS 'Web-sourced academic program information';
COMMENT ON COLUMN schools.enriched_campus_info IS 'Web-sourced campus and facilities information';
COMMENT ON COLUMN schools.enriched_student_life IS 'Web-sourced student life description';
COMMENT ON COLUMN schools.enriched_notable_alumni IS 'JSON array of notable alumni names found online';
COMMENT ON COLUMN schools.enriched_recent_news IS 'JSON array of recent news/achievements found online';
COMMENT ON COLUMN schools.content_sources IS 'JSON array of source URLs for attribution and outbound links';
