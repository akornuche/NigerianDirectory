-- Database clean-up, 2026-11-24 (approved by the site owner).
--
-- After this, the schools table holds only verified, published records.
-- Deleted:
--   * every unverified record (309 secondary schools from the September
--     crawl that no source confirmed, and one test hospital record);
--   * every rejected record (14 duplicates and one university campus).
-- No other table referenced these rows (checked: claims, contact
-- submissions, page views, crawl logs, enrichment queue, revisions).
-- Old URLs of merged duplicates keep redirecting: their slug_aliases rows
-- point at the surviving record, not at the deleted one.
-- The names of 96 schools that may be real are kept for later checking in
-- crawler/fixes/2026-11-24_school_leads_to_verify.csv. A full copy of the
-- data before remediation is on the Neon branch pre-remediation-2026-11-21.
BEGIN;
DELETE FROM schools WHERE verification_status IN ('unverified', 'rejected');
COMMIT;
