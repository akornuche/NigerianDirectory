/**
 * Seed universities into the schools table.
 *
 * Universities share the schools table and are distinguished by
 * institution_category = 'university'.
 *
 * Connection resolution:
 *   --neon   load DATABASE_URL from backend/.env.neon (managed database)
 *   default  use DATABASE_URL or the discrete DB_* environment variables
 *
 * Usage:
 *   node src/seeds/seedUniversities.js
 *   node src/seeds/seedUniversities.js --neon
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { universities, slugify } = require('./universityData');

function resolveConnection() {
    if (process.argv.includes('--neon')) {
        const envPath = path.join(__dirname, '..', '..', '.env.neon');

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

        const connectionString = line
            .slice('DATABASE_URL='.length)
            .trim()
            .replace(/^["']|["']$/g, '');

        return { connectionString, ssl: { rejectUnauthorized: true } };
    }

    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: true },
        };
    }

    const host = process.env.DB_HOST || 'localhost';
    const isLocal = host === 'localhost' || host === '127.0.0.1';

    return {
        host,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'nigerian_directory',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: isLocal ? false : { rejectUnauthorized: true },
    };
}

const UPSERT = `
    INSERT INTO schools (
        name, slug, institution_category, type, state, city, address,
        website, established_year, principal_name, principal_title,
        levels, boarding, needs_ai_enrichment
    ) VALUES ($1, $2, 'university', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE)
    ON CONFLICT (slug) DO UPDATE SET
        institution_category = 'university',
        type                 = EXCLUDED.type,
        state                = EXCLUDED.state,
        city                 = EXCLUDED.city,
        address              = EXCLUDED.address,
        website              = EXCLUDED.website,
        established_year     = EXCLUDED.established_year,
        principal_name       = EXCLUDED.principal_name,
        principal_title      = EXCLUDED.principal_title,
        levels               = EXCLUDED.levels,
        boarding             = EXCLUDED.boarding,
        updated_at           = NOW()
    RETURNING (xmax = 0) AS inserted
`;

async function main() {
    const client = new Client({
        ...resolveConnection(),
        connectionTimeoutMillis: 30000,
    });

    await client.connect();

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const uni of universities) {
        const slug = slugify(uni.name);

        try {
            const result = await client.query(UPSERT, [
                uni.name,
                slug,
                uni.type,
                uni.state,
                uni.city,
                uni.address ?? null,
                uni.website ?? null,
                uni.established_year ?? null,
                uni.principal_name ?? null,
                uni.principal_title ?? null,
                uni.levels ?? null,
                uni.boarding ?? null,
            ]);

            if (result.rows[0].inserted) {
                inserted += 1;
                console.log(`INSERT ${uni.name}`);
            } else {
                updated += 1;
                console.log(`UPDATE ${uni.name}`);
            }
        } catch (error) {
            failed += 1;
            console.error(`FAIL   ${uni.name} :: ${error.message}`);
        }
    }

    const summary = await client.query(
        `SELECT COUNT(*) AS total
         FROM schools
         WHERE institution_category = 'university'`
    );

    console.log(
        `\ninserted=${inserted} updated=${updated} failed=${failed} ` +
        `universities_in_db=${summary.rows[0].total}`
    );

    await client.end();

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(`FAILED: ${error.message}`);
    process.exit(1);
});
