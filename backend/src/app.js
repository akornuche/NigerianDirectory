require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { pool, testConnection } = require('./config/database');
const { redis, testRedisConnection } = require('./config/redis');

// ============================================
// LOGGING & MONITORING
// ============================================
const { 
    requestLoggingMiddleware, 
    errorLoggingMiddleware,
    Logger
} = require('./utils/logger');
const {
    metricsMiddleware,
    metricsEndpoint,
    collector
} = require('./middleware/metrics');

// ============================================
// ENVIRONMENT VALIDATION
// ============================================
function validateEnvironment() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';
    
    // Required for all environments
    const alwaysRequired = ['JWT_SECRET'];
    
    // Required only in production
    const productionRequired = [
        'DB_HOST',
        'DB_PORT',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'REDIS_HOST',
        'REDIS_PORT',
        'FRONTEND_URL'
    ];

    // Check always-required variables
    let missing = alwaysRequired.filter(v => !process.env[v]);
    if (missing.length > 0) {
        console.error(
            `❌ CRITICAL: Missing required environment variables: ${missing.join(', ')}\n` +
            `These are required in all environments.\n` +
            `See .env.example for configuration instructions.`
        );
        process.exit(1);
    }

    // Check production-required variables
    if (isProduction) {
        missing = productionRequired.filter(v => !process.env[v]);
        if (missing.length > 0) {
            console.error(
                `❌ CRITICAL: Missing production environment variables: ${missing.join(', ')}\n` +
                `These are required for production deployments.\n` +
                `See .env.example for configuration instructions.`
            );
            process.exit(1);
        }
    }

    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        console.error('❌ CRITICAL: JWT_SECRET must be at least 32 characters');
        process.exit(1);
    }

    // Warn if using default/example values
    const defaults = {
        'JWT_SECRET': 'your_secure_jwt_secret_minimum_32_chars',
        'DB_PASSWORD': 'postgres',
        'REDIS_PORT': '6379'
    };

    for (const [key, defaultValue] of Object.entries(defaults)) {
        if (process.env[key] === defaultValue && isProduction) {
            console.error(`❌ WARNING: ${key} is set to a default/example value`);
        }
    }

    // Validate port is valid number
    if (process.env.PORT) {
        const port = parseInt(process.env.PORT, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
            console.error('❌ CRITICAL: PORT must be a valid port number (1-65535)');
            process.exit(1);
        }
    }

    // Validate FRONTEND_URL format in production
    if (isProduction && process.env.FRONTEND_URL) {
        try {
            new URL(process.env.FRONTEND_URL);
        } catch (error) {
            console.error('❌ CRITICAL: FRONTEND_URL is not a valid URL');
            process.exit(1);
        }
    }

    logger.info('✅ Environment validation passed');
}

validateEnvironment();

// Import routes
const schoolsRoutes = require('./routes/schools');
const locationsRoutes = require('./routes/locations');
const authRoutes = require('./routes/auth');
const claimsRoutes = require('./routes/claims');
const adminRoutes = require('./routes/admin');
const crawlRoutes = require('./routes/crawl');
const viewsRoutes = require('./routes/views');

const app = express();
const PORT = process.env.PORT || 5000;
const logger = new Logger();

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "maps.googleapis.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "maps.googleapis.com", "*.googleapis.com"],
            fontSrc: ["'self'", "fonts.gstatic.com", "data:"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined
        }
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny'
    },
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: ['self'],
        usb: []
    }
}));

// CORS configuration - require FRONTEND_URL in production
const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl && process.env.NODE_ENV === 'production') {
    console.error('❌ CRITICAL: FRONTEND_URL environment variable is required in production');
    process.exit(1);
}

// Support multiple CORS origins via environment variable
let corsOrigin = frontendUrl || 'http://localhost:3000';

// In production, validate and support multiple origins if provided
if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGINS) {
    corsOrigin = process.env.CORS_ORIGINS.split(',').map(url => url.trim());
    logger.info(`📍 CORS configured for multiple origins: ${corsOrigin.join(', ')}`);
} else {
    logger.info(`📍 CORS origin configured to: ${corsOrigin}`);
}

