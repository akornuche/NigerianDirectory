const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Neon database connection details
const client = new Client({
  host: 'ep-sweet-fire-are7bve1.c-4.us-west-2.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: process.env.DB_PASSWORD || 'npg_8TgZsh1GDMeB',
  port: 5432,
  ssl: true
});

async function setupAndQuery() {
  try {
    await client.connect();
    console.log('✓ Connected to Neon database');
    console.log('-------------------------------------------\n');

    // Check if tables exist
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      LIMIT 1;
    `);

    if (tablesCheck.rows.length === 0) {
      console.log('⚠ Database is empty. Initializing schema...\n');

      // Read and execute init.sql
      const initSqlPath = path.join(__dirname, 'database', 'init.sql');
      const initSql = fs.readFileSync(initSqlPath, 'utf-8');
      
      console.log('Executing database initialization...');
      await client.query(initSql);
      console.log('✓ Database schema initialized\n');
    } else {
      console.log('✓ Database schema already exists\n');
    }

    // Check available tables
    console.log('Available tables in the database:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.table(tables.rows);
    console.log('\n');

    // Run the 5 queries
    console.log('-------------------------------------------');
    console.log('RUNNING SCHOOL DATA QUERIES');
    console.log('-------------------------------------------\n');

    // Query 1: Count total schools
    console.log('1. TOTAL SCHOOLS COUNT:');
    try {
      const totalCount = await client.query('SELECT COUNT(*)::bigint as count FROM schools;');
      console.log(totalCount.rows[0]);
      console.log('');
    } catch (e) {
      console.log('❌ Cannot query schools: ' + e.message);
    }

    // Query 2: Count by category
    console.log('2. COUNT BY CATEGORY:');
    try {
      const byCategory = await client.query('SELECT institution_category as category, COUNT(*) as count FROM schools GROUP BY institution_category ORDER BY count DESC;');
      if (byCategory.rows.length > 0) {
        console.table(byCategory.rows);
      } else {
        console.log('(No data)');
      }
    } catch (e) {
      console.log('❌ Cannot query category: ' + e.message);
    }
    console.log('');

    // Query 3: Count by type
    console.log('3. COUNT BY TYPE:');
    try {
      const byType = await client.query('SELECT type, COUNT(*) as count FROM schools WHERE type IS NOT NULL GROUP BY type ORDER BY count DESC;');
      if (byType.rows.length > 0) {
        console.table(byType.rows);
      } else {
        console.log('(No data)');
      }
    } catch (e) {
      console.log('❌ Cannot query type: ' + e.message);
    }
    console.log('');

    // Query 4: Show sample of different school types
    console.log('4. SAMPLE OF DIFFERENT SCHOOL TYPES:');
    try {
      const distinctTypes = await client.query('SELECT DISTINCT type FROM schools WHERE type IS NOT NULL ORDER BY type LIMIT 20;');
      if (distinctTypes.rows.length > 0) {
        console.table(distinctTypes.rows);
      } else {
        console.log('(No data)');
      }
    } catch (e) {
      console.log('❌ Cannot query school types: ' + e.message);
    }
    console.log('');

    // Query 5: Count schools by state (top 10)
    console.log('5. TOP 10 STATES BY SCHOOL COUNT:');
    try {
      const byState = await client.query('SELECT state, COUNT(*) as count FROM schools WHERE state IS NOT NULL GROUP BY state ORDER BY count DESC LIMIT 10;');
      if (byState.rows.length > 0) {
        console.table(byState.rows);
      } else {
        console.log('(No data)');
      }
    } catch (e) {
      console.log('❌ Cannot query states: ' + e.message);
    }
    console.log('');

    console.log('-------------------------------------------');
    console.log('✓ Query execution completed');

  } catch (error) {
    console.error('Fatal Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupAndQuery();
