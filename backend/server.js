/**
 * NigerianDirectory Backend Server
 * Entry point for the Express.js API
 */

require('dotenv').config();

const app = require('./src/app');
const { pool } = require('./src/config/database');
const redis = require('./src/config/redis');

const PORT = process.env.PORT || 3001;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} signal received. Starting graceful shutdown...`);
  
  // Close database connection
  try {
    await pool.end();
    console.log('✓ Database connections closed');
  } catch (error) {
    console.error('Error closing database:', error.message);
  }
  
  // Close Redis connection
  try {
    await redis.quit();
    console.log('✓ Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis:', error.message);
  }
  
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected');
    
    // Test Redis connection (if configured)
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      try {
        await redis.ping();
        console.log('✓ Redis connected');
      } catch (redisError) {
        console.warn('⚠ Redis not connected (caching disabled):', redisError.message);
      }
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🇳🇬 NigerianDirectory.com API Server                 ║
║                                                       ║
║   Environment: ${process.env.NODE_ENV || 'development'}                         ║
║   Port: ${PORT}                                         ║
║   API URL: http://localhost:${PORT}/api                  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
