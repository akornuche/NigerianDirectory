#!/usr/bin/env node

/**
 * Deploy to Vercel with Neon credentials from JSON file
 * 
 * Usage:
 *   1. Copy neon-credentials.json.example to neon-credentials.json
 *   2. Edit neon-credentials.json with your actual credentials
 *   3. Run: node deploy-with-credentials.js
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  log(`\n╔════════════════════════════════════════════════════╗`, 'cyan');
  log(`║ ${message.padEnd(50)}║`, 'cyan');
  log(`╚════════════════════════════════════════════════════╝\n`, 'cyan');
}

async function main() {
  try {
    header('NigerianDirectory - Deploy to Vercel + Neon');

    // Check if credentials file exists
    const credsPath = path.join(__dirname, 'neon-credentials.json');
    
    if (!fs.existsSync(credsPath)) {
      log(`❌ Credentials file not found: ${credsPath}`, 'red');
      log('\nTo proceed:', 'yellow');
      log('1. Copy: neon-credentials.json.example → neon-credentials.json', 'yellow');
      log('2. Edit with your Neon database credentials', 'yellow');
      log('3. Run this script again', 'yellow');
      process.exit(1);
    }

    // Load credentials
    log('Loading credentials...', 'yellow');
    const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    log('✓ Credentials loaded', 'green');

    // Validate required fields
    const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'FRONTEND_URL'];
    for (const field of required) {
      if (!credentials[field] || credentials[field].includes('your_')) {
        log(`❌ Missing or invalid credential: ${field}`, 'red');
        process.exit(1);
      }
    }
    log('✓ All required credentials present', 'green');

    // Check Vercel CLI
    log('\nChecking Vercel CLI...', 'yellow');
    try {
      const version = execSync('vercel --version', { encoding: 'utf-8' });
      log(`✓ ${version.trim()}`, 'green');
    } catch (error) {
      log('❌ Vercel CLI not found', 'red');
      process.exit(1);
    }

    // Check if logged in
    log('Checking Vercel authentication...', 'yellow');
    try {
      const whoami = execSync('vercel whoami', { encoding: 'utf-8' });
      log(`✓ ${whoami.trim()}`, 'green');
    } catch (error) {
      log('❌ Not logged into Vercel. Run: vercel login', 'red');
      process.exit(1);
    }

    // Display configuration
    log('\n📋 CONFIGURATION SUMMARY', 'cyan');
    log('=========================\n', 'cyan');
    
    log(`DB_HOST:      ${credentials.DB_HOST}`, 'gray');
    log(`DB_PORT:      ${credentials.DB_PORT}`, 'gray');
    log(`DB_NAME:      ${credentials.DB_NAME}`, 'gray');
    log(`DB_USER:      ${credentials.DB_USER}`, 'gray');
    log(`DB_PASSWORD:  [HIDDEN]`, 'gray');
    log(`JWT_SECRET:   [HIDDEN]`, 'gray');
    log(`FRONTEND_URL: ${credentials.FRONTEND_URL}`, 'gray');
    log(`PORT:         ${credentials.PORT || '3000'}`, 'gray');
    log(`NODE_ENV:     production`, 'gray');

    // Set PORT if not specified
    credentials.PORT = credentials.PORT || '3000';
    credentials.NODE_ENV = 'production';

    // Deploy with environment variables
    log('\n🚀 DEPLOYING TO VERCEL', 'yellow');
    log('======================\n', 'yellow');

    // Create environment for deployment
    const deployEnv = { ...process.env, ...credentials };

    return new Promise((resolve, reject) => {
      const child = spawn('vercel', ['--prod'], {
        stdio: 'inherit',
        env: deployEnv,
        shell: true
      });

      child.on('close', (code) => {
        if (code === 0) {
          header('✅ DEPLOYMENT SUCCESSFUL');
          
          log('Deployment Complete! Your API is now live.', 'green');
          log('\nNext Steps:', 'cyan');
          log('1. Check logs: vercel logs --prod', 'gray');
          log('2. Test API: curl https://your-deployment.vercel.app/health/live', 'gray');
          log('3. View dashboard: https://vercel.com/dashboard', 'gray');
          
          resolve();
        } else {
          log(`\n❌ Deployment failed with exit code ${code}`, 'red');
          reject(new Error(`Deployment exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        log(`\n❌ Error: ${error.message}`, 'red');
        reject(error);
      });
    });

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main().catch((error) => {
  process.exit(1);
});
