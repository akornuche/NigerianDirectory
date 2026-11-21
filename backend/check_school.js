const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5433,
  database: process.env.DB_NAME || 'nigerian_directory',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD, // required; no password in source
});

pool.query(
  `SELECT name, meta_title, meta_description,
   enriched_history, enriched_academics, enriched_campus_info, enriched_student_life
   FROM schools WHERE slug = 'abeokuta-grammar-school'`
).then(r => {
  const s = r.rows[0];
  if (!s) { console.log('NOT FOUND'); return; }
  console.log('Name:', s.name);
  console.log('\nmeta_title:', s.meta_title);
  console.log('meta_description:', s.meta_description);
  console.log('\nenriched_history (' + (s.enriched_history||'').length + ' chars):');
  console.log(s.enriched_history ? s.enriched_history.substring(0, 500) : 'NULL');
  console.log('\nenriched_academics (' + (s.enriched_academics||'').length + ' chars):');
  console.log(s.enriched_academics ? s.enriched_academics.substring(0, 300) : 'NULL');
  console.log('\nenriched_campus_info (' + (s.enriched_campus_info||'').length + ' chars):');
  console.log(s.enriched_campus_info ? s.enriched_campus_info.substring(0, 300) : 'NULL');
  console.log('\nenriched_student_life (' + (s.enriched_student_life||'').length + ' chars):');
  console.log(s.enriched_student_life ? s.enriched_student_life.substring(0, 300) : 'NULL');
}).catch(e => console.error('DB ERROR:', e.message))
.finally(() => pool.end());
