/**
 * Connectivity probe for the managed (Neon) database.
 *
 * Reads DATABASE_URL from backend/.env.neon and reports server identity plus
 * current row counts. Credentials are never printed.
 *
 * Usage: node scripts/neon-check.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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

async function main() {
    const connectionString = loadDatabaseUrl();

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: true },
        connectionTimeoutMillis: 30000,
        statement_timeout: 30000,
    });

    const started = Date.now();
    await client.connect();
    console.log(`connected in ${Date.now() - started}ms`);

    const identity = await client.query(
        'SELECT current_database() AS db, current_user AS usr, version() AS ver'
    );
    const { db, usr, ver } = identity.rows[0];
    console.log(`database : ${db}`);
    console.log(`user     : ${usr}`);
    console.log(`version  : ${ver.split(',')[0]}`);

    const tables = await client.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
         ORDER BY table_name`
    );
    console.log(`tables   : ${tables.rowCount === 0 ? '(none)' : tables.rows.map((r) => r.table_name).join(', ')}`);

    if (tables.rows.some((r) => r.table_name === 'locations')) {
        const locations = await client.query('SELECT COUNT(*) AS total FROM locations');
        console.log(`locations: ${locations.rows[0].total} rows`);
    }

    const hasSchools = tables.rows.some((r) => r.table_name === 'schools');

    if (hasSchools) {
        const counts = await client.query(
            `SELECT COALESCE(institution_category, '(none)') AS category,
                    COUNT(*)                                 AS total,
                    COUNT(*) FILTER (WHERE enriched_at IS NOT NULL) AS enriched
             FROM schools
             GROUP BY 1
             ORDER BY 2 DESC`
        );
        if (counts.rowCount === 0) {
            console.log('schools  : table exists but is empty');
        } else {
            for (const r of counts.rows) {
                console.log(`schools  : ${r.category} total=${r.total} enriched=${r.enriched}`);
            }
        }
    }

    await client.end();
}

main().catch((error) => {
    console.error(`FAILED: ${error.message}`);
    process.exit(1);
});
