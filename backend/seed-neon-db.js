/**
 * Direct Neon Database Seeder
 * Seeds schools from ministry_schools.json directly to Neon database
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

// Neon database connection
const client = new Client({
  host: 'ep-sweet-fire-are7bve1.c-4.us-west-2.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: process.env.DB_PASSWORD || 'npg_8TgZsh1GDMeB',
  port: 5432,
  ssl: true
});

function generateSlug(name, state, area) {
    return slugify(name, { lower: true, strict: true });
}

async function seedSchools() {
    console.log('🏫 NigerianDirectory School Seeder (Neon)\n');

    try {
        await client.connect();
        console.log('✓ Connected to Neon database\n');

        // Read seed file
        const seedPath = path.join(__dirname, '../crawler/seeds/ministry_schools.json');
        if (!fs.existsSync(seedPath)) {
            console.error(`✗ Seed file not found: ${seedPath}`);
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
        const schools = data.schools;

        console.log(`Found ${schools.length} schools in seed file`);
        console.log(`Source: ${data.metadata.description}`);
        console.log(`Last updated: ${data.metadata.last_updated}\n`);

        let inserted = 0;
        let updated = 0;
        let failed = 0;

        // Process schools
        for (const school of schools) {
            try {
                const slug = generateSlug(school.name, school.state, school.area);

                const result = await client.query(
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
                        true,
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
                console.error(`  ✗ Error seeding ${school.name}: ${error.message}`);
            }
        }

        console.log('\n✓ Seeding complete!');
        console.log(`  • Inserted: ${inserted}`);
        console.log(`  • Updated: ${updated}`);
        console.log(`  • Failed: ${failed}`);

    } catch (error) {
        console.error('✗ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seedSchools();
