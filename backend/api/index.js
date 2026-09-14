/**
 * Vercel Serverless Function - Main API Entry Point
 * This handles all requests in Vercel's serverless environment
 */

require('dotenv').config();

const app = require('../src/app');

module.exports = app;
