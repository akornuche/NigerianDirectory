# Neon + Vercel Deployment Guide

**Status**: Production Ready  
**Date**: September 12, 2026  
**Architecture**: Neon PostgreSQL + Vercel Serverless  

---

## Overview

This guide walks you through hosting the NigerianDirectory API on Vercel with Neon as the PostgreSQL database backend.

**Architecture:**
```
User → Vercel Edge Network → NigerianDirectory API → Neon PostgreSQL
                                                   → Vercel KV (Redis alternative)
```

---

## Part 1: Neon Database Setup

### Step 1: Access Neon Dashboard

1. Go to https://console.neon.tech
2. Sign in with your account
3. Create a new project or use existing one

### Step 2: Create PostgreSQL Database

1. In Neon dashboard, click "New Project"
2. Configure:
   - **Project Name**: `nigerian-directory-prod`
   - **Region**: Select closest to your users (US/EU)
   - **PostgreSQL Version**: 15 or 16 (latest)
3. Click "Create Project"

### Step 3: Get Connection String

1. In project dashboard, find the connection string
2. Copy the **Connection String** (looks like):
   ```
   postgresql://user:password@host/dbname
   ```
3. You'll also see individual components:
   - **Host**: `ep-xxxxx.us-east-1.neon.tech`
   - **User**: `neon_user`
   - **Password**: `neonpassword123`
   - **Database**: `neon_db`
   - **Port**: `5432`

### Step 4: Verify Connection

Test the connection locally first:

```bash
# Option 1: Using psql
psql postgresql://user:password@host/dbname -c "SELECT version();"

# Option 2: Using curl
curl https://console.neon.tech/api/v2/projects -H "Authorization: Bearer $NEON_API_KEY"
```

---

## Part 2: Vercel Deployment

### Step 1: Add Environment Variables to Vercel

```bash
cd backend

# Database - From Neon
vercel env add DB_HOST
# Paste: ep-xxxxx.us-east-1.neon.tech

vercel env add DB_PORT
# Paste: 5432

vercel env add DB_NAME
# Paste: neon_db

vercel env add DB_USER
# Paste: neon_user

vercel env add DB_PASSWORD
# Paste: neonpassword123

# Application Secrets
vercel env add JWT_SECRET
# Paste: $(openssl rand -base64 32)
# OR paste a 32+ character secure string

vercel env add FRONTEND_URL
# Paste: https://nigeriandirectory.com

vercel env add PORT
# Paste: 3000

vercel env add NODE_ENV
# Paste: production

# Redis (optional - can use Vercel KV)
vercel env add REDIS_HOST
# Paste: (leave blank if using Vercel KV)

vercel env add REDIS_PORT
# Paste: 6379
```

### Step 2: Verify Environment Variables

```bash
vercel env list
```

Should show:
```
DB_HOST                 Production ✓
DB_PORT                 Production ✓
DB_NAME                 Production ✓
DB_USER                 Production ✓
DB_PASSWORD             Production ✓
JWT_SECRET              Production ✓
FRONTEND_URL            Production ✓
PORT                    Production ✓
NODE_ENV                Production ✓
```

### Step 3: Deploy to Vercel

```bash
vercel --prod
```

Expected output:
```
✓ Deployed to https://backend-production.vercel.app
✓ Assigned to codez-mania-team
```

### Step 4: Monitor Deployment

```bash
# View deployment logs
vercel logs --prod

# Check deployment status
vercel list

# View analytics
vercel analytics --prod
```

---

## Part 3: Database Migration

### Step 1: Run Migrations on Neon

After deployment, run database migrations:

```bash
# Option 1: Via Neon SQL Editor (recommended)
# 1. Go to Neon Console
# 2. Click "SQL Editor"
# 3. Paste migration scripts from backend/database/migrations/

# Option 2: Via psql CLI
psql postgresql://user:password@host/dbname < backend/database/init.sql

# Option 3: Via Node.js migration script
npm run migrate:prod
```

### Step 2: Verify Database Schema

