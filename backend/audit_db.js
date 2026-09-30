const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5433, database: 'nigerian_directory', user: 'postgres', password: 'devpassword123' });

pool.query(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN enriched_history IS NOT NULL AND enriched_history != '' THEN 1 END) as has_history,
    COUNT(CASE WHEN enriched_academics IS NOT NULL AND enriched_academics != '' THEN 1 END) as has_academics,
    COUNT(CASE WHEN enriched_campus_info IS NOT NULL AND enriched_campus_info != '' THEN 1 END) as has_campus,
    COUNT(CASE WHEN enriched_student_life IS NOT NULL AND enriched_student_life != '' THEN 1 END) as has_student_life,
    COUNT(CASE WHEN meta_title IS NOT NULL AND meta_title != '' THEN 1 END) as has_meta_title,
    COUNT(CASE WHEN meta_description IS NOT NULL AND meta_description != '' THEN 1 END) as has_meta_desc,
    COUNT(CASE WHEN logo_url IS NOT NULL THEN 1 END) as has_logo,
    COUNT(CASE WHEN hero_image_url IS NOT NULL THEN 1 END) as has_hero,
    COUNT(CASE WHEN website IS NOT NULL THEN 1 END) as has_website,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as has_phone,
    COUNT(CASE WHEN enriched_at IS NOT NULL THEN 1 END) as crawled_count,
    COUNT(CASE WHEN established_year IS NOT NULL THEN 1 END) as has_year,
    COUNT(CASE WHEN principal_name IS NOT NULL THEN 1 END) as has_principal,
    COUNT(CASE WHEN facilities IS NOT NULL AND facilities != '[]' THEN 1 END) as has_facilities,
    COUNT(CASE WHEN achievements IS NOT NULL AND achievements != '[]' THEN 1 END) as has_achievements
  FROM schools
`).then(r => {
  const s = r.rows[0];
  console.log('=== DATABASE COVERAGE ===');
  Object.entries(s).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}).catch(e => console.error('DB ERROR:', e.message)).finally(() => pool.end());
