#!/usr/bin/env node
/**
 * Verify that the root package.json declares the same runtime dependencies
 * as backend/package.json.
 *
 * The Vercel API deployment builds api/index.js from the repository root.
 * Vercel installs packages from the package.json nearest the entrypoint,
 * which is the root one, so a dependency added only to backend/package.json
 * would deploy without being installed and the function would crash with
 * "Cannot find module". CI runs this script to catch that drift.
 */

const path = require('path');

const root = require(path.join(__dirname, '..', 'package.json'));
const backend = require(path.join(__dirname, '..', 'backend', 'package.json'));

const rootDeps = root.dependencies || {};
const backendDeps = backend.dependencies || {};

const problems = [];

for (const [name, range] of Object.entries(backendDeps)) {
    if (!(name in rootDeps)) {
        problems.push(`missing from root: ${name}@${range}`);
    } else if (rootDeps[name] !== range) {
        problems.push(`version mismatch: ${name} root=${rootDeps[name]} backend=${range}`);
    }
}

for (const name of Object.keys(rootDeps)) {
    if (!(name in backendDeps)) {
        problems.push(`only in root (remove it or add it to backend): ${name}`);
    }
}

if (problems.length > 0) {
    console.error('Root package.json is out of sync with backend/package.json:');
    for (const p of problems) console.error(`  - ${p}`);
    console.error('\nCopy backend dependencies into the root package.json, then run `npm install --package-lock-only` at the root.');
    process.exit(1);
}

console.log(`Root dependencies match backend (${Object.keys(backendDeps).length} packages).`);
