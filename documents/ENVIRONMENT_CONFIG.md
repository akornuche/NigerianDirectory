# Environment Configuration Guide

## Overview

This guide documents all environment variables required for NigerianDirectory deployment across development, staging, and production environments.

**Status**: Phase 3 ✅ Complete

## Environment Variables

### Backend Configuration

#### Core Application
| Variable | Required | Development | Staging | Production | Description |
|----------|----------|-------------|---------|------------|---|
| `NODE_ENV` | ✓ | `development` | `staging` | `production` | Node environment mode |
| `PORT` | ✓ | `5000` | `5000` | `5000` or from Railway/Platform | API server port |
| `LOG_LEVEL` | | `debug` | `info` | `error` | Logging level (debug, info, warn, error) |
| `JWT_SECRET` | ✓ | Min 32 chars | Min 32 chars | Min 32 chars, rotated | JWT signing secret |

#### Database Configuration
| Variable | Required | Development | Staging | Production | Description |
|----------|----------|-------------|---------|------------|---|
| `DB_HOST` | ✓ | `localhost` | Staging RDS | Production RDS | PostgreSQL host |
| `DB_PORT` | ✓ | `5432` | `5432` | `5432` | PostgreSQL port |
| `DB_NAME` | ✓ | `nigerian_directory` | `nigerian_directory_staging` | `nigerian_directory_prod` | Database name |
| `DB_USER` | ✓ | `postgres` | Staging user | Prod user | Database username |
| `DB_PASSWORD` | ✓ | `postgres` | Strong password | Strong password | Database password |
| `DB_SSL` | | `false` | `true` | `true` | Require SSL connections |
| `DB_POOL_MIN` | | `5` | `10` | `20` | Minimum pool connections |
| `DB_POOL_MAX` | | `20` | `50` | `100` | Maximum pool connections |

#### Redis Configuration
| Variable | Required | Development | Staging | Production | Description |
|----------|----------|-------------|---------|------------|---|
| `REDIS_HOST` | ✓ | `localhost` | Staging Redis | Production Redis | Redis host |
| `REDIS_PORT` | ✓ | `6379` | `6379` | `6379` | Redis port |
| `REDIS_PASSWORD` | | Not set | Set | Set | Redis password (production only) |
| `REDIS_DB` | | `0` | `1` | `2` | Redis database number |
| `REDIS_TLS` | | `false` | `true` | `true` | Require TLS connections |

#### Frontend Integration
| Variable | Required | Development | Staging | Production | Description |
|----------|----------|-------------|---------|------------|---|
| `FRONTEND_URL` | ✓ | `http://localhost:3000` | Staging URL | Production URL | Frontend application URL |
| `CORS_ORIGINS` | | Not set | Staging URL | Prod URL (comma-separated) | Additional CORS origins |

#### Email Configuration (Optional)
| Variable | Required | Development | Staging | Production | Description |
|----------|----------|-------------|---------|------------|---|
| `EMAIL_SERVICE` | | `smtp` | `smtp` | `smtp` | Email service type |
| `EMAIL_HOST` | | `localhost` | SendGrid | SendGrid | SMTP host |
| `EMAIL_PORT` | | `1025` | `587` | `587` | SMTP port |
| `EMAIL_USER` | | Not set | SendGrid API key | SendGrid API key | Email account |
| `EMAIL_PASSWORD` | | Not set | SendGrid API key | SendGrid API key | Email password |
| `EMAIL_FROM` | | `noreply@localhost` | `noreply@nigeriandirectory.com` | `noreply@nigeriandirectory.com` | From email address |

#### Monitoring & Logging (Optional)
| Variable | Required | Development | Staging | Production | Description |
|----------|----------|-------------|---------|------------|---|
| `SENTRY_DSN` | | Not set | Optional | Recommended | Sentry error tracking DSN |
| `PROMETHEUS_ENABLED` | | `false` | `true` | `true` | Enable Prometheus metrics |
| `LOG_FORMAT` | | `text` | `json` | `json` | Log output format |

---

### Frontend Configuration

#### Build-Time Configuration
| Variable | Required | Development | Staging | Production | Description |
|----------|----------|-------------|---------|------------|---|
| `REACT_APP_API_URL` | ✓ | `http://localhost:5000/api` | Staging API | Production API | Backend API base URL |
| `REACT_APP_ENV` | ✓ | `development` | `staging` | `production` | Environment name |
| `REACT_APP_GOOGLE_MAPS_KEY` | ✓ | Dev key | Staging key | Production key | Google Maps API key |

#### Runtime Configuration (If Used)
```javascript
// frontend/public/config.js (optional for runtime config)
window.CONFIG = {
    API_URL: process.env.REACT_APP_API_URL,
    ENV: process.env.REACT_APP_ENV
};
```

---

## Setup Instructions

### Development Environment

#### 1. Backend Setup
```bash
cd backend
cp .env.example .env

# Edit .env with development values
cat .env
```

**Sample `.env` for Development**:
```
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nigerian_directory
DB_USER=postgres
DB_PASSWORD=postgres
DB_POOL_MIN=5
DB_POOL_MAX=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Frontend
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=your_dev_jwt_secret_minimum_32_characters_long_123456
```

