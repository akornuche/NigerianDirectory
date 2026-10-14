/**
 * Verify the connection that src/config/database.js actually resolves.
 *
 * Unlike neon-check.js, which opens its own client, this exercises the real
 * application pool, so it validates TLS selection, timeouts and pool sizing
 * exactly as the API will experience them.
 *
 * Credentials are never printed; only the target host is shown.
 *
 * Usage:
 *   node scripts/db-selftest.js
 */

const db = require('../src/config/database');

function describeTarget() {
    if (process.env.DATABASE_URL) {
        try {
            const url = new URL(process.env.DATABASE_URL);
            return `DATABASE_URL -> ${url.hostname}`;
        } catch {
            return 'DATABASE_URL -> (unparseable)';
        }
    }
    return `DB_HOST -> ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`;
}

async function main() {
    console.log(`target   : ${describeTarget()}`);

    const started = Date.now();
    const identity = await db.query('SELECT current_database() AS db, current_user AS usr');
    console.log(`connected: ${Date.now() - started}ms`);
    console.log(`database : ${identity.rows[0].db}`);
    console.log(`user     : ${identity.rows[0].usr}`);

    const counts = await db.query(
        `SELECT COALESCE(institution_category, '(none)') AS category,
                COUNT(*)                                 AS total,
                COUNT(*) FILTER (WHERE enriched_at IS NOT NULL) AS enriched
         FROM schools
         GROUP BY 1
         ORDER BY 2 DESC`
    );

    for (const row of counts.rows) {
        console.log(`schools  : ${row.category} total=${row.total} enriched=${row.enriched}`);
    }

    await db.pool.end();
}

main().catch((error) => {
    console.error(`FAILED: ${error.message}`);
    process.exit(1);
});
