/**
 * Vercel Serverless Function - Main API Entry Point
 *
 * The root vercel.json routes every request here. Vercel installs packages
 * from the root package.json (the one nearest this file), which mirrors the
 * backend's dependencies; `npm run check:deps` verifies the two match.
 *
 * Use /health to confirm the function is responding. A route added here
 * would sit behind the app's 404 handler and never be reached.
 */

require('dotenv').config();

module.exports = require('../backend/src/app');
