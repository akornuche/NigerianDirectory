/**
 * Prometheus Metrics Middleware
 * 
 * Tracks:
 * - HTTP request counts and latencies
 * - Error rates
 * - Database connection pool status
 * - Cache hit/miss rates
 * - Authentication metrics
 */

const { redis } = require('../config/redis');
const { pool } = require('../config/database');

class MetricsCollector {
    constructor() {
        // HTTP metrics
        this.httpRequestsTotal = new Map();
        this.httpRequestDuration = new Map();
        this.httpErrorsTotal = new Map();

        // Database metrics
        this.dbPoolConnections = 0;
        this.dbQueries = 0;
        this.dbErrors = 0;

        // Cache metrics
        this.cacheHits = 0;
        this.cacheMisses = 0;

        // Auth metrics
        this.loginAttempts = 0;
        this.loginSuccesses = 0;
        this.loginFailures = 0;
        this.tokenRefreshes = 0;
        this.logouts = 0;
    }

    /**
     * Track HTTP request
     */
    recordHttpRequest(method, path, statusCode, duration) {
        const key = `${method} ${path}`;
        
        // Count
        const countKey = `requests:${key}`;
        this.httpRequestsTotal.set(countKey, (this.httpRequestsTotal.get(countKey) || 0) + 1);

        // Duration histogram (simplified - store min/max/avg)
        const durationKey = `duration:${key}`;
        const existing = this.httpRequestDuration.get(durationKey) || { min: duration, max: duration, total: 0, count: 0 };
        existing.min = Math.min(existing.min, duration);
        existing.max = Math.max(existing.max, duration);
        existing.total += duration;
        existing.count += 1;
        this.httpRequestDuration.set(durationKey, existing);

        // Errors
        if (statusCode >= 400) {
            const errorKey = `errors:${statusCode}`;
            this.httpErrorsTotal.set(errorKey, (this.httpErrorsTotal.get(errorKey) || 0) + 1);
        }
    }

    /**
     * Record login attempt
     */
    recordLoginAttempt(success = true) {
        this.loginAttempts += 1;
        if (success) {
            this.loginSuccesses += 1;
        } else {
            this.loginFailures += 1;
        }
    }

    /**
     * Record token refresh
     */
    recordTokenRefresh() {
        this.tokenRefreshes += 1;
    }

    /**
     * Record logout
     */
    recordLogout() {
        this.logouts += 1;
    }

    /**
     * Record cache hit
     */
    recordCacheHit() {
        this.cacheHits += 1;
    }

    /**
     * Record cache miss
     */
    recordCacheMiss() {
        this.cacheMisses += 1;
    }

    /**
     * Get metrics as Prometheus format
     */
    async getMetrics() {
        const metrics = [];

        // HTTP request metrics
        for (const [key, value] of this.httpRequestsTotal) {
            metrics.push(`nigerian_directory_http_requests_total{label="${key}"} ${value}`);
        }

        // HTTP duration metrics
        for (const [key, value] of this.httpRequestDuration) {
            metrics.push(`nigerian_directory_http_request_duration_seconds{label="${key}",quantile="min"} ${value.min / 1000}`);
            metrics.push(`nigerian_directory_http_request_duration_seconds{label="${key}",quantile="max"} ${value.max / 1000}`);
            metrics.push(`nigerian_directory_http_request_duration_seconds{label="${key}",quantile="avg"} ${(value.total / value.count) / 1000}`);
        }

        // HTTP error metrics
        for (const [key, value] of this.httpErrorsTotal) {
            metrics.push(`nigerian_directory_http_errors_total{${key}} ${value}`);
        }

        // Auth metrics
        metrics.push(`nigerian_directory_login_attempts_total ${this.loginAttempts}`);
        metrics.push(`nigerian_directory_login_successes_total ${this.loginSuccesses}`);
        metrics.push(`nigerian_directory_login_failures_total ${this.loginFailures}`);
        metrics.push(`nigerian_directory_token_refreshes_total ${this.tokenRefreshes}`);
        metrics.push(`nigerian_directory_logouts_total ${this.logouts}`);

        // Cache metrics
        const cacheTotal = this.cacheHits + this.cacheMisses;
        const cacheHitRate = cacheTotal > 0 ? (this.cacheHits / cacheTotal * 100).toFixed(2) : 0;
        metrics.push(`nigerian_directory_cache_hits_total ${this.cacheHits}`);
        metrics.push(`nigerian_directory_cache_misses_total ${this.cacheMisses}`);
        metrics.push(`nigerian_directory_cache_hit_ratio ${cacheHitRate}`);

        // Database pool metrics
        try {
            const poolState = pool._clients ? {
                available: pool._clients.available.length,
                waiting: pool._queue ? pool._queue.length : 0,
                total: pool.options.max
            } : {};

            metrics.push(`nigerian_directory_db_pool_available ${poolState.available || 0}`);
            metrics.push(`nigerian_directory_db_pool_waiting ${poolState.waiting || 0}`);
            metrics.push(`nigerian_directory_db_pool_total ${poolState.total || 20}`);
        } catch (error) {
            // Ignore pool metrics if unavailable
        }

        // Redis metrics (if available)
        try {
            const info = await redis.info();
            if (info) {
                const lines = info.split('\r\n');
                for (const line of lines) {
                    if (line.startsWith('connected_clients:')) {
                        metrics.push(`nigerian_directory_redis_connected_clients ${line.split(':')[1]}`);
                    }
                    if (line.startsWith('used_memory:')) {
                        metrics.push(`nigerian_directory_redis_used_memory ${line.split(':')[1]}`);
                    }
                }
            }
        } catch (error) {
            // Redis metrics optional
        }

        return metrics.join('\n');
    }

    /**
     * Reset metrics (useful for periodic reporting)
     */
    reset() {
        this.httpRequestsTotal = new Map();
        this.httpRequestDuration = new Map();
        this.httpErrorsTotal = new Map();
        this.loginAttempts = 0;
        this.loginSuccesses = 0;
        this.loginFailures = 0;
        this.tokenRefreshes = 0;
        this.logouts = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }
}

// Global metrics collector
const collector = new MetricsCollector();

/**
 * Express middleware for metrics collection
 */
function metricsMiddleware(req, res, next) {
    const startTime = Date.now();

    // Capture original send
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        collector.recordHttpRequest(req.method, req.path, res.statusCode, duration);
        return originalSend.call(this, data);
    };

    next();
}

/**
 * Express endpoint to expose metrics in Prometheus format
 */
async function metricsEndpoint(req, res) {
    try {
        const metrics = await collector.getMetrics();
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(metrics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate metrics' });
    }
}

module.exports = {
    MetricsCollector,
    collector,
    metricsMiddleware,
    metricsEndpoint
};
