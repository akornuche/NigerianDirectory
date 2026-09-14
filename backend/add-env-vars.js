#!/usr/bin/env node

/**
 * Add environment variables to Vercel production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const credsPath = path.join(__dirname, 'neon-credentials.json');

if (!fs.existsSync(credsPath)) {
  console.error('❌ neon-credentials.json not found');
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║   Adding Environment Variables to Vercel          ║');
console.log('╚════════════════════════════════════════════════════╝\n');

const vars = [
  ['DB_HOST', creds.DB_HOST],
  ['DB_PORT', creds.DB_PORT],
  ['DB_NAME', creds.DB_NAME],
  ['DB_USER', creds.DB_USER],
  ['DB_PASSWORD', creds.DB_PASSWORD],
  ['JWT_SECRET', creds.JWT_SECRET],
  ['FRONTEND_URL', creds.FRONTEND_URL],
  ['PORT', creds.PORT],
  ['NODE_ENV', 'production']
];

for (const [key, value] of vars) {
  try {
    console.log(`Adding ${key}...`);
    execSync(`vercel env add ${key} production`, { 
      input: value + '\ny\n',
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8'
    });
    console.log(`✓ ${key} added\n`);
  } catch (error) {
    console.error(`⚠ Error adding ${key}`);
  }
}

console.log('✓ Environment variables configured');
console.log('\nNext: Run "vercel --prod" to deploy');
