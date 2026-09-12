const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'nigerian_directory',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'devpassword123',
});

async function check() {
    try {
        console.log("--- Institution Categories ---");
        const catRes = await pool.query("SELECT DISTINCT institution_category FROM schools");
        catRes.rows.forEach(r => console.log(`'${r.institution_category}'`));

        console.log("\n--- Types ---");
        const typeRes = await pool.query("SELECT DISTINCT type FROM schools");
        typeRes.rows.forEach(r => console.log(`'${r.type}'`));

        console.log("\n--- University Types ---");
        const uniTypeRes = await pool.query("SELECT DISTINCT type FROM schools WHERE institution_category = 'university'");
        uniTypeRes.rows.forEach(r => console.log(`'${r.type}'`));

        console.log("\n--- School Levels ---");
        const levelRes = await pool.query("SELECT DISTINCT levels FROM schools WHERE institution_category = 'school' LIMIT 10");
        levelRes.rows.forEach(r => console.log(`'${r.levels}'`));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
