/**
 * Apply schema migrations to the managed (Neon) database.
 *
 * Reads DATABASE_URL from backend/.env.neon. Each migration runs inside its
 * own transaction, so a failure leaves the database unchanged for that file.
 *
 * The migrations in this project are written to be idempotent (IF NOT EXISTS
 * / ADD COLUMN IF NOT EXISTS), so re-running them is safe.
 *
 * Usage:
 *   node scripts/neon-migrate.js --check    report state only, change nothing
 *   node scripts/neon-migrate.js            apply pending migrations
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS = [
    '001_add_enriched_content.sql',
    '002_consolidate_enriched_content.sql',
    '20260113_add_content_sources.sql',
    '004_add_institution_category.sql',
    '005_add_contact_submissions.sql',
    '006_add_universities.sql',
];

function loadDatabaseUrl() {
    const envPath = path.join(__dirname, '..', '.env.neon');

    if (!fs.existsSync(envPath)) {
        throw new Error(`Missing ${envPath}`);
    }

    const line = fs
        .readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .find((l) => l.startsWith('DATABASE_URL='));

    if (!line) {
        throw new Error('DATABASE_URL not found in .env.neon');
    }

    return line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
}

function createClient(connectionString) {
    return new Client({
        connectionString,
        ssl: { rejectUnauthorized: true },
        connectionTimeoutMillis: 30000,
    });
}

async function reportState(client) {
    const tables = await client.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log(`tables : ${tables.rows.map((r) => r.table_name).join(', ')}`);

    const columns = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'schools'
           AND column_name IN (
             'institution_category','accreditation','faculties','programmes',
             'vc_name','vc_title','student_population','postgraduate',
             'distance_learning','year_chartered','enriched_history','content_sources'
           )
         ORDER BY column_name`
    );
    console.log(`columns: ${columns.rows.map((r) => r.column_name).join(', ') || '(none of interest)'}`);
}

async function main() {
    const checkOnly = process.argv.includes('--check');
    const client = createClient(loadDatabaseUrl());

    await client.connect();
    console.log('connected');

    await reportState(client);

    if (checkOnly) {
        await client.end();
        return;
    }

    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    let applied = 0;
    let failed = 0;

    for (const name of MIGRATIONS) {
        const file = path.join(migrationsDir, name);

        if (!fs.existsSync(file)) {
            console.log(`SKIP ${name} (file not found)`);
            continue;
        }

        const sql = fs.readFileSync(file, 'utf8');

        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('COMMIT');
            console.log(`OK   ${name}`);
            applied += 1;
        } catch (error) {
            await client.query('ROLLBACK');
            console.log(`FAIL ${name} :: ${error.message}`);
            failed += 1;
        }
    }

    console.log(`\napplied=${applied} failed=${failed}`);
    await reportState(client);
    await client.end();

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(`FAILED: ${error.message}`);
    process.exit(1);
});
