-- Check enrichment coverage statistics
SELECT 
    COUNT(*) as total_schools,
    COUNT(enriched_history) as has_history,
    COUNT(enriched_academics) as has_academics,
    COUNT(enriched_student_life) as has_student_life,
    COUNT(enriched_campus_info) as has_campus_info,
    ROUND(COUNT(enriched_history)::numeric / COUNT(*)::numeric * 100, 1) as history_pct,
    ROUND(COUNT(enriched_academics)::numeric / COUNT(*)::numeric * 100, 1) as academics_pct
FROM schools;

-- Sample of schools with enriched content
SELECT name, 
    CASE WHEN enriched_history IS NOT NULL THEN 'YES' ELSE 'NO' END as has_history,
    CASE WHEN enriched_academics IS NOT NULL THEN 'YES' ELSE 'NO' END as has_academics,
    LEFT(enriched_academics, 100) as academics_preview
FROM schools 
WHERE enriched_academics IS NOT NULL
LIMIT 5;

-- Sample of schools WITHOUT enriched content (using fallback)
SELECT name, state
FROM schools 
WHERE enriched_history IS NULL
LIMIT 5;