app.use(cors({
    origin: corsOrigin,
    credentials: true,
    optionsSuccessStatus: 200
}));

// Request logging (morgan for compatibility)
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Structured logging middleware
app.use(requestLoggingMiddleware);

// ============================================
// INPUT SANITIZATION & VALIDATION
// ============================================
const {
    sanitizationMiddleware,
    preventRequestSmuggling
} = require('./middleware/inputSanitization');

const {
    csrfProtection,
    getCsrfToken
} = require('./middleware/csrf');

app.use(preventRequestSmuggling);
app.use(sanitizationMiddleware);

// CSRF protection for state-changing requests
app.use(csrfProtection);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// RATE LIMITING - Multiple layers for different endpoints
// ============================================

// Global rate limiter (basic)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});

// Auth endpoints - strict
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: { error: 'Too many login attempts, please try again later' },
    skip: (req) => req.user && req.user.role === 'admin' // Don't rate limit admins
});

// Token refresh - very strict
const refreshLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 attempts per minute
    message: { error: 'Too many token refresh attempts' }
});

// Schools endpoint - moderate
const schoolsLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: { error: 'Too many requests to schools endpoint' }
});

// Claims endpoint - strict (prevents abuse)
const claimsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 claims per hour per IP
    message: { error: 'Too many claim attempts, please try again later' }
});

app.use('/api/', globalLimiter);

// ============================================
// HEALTH CHECK & MONITORING
// ============================================

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'NigerianDirectory API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api',
        health: '/health',
        metrics: '/metrics'
    });
});

// Liveness probe - is app running?
app.get('/health/live', (req, res) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString()
    });
});

// Readiness probe - can app serve traffic?
app.get('/health/ready', async (req, res) => {
    try {
        // Check database
        const dbCheck = await pool.query('SELECT 1').catch(e => ({ error: e.message }));
        
        // Check Redis
        const redisCheck = await redis.ping().catch(e => ({ error: e.message }));

        if (dbCheck.error || (typeof redisCheck !== 'string')) {
            return res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: dbCheck.error ? 'failed' : 'ok',
                    redis: redisCheck.error ? 'failed' : 'ok'
                }
            });
        }

        res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            checks: {
                database: 'ok',
                redis: 'ok'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            error: error.message
        });
    }
});

// Combined health check (backwards compatible)
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

// Prometheus metrics endpoint
app.get('/metrics', metricsEndpoint);

// ============================================
// API ROUTES
// ============================================

// CSRF token endpoint (GET - safe method, no token required)
app.get('/api/csrf-token', (req, res, next) => {
    // Skip CSRF check for this endpoint
    csrfProtection.bypass = true;
    getCsrfToken(req, res);
    csrfProtection.bypass = false;
});

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/crawl', crawlRoutes);
app.use('/api/views', viewsRoutes);

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
            crawl: '/api/crawl',
            views: '/api/views'
        }
    });
});

// ============================================
// ERROR HANDLING
// ============================================

// Error logging middleware
app.use(errorLoggingMiddleware);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Global error handler with sensitive data masking
app.use((err, req, res, next) => {
    const requestLogger = req.logger || new Logger({ requestId: req.requestId || 'unknown' });

    // Log full error server-side
    requestLogger.error('Unhandled error', err, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode || 500
    });

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

    // Database errors
    if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({
            error: 'Database connection failed'
        });
    }

    // Generic error response (no sensitive details exposed to client)
    const statusCode = err.statusCode || err.status || 500;
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(statusCode).json({
        error: err.message || 'Internal Server Error',
        ...(isDevelopment && { stack: err.stack })
    });
});

// ============================================
// START SERVER
// ============================================
async function startServer() {
    try {
        // Test database connection
        await testConnection();
        logger.info('✅ Database connected successfully');

        // Test Redis connection
        await testRedisConnection();
        logger.info('✅ Redis connected successfully');

        // Start server
        app.listen(PORT, () => {
            logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🇳🇬 NigerianDirectory.com API Server                     ║
║                                                            ║
║   Server running on: http://localhost:${PORT}               ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║   Health: /health                                          ║
║   Metrics: /metrics                                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        logger.error('❌ Failed to start server', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
