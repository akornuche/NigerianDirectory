# Database Optimization Guide

## Overview

This guide covers database optimization for NigerianDirectory, including connection pool tuning, query optimization, indexing strategy, and zero-downtime migration procedures.

**Status**: Phase 7 ✅ Complete

## 1. Connection Pool Tuning

### Current Configuration

```javascript
// backend/src/config/database.js
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    min: parseInt(process.env.DB_POOL_MIN || 5),
    max: parseInt(process.env.DB_POOL_MAX || 20),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    reapIntervalMillis: 10000
});
```

### Tuning by Environment

#### Development
- **Min**: 2-5 connections
- **Max**: 10-20 connections
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 2 seconds
- **Max Usage**: Single developer machine

```env
DB_POOL_MIN=2
DB_POOL_MAX=10
```

#### Staging
- **Min**: 10 connections
- **Max**: 50 connections
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 5 seconds
- **Max Usage**: Testing and QA team

```env
DB_POOL_MIN=10
DB_POOL_MAX=50
```

#### Production
- **Min**: 20 connections
- **Max**: 100 connections
- **Idle Timeout**: 60 seconds (reduce connection churn)
- **Connection Timeout**: 10 seconds
- **Max Usage**: Live traffic

```env
DB_POOL_MIN=20
DB_POOL_MAX=100
```

### Formulas

**Min Pool Size**:
```
min = max(5, cpu_cores * 2, max_concurrent_requests / 20)
```

**Max Pool Size**:
```
max = cpu_cores * 4 + backend_instances + buffer
```

For typical deployment with 4 CPU cores and 1 instance:
```
min = max(5, 8, traffic/20) = 5-10
max = 16 + 1 + 5 = 22 (start) → 50-100 (under load)
```

### Connection Pool Monitoring

```javascript
// Add to application startup
pool.on('error', (err) => {
    logger.error('Pool error:', err);
});

pool.on('connect', () => {
    logger.debug('New connection to database');
});

// Monitor pool health
setInterval(() => {
    logger.info('Pool stats:', {
        waitingCount: pool.waitingCount,
        idleCount: pool.idleCount,
        totalCount: pool.totalCount
    });
}, 60000);
```

### Pool Exhaustion Prevention

**Signs of Pool Exhaustion**:
```
"Error: Client pool connection timeout - remaining queue size: 5"
"FATAL: remaining connection slots are reserved for non-replication superuser connections"
```

**Solutions**:

1. **Increase max size**:
   ```env
   DB_POOL_MAX=150  # For high-traffic scenarios
   ```

2. **Implement connection lifecycle**:
   ```javascript
   // Release connections immediately after query
   try {
       const result = await pool.query(sql, params);
       return result;
   } finally {
       // Pool automatically releases connection
   }
   ```

3. **Add query timeout**:
   ```javascript
   const result = await pool.query({
       text: sql,
       values: params,
       timeout: 30000  // 30 second timeout
   });
   ```

4. **Use query queuing**:
   ```javascript
   // Implement rate limiting before queries
   if (activeQueries > maxConcurrent) {
       throw new Error('Database temporarily unavailable');
   }
   ```

---

## 2. Schema Documentation

### Database Schema Overview

```
nigerian_directory_prod
├── users (Authentication & account management)
├── schools (Core school data)
├── locations (Geographic hierarchy)
├── enriched_content (Scraped/enriched data)
├── claims (Ownership claims)
├── crawl_logs (Crawler execution tracking)
├── page_views (Analytics)
├── enrichment_queue (Pending enrichment tasks)
└── content_sources (Crawler source tracking)
```

### Table Relationships

```
users (1) ──→ (N) schools
           ──→ (N) claims
           ──→ (N) page_views

locations (1) ──→ (N) schools

schools (1) ──→ (N) enriched_content
         (1) ──→ (N) claims
         (1) ──→ (N) page_views
         (1) ──→ (N) enrichment_queue

crawl_logs (1) ──→ (N) enrichment_queue

content_sources (1) ──→ (N) crawl_logs
```

### Key Tables

#### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',  -- 'user', 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

#### schools
```sql
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    website VARCHAR(500),
    email VARCHAR(255),
    phone VARCHAR(20),
    type VARCHAR(50),  -- 'private', 'public', 'international'
    gender VARCHAR(50),  -- 'male', 'female', 'co-ed'
    day_school BOOLEAN DEFAULT TRUE,
    boarding_school BOOLEAN DEFAULT FALSE,
    
    -- Location
    location_id INTEGER REFERENCES locations(id),
    state VARCHAR(100),
    city VARCHAR(100),
    area VARCHAR(100),
    address TEXT,
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    meta_keywords VARCHAR(500)
);

-- Indexes for search and filtering
CREATE INDEX idx_schools_slug ON schools(slug);
CREATE INDEX idx_schools_state ON schools(state);
CREATE INDEX idx_schools_city ON schools(city);
CREATE INDEX idx_schools_type ON schools(type);
CREATE INDEX idx_schools_name_tsvector ON schools 
    USING GIN(to_tsvector('english', name));  -- Full-text search
CREATE INDEX idx_schools_created_at ON schools(created_at DESC);
CREATE INDEX idx_schools_created_by ON schools(created_by);
```

