/**
 * Seed institutions of any niche into the shared schools table.
 *
 * Generalises seedUniversities.js, which hardcoded institution_category =
 * 'university' into its SQL. That is the same copy-paste pattern being
 * removed from the crawler (see crawler/niche_config.py and
 * crawler/niche_crawler.py): one script per niche would duplicate this
 * logic for every future vertical instead of taking the niche as data.
 *
 * seedUniversities.js is left in place as a thin wrapper calling this with
 * institution_category = 'university', so existing invocations keep
 * working.
 *
 * Connection resolution:
 *   --neon   load DATABASE_URL from backend/.env.neon (managed database)
 *   default  use DATABASE_URL or the discrete DB_* environment variables
 *
 * Usage (direct):
 *   node src/seeds/seedInstitutions.js university --neon
 *   node src/seeds/seedInstitutions.js hospital --neon
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROSTERS = {
    university: () => require('./universityData'),
    hospital: () => require('./hospitalData'),
};

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
        name, slug, institution_category, type, state, city, area, address,
        website, established_year, principal_name, principal_title,
        levels, boarding, needs_ai_enrichment
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, TRUE)
    ON CONFLICT (slug) DO UPDATE SET
        institution_category = EXCLUDED.institution_category,
        type                 = EXCLUDED.type,
        state                = EXCLUDED.state,
        city                 = EXCLUDED.city,
        area                 = EXCLUDED.area,
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

async function seedNiche(institutionCategory) {
    const rosterLoader = ROSTERS[institutionCategory];
    if (!rosterLoader) {
        const available = Object.keys(ROSTERS).join(', ');
        throw new Error(`Unknown niche '${institutionCategory}'. Available: ${available}`);
    }

    const { [`${institutionCategory}s`]: roster, slugify } = (() => {
        const mod = rosterLoader();
        // universityData.js exports `universities`, hospitalData.js exports
        // `hospitals`; normalise both to a single `items` key.
        const key = Object.keys(mod).find((k) => Array.isArray(mod[k]));
        return { [`${institutionCategory}s`]: mod[key], slugify: mod.slugify };
    })();

    const client = new Client({
        ...resolveConnection(),
        connectionTimeoutMillis: 30000,
    });

    await client.connect();

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const item of roster) {
        const slug = slugify(item.name);

        try {
            const result = await client.query(UPSERT, [
                item.name,
                slug,
                institutionCategory,
                item.type,
                item.state,
                item.city,
                item.area ?? null,
                item.address ?? null,
                item.website ?? null,
                item.established_year ?? null,
                item.principal_name ?? null,
                item.principal_title ?? null,
                item.levels ?? null,
                item.boarding ?? null,
            ]);

            if (result.rows[0].inserted) {
                inserted += 1;
                console.log(`INSERT ${item.name}`);
            } else {
                updated += 1;
                console.log(`UPDATE ${item.name}`);
            }
        } catch (error) {
            failed += 1;
            console.error(`FAIL   ${item.name} :: ${error.message}`);
        }
    }

    const summary = await client.query(
        `SELECT COUNT(*) AS total FROM schools WHERE institution_category = $1`,
        [institutionCategory]
    );

    console.log(
        `\nniche=${institutionCategory} inserted=${inserted} updated=${updated} ` +
        `failed=${failed} total_in_db=${summary.rows[0].total}`
    );

    await client.end();

    if (failed > 0) {
        process.exit(1);
    }
}

async function main() {
    const niche = process.argv[2];
    if (!niche || niche.startsWith('--')) {
        console.error('Usage: node src/seeds/seedInstitutions.js <niche> [--neon]');
        console.error(`Available niches: ${Object.keys(ROSTERS).join(', ')}`);
        process.exit(1);
    }

    await seedNiche(niche);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`FAILED: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { seedNiche };
