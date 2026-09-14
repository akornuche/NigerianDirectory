/**
 * Vercel Serverless Function - Main API Entry Point
 * This handles all requests in Vercel's serverless environment
 */

require('dotenv').config();

// In Vercel serverless, just export the app without trying to listen
const app = require('../src/app');

// Add a test endpoint to verify serverless function is working
app.get('/test-serverless', (req, res) => {
  res.json({
    message: 'Serverless function is responding!',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      platform: 'vercel-serverless'
    }
  });
});

module.exports = app;

