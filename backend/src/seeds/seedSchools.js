/**
 * Seed Schools from ministry_schools.json
 * 
 * Reads the crawler's trusted school seeds and inserts them into the database.
 * Uses upsert (ON CONFLICT) so it can be re-run safely.
 * 
 * Usage: npm run seed:schools
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const { pool, query } = require('../config/database');

const SEED_FILE = path.join(__dirname, '../../../crawler/seeds/ministry_schools.json');

function generateSlug(name, state, area) {
    const base = slugify(name, { lower: true, strict: true });
    return base;
}

async function seedSchools() {
    console.log('🏫 NigerianDirectory School Seeder\n');

    try {
        // Test connection
        await query('SELECT NOW()');
        console.log('✓ Database connected\n');

        // Read seed file
        if (!fs.existsSync(SEED_FILE)) {
            console.error(`✗ Seed file not found: ${SEED_FILE}`);
            console.error('  Make sure crawler/seeds/ministry_schools.json exists.');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
        const schools = data.schools;

        console.log(`Found ${schools.length} schools in seed file`);
        console.log(`Source: ${data.metadata.description}`);
        console.log(`Last updated: ${data.metadata.last_updated}\n`);

        let inserted = 0;
        let updated = 0;
        let failed = 0;

        for (const school of schools) {
            try {
                const slug = generateSlug(school.name, school.state, school.area);

                const result = await query(
                    `INSERT INTO schools (
                        name, slug, type, state, city, area,
                        curriculum, levels, boarding, day_school, gender,
                        website, established_year, needs_ai_enrichment,
                        meta_title, meta_description
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6,
                        $7, $8, $9, $10, $11,
                        $12, $13, $14,
                        $15, $16
                    )
                    ON CONFLICT (slug) DO UPDATE SET
                        name = EXCLUDED.name,
                        type = EXCLUDED.type,
                        state = EXCLUDED.state,
                        city = EXCLUDED.city,
                        area = EXCLUDED.area,
                        curriculum = EXCLUDED.curriculum,
                        levels = EXCLUDED.levels,
                        boarding = EXCLUDED.boarding,
                        day_school = EXCLUDED.day_school,
                        gender = EXCLUDED.gender,
                        website = COALESCE(EXCLUDED.website, schools.website),
                        established_year = COALESCE(EXCLUDED.established_year, schools.established_year),
                        updated_at = NOW()
                    RETURNING id, (xmax = 0) AS is_insert`,
                    [
                        school.name,
                        slug,
                        school.type || 'private',
                        school.state,
                        school.city,
                        school.area,
                        school.curriculum,
                        school.levels,
                        school.boarding ?? false,
                        school.day_school ?? true,
                        school.gender || 'co-ed',
                        school.website || null,
                        school.established_year || null,
                        true, // needs_ai_enrichment
                        `${school.name} - ${school.area}, ${school.state} | NigerianDirectory`,
                        `Discover ${school.name} in ${school.area}, ${school.state}. ${school.curriculum || ''} curriculum school offering ${school.levels || ''} education.`.trim()
                    ]
                );

                if (result.rows[0]?.is_insert) {
                    inserted++;
                } else {
                    updated++;
                }
            } catch (error) {
                failed++;
                console.error(`  ✗ Failed: ${school.name} — ${error.message}`);
            }
        }

        console.log(`\n✓ Seeding complete:`);
        console.log(`  Inserted: ${inserted}`);
        console.log(`  Updated: ${updated}`);
        console.log(`  Failed: ${failed}`);
        console.log(`  Total: ${schools.length}`);

    } catch (error) {
        console.error('\n✗ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seedSchools();
