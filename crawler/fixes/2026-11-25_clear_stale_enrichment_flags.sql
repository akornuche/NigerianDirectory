-- Clear the legacy needs_ai_enrichment flag on records that already have a
-- hand-written, sourced profile (history and academics sections present).
-- The flag belonged to the retired AI writing pipeline; leaving it set made
-- the admin dashboard under-count content (109/480) and would have queued
-- these profiles for automatic rewriting. Run only with the owner's approval.
BEGIN;
UPDATE schools
SET needs_ai_enrichment = false,
    enrichment_status = 'completed',
    updated_at = NOW()
WHERE needs_ai_enrichment = true
  AND COALESCE(enriched_history, '') <> ''
  AND COALESCE(enriched_academics, '') <> '';
COMMIT;
