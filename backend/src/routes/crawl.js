const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const CrawlLog = require('../models/CrawlLog');
const { redis, isRedisConfigured } = require('../config/redis');

// The crawl queue is shared with the Python crawler through Redis. The
// in-memory fallback is private to this process, so a job queued there
// would never run. Refuse clearly instead of accepting work that is lost.
router.use((req, res, next) => {
    if (!isRedisConfigured) {
        return res.status(503).json({
            error: 'Crawl queue unavailable',
            message: 'Set REDIS_URL or REDIS_HOST to enable the crawl queue'
        });
    }
    return next();
});

// ============================================
// POST /api/crawl/batch - Trigger crawler batch (admin)
// ============================================
router.post('/batch', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { count = 200, priority = 'initial' } = req.body;

        // Add crawl job to Redis queue
        const jobId = `crawl_${Date.now()}`;
        const job = {
            id: jobId,
            type: 'batch',
            count,
            priority,
            status: 'queued',
            created_at: new Date().toISOString(),
            created_by: req.user.id
        };

        await redis.hset('crawl:jobs', jobId, JSON.stringify(job));
        await redis.lpush('crawl:queue', jobId);

        res.json({
            message: 'Crawl batch queued',
            job: {
                id: jobId,
                count,
                priority,
                status: 'queued'
            }
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/crawl/status - Get crawl status
// ============================================
router.get('/status', authenticate, requireAdmin, async (req, res, next) => {
    try {
        // Get queue length
        const queueLength = await redis.llen('crawl:queue');
        
        // Get all jobs
        const jobs = await redis.hgetall('crawl:jobs');
        const jobList = Object.values(jobs || {}).map(j => JSON.parse(j));
        
        // Get crawl stats
        const stats = await CrawlLog.getStats();

        res.json({
            queue: {
                length: queueLength,
                jobs: jobList.slice(-10) // Last 10 jobs
            },
            stats
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// GET /api/crawl/logs - Get recent crawl logs
// ============================================
router.get('/logs', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { status, limit = 100 } = req.query;
        
        let logs;
        if (status) {
            const result = await CrawlLog.getByStatus(status, 1, parseInt(limit));
            logs = result.logs;
        } else {
            logs = await CrawlLog.getRecent(parseInt(limit));
        }

        res.json(logs);
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/crawl/single - Crawl single school URL
// ============================================
router.post('/single', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { url, school_id } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Add single crawl job to queue
        const jobId = `crawl_single_${Date.now()}`;
        const job = {
            id: jobId,
            type: 'single',
            url,
            school_id,
            status: 'queued',
            created_at: new Date().toISOString(),
            created_by: req.user.id
        };

        await redis.hset('crawl:jobs', jobId, JSON.stringify(job));
        await redis.lpush('crawl:queue', jobId);

        res.json({
            message: 'Single crawl job queued',
            job: {
                id: jobId,
                url,
                school_id,
                status: 'queued'
            }
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// POST /api/crawl/retry - Retry failed crawls
// ============================================
router.post('/retry', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { limit = 50 } = req.body;

        // Get failed crawl logs
        const result = await CrawlLog.getByStatus('failure', 1, limit);
        const failedLogs = result.logs;

        // Re-queue failed crawls
        let queuedCount = 0;
        for (const log of failedLogs) {
            if (log.source_url) {
                const jobId = `crawl_retry_${log.id}_${Date.now()}`;
                const job = {
                    id: jobId,
                    type: 'retry',
                    url: log.source_url,
                    school_id: log.school_id,
                    original_log_id: log.id,
                    status: 'queued',
                    created_at: new Date().toISOString(),
                    created_by: req.user.id
                };

                await redis.hset('crawl:jobs', jobId, JSON.stringify(job));
                await redis.lpush('crawl:queue', jobId);
                queuedCount++;
            }
        }

        res.json({
            message: `Queued ${queuedCount} retry jobs`,
            failedCount: failedLogs.length,
            queuedCount
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// DELETE /api/crawl/job/:jobId - Cancel crawl job
// ============================================
router.delete('/job/:jobId', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { jobId } = req.params;

        // Get job
        const jobData = await redis.hget('crawl:jobs', jobId);
        if (!jobData) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = JSON.parse(jobData);
        
        // Only cancel if queued
        if (job.status !== 'queued') {
            return res.status(400).json({ error: 'Can only cancel queued jobs' });
        }

        // Update job status
        job.status = 'cancelled';
        await redis.hset('crawl:jobs', jobId, JSON.stringify(job));
        
        // Remove from queue
        await redis.lrem('crawl:queue', 0, jobId);

        res.json({
            message: 'Job cancelled',
            job
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
