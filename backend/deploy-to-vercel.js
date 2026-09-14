#!/usr/bin/env node

/**
 * Vercel + Neon Deployment Script
 * 
 * Usage:
 *   1. Edit VERCEL_ENV_TEMPLATE.txt with your Neon credentials
 *   2. Run: node deploy-to-vercel.js
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function executeCommand(command) {
  return new Promise((resolve, reject) => {
    try {
      const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
      resolve(output);
    } catch (error) {
      reject(error);
    }
  });
}

async function deployToVercel(envVars) {
  return new Promise((resolve, reject) => {
    const child = spawn('vercel', ['--prod'], {
      stdio: 'inherit',
      env: { ...process.env, ...envVars }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Deployment failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    header('NigerianDirectory - Vercel + Neon Deployment');

    // Check vercel CLI
    log('Checking Vercel CLI...', 'yellow');
    try {
      const version = execSync('vercel --version', { encoding: 'utf-8' });
      log(`✓ ${version.trim()}`, 'green');
    } catch (error) {
      log('❌ Vercel CLI not found. Install: npm install -g vercel', 'red');
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

    // Get environment variables
    log('\n📚 ENVIRONMENT VARIABLE CONFIGURATION', 'yellow');
    log('=====================================\n', 'yellow');

    const envVars = {};
    
    const inputs = [
      { key: 'DB_HOST', prompt: 'Neon DB Host (ep-xxxxx.us-east-1.neon.tech): ' },
      { key: 'DB_PORT', prompt: 'Neon DB Port (default 5432): ', default: '5432' },
      { key: 'DB_NAME', prompt: 'Neon DB Name: ' },
      { key: 'DB_USER', prompt: 'Neon DB User: ' },
      { key: 'DB_PASSWORD', prompt: 'Neon DB Password: ', sensitive: true },
      { key: 'JWT_SECRET', prompt: 'JWT Secret (32+ chars, or press Enter to generate): ' },
      { key: 'FRONTEND_URL', prompt: 'Frontend URL (https://nigeriandirectory.com): ', default: 'https://nigeriandirectory.com' },
      { key: 'PORT', prompt: 'API Port (default 3000): ', default: '3000' }
    ];

    for (const input of inputs) {
      let value;
      
      if (input.sensitive) {
        // For sensitive input, we'd need to handle password masking differently
        value = await prompt(`${colors.yellow}${input.prompt}${colors.reset}`);
      } else {
        value = await prompt(`${colors.yellow}${input.prompt}${colors.reset}`);
      }

      if (!value && input.default) {
        value = input.default;
      }

      if (!value && input.key === 'JWT_SECRET') {
        // Generate JWT secret if not provided
        value = require('crypto').randomBytes(32).toString('base64');
        log(`✓ Generated JWT_SECRET`, 'green');
      }

      if (!value) {
        log(`❌ ${input.key} is required`, 'red');
        process.exit(1);
      }

      envVars[input.key] = value;
    }

    envVars.NODE_ENV = 'production';

    // Summary
    log('\n📋 CONFIGURATION SUMMARY', 'cyan');
    log('=========================\n', 'cyan');
    
    for (const [key, value] of Object.entries(envVars)) {
      if (key === 'DB_PASSWORD' || key === 'JWT_SECRET') {
        log(`${key.padEnd(20)} [HIDDEN]`, 'gray');
      } else {
        log(`${key.padEnd(20)} ${value}`, 'gray');
      }
    }

    // Confirm
    log('', 'reset');
    const confirm = await prompt(`${colors.yellow}Proceed with deployment? (y/n): ${colors.reset}`);
    
    if (confirm !== 'y' && confirm !== 'Y') {
      log('\n❌ Deployment cancelled', 'red');
      process.exit(0);
    }

    // Deploy
    log('\n🚀 DEPLOYING TO VERCEL', 'yellow');
    log('======================\n', 'yellow');

    await deployToVercel(envVars);

    // Success
    header('✅ DEPLOYMENT SUCCESSFUL');
    
    log('Next Steps:', 'cyan');
    log('1. Run database migrations:', 'gray');
    log('   npm run migrate:prod', 'gray');
    log('', 'reset');
    log('2. Verify deployment:', 'gray');
    log('   vercel logs --prod', 'gray');
    log('', 'reset');
    log('3. Check API health:', 'gray');
    log('   curl https://your-deployment.vercel.app/health/live', 'gray');
    log('\n', 'reset');

    rl.close();
    process.exit(0);

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    rl.close();
    process.exit(1);
  }
}

main();
