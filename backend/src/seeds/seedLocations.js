/**
 * Seed Nigerian Locations into Database
 */
require('dotenv').config({ path: '../../.env' });
const { pool } = require('../config/database');
const Location = require('../models/Location');
const nigerianLocations = require('./locationData');

async function seedLocations() {
    console.log('🌍 Starting location seeding...\n');

    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected\n');

        let successCount = 0;
        let errorCount = 0;

        for (const location of nigerianLocations) {
            try {
                await Location.create({
                    country: 'Nigeria',
                    state: location.state,
                    city: location.city,
                    area: location.area,
                    slug: location.slug,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    is_major_city: location.is_major_city || false
                });
                successCount++;
                console.log(`  ✓ Added: ${location.state} - ${location.area}`);
            } catch (error) {
                if (error.code === '23505') {
                    console.log(`  • Exists: ${location.state} - ${location.area}`);
                } else {
                    console.log(`  ✗ Error: ${location.state} - ${location.area}: ${error.message}`);
                    errorCount++;
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✅ Seeding complete!`);
        console.log(`   - Locations added: ${successCount}`);
        console.log(`   - Errors: ${errorCount}`);
        console.log(`   - Total locations: ${nigerianLocations.length}`);

        // Get stats
        const stats = await Location.getStats();
        console.log('\n📊 Database Stats:');
        console.log(`   - Total States: ${stats.total_states}`);
        console.log(`   - Total Cities: ${stats.total_cities}`);
        console.log(`   - Total Areas: ${stats.total_areas}`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('\n👋 Database connection closed');
    }
}

// Run if called directly
if (require.main === module) {
    seedLocations();
}

module.exports = seedLocations;
