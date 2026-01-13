-- Add enriched content columns to schools table
-- These columns store AI-generated enriched content from web crawling

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS enriched_history TEXT,
ADD COLUMN IF NOT EXISTS enriched_academics TEXT,
ADD COLUMN IF NOT EXISTS enriched_campus_info TEXT,
ADD COLUMN IF NOT EXISTS enriched_student_life TEXT,
ADD COLUMN IF NOT EXISTS content_sources JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS enrichment_status VARCHAR(20) DEFAULT 'pending' CHECK (enrichment_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS last_enriched TIMESTAMP;

-- Create index for enrichment status
CREATE INDEX IF NOT EXISTS idx_schools_enrichment_status ON schools(enrichment_status);

-- Update existing schools to need enrichment
UPDATE schools SET needs_ai_enrichment = TRUE WHERE needs_ai_enrichment IS NULL;