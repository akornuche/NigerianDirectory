-- Check current status of the two schools
SELECT 
    name,
    slug,
    content_sources IS NOT NULL as has_content_sources,
    enriched_history IS NOT NULL as has_enriched_history,
    enriched_academics IS NOT NULL as has_enriched_academics,
    enriched_student_life IS NOT NULL as has_enriched_student_life
FROM schools 
WHERE slug IN ('federal-government-girls-college-abuja', 'kings-college-lagos');

-- Add content_sources for Federal Government Girls College Abuja (if missing)
UPDATE schools 
SET content_sources = '[
    {"url": "https://en.wikipedia.org/wiki/Federal_Government_Girls%27_College,_Bwari", "title": "Federal Government Girls College - Wikipedia", "type": "reference"},
    {"url": "https://fggcbwari.edu.ng", "title": "Official Website", "type": "official"}
]'::jsonb
WHERE slug = 'federal-government-girls-college-abuja' 
AND content_sources IS NULL;

-- Add content_sources for Kings College Lagos (if missing or update)
UPDATE schools 
SET content_sources = '[
    {"url": "https://en.wikipedia.org/wiki/King%27s_College,_Lagos", "title": "Kings College Lagos - Wikipedia", "type": "reference"},
    {"url": "https://kingscollege.ng", "title": "Official Website", "type": "official"},
    {"url": "https://www.kingscollegeoldboysassociation.org", "title": "Old Boys Association", "type": "alumni"}
]'::jsonb
WHERE slug = 'kings-college-lagos';

-- Verify the update
SELECT 
    name,
    slug,
    content_sources
FROM schools 
WHERE slug IN ('federal-government-girls-college-abuja', 'kings-college-lagos');