#### 2. Create Database
```bash
# PostgreSQL
createdb nigerian_directory

# Or using psql
psql -U postgres -c "CREATE DATABASE nigerian_directory;"
```

#### 3. Start Services
```bash
# Terminal 1: PostgreSQL
# (Usually already running)

# Terminal 2: Redis
redis-server

# Terminal 3: Backend
cd backend
npm install
npm run migrate
npm run seed:schools
npm run dev

# Terminal 4: Frontend
cd frontend
npm install
npm start
```

### Staging Environment

#### 1. Set Environment Variables in Deployment Platform

**Railway** (Recommended):
```bash
# Via Railway CLI
railway variables set NODE_ENV=staging
railway variables set DB_HOST=<staging-db-host>
# ... set all variables

# Or via Railway Dashboard
# Project → Variables → Add each variable
```

**DigitalOcean App Platform**:
```yaml
# app.yaml
envs:
  - key: NODE_ENV
    value: staging
  - key: DB_HOST
    value: ${db.hostname}
  # ... add all variables
```

#### 2. Database Setup
```bash
# Via deployment platform CLI or UI
createdb nigerian_directory_staging

# Run migrations
npm run migrate
```

#### 3. Verify Configuration
```bash
# SSH into staging and verify
curl http://staging-api/health

# Check environment variables are loaded
curl http://staging-api/config (if endpoint exists)
```

### Production Environment

#### 1. Database Setup
```bash
# Use managed database service (RDS, DigitalOcean Managed DB, etc.)
# Create database:
# - Name: nigerian_directory_prod
# - User: dedicated prod user
# - Password: strong password (40+ characters)
# - SSL: Required
# - Backups: Daily

# Connection string format (for verification):
postgresql://user:password@host:5432/nigerian_directory_prod?sslmode=require
```

#### 2. Redis Setup
```bash
# Use managed Redis service
# - Name: nigerian-directory-redis
# - Password: strong password (40+ characters)
# - TLS: Enabled
# - Persistence: Enabled (AOF or RDB)
# - Backups: Automatic

# Connection format:
redis://:<password>@host:6379
```

#### 3. Set Environment Variables

**Railway Deployment**:
```bash
railway variables set \
  NODE_ENV=production \
  DB_HOST=<prod-rds-host> \
  DB_PORT=5432 \
  DB_NAME=nigerian_directory_prod \
  DB_USER=<prod-db-user> \
  DB_PASSWORD=<prod-db-password> \
  DB_SSL=true \
  DB_POOL_MIN=20 \
  DB_POOL_MAX=100 \
  REDIS_HOST=<prod-redis-host> \
  REDIS_PORT=6379 \
  REDIS_PASSWORD=<prod-redis-password> \
  REDIS_TLS=true \
  FRONTEND_URL=https://nigeriandirectory.com \
  JWT_SECRET=<production-jwt-secret-40-chars> \
  SENTRY_DSN=<sentry-dsn> \
  LOG_LEVEL=error
```

#### 4. Verify Production Configuration
```bash
# Test health endpoint
curl https://api.nigeriandirectory.com/health

# Check logs for validation
railway logs

# Verify no default values are used
# (JWT_SECRET, DB_PASSWORD should not be defaults)
```

---

## Environment Validation

### Automatic Validation

The backend automatically validates environment variables on startup:

```
✅ Environment validation passed
```

### Common Validation Errors

#### Missing Required Variable
```
❌ CRITICAL: Missing production environment variables: DB_HOST, DB_USER
```

**Solution**: Add missing variables to environment configuration

#### Invalid JWT_SECRET
```
❌ CRITICAL: JWT_SECRET must be at least 32 characters
```

**Solution**: Generate strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Invalid FRONTEND_URL
```
❌ CRITICAL: FRONTEND_URL is not a valid URL
```

**Solution**: Ensure FRONTEND_URL is a valid URL format:
```
https://nigeriandirectory.com  ✓
https://frontend.example.com   ✓
http://localhost:3000          ✓ (dev only)
nigeriandirectory.com          ✗ (missing protocol)
```

#### Port Out of Range
```
❌ CRITICAL: PORT must be a valid port number (1-65535)
```

**Solution**: Set PORT to a valid number between 1-65535

---

## Configuration by Environment

### Development
- Loose validation (some optional variables can be missing)
- Verbose logging (DEBUG level)
- No TLS required for database/Redis
- Single CORS origin allowed
- Email can be mocked

### Staging
- Production-like configuration
- Info level logging
- TLS enabled for database/Redis
- Multiple CORS origins can be tested
- Email configured (usually test account)

### Production
- Strict validation (all required variables must be set)
- Error-only logging
- TLS required for all connections
- Single CORS origin (frontend domain)
- Email configured for real service
- Monitoring and error tracking enabled

---

## Secrets Management

### GitHub Actions Secrets

Store sensitive variables in GitHub Secrets:

