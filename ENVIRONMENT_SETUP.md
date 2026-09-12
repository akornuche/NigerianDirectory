# Environment Configuration Guide

**CRITICAL SECURITY NOTE**: Never commit `.env` files or secrets to the repository. All `.env` files are in `.gitignore` and should remain local or in a secure secrets management system.

## Quick Start for Local Development

### 1. Copy Environment Templates

```bash
# Root directory
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# Crawler
cp crawler/.env.example crawler/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

### 2. Fill in Local Development Values

Edit each `.env` file with your local development settings:

```bash
# .env (root)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nigerian_directory
DB_USER=postgres
DB_PASSWORD=localdevpassword
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=local-dev-secret-at-least-32-chars-long-and-random
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Initialize Database

```bash
# Start PostgreSQL container (if using Docker)
docker-compose up -d postgres

# Run migrations
cd backend
npm run migrate

# Create initial admin user
ADMIN_EMAIL="admin@local.com" \
ADMIN_PASSWORD="SecurePassword123!" \
node src/database/setup-admin.js
```

### 4. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Terminal 3: Crawler (optional)
cd crawler
pip install -r requirements.txt
python scheduler.py
```

---

## Environment Variables Reference

### Database Configuration

| Variable | Required | Development | Production | Description |
|----------|----------|-------------|-----------|-------------|
| `DB_HOST` | Yes | `localhost` | RDS endpoint | PostgreSQL host |
| `DB_PORT` | Yes | `5432` | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | `nigerian_directory` | `nigerian_directory` | Database name |
| `DB_USER` | Yes | `postgres` | `service_user` | Database user |
| `DB_PASSWORD` | Yes | any value | **Strong random** | Database password |

### Redis Configuration

| Variable | Required | Development | Production | Description |
|----------|----------|-------------|-----------|-------------|
| `REDIS_HOST` | No | `localhost` | Redis Cloud endpoint | Redis host |
| `REDIS_PORT` | No | `6379` | `6379` | Redis port |
| `REDIS_PASSWORD` | No | empty | **Strong random** | Redis password |

### Backend Configuration

| Variable | Required | Development | Production | Description |
|----------|----------|-------------|-----------|-------------|
| `PORT` | No | `5000` | `3000` (or platform-specific) | Backend port |
| `NODE_ENV` | Yes | `development` | **`production`** | Environment mode |
| `JWT_SECRET` | **Yes** | any 32+ chars | **Cryptographically secure** | JWT signing key |
| `JWT_EXPIRES_IN` | No | `7d` | `7d` or shorter | Token expiration |
| `FRONTEND_URL` | No* | `http://localhost:3000` | **Production domain** | Frontend URL for CORS |

*Required in production

### Frontend Configuration

| Variable | Required | Visibility | Description |
|----------|----------|-----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Public | Backend API URL |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public | Frontend site URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Public | Google Maps key |
| `NEXT_PUBLIC_GOOGLE_ADSENSE_ID` | No | Public | AdSense account ID |

### Crawler Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `CRAWLER_USER_AGENT` | No | HTTP User-Agent header |
| `CRAWLER_DELAY` | No | Delay between requests (seconds) |
| `CRAWLER_MAX_RETRIES` | No | Retry attempts for failed requests |
| `OPENAI_API_KEY` | No | For content enrichment |

---

## Production Deployment

### Prerequisites

1. **Secure Credential Management**: Never store production secrets in `.env` files
2. **Choose a Deployment Platform**: Railway, DigitalOcean, Render, AWS, or similar
3. **Set Up Managed Database**: PostgreSQL service (AWS RDS, DigitalOcean, Railway)
4. **Set Up Managed Redis** (optional): Redis Cloud, AWS ElastiCache, or similar

### GitHub Actions Setup

Store all production secrets in GitHub Actions:

```bash
# Navigate to: Settings > Secrets and variables > Actions > New repository secret

# Add each secret:
- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASSWORD
- REDIS_HOST
- REDIS_PORT
- REDIS_PASSWORD
- JWT_SECRET (generate with: openssl rand -base64 32)
- FRONTEND_URL
- NEXT_PUBLIC_API_URL
```

### Generate Secure Secrets

```bash
# Generate JWT Secret (minimum 32 chars)
openssl rand -base64 32

# Generate strong password
openssl rand -base64 24

# Generate PostgreSQL password
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Initial Deployment Steps

1. **Deploy infrastructure** (Database, Redis)
2. **Configure secrets** in deployment environment
3. **Run database migrations**:
   ```bash
   npm run migrate
   ```
4. **Create admin user**:
   ```bash
   ADMIN_EMAIL="admin@yourdomain.com" \
   ADMIN_PASSWORD="$(openssl rand -base64 32)" \
   node src/database/setup-admin.js
   ```
5. **Save admin credentials** in secure vault (1Password, LastPass, etc.)
6. **Deploy application** via GitHub Actions or platform CI/CD
7. **Verify health check**: `https://api.yourdomain.com/health`

### Environment-Specific Values

#### Staging Environment

```
NODE_ENV=staging
FRONTEND_URL=https://staging.nigeriandirectory.com
NEXT_PUBLIC_API_URL=https://api-staging.nigeriandirectory.com/api
```

#### Production Environment

```
NODE_ENV=production
FRONTEND_URL=https://nigeriandirectory.com
NEXT_PUBLIC_API_URL=https://api.nigeriandirectory.com/api
```

---

## Security Checklist

- [ ] All `.env` files are in `.gitignore`
- [ ] No secrets committed to git (check git history if unsure)
- [ ] Production credentials stored in GitHub Actions secrets
- [ ] JWT_SECRET is a strong, random 32+ character string
- [ ] Database password is strong and unique
- [ ] FRONTEND_URL is set correctly for CORS validation
- [ ] No localhost URLs used in production configuration
- [ ] Admin credentials saved in secure vault immediately after setup
- [ ] All environment variables validated on startup
- [ ] NODE_ENV set to 'production' for all production deployments

---

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Check environment variables are set
env | grep DB_
```

### CORS Errors in Production

```
❌ Access to XMLHttpRequest blocked by CORS policy
```

**Solution**: Ensure `FRONTEND_URL` matches your frontend domain exactly:

```bash
# Wrong (trailing slash, www mismatch, etc.)
FRONTEND_URL=https://www.nigeriandirectory.com/

# Correct
FRONTEND_URL=https://nigeriandirectory.com
```

### JWT Token Errors

```
❌ Invalid token
❌ JsonWebTokenError
```

**Solution**: Ensure JWT_SECRET is:
1. Set in the environment
2. The same across all server instances
3. At least 32 characters
4. Not the placeholder value

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# If using password:
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

---

## Key Principles

1. **Never commit secrets** - All credentials go in `.env` files which are gitignored
2. **Use `.env.example`** - Document required variables with placeholder values
3. **Validate on startup** - Backend validates critical env vars when NODE_ENV=production
4. **Environment-specific configs** - Different values for dev, staging, production
5. **Secure generation** - Use cryptographically secure methods for secrets
6. **Secrets management** - Use GitHub Actions secrets, not environment files, for production

---

## Additional Resources

- [12-Factor App - Environment Variables](https://12factor.net/config)
- [OWASP - Secrets Management](https://owasp.org/www-community/attacks/Secrets_in_Code)
- [Node.js Best Practices - Security](https://nodejs.org/en/docs/guides/security/)
