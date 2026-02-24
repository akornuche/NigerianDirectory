/**
 * Database Migration Runner
 * 
 * Reads SQL migration files from backend/database/migrations/
 * Tracks applied migrations in a schema_migrations table
 * Applies unapplied migrations in filename order
 * 
 * Usage: npm run migrate
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, query } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../../database/migrations');

async function ensureMigrationsTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMP DEFAULT NOW()
        )
    `);
}

async function getAppliedMigrations() {
    const result = await query('SELECT filename FROM schema_migrations ORDER BY filename');
    return result.rows.map(row => row.filename);
}

async function getPendingMigrations(applied) {
    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();

    return files.filter(f => !applied.includes(f));
}

async function applyMigration(filename) {
    const filepath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filepath, 'utf-8');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [filename]
        );
        await client.query('COMMIT');
        console.log(`  ✓ Applied: ${filename}`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ✗ Failed: ${filename}`);
        console.error(`    Error: ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
}

async function migrate() {
    console.log('🗄️  NigerianDirectory Migration Runner\n');

    try {
        // Test connection
        await query('SELECT NOW()');
        console.log('✓ Database connected\n');

        // Ensure migrations table exists
        await ensureMigrationsTable();

        // Get pending migrations
        const applied = await getAppliedMigrations();
        const pending = await getPendingMigrations(applied);

        if (pending.length === 0) {
            console.log('✓ Database is up to date. No pending migrations.\n');
            console.log(`  Total applied: ${applied.length}`);
            process.exit(0);
        }

        console.log(`Found ${pending.length} pending migration(s):\n`);

        // Apply each migration
        for (const filename of pending) {
            await applyMigration(filename);
        }

        console.log(`\n✓ All migrations applied successfully.`);
        console.log(`  Previously applied: ${applied.length}`);
        console.log(`  Newly applied: ${pending.length}`);
        console.log(`  Total: ${applied.length + pending.length}`);

    } catch (error) {
        console.error('\n✗ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
