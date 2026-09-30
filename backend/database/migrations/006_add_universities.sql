-- Migration 006: Universities vertical support
-- Extends the schools table for higher education institutions

-- Extend type to include university-specific ownership types
ALTER TABLE schools
  DROP CONSTRAINT IF EXISTS schools_type_check;

ALTER TABLE schools
  ADD CONSTRAINT schools_type_check CHECK (
    type IN (
      'private', 'public', 'international', 'federal', 'state',
      'mission', 'community', 'proprietory'
    )
  );

-- University-specific fields
ALTER TABLE schools ADD COLUMN IF NOT EXISTS accreditation       VARCHAR(100);  -- e.g. 'NUC', 'NBTE', 'NCCE'
ALTER TABLE schools ADD COLUMN IF NOT EXISTS faculties           JSONB DEFAULT '[]';  -- array of faculty names
ALTER TABLE schools ADD COLUMN IF NOT EXISTS programmes          JSONB DEFAULT '[]';  -- array of programme names
ALTER TABLE schools ADD COLUMN IF NOT EXISTS vc_name             VARCHAR(150);  -- Vice Chancellor / Rector / Provost
ALTER TABLE schools ADD COLUMN IF NOT EXISTS vc_title            VARCHAR(100) DEFAULT 'Vice Chancellor';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS student_population  INT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS postgraduate        BOOLEAN DEFAULT FALSE;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS distance_learning   BOOLEAN DEFAULT FALSE;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS year_chartered      INT;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_schools_institution_category ON schools(institution_category);
CREATE INDEX IF NOT EXISTS idx_schools_accreditation ON schools(accreditation);

-- Update existing schools to explicitly set category
UPDATE schools SET institution_category = 'school'
WHERE institution_category IS NULL OR institution_category = '';