```bash
# Connect to Neon
psql postgresql://user:password@host/dbname

# Check tables
\dt

# Check schema
\d schools
\d users
\d locations
```

---

## Part 4: Redis Alternative - Vercel KV

Vercel KV is a Redis-compatible serverless cache. Option to use instead of self-hosted Redis.

### Setup Vercel KV (Optional)

1. In Vercel dashboard:
   - Go to "Storage" tab
   - Click "Create Database" → "KV"
   - Name it: `nigerian-directory-kv`
   - Select region

2. Copy connection details to environment:

```bash
vercel env add KV_URL
# Paste the KV connection string
```

3. Update code to use KV:

```javascript
// src/config/redis.js
const redis = require('@vercel/kv');
// Already configured if needed
```

---

## Part 5: Verification

### Test API Endpoints

```bash
# Health check
curl https://backend-production.vercel.app/health/live

# API root
curl https://backend-production.vercel.app/

# Swagger UI
curl https://backend-production.vercel.app/api/docs

# Test authentication (create account)
curl -X POST https://backend-production.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123"
  }'

# Test schools endpoint
curl https://backend-production.vercel.app/api/schools?pageSize=10

# Test search
curl https://backend-production.vercel.app/api/schools?search=international
```

### Monitor in Vercel Dashboard

1. Go to https://vercel.com/dashboard/projects
2. Select "backend" project
3. Check:
   - **Analytics**: Response times, request volume
   - **Logs**: Real-time logs
   - **Deployments**: Deployment history
   - **Settings**: Environment variables

### Monitor Neon Database

1. Go to https://console.neon.tech
2. Select project
3. Check:
   - **Monitoring**: Query performance
   - **Branches**: Database branches
   - **Connections**: Active connections
   - **Compute**: CPU/memory usage

---

## Part 6: Custom Domain

### Add Custom Domain to Vercel

1. In Vercel dashboard:
   - Project → Settings → Domains
   - Add domain: `api.nigeriandirectory.com`

2. Choose DNS provider:
   - **Vercel Nameservers** (recommended)
   - **External DNS** (manual CNAME)

3. Update DNS records:

```
Type: CNAME
Name: api
Value: cname.vercel-dns.com
TTL: 3600
```

4. Verify DNS:

```bash
dig api.nigeriandirectory.com
nslookup api.nigeriandirectory.com
```

---

## Part 7: Monitoring & Maintenance

### Real-time Monitoring

```bash
# Watch logs
vercel logs --prod --follow

# Error logs only
vercel logs --prod --level error

# View last 100 lines
vercel logs --prod --lines 100
```

### Performance Monitoring

1. **Vercel Analytics**:
   - Response times
   - Request volume
   - Error rates
   - Regional distribution

2. **Neon Monitoring**:
   - Query performance
   - Connection count
   - Database size
   - CPU usage

### Set up Alerts

**Vercel**:
- Go to Settings → Alerts
- Set up notifications for:
  - High error rate (> 1%)
  - Slow response times (> 1s)
  - Deployment failures

**Neon**:
- Project Settings → Alerts
- Set up notifications for:
  - Query slowness
  - Connection limits
  - Storage usage

---

## Part 8: Troubleshooting

### Connection Issues

```bash
# Test database connection
npm run test:db

# Check environment variables
vercel env list

# View logs for connection errors
vercel logs --prod --level error
```

### Common Issues & Solutions

**Issue**: `ECONNREFUSED - Database connection failed`
- **Cause**: Wrong DB credentials or host
- **Fix**: Verify `DB_HOST`, `DB_PASSWORD` in Vercel env

**Issue**: `TimeoutError - Connection timeout`
- **Cause**: Network or firewall issue
- **Fix**: Check Neon IP allowlist settings

**Issue**: `502 Bad Gateway`
- **Cause**: Server crashed or timeout
- **Fix**: Check logs: `vercel logs --prod --level error`

**Issue**: `SSL error: certificate problem`
- **Cause**: SSL certificate issue
- **Fix**: Vercel handles SSL, check domain config

