require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { pool, testConnection } = require('./config/database');
const { redis, testRedisConnection } = require('./config/redis');

// Import routes
const schoolsRoutes = require('./routes/schools');
const locationsRoutes = require('./routes/locations');
const authRoutes = require('./routes/auth');
const claimsRoutes = require('./routes/claims');
const adminRoutes = require('./routes/admin');
const crawlRoutes = require('./routes/crawl');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Request logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ============================================
// HEALTH CHECK
// ============================================

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'NigerianDirectory API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api',
        health: '/health'
    });
});

app.get('/health', async (req, res) => {
    try {
        // Check database
        await pool.query('SELECT 1');
        
        // Check Redis
        await redis.ping();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                redis: 'connected'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/crawl', crawlRoutes);

// ============================================
// ROOT ENDPOINT
// ============================================
app.get('/api', (req, res) => {
    res.json({
        name: 'NigerianDirectory API',
        version: '1.0.0',
        description: 'API for NigerianDirectory.com - Schools directory platform',
        endpoints: {
            schools: '/api/schools',
            locations: '/api/locations',
            auth: '/api/auth',
            claims: '/api/claims',
            admin: '/api/admin',
            crawl: '/api/crawl'
        }
    });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.details || err.message
        });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired'
        });
    }
    
    // Default error
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// START SERVER
// ============================================
async function startServer() {
    try {
        // Test database connection
        await testConnection();
        console.log('✅ Database connected successfully');
        
        // Test Redis connection
        await testRedisConnection();
        console.log('✅ Redis connected successfully');
        
        // Start server
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🇳🇬 NigerianDirectory.com API Server                     ║
║                                                            ║
║   Server running on: http://localhost:${PORT}               ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
