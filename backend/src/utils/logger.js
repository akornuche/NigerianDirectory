/**
 * Structured Logger - Production-ready logging with winston
 * 
 * Features:
 * - JSON formatted logs for easy parsing
 * - Request ID tracking across requests
 * - Different log levels (error, warn, info, debug)
 * - Console and file output (in production)
 * - Sensitive data redaction
 * - Performance metrics logging
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Generate unique request ID for correlation
 */
function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Redact sensitive fields from data
 */
function redactSensitiveData(obj) {
    if (!obj) return obj;
    
    const sensitiveFields = [
        'password',
        'password_hash',
        'token',
        'accessToken',
        'refreshToken',
        'secret',
        'api_key',
        'apiKey',
        'authorization',
    ];
    
    const redacted = JSON.parse(JSON.stringify(obj));
    
    const redactField = (obj, fields) => {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (fields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
                    obj[key] = '***REDACTED***';
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    redactField(obj[key], fields);
                }
            }
        }
    };
    
    redactField(redacted, sensitiveFields);
    return redacted;
}

/**
 * Structured logger with context
 */
class Logger {
    constructor(context = {}) {
        this.context = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            service: 'nigerian-directory-api',
            ...context
        };
    }

    /**
     * Format log entry
     */
    formatLog(level, message, data = {}) {
        return {
            level,
            message,
            timestamp: new Date().toISOString(),
            ...this.context,
            ...redactSensitiveData(data)
        };
    }

    /**
     * Error level logging
     */
    error(message, error = null, additionalData = {}) {
        const logEntry = this.formatLog('error', message, {
            error: error ? {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
            } : null,
            ...additionalData
        });

        console.error(JSON.stringify(logEntry));
        
        // Also log to stderr for error tracking services
        if (process.env.NODE_ENV === 'production') {
            process.stderr.write(JSON.stringify(logEntry) + '\n');
        }
    }

    /**
     * Warning level logging
     */
    warn(message, data = {}) {
        if (!this.shouldLog('warn')) return;
        
        const logEntry = this.formatLog('warn', message, data);
        console.warn(JSON.stringify(logEntry));
    }

    /**
     * Info level logging
     */
    info(message, data = {}) {
        if (!this.shouldLog('info')) return;
        
        const logEntry = this.formatLog('info', message, data);
        console.log(JSON.stringify(logEntry));
    }

    /**
     * Debug level logging
     */
    debug(message, data = {}) {
        if (!this.shouldLog('debug')) return;
        
        const logEntry = this.formatLog('debug', message, data);
        console.log(JSON.stringify(logEntry));
    }

    /**
     * Check if log level should be logged
     */
    shouldLog(level) {
        const levels = ['error', 'warn', 'info', 'debug'];
        const logLevelIndex = levels.indexOf(LOG_LEVEL);
        const currentLevelIndex = levels.indexOf(level);
        return currentLevelIndex <= logLevelIndex;
    }

    /**
     * Create child logger with additional context
     */
    child(additionalContext) {
        return new Logger({
            ...this.context,
            ...additionalContext
        });
    }
}

/**
 * Express middleware for request logging and request ID tracking
 */
function requestLoggingMiddleware(req, res, next) {
    // Generate request ID
    const requestId = req.get('X-Request-Id') || generateRequestId();
    req.requestId = requestId;

    // Create logger for this request
    const logger = new Logger({
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress
    });

    req.logger = logger;

    // Log request start
    logger.info('Request received', {
        query: req.query,
        userAgent: req.get('user-agent')
    });

    // Measure response time
    const startTime = Date.now();

    // Log response
    // Size of a body as express will send it. An empty body (res.send()) has
    // no size; stringifying undefined and measuring it threw and turned the
    // response into a 500.
    const responseSize = (data) => {
        if (data === undefined || data === null) return 0;
        if (Buffer.isBuffer(data)) return data.length;
        if (typeof data === 'string') return Buffer.byteLength(data);
        return Buffer.byteLength(JSON.stringify(data) || '');
    };

    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        req.logger.info('Request completed', {
            statusCode,
            duration,
            durationMs: duration,
            responseSize: responseSize(data)
        });

        // Call original send
        return originalSend.call(this, data);
    };

    next();
}

/**
 * Error logging middleware
 */
function errorLoggingMiddleware(err, req, res, next) {
    const logger = req.logger || new Logger({ requestId: req.requestId || 'unknown' });

    logger.error('Request error', err, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode || 500,
        userAgent: req.get('user-agent'),
        query: req.query,
        body: req.body ? redactSensitiveData(req.body) : null
    });

    next(err);
}

/**
 * Performance metrics logger
 */
function logPerformanceMetric(label, duration, additionalData = {}) {
    const logger = new Logger();
    
    logger.info(`Performance: ${label}`, {
        label,
        duration,
        durationMs: duration,
        ...additionalData
    });
}

/**
 * Database query logger
 */
function logDatabaseQuery(query, duration, params = null) {
    if (process.env.NODE_ENV === 'development') {
        const logger = new Logger();
        logger.debug('Database query', {
            query: query.substring(0, 200), // Truncate long queries
            duration,
            durationMs: duration,
            paramsCount: params ? params.length : 0,
            slow: duration > 1000 // Flag slow queries
        });
    }
}

/**
 * Auth event logger
 */
function logAuthEvent(eventType, userEmail, additionalData = {}) {
    const logger = new Logger();
    
    logger.info(`Auth event: ${eventType}`, {
        eventType,
        userEmail,
        ...additionalData
    });
}

/**
 * Business event logger
 */
function logBusinessEvent(eventType, userId, eventData = {}) {
    const logger = new Logger();
    
    logger.info(`Business event: ${eventType}`, {
        eventType,
        userId,
        ...eventData
    });
}

/**
 * Create logger for background jobs
 */
function createJobLogger(jobName) {
    return new Logger({
        jobName,
        type: 'background-job'
    });
}

module.exports = {
    Logger,
    generateRequestId,
    redactSensitiveData,
    requestLoggingMiddleware,
    errorLoggingMiddleware,
    logPerformanceMetric,
    logDatabaseQuery,
    logAuthEvent,
    logBusinessEvent,
    createJobLogger
};