```bash
# Via GitHub CLI
gh secret set DB_PASSWORD -b "$(openssl rand -base64 32)"
gh secret set JWT_SECRET -b "$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
gh secret set REDIS_PASSWORD -b "$(openssl rand -base64 32)"

# Or via GitHub Web UI:
# Settings → Secrets and variables → Actions → New repository secret
```

### Deployment Platform Secrets

**Railway**:
```bash
# Use Railway Vault for sensitive variables
railway variables:encrypt DB_PASSWORD <value>
```

**DigitalOcean**:
```bash
# Secrets are encrypted at rest
# Configure via UI or doctl CLI
doctl apps create --spec app.yaml
```

### Local Development

**NEVER commit `.env` file**:
```bash
# .gitignore already includes
.env
.env.*.local
.env.*.production
```

**Use `.env.example` template**:
```bash
cp .env.example .env
# Edit .env with local values
```

---

## Rotating Secrets

### JWT_SECRET Rotation

When rotating JWT_SECRET:

1. Deploy new secret in production
2. All new tokens use new secret
3. Old tokens remain valid for their TTL (1 hour for access, 7 days for refresh)
4. Users automatically get new tokens on refresh
5. After 7 days, all old tokens expire

```bash
# Generate new secret
NEW_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')

# Deploy
railway variables set JWT_SECRET="$NEW_SECRET"

# Verify deployment
railway logs | grep "Environment validation"
```

### Database Password Rotation

When rotating database password:

1. Create new user or change existing user password in database
2. Update `DB_PASSWORD` environment variable
3. Verify connection works
4. Update backup procedures with new password

```bash
# PostgreSQL password change
psql -U postgres -c "ALTER USER prod_user WITH PASSWORD 'new_password';"

# Update environment
railway variables set DB_PASSWORD="new_password"
```

### Redis Password Rotation

Similar to database password rotation:

```bash
# Update Redis password
# (via managed service UI or redis-cli)

# Update environment
railway variables set REDIS_PASSWORD="new_password"
```

---

## Configuration Checklist

### Before Production Deployment

- [ ] All required environment variables are set
- [ ] No default or example values used for production
- [ ] JWT_SECRET is strong (40+ characters)
- [ ] Database password is strong (40+ characters)
- [ ] Redis password is strong (40+ characters)
- [ ] FRONTEND_URL points to production domain
- [ ] Database SSL is enabled
- [ ] Redis TLS is enabled
- [ ] Connection pool sizes are optimized
- [ ] LOG_LEVEL is set to `error`
- [ ] Monitoring (SENTRY_DSN) is configured
- [ ] Email configuration is correct
- [ ] Database backups are configured
- [ ] All variables documented in README

### Before Staging Deployment

- [ ] Staging database exists and is isolated
- [ ] Staging Redis instance is separate
- [ ] All required variables are configured
- [ ] Database SSL is enabled
- [ ] Redis TLS is enabled
- [ ] Staging FRONTEND_URL is set correctly
- [ ] Email configuration uses staging account

---

## Verification

### Test Environment Variables

```bash
# Backend: Check environment validation
npm start

# Should output:
# ✅ Environment validation passed
# 📍 CORS origin configured to: http://localhost:3000
# ... other startup messages
```

### Test Database Connection

```bash
# In backend directory
node -e "
const { pool } = require('./src/config/database');
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Database connected'))
  .catch(e => console.error('❌ Database error:', e.message));
"
```

### Test Redis Connection

```bash
# In backend directory
node -e "
const { redis } = require('./src/config/redis');
redis.ping()
  .then(r => console.log('✅ Redis connected:', r))
  .catch(e => console.error('❌ Redis error:', e.message));
"
```

### Test CORS Configuration

```bash
# Test CORS headers
curl -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost:5000/api/schools -v
```

---

## Troubleshooting

### "Cannot find module" errors on startup
- [ ] Run `npm install` after environment setup
- [ ] Check `NODE_ENV` is set correctly
- [ ] Verify all required files exist

### Database connection timeout
- [ ] Verify `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- [ ] Check database is running: `pg_isready -h $DB_HOST`
- [ ] Verify network connectivity (VPN, firewall, security groups)
- [ ] Check database user has correct permissions

### Redis connection timeout
- [ ] Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- [ ] Check Redis is running: `redis-cli ping`
- [ ] Verify network connectivity

### CORS errors in frontend
- [ ] Check `FRONTEND_URL` matches actual frontend URL
- [ ] Verify frontend is being served from that URL
- [ ] Check for proxy configuration differences

### JWT token errors
- [ ] Verify `JWT_SECRET` is the same across all instances
- [ ] Check token hasn't expired (access: 1h, refresh: 7d)
- [ ] Verify token wasn't revoked (logout)

---

## References

- [Express.js Environment Configuration](https://expressjs.com/en/advanced/best-practice-performance.html#set-node_env-to-production)
- [Node.js Environment Variables](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Redis Connection Strings](https://redis.io/docs/manual/client-side-caching/protocol/#inline-commands)

---

**Last Updated**: September 2026
**Status**: Phase 3 (Environment Configuration) ✅ Complete
