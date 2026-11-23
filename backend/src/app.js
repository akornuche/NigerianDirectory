require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { pool, testConnection } = require('./config/database');
const { redis, isRedisConfigured, testRedisConnection } = require('./config/redis');

// ============================================
// LOGGING & MONITORING
// ============================================
const {
    requestLoggingMiddleware,
    errorLoggingMiddleware,
    Logger
} = require('./utils/logger');
const { metricsEndpoint } = require('./middleware/metrics');

// ============================================
// ENVIRONMENT VALIDATION
// ============================================
function validateEnvironment() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Required for all environments
    const alwaysRequired = ['JWT_SECRET'];
    
    // Required only in production. A DATABASE_URL connection string (as
    // Neon provides) replaces the discrete DB_* variables. Redis is optional.
    const productionRequired = process.env.DATABASE_URL
        ? ['FRONTEND_URL']
        : ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'FRONTEND_URL'];

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
            const message = `❌ CRITICAL: Missing production environment variables: ${missing.join(', ')}\n` +
                `These are required for production deployments.\n` +
                `See .env.example for configuration instructions.`;
            
            // In Vercel, log warning but continue (will fail when DB is accessed)
            if (process.env.VERCEL === '1') {
                console.warn(message);
                console.warn('Note: API will respond but database operations will fail');
            } else {
                console.error(message);
                process.exit(1);
            }
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

    console.log('✅ Environment validation passed');
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
const aiAgentsRoutes = require('./routes/ai-agents');


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
            objectSrc: ["'none'"]
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

// Rate limits are keyed by client IP, so the app must read the client
// address the proxy reports. Without this, every request behind Vercel or
// nginx carried the proxy's address and all visitors shared one bucket.
// TRUST_PROXY overrides the default (a hop count, or a value express
// accepts); trusting a proxy that is not there lets clients spoof their IP,
// so it defaults to off outside Vercel.
const trustProxy = process.env.TRUST_PROXY ?? (process.env.VERCEL === '1' ? '1' : 'false');
app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy)
    : trustProxy === 'true' ? true
    : trustProxy === 'false' ? false
    : trustProxy);

// The frontend's server-side rendering calls the API from a handful of
// server IPs, so per-IP limits would throttle every page build and leave
// pages rendered empty. Those calls send INTERNAL_API_KEY and are exempt.
// Without the key configured, nothing is exempt.
const crypto = require('crypto');
function isInternalRequest(req) {
    const expected = process.env.INTERNAL_API_KEY;
    const given = req.get('x-internal-api-key');
    if (!expected || !given) return false;
    const a = crypto.createHash('sha256').update(given).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    return crypto.timingSafeEqual(a, b);
}

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: Number(process.env.RATE_LIMIT_MAX) || 100, // per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    skip: isInternalRequest,
    message: { error: 'Too many requests, please try again later.' }
});

// Claim creation - strict (prevents abuse). Login, registration and token
// refresh have their own limiters in routes/auth.js.
const claimsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 claims per hour per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many claim attempts, please try again later' }
});

app.use('/api/', globalLimiter);
app.post('/api/claims', claimsLimiter);

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

/**
 * Check dependencies. The database is required; Redis is an optional cache,
 * so its state is reported but never makes the API unhealthy. Reporting a
 * cache outage as a 503 would take the service out of rotation for no gain.
 */
async function checkDependencies() {
    const checks = { database: 'ok', redis: 'not_configured' };

    try {
        await pool.query('SELECT 1');
    } catch (error) {
        checks.database = 'failed';
    }

    if (isRedisConfigured) {
        try {
            await redis.ping();
            checks.redis = 'ok';
        } catch (error) {
            checks.redis = 'failed';
        }
    }

    return { healthy: checks.database === 'ok', checks };
}

// Readiness probe - can app serve traffic?
app.get('/health/ready', async (req, res) => {
    const { healthy, checks } = await checkDependencies();
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        checks
    });
});

// Combined health check (backwards compatible)
app.get('/health', async (req, res) => {
    const { healthy, checks } = await checkDependencies();
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: checks
    });
});

// Prometheus metrics endpoint
app.get('/metrics', metricsEndpoint);

// ============================================
// API ROUTES
// ============================================

// CSRF token endpoint (GET - safe method, no token required)
app.get('/api/csrf-token', getCsrfToken);

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/admin/records', require('./routes/adminRecords'));
app.use('/api/admin', adminRoutes);
app.use('/api/cron', require('./routes/cron'));
app.use('/api/crawl', crawlRoutes);
app.use('/api/views', viewsRoutes);
app.use('/api/ai', aiAgentsRoutes);
app.use('/api/contact', require('./routes/contact')); // AI Agents & Generative Engine Optimization

// ============================================
// SWAGGER/OPENAPI DOCUMENTATION
// ============================================
// Swagger UI is disabled: it caused initialization failures. To restore
// it, call initializeSwagger(app) from ./config/swaggerInit here.

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
        // The database is required: without it there is nothing to serve.
        await testConnection();
        logger.info('✅ Database connected successfully');

        // Redis is an optional cache. A cache outage must not take the API
        // down, so failures here are logged and execution continues.
        try {
            await testRedisConnection();
            logger.info(isRedisConfigured
                ? '✅ Redis connected successfully'
                : 'ℹ️  Redis not configured, using in-memory cache');
        } catch (redisError) {
            logger.warn(`⚠️  Redis unavailable, continuing without cache: ${redisError.message}`);
        }

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

// Only start server if this file is run directly (not imported by server.js)
if (process.env.VERCEL !== '1' && require.main === module) {
  startServer();
}

module.exports = app;