#### locations
```sql
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    area VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    population INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_locations_state_city ON locations(state, city);
CREATE UNIQUE INDEX idx_locations_unique ON locations(state, city, area);
```

#### enriched_content
```sql
CREATE TABLE enriched_content (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    source_url VARCHAR(500),
    content_type VARCHAR(50),  -- 'text', 'image', 'video'
    content_title VARCHAR(255),
    content_body TEXT,
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_enriched_content_school_id ON enriched_content(school_id);
CREATE INDEX idx_enriched_content_created_at ON enriched_content(created_at DESC);
```

#### claims
```sql
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    school_id INTEGER NOT NULL REFERENCES schools(id),
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'verified', 'approved', 'rejected'
    verification_code VARCHAR(20) UNIQUE,
    verification_method VARCHAR(50),  -- 'email', 'phone'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_school_id ON claims(school_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_created_at ON claims(created_at DESC);
```

#### page_views
```sql
CREATE TABLE page_views (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    school_id INTEGER REFERENCES schools(id),
    referrer VARCHAR(500),
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for analytics queries
CREATE INDEX idx_page_views_school_id ON page_views(school_id, created_at DESC);
CREATE INDEX idx_page_views_user_id ON page_views(user_id, created_at DESC);
CREATE INDEX idx_page_views_created_at ON page_views(created_at DESC);
```

---

## 3. Index Strategy

### Current Indexes

```sql
-- Check existing indexes
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Index Optimization Checklist

- [x] Primary key indexes (automatic)
- [x] Foreign key indexes (automatic)
- [x] Search columns: `schools.slug`, `schools.name`
- [x] Filter columns: `schools.state`, `schools.city`, `schools.type`
- [x] Sort columns: `created_at` DESC for recent data
- [x] User lookup: `users.email`, `users.id`
- [x] Full-text search: `schools.name` with GIN index
- [ ] Composite indexes for common WHERE clauses
- [ ] Partial indexes for status-based queries
- [ ] BRIN indexes for time-series data (page_views)

### Composite Index Examples

```sql
-- For queries filtering by state AND city
CREATE INDEX idx_schools_state_city 
ON schools(state, city);

-- For claims by user and status
CREATE INDEX idx_claims_user_status 
ON claims(user_id, status);

-- For time-based analytics
CREATE INDEX idx_page_views_school_time 
ON page_views(school_id, created_at DESC);
```

### Partial Index Examples

```sql
-- Only index active users (reduces index size)
CREATE INDEX idx_active_users 
ON users(email) 
WHERE is_active = TRUE;

-- Only index pending claims (reduces index size)
CREATE INDEX idx_pending_claims 
ON claims(created_at DESC) 
WHERE status = 'pending';
```

### BRIN Index for Time-Series

```sql
-- For page_views table (large, time-based)
-- BRIN uses 64x less space than B-tree
CREATE INDEX idx_page_views_created_at_brin 
ON page_views USING BRIN(created_at);
```

### Index Maintenance

```sql
-- Reindex all indexes
REINDEX DATABASE nigerian_directory_prod;

-- Analyze table statistics
ANALYZE schools;

-- Vacuum and analyze
VACUUM ANALYZE;

-- Check unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Drop unused indexes
DROP INDEX idx_name;
```

---

## 4. Query Optimization

### Slow Query Logging

```javascript
// backend/src/config/database.js
pool.on('query', (query) => {
    const start = Date.now();
    
    // Log query execution time
    const result = query.callback;
    query.callback = (...args) => {
        const duration = Date.now() - start;
        
        if (duration > 1000) {  // Log queries over 1 second
            logger.warn('Slow query detected', {
                query: query.text,
                duration_ms: duration,
                rows_affected: args[0]?.rowCount
            });
        }
        
        return result.apply(this, args);
    };
});
```

### Common Slow Queries & Optimization

#### 1. Full Table Scan on Schools

**Slow**:
```sql
SELECT * FROM schools WHERE name LIKE '%school%';
```

**Optimized** (with full-text search):
```sql
SELECT * FROM schools 
WHERE to_tsvector('english', name) @@ plainto_tsquery('english', 'school')
LIMIT 20;

-- With index: CREATE INDEX idx_schools_name_tsvector 
-- ON schools USING GIN(to_tsvector('english', name));
```

#### 2. Missing Indexes on Filters

**Slow** (without index):
```sql
SELECT * FROM schools WHERE state = 'Lagos' AND city = 'Shomolu';
```

**Optimized** (with composite index):
```sql
-- Add index
CREATE INDEX idx_schools_state_city ON schools(state, city);

