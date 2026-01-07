const Redis = require('ioredis');

// Create Redis client
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

// Error handling
redis.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

redis.on('connect', () => {
    console.log('Redis client connected');
});

// Test connection
async function testRedisConnection() {
    try {
        await redis.ping();
        return true;
    } catch (error) {
        console.error('Redis connection failed:', error);
        throw error;
    }
}

// Cache helpers
const CACHE_TTL = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    DAY: 86400 // 24 hours
};

async function getCache(key) {
    try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
}

async function setCache(key, data, ttl = CACHE_TTL.MEDIUM) {
    try {
        await redis.setex(key, ttl, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Cache set error:', error);
        return false;
    }
}

async function deleteCache(key) {
    try {
        await redis.del(key);
        return true;
    } catch (error) {
        console.error('Cache delete error:', error);
        return false;
    }
}

async function clearCachePattern(pattern) {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
        return true;
    } catch (error) {
        console.error('Cache clear pattern error:', error);
        return false;
    }
}

module.exports = {
    redis,
    testRedisConnection,
    getCache,
    setCache,
    deleteCache,
    clearCachePattern,
    CACHE_TTL
};
