/**
 * Report NULL values in columns that page templates dereference.
 *
 * A NULL area caused a 500 on state pages because the template called
 * toLowerCase() on it directly. This script makes such gaps visible.
 *
 * Usage: node scripts/data-nulls.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadDatabaseUrl() {
    const envPath = path.join(__dirname, '..', '.env.neon');
    const line = fs
        .readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .find((l) => l.startsWith('DATABASE_URL='));

    if (!line) {
        throw new Error('DATABASE_URL not found in .env.neon');
    }

    return line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
}

const COLUMNS = ['area', 'city', 'state', 'slug', 'name', 'type'];

async function main() {
    const client = new Client({
        connectionString: loadDatabaseUrl(),
        ssl: { rejectUnauthorized: true },
        connectionTimeoutMillis: 30000,
    });

    await client.connect();

    for (const column of COLUMNS) {
        const result = await client.query(
            `SELECT COUNT(*)::int AS total FROM schools WHERE ${column} IS NULL`
        );
        console.log(`null ${column.padEnd(6)} : ${result.rows[0].total}`);
    }

    const byState = await client.query(
        `SELECT state, COUNT(*)::int AS total
         FROM schools
         WHERE area IS NULL
         GROUP BY state
         ORDER BY total DESC`
    );

    console.log('\nnull area grouped by state:');
    if (byState.rowCount === 0) {
        console.log('  (none)');
    } else {
        for (const row of byState.rows) {
            console.log(`  ${row.state} = ${row.total}`);
        }
    }

    await client.end();
}

main().catch((error) => {
    console.error(`FAILED: ${error.message}`);
    process.exit(1);
});
