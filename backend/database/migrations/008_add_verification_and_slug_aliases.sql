-- Migration 008: record verification and slug aliases.
--
-- Only records verified against an independent source are published. A
-- record's status, the source that verified it and when (data_verified_at;
-- verified/verified_at already mean "an owner claim was verified") are stored on the
-- row, and field_sources maps individual fields to the source each came
-- from, e.g. {"established_year": "https://en.wikipedia.org/wiki/..."}.
--
-- slug_aliases keeps the old slug of a record that was merged into another
-- or renamed, so its old URL can 301 to the surviving record.
--
-- Idempotent: safe to re-run.

ALTER TABLE schools ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'unverified';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS verification_source_name TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS verification_source_url TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS data_verified_at TIMESTAMPTZ;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS field_sources JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_verification_status_check') THEN ALTER TABLE schools ADD CONSTRAINT schools_verification_status_check CHECK (verification_status IN ('verified', 'unverified', 'rejected')); END IF; END $$;

CREATE INDEX IF NOT EXISTS idx_schools_verification_status ON schools (verification_status);

CREATE TABLE IF NOT EXISTS slug_aliases (
    old_slug VARCHAR(255) PRIMARY KEY,
    school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slug_aliases_school_id ON slug_aliases (school_id);
