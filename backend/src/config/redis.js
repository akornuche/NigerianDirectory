/**
 * Redis client with an in-memory fallback.
 *
 * Redis is optional. The serverless deployment has no Redis instance, and
 * an ioredis client pointed at a host that does not exist delays every
 * cached request while it retries, then fails. So a real client is created
 * only when REDIS_URL or REDIS_HOST is set. Otherwise a small in-memory
 * store with the same command surface is used. It is per-process, which is
 * acceptable for a cache but not for anything that must be shared between
 * instances: callers that need shared state check `isRedisConfigured`.
 */

const Redis = require('ioredis');

const isRedisConfigured = Boolean(process.env.REDIS_URL || process.env.REDIS_HOST);

/**
 * Minimal in-memory implementation of the Redis commands this codebase uses.
 * Every method returns a promise so callers behave the same either way.
 */
class MemoryRedis {
    constructor() {
        this.store = new Map();
        this.isMemoryFallback = true;
    }

    _live(key) {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        return entry;
    }

    _set(key, value, ttlSeconds = null) {
        this.store.set(key, {
            value,
            expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
        });
    }

    async ping() { return 'PONG'; }
    async quit() { this.store.clear(); return 'OK'; }
    async info() { return '# memory fallback\r\nconnected_clients:0\r\nused_memory:0\r\n'; }

    async get(key) {
        const entry = this._live(key);
        return entry && typeof entry.value === 'string' ? entry.value : null;
    }

    async set(key, value) { this._set(key, String(value)); return 'OK'; }
    async setex(key, ttl, value) { this._set(key, String(value), Number(ttl)); return 'OK'; }

    async del(...keys) {
        let removed = 0;
        for (const key of keys.flat()) {
            if (this._live(key) && this.store.delete(key)) removed++;
        }
        return removed;
    }

    async keys(pattern) {
        // Redis glob: only '*' and '?' are used in this codebase.
        const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
        return [...this.store.keys()].filter((k) => this._live(k) && regex.test(k));
    }

    _hash(key) {
        let entry = this._live(key);
        if (!entry) {
            this._set(key, new Map());
            entry = this.store.get(key);
        }
        return entry.value;
    }

    async hset(key, field, value) { this._hash(key).set(field, String(value)); return 1; }
    async hget(key, field) { const e = this._live(key); return e ? e.value.get(field) ?? null : null; }
    async hgetall(key) { const e = this._live(key); return e ? Object.fromEntries(e.value) : {}; }

    _list(key) {
        let entry = this._live(key);
        if (!entry) {
            this._set(key, []);
            entry = this.store.get(key);
        }
        return entry.value;
    }

    async lpush(key, ...values) { const l = this._list(key); l.unshift(...values.reverse()); return l.length; }
    async llen(key) { const e = this._live(key); return e ? e.value.length : 0; }

    async lrem(key, count, value) {
        const e = this._live(key);
        if (!e) return 0;
        const before = e.value.length;
        e.value = e.value.filter((v) => v !== value);
        return before - e.value.length;
    }
}

function createClient() {
    if (!isRedisConfigured) {
        return new MemoryRedis();
    }

    const options = {
        // Fail fast: a cache that takes seconds to answer is worse than none.
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        retryStrategy(times) {
            return Math.min(times * 200, 5000);
        }
    };

    const client = process.env.REDIS_URL
        ? new Redis(process.env.REDIS_URL, options)
        : new Redis({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            ...options
        });

    // Log the first error of an outage only, not every reconnect attempt.
    let reportedOutage = false;
    client.on('error', (err) => {
        if (!reportedOutage) {
            console.error('Redis client error:', err.message);
            reportedOutage = true;
        }
    });
    client.on('ready', () => {
        reportedOutage = false;
    });

    return client;
}

const redis = createClient();

async function testRedisConnection() {
    await redis.ping();
    return true;
}

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
        console.error('Cache get error:', error.message);
        return null;
    }
}

async function setCache(key, data, ttl = CACHE_TTL.MEDIUM) {
    try {
        await redis.setex(key, ttl, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Cache set error:', error.message);
        return false;
    }
}

async function deleteCache(key) {
    try {
        await redis.del(key);
        return true;
    } catch (error) {
        console.error('Cache delete error:', error.message);
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
        console.error('Cache clear pattern error:', error.message);
        return false;
    }
}

module.exports = {
    redis,
    isRedisConfigured,
    MemoryRedis,
    testRedisConnection,
    getCache,
    setCache,
    deleteCache,
    clearCachePattern,
    CACHE_TTL
};
