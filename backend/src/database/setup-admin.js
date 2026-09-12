#!/usr/bin/env node

/**
 * Setup Admin User Script
 * 
 * This script creates the initial admin user for NigerianDirectory.
 * It should be run after database initialization.
 * 
 * Usage:
 *   node src/database/setup-admin.js
 * 
 * Environment variables required:
 *   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *   - ADMIN_EMAIL (optional, defaults to admin@nigeriandirectory.com)
 *   - ADMIN_PASSWORD (required, should be strong/random)
 * 
 * For production:
 *   ADMIN_EMAIL="admin@example.com" \
 *   ADMIN_PASSWORD="$(openssl rand -base64 32)" \
 *   node src/database/setup-admin.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const readline = require('readline');

// Validate environment variables
function validateEnv() {
    const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missing = required.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
}

// Get user input interactively
async function getAdminCredentials() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        const answers = {};

        const askEmail = () => {
            rl.question(
                `Admin Email [${process.env.ADMIN_EMAIL || 'admin@nigeriandirectory.com'}]: `,
                (answer) => {
                    answers.email = answer || process.env.ADMIN_EMAIL || 'admin@nigeriandirectory.com';
                    askPassword();
                }
            );
        };

        const askPassword = () => {
            // For automated scripts, password can come from env
            if (process.env.ADMIN_PASSWORD) {
                answers.password = process.env.ADMIN_PASSWORD;
                askConfirm();
            } else {
                // Interactively prompt if not in env
                console.warn('⚠️  ADMIN_PASSWORD not set in environment. Using interactive prompt.');
                rl.question(
                    'Admin Password (minimum 12 characters): ',
                    (answer) => {
                        if (!answer || answer.length < 12) {
                            console.error('❌ Password must be at least 12 characters');
                            askPassword();
                        } else {
                            answers.password = answer;
                            askConfirm();
                        }
                    }
                );
            }
        };

        const askConfirm = () => {
            rl.question(
                `\nCreate admin account?\n  Email: ${answers.email}\n  Confirm [y/N]: `,
                (answer) => {
                    rl.close();
                    if (answer.toLowerCase() === 'y') {
                        resolve(answers);
                    } else {
                        console.log('Cancelled.');
                        process.exit(0);
                    }
                }
            );
        };

        askEmail();
    });
}

// Check if admin already exists
async function adminExists(pool, email) {
    const result = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND role = $2',
        [email, 'admin']
    );
    return result.rows.length > 0;
}

// Hash password with bcrypt
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

// Create admin user
async function createAdmin(pool, email, passwordHash) {
    const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email, role`,
        ['Administrator', email, passwordHash, 'admin', true]
    );

    return result.rows[0];
}

// Main function
async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🇳🇬 NigerianDirectory Admin Setup                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);

    validateEnv();

    // Create connection pool
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        // Test connection
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connection successful\n');

        // Get admin credentials
        const credentials = await getAdminCredentials();

        // Check if admin exists
        const exists = await adminExists(pool, credentials.email);
        if (exists) {
            console.error(`\n❌ Admin user with email "${credentials.email}" already exists`);
            process.exit(1);
        }

        // Hash password
        console.log('\n⏳ Creating admin account...');
        const passwordHash = await hashPassword(credentials.password);

        // Create admin
        const admin = await createAdmin(pool, credentials.email, passwordHash);

        if (!admin) {
            console.error('❌ Failed to create admin user');
            process.exit(1);
        }

        console.log(`\n✅ Admin account created successfully!`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   ID: ${admin.id}`);
        console.log(`\n✓ Admin can now log in with their email and password`);
        console.log(`⚠️  IMPORTANT: Change the admin password after first login`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