-- Then query automatically uses index
SELECT * FROM schools WHERE state = 'Lagos' AND city = 'Shomolu';
```

#### 3. N+1 Query Problem

**Slow** (1 + N queries):
```javascript
const schools = await pool.query('SELECT id, name FROM schools LIMIT 10');
for (const school of schools.rows) {
    const enriched = await pool.query(
        'SELECT * FROM enriched_content WHERE school_id = $1',
        [school.id]
    );
}
```

**Optimized** (single JOIN):
```javascript
const result = await pool.query(`
    SELECT s.id, s.name, ec.content_title, ec.content_body
    FROM schools s
    LEFT JOIN enriched_content ec ON s.id = ec.school_id
    LIMIT 10
`);
```

#### 4. Missing LIMIT on Large Results

**Slow** (fetches all rows):
```sql
SELECT * FROM page_views;  -- Millions of rows
```

**Optimized** (with pagination):
```sql
SELECT * FROM page_views 
ORDER BY created_at DESC 
LIMIT 100 OFFSET 0;
```

#### 5. Inefficient Date Filtering

**Slow** (function on indexed column):
```sql
SELECT * FROM schools 
WHERE DATE(created_at) = '2024-01-15';
```

**Optimized** (range query):
```sql
SELECT * FROM schools 
WHERE created_at >= '2024-01-15'::date 
  AND created_at < '2024-01-15'::date + INTERVAL '1 day'
-- Uses index on created_at
```

### Query Analysis

```sql
-- Use EXPLAIN to analyze query plans
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM schools WHERE state = 'Lagos';

-- Look for:
-- - Sequential Scan (missing index)
-- - Index Scan (good)
-- - Seq Scan on page_views (large table scan)
-- - Buffers: hits/reads ratio
```

---

## 5. Caching Strategy

### Redis Caching

```javascript
// Cache school details for 1 hour
async function getSchoolWithCache(slug) {
    const cacheKey = `school:${slug}`;
    
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Query database if not cached
    const school = await pool.query(
        'SELECT * FROM schools WHERE slug = $1',
        [slug]
    );
    
    if (school.rows[0]) {
        // Cache for 1 hour
        await redis.setex(cacheKey, 3600, JSON.stringify(school.rows[0]));
    }
    
    return school.rows[0];
}
```

### Cache Invalidation

```javascript
// Update school (invalidate cache)
async function updateSchool(id, data) {
    const result = await pool.query(
        'UPDATE schools SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [data.name, id]
    );
    
    // Invalidate caches
    const school = result.rows[0];
    await redis.del(`school:${school.slug}`);
    await redis.del(`school:${id}`);
    
    return school;
}
```

### HTTP Caching Headers

```javascript
// Backend returns cache headers
router.get('/api/schools/:slug', (req, res) => {
    // Public, can be cached by CDN
    res.set('Cache-Control', 'public, max-age=3600');  // 1 hour
    res.set('ETag', generateETag(school));
    
    // Send school data
    res.json(school);
});

// Client checks ETag, gets 304 Not Modified if unchanged
```

---

## 6. Zero-Downtime Migration Strategy

### Pre-Migration Checklist

- [ ] Backup current database
- [ ] Test migrations on staging with rollback
- [ ] Notify team of deployment window
- [ ] Prepare rollback plan
- [ ] Monitor application logs during migration

### Step-by-Step Migration Process

#### Phase 1: Preparation (0 downtime)

```sql
-- 1. Add new column without constraint
ALTER TABLE schools ADD COLUMN status_new VARCHAR(50);

-- 2. Backfill new column with default values
UPDATE schools SET status_new = 'active' WHERE is_active = TRUE;
UPDATE schools SET status_new = 'inactive' WHERE is_active = FALSE;

-- 3. Verify data integrity
SELECT COUNT(*) FROM schools WHERE status_new IS NULL;  -- Should be 0
```

#### Phase 2: Application Update (1-5 minutes downtime or blue-green)

Option A: Rolling Update (no downtime)
```bash
# Deploy new app version that:
# 1. Reads from both old and new columns
# 2. Writes to both old and new columns
# 3. Handles both formats gracefully

# Once deployed, verify everything works
```

Option B: Blue-Green Deployment (true zero downtime)
```bash
# Start new version (green) running in parallel
# Route traffic to new version
# Keep old version (blue) running as fallback
# After verification, stop old version
```

#### Phase 3: Cleanup (0 downtime)

```sql
-- After app is stably using new column:

-- 1. Drop old column
ALTER TABLE schools DROP COLUMN is_active;

-- 2. Rename new column
ALTER TABLE schools RENAME COLUMN status_new TO status;

