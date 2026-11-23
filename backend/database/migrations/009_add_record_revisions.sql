-- Migration 009: edit history for directory records.
--
-- Every change an administrator makes through the admin listing editor or
-- verification queue is stored here: who changed which fields, from what to
-- what, and why. Additive and idempotent.

CREATE TABLE IF NOT EXISTS record_revisions (
    id          BIGSERIAL PRIMARY KEY,
    school_id   INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(32) NOT NULL,          -- edit | verify | reject | unverify
    changes     JSONB NOT NULL DEFAULT '{}',   -- { field: { from, to } }
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_revisions_school ON record_revisions (school_id, created_at DESC);
