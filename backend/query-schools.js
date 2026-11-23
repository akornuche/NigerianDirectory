const { Client } = require('pg');

// Neon database connection details
const client = new Client({
  host: process.env.DB_HOST,
  database: 'neondb',
  user: 'neondb_owner',
  password: process.env.DB_PASSWORD, // required: set DB_PASSWORD; never commit it
  port: 5432,
  ssl: true
});

async function runQueries() {
  try {
    await client.connect();
    console.log('✓ Connected to Neon database');
    console.log('-------------------------------------------\n');

    // First, check available tables
    console.log('Available tables in the database:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.table(tables.rows);
    console.log('\n');

    // Query 1: Count total schools
    console.log('1. TOTAL SCHOOLS COUNT:');
    try {
      const totalCount = await client.query('SELECT COUNT(*) FROM schools;');
      console.log(totalCount.rows[0]);
    } catch (e) {
      console.log('Schools table not found. Attempting to query school_data or similar...');
    }
    console.log('');

    // Query 2: Count by category
    console.log('2. COUNT BY CATEGORY:');
    try {
      const byCategory = await client.query('SELECT category, COUNT(*) as count FROM schools GROUP BY category;');
      console.table(byCategory.rows);
    } catch (e) {
      console.log('Cannot query category: ' + e.message);
    }
    console.log('');

    // Query 3: Count by type
    console.log('3. COUNT BY TYPE:');
    try {
      const byType = await client.query('SELECT type, COUNT(*) as count FROM schools GROUP BY type;');
      console.table(byType.rows);
    } catch (e) {
      console.log('Cannot query type: ' + e.message);
    }
    console.log('');

    // Query 4: Show sample of different school types
    console.log('4. SAMPLE OF DIFFERENT SCHOOL TYPES:');
    try {
      const distinctTypes = await client.query('SELECT DISTINCT type FROM schools LIMIT 20;');
      console.table(distinctTypes.rows);
    } catch (e) {
      console.log('Cannot query school types: ' + e.message);
    }
    console.log('');

    // Query 5: Count schools by state (top 10)
    console.log('5. TOP 10 STATES BY SCHOOL COUNT:');
    try {
      const byState = await client.query('SELECT state, COUNT(*) as count FROM schools GROUP BY state ORDER BY count DESC LIMIT 10;');
      console.table(byState.rows);
    } catch (e) {
      console.log('Cannot query states: ' + e.message);
    }
    console.log('');

    console.log('-------------------------------------------');
    console.log('✓ Query execution completed');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runQueries();
