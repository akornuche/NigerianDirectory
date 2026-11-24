-- Fix the slug generated for an accented name; the old URL redirects.
BEGIN;
INSERT INTO slug_aliases (old_slug, school_id, reason)
SELECT 'lyc-e-fran-ais-louis-pasteur-de-lagos', id, 'slug regenerated without broken accent handling'
  FROM schools WHERE slug = 'lyc-e-fran-ais-louis-pasteur-de-lagos'
ON CONFLICT (old_slug) DO NOTHING;
UPDATE schools SET slug = 'lycee-francais-louis-pasteur-de-lagos', updated_at = NOW() WHERE slug = 'lyc-e-fran-ais-louis-pasteur-de-lagos';
COMMIT;
