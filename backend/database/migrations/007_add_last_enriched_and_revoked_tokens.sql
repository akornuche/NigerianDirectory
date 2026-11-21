-- Migration 007: columns and tables the code uses that no migration created.
-- Idempotent, so it is safe on databases that already have them (for
-- example ones where scripts/sql/add_enriched_columns.sql was run by hand).

-- Written by crawler/simple_enrich.py and scripts/data/enrich_from_sources.py.
-- Previously only created by the ad-hoc scripts/sql/add_enriched_columns.sql.
ALTER TABLE schools ADD COLUMN IF NOT EXISTS last_enriched TIMESTAMP;

-- Token revocation list used at logout (backend/src/services/tokenService.js).
-- The service also creates it on first use, so an unmigrated database still
-- revokes correctly; this migration makes the table part of the schema.
CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens (expires_at);
