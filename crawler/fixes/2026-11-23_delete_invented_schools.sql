-- Delete 18 invented school records (approved by the site owner, 2026-11-23).
--
-- Each is named "Federal Government (Girls) College <State>", a pattern that
-- matches no Unity College on the official or Wikipedia lists; the real
-- federal colleges in these states have different, town-based names. None
-- was ever verified or published, and no other table references them.
-- A copy survives on the Neon backup branch pre-remediation-2026-11-21.
BEGIN;
DELETE FROM schools
 WHERE id IN (83, 84, 87, 88, 89, 90, 93, 94, 96, 99, 101, 109, 117, 155, 159, 162, 1061, 1150)
   AND institution_category = 'school'
   AND verification_status <> 'verified'
   AND name ~ '^Federal Government (Girls )?College [A-Z][a-z]+$';
COMMIT;
