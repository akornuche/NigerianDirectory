# Simple script to query the database
$result = docker exec nigerian_directory_db psql -U postgres -d nigerian_directory -t -A -F ',' -c "SELECT name,content_sources IS NOT NULL as has_sources,enriched_history IS NOT NULL as has_history FROM schools WHERE slug IN ('federal-government-girls-college-abuja','kings-college-lagos')" 2>&1
Write-Host "Database Query Result:"
Write-Host $result
