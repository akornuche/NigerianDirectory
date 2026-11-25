-- Migration 010: the daily news digest.
--
-- One row in news_days per calendar day (Lagos time) and up to 50 ranked
-- stories in news_items. Each story is summarised in our own words and links
-- to every outlet that reported it. A day is a draft until an editor publishes
-- it from the admin review screen; only published days are public.
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS news_days (
    day           DATE PRIMARY KEY,
    lead          TEXT,                                  -- the day in brief, our words
    status        VARCHAR(16) NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published')),
    reviewed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS news_items (
    id          BIGSERIAL PRIMARY KEY,
    day         DATE NOT NULL REFERENCES news_days(day) ON DELETE CASCADE,
    rank        SMALLINT NOT NULL CHECK (rank BETWEEN 1 AND 50),
    headline    TEXT NOT NULL,
    summary     TEXT NOT NULL,
    category    VARCHAR(32) NOT NULL,                    -- politics | economy | security | ...
    states      TEXT[] NOT NULL DEFAULT '{}',            -- Nigerian states the story concerns
    sources     JSONB NOT NULL DEFAULT '[]',             -- [{ name, url }], first is the lead source
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (day, rank)
);

CREATE INDEX IF NOT EXISTS idx_news_days_status ON news_days (status, day DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_day ON news_items (day, rank);