---

## Part 9: Database Backups

### Automatic Backups (Neon)

Neon automatically backs up your database:
- Keeps 7-day backup history
- Point-in-time recovery available
- Backups are automatic

### Manual Export

```bash
# Export database
pg_dump postgresql://user:password@host/dbname > backup.sql

# Import backup
psql postgresql://user:password@host/dbname < backup.sql
```

---

## Part 10: Scaling

### Vercel Auto-scaling

Vercel automatically scales your serverless functions:
- No configuration needed
- Handles traffic spikes
- No cold start (after first invocation)

### Neon Auto-scaling

Neon automatically adjusts compute resources:
- CPU scales based on demand
- No manual intervention needed
- Monitor in Neon console

---

## Part 11: Cost Optimization

### Vercel Costs

- **Free tier**: 100 GB bandwidth/month
- **Pro**: $20/month + overage
- **Team**: $150/month + overage

### Neon Costs

- **Free tier**: 3 GB storage, 1 branch
- **Pro**: $15/month + overage
- **Enterprise**: Custom pricing

### Cost Reduction Tips

1. **Connection pooling**: Enabled by default
2. **Query optimization**: Monitor slow queries
3. **Caching**: Use Redis/KV strategically
4. **Database size**: Archive old data

---

## Part 12: Security

### Database Security

✓ SSL/TLS encryption in transit
✓ Password-based authentication
✓ IP allowlist available (Neon Pro)
✓ Encryption at rest

### Application Security

✓ JWT authentication
✓ Rate limiting enabled
✓ CORS configured
✓ Input validation
✓ Security headers

### Secrets Management

✓ Environment variables in Vercel
✓ No secrets in code
✓ Secrets not logged
✓ Automatic rotation (if configured)

---

## Part 13: Deployment Checklist

- [ ] Neon project created
- [ ] Database connection string obtained
- [ ] Environment variables added to Vercel
- [ ] Database migrations completed
- [ ] API endpoints responding
- [ ] Health checks passing
- [ ] Swagger UI accessible
- [ ] Authentication working
- [ ] Search functionality working
- [ ] Monitoring enabled
- [ ] Alerts configured
- [ ] Custom domain added
- [ ] SSL certificate active
- [ ] Team access configured
- [ ] Documentation updated

---

## Part 14: Rollback Procedure

If deployment has issues:

```bash
# View deployments
vercel list

# Rollback to previous version
vercel rollback

# Or specify exact deployment
vercel rollback <deployment-id>

# Verify
curl https://backend-production.vercel.app/health/live
```

---

## Quick Reference

### Useful Commands

```bash
# Deployment
vercel --prod                    # Deploy to production
vercel logs --prod              # View production logs
vercel analytics --prod         # View analytics
vercel list                     # List deployments
vercel rollback                 # Rollback deployment

# Environment
vercel env list                 # List variables
vercel env add KEY              # Add variable
vercel env remove KEY           # Remove variable

# Database
psql postgresql://...           # Connect to Neon
npm run migrate:prod            # Run migrations
npm run seed:prod               # Seed data
```

### URLs & Resources

**Vercel**:
- Dashboard: https://vercel.com/dashboard
- Logs: https://vercel.com/dashboard/logs
- Deployments: https://vercel.com/dashboard/deployments

**Neon**:
- Console: https://console.neon.tech
- Docs: https://neon.tech/docs
- API: https://api-docs.neon.tech

**API**:
- Health: https://api.nigeriandirectory.com/health/live
- Docs: https://api.nigeriandirectory.com/api/docs
- Root: https://api.nigeriandirectory.com/

---

## Support & Help

**Vercel Support**: https://vercel.com/support  
**Neon Support**: https://neon.tech/contact  
**GitHub Issues**: https://github.com/akornuche/NigerianDirectory/issues  

---

**Status**: ✅ PRODUCTION READY  
**Architecture**: Vercel + Neon PostgreSQL  
**Expected Uptime**: 99.9%+  
**Deployment Time**: < 5 minutes  