-- 3. Add constraints if needed
ALTER TABLE schools ALTER COLUMN status SET NOT NULL;

-- 4. Verify migration
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'schools' AND column_name = 'status';
```

### Migration Rollback Plan

```sql
-- If migration fails, rollback:

-- Option 1: ROLLBACK transaction (if in transaction)
ROLLBACK;

-- Option 2: Manual rollback of applied changes
ALTER TABLE schools ADD COLUMN is_active BOOLEAN;
UPDATE schools SET is_active = (status = 'active');
ALTER TABLE schools DROP COLUMN status;

-- Option 3: Restore from backup
-- (Requires coordination with deployment)
```

### Deployment Script Example

```bash
#!/bin/bash
# deploy.sh - Zero-downtime deployment

set -e  # Exit on error

echo "🔄 Starting zero-downtime deployment..."

# 1. Backup current state
echo "📦 Creating database backup..."
pg_dump $DATABASE_URL > backup_$(date +%s).sql

# 2. Run migrations
echo "⬆️  Running migrations..."
npm run migrate

# 3. Deploy new app version
echo "🚀 Deploying new app version..."
docker pull $IMAGE_NAME:$VERSION
docker stop nigerian-directory-api
docker run -d --name nigerian-directory-api \
  -e DATABASE_URL=$DATABASE_URL \
  -e REDIS_URL=$REDIS_URL \
  -p 5000:5000 \
  $IMAGE_NAME:$VERSION

# 4. Health check
echo "🏥 Running health checks..."
for i in {1..30}; do
  if curl -f http://localhost:5000/health; then
    echo "✅ Health check passed"
    break
  fi
  echo "⏳ Waiting for service... ($i/30)"
  sleep 2
done

echo "✅ Deployment complete!"
```

---

## 7. Performance Monitoring

### Query Performance Analysis

```javascript
// Log query performance
const MonitoredPool = {
    query: async (text, values) => {
        const start = Date.now();
        try {
            const result = await pool.query(text, values);
            const duration = Date.now() - start;
            
            logger.debug('Query executed', {
                duration_ms: duration,
                rows: result.rowCount,
                query: text.substring(0, 100)  // First 100 chars
            });
            
            return result;
        } catch (error) {
            const duration = Date.now() - start;
            logger.error('Query failed', {
                duration_ms: duration,
                error: error.message,
                query: text.substring(0, 100)
            });
            throw error;
        }
    }
};
```

### Database Metrics to Monitor

```javascript
// Metrics to collect
{
    // Connection metrics
    pool_connections_active: 15,
    pool_connections_idle: 5,
    pool_connections_waiting: 0,
    pool_connection_errors: 0,
    
    // Query metrics
    query_duration_p50_ms: 45,
    query_duration_p95_ms: 500,
    query_duration_p99_ms: 1500,
    query_errors_per_minute: 0,
    
    // Table metrics
    schools_total_rows: 50000,
    schools_table_size_mb: 25,
    schools_index_size_mb: 12,
    
    // Replication metrics (if applicable)
    replication_lag_seconds: 0,
    last_checkpoint_age_seconds: 120
}
```

---

## 8. Database Maintenance

### Daily Maintenance

```sql
-- Vacuum and analyze statistics
VACUUM ANALYZE;

-- Check for missing indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Weekly Maintenance

```sql
-- Full reindex
REINDEX DATABASE nigerian_directory_prod;

-- Check table bloat
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monthly Maintenance

```sql
-- Check for unused indexes
SELECT schemaname, tablename, indexname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE idx_scan < 100
ORDER BY pg_relation_size(indexrelid) DESC;

-- Analyze slow query logs
-- Review application performance metrics
-- Plan optimization based on findings
```

---

## 9. Disaster Recovery

### Backup Strategy

- **Frequency**: Daily automated backups
- **Retention**: 30 days
- **Location**: Off-site (S3, Azure Blob)
- **Testing**: Monthly recovery drills

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/var/backups/database"
DB_NAME="nigerian_directory_prod"

pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
gzip $BACKUP_DIR/backup_*.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/ s3://backups/nigerian-directory/ --recursive
```

### Recovery Procedure

```bash
# Restore from backup
gunzip backup_20260920_120000.sql.gz
psql $DATABASE_URL < backup_20260920_120000.sql

# Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM schools;"
```

---

## Checklist: Phase 7 Complete

- [x] 7.1 Tune connection pool (Dev: 2-10, Staging: 10-50, Prod: 20-100)
- [x] 7.2 Review and document migrations strategy
- [x] 7.3 Create schema documentation with ER diagram and constraints
- [x] 7.4 Set up database monitoring and performance analysis
- [x] 7.5 Document zero-downtime migration strategy

---

**Last Updated**: September 2026
**Status**: Phase 7 (Database Optimization) ✅ Complete
