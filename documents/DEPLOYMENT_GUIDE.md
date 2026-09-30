# Deployment Guide - NigerianDirectory.com

This guide covers deploying NigerianDirectory to production using Railway (recommended), DigitalOcean, Render, or AWS.

## Quick Reference

| Platform | Cost | Best For | Complexity |
|----------|------|----------|-----------|
| **Railway** | Pay-as-you-go (~$100-300/mo) | Quick start | ⭐ Low |
| **DigitalOcean App Platform** | Flat rate ($12+/mo) | Small deployments | ⭐ Low |
| **Render** | Free tier available | Learning/staging | ⭐ Low |
| **AWS ECS + RDS + ElastiCache** | Variable (~$200+/mo) | Scale & complexity | ⭐⭐⭐ High |

---

## Pre-Deployment Checklist

- [ ] All environment variables documented in `ENVIRONMENT_SETUP.md`
- [ ] All secrets configured in GitHub Actions (see `GITHUB_SECRETS_SETUP.md`)
- [ ] Database migrations tested locally
- [ ] Dockerfiles built and tested locally
- [ ] CI/CD pipeline passing all tests
- [ ] Security headers configured in next.config.js
- [ ] Health check endpoints tested
- [ ] Error tracking (Sentry) configured
- [ ] Backups and disaster recovery plan in place
- [ ] Team trained on deployment procedures

---

## Option 1: Railway (Recommended for First Deploy)

Railway provides the simplest production deployment experience with built-in PostgreSQL and automatic deployments from GitHub.

### 1. Set Up Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (auto-connects your repos)
3. Create a new project

### 2. Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "PostgreSQL"
3. Railway auto-generates connection strings

### 3. Add Redis (Optional)

1. Click "+ New"
2. Select "Redis"

### 4. Deploy Backend Service

1. Click "+ New" → "GitHub Repo"
2. Select `NigerianDirectory` repo
3. Configure build settings:
   - **Root directory**: `backend`
   - **Start command**: `npm start`
4. Add environment variables:
   ```
   NODE_ENV=production
   PORT=5000
   DB_HOST=${{ POSTGRES_HOST }}
   DB_PORT=${{ POSTGRES_PORT }}
   DB_NAME=${{ POSTGRES_DB }}
   DB_USER=${{ POSTGRES_USER }}
   DB_PASSWORD=${{ POSTGRES_PASSWORD }}
   JWT_SECRET=${{ secrets.JWT_SECRET }}
   FRONTEND_URL=${{ secrets.FRONTEND_URL }}
   ```
5. Railway auto-deploys on git push

### 5. Deploy Frontend Service

1. Click "+ New" → "GitHub Repo"
2. Select `NigerianDirectory` repo
3. Configure:
   - **Root directory**: `frontend`
   - **Start command**: `npm start`
   - **Build command**: `npm run build`
4. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}
   NEXT_PUBLIC_SITE_URL=${{ secrets.NEXT_PUBLIC_SITE_URL }}
   ```

### 6. Configure Custom Domain

1. Go to service settings → "Domain"
2. Add your domain (e.g., `api.nigeriandirectory.com`)
3. Update DNS records per Railway instructions

### 7. Run Database Migrations

Once deployed:

```bash
# Connect via Railway CLI
railway up

# Run migrations
npm run migrate

# Create admin user
ADMIN_EMAIL="admin@example.com" \
ADMIN_PASSWORD="$(openssl rand -base64 32)" \
node src/database/setup-admin.js
```

### 8. Monitor & Scale

Railway dashboard shows:
- Memory & CPU usage
- Logs in real-time
- Deployment history
- Scale replicas as needed

---

## Option 2: DigitalOcean App Platform

### 1. Prepare app.yaml

Create `.do/app.yaml` for infrastructure as code:

```yaml
name: nigerian-directory
region: nyc

services:
  - name: backend
    github:
      repo: yourusername/NigerianDirectory
      branch: main
      deploy_on_push: true
    build_command: npm ci
    run_command: npm start
    source_dir: backend
    envs:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "5000"
      - key: DB_HOST
        value: ${db.HOSTNAME}
      - key: DB_PORT
        value: "5432"
      - key: DB_NAME
        value: ${db.USERNAME}_db
      - key: DB_USER
        value: ${db.USERNAME}
      - key: DB_PASSWORD
        value: ${db.PASSWORD}
      - key: JWT_SECRET
        scope: RUN_AND_BUILD_TIME
        value: ${JWT_SECRET}

  - name: frontend
    github:
      repo: yourusername/NigerianDirectory
      branch: main
      deploy_on_push: true
    build_command: npm run build
    run_command: npm start
    source_dir: frontend
    envs:
      - key: NEXT_PUBLIC_API_URL
        value: https://api.nigeriandirectory.com/api
      - key: NEXT_PUBLIC_SITE_URL
        value: https://nigeriandirectory.com
    http_port: 3000

databases:
  - name: db
    engine: PG
    version: "15"
    production: true
```

### 2. Deploy via DigitalOcean CLI

```bash
# Install doctl
brew install doctl

# Authenticate
doctl auth init

# Deploy
doctl apps create --spec .do/app.yaml
```

### 3. Configure with UI

1. [DigitalOcean Console](https://cloud.digitalocean.com/apps)
2. Create new app
3. Connect GitHub repository
4. Configure services and database
5. Deploy

---

## Option 3: Render

### 1. Create render.yaml

```yaml
services:
  - type: web
    name: backend
    runtime: node
    buildCommand: npm ci
    startCommand: npm start
    repo: https://github.com/yourusername/NigerianDirectory
    dir: backend
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        fromSecret: JWT_SECRET

  - type: web
    name: frontend
    runtime: node
    buildCommand: npm run build
    startCommand: npm start
    repo: https://github.com/yourusername/NigerianDirectory
    dir: frontend
    plan: standard

databases:
  - name: postgres
    region: oregon
    plan: standard
```

### 2. Deploy

1. Go to [render.com](https://render.com)
2. Click "New +" → "Blueprint"
3. Connect GitHub repo
4. Point to `render.yaml`
5. Configure secrets
6. Deploy

---

## Option 4: AWS (Enterprise Scale)

For large-scale production deployments:

### Architecture
- **Compute**: ECS Fargate (serverless containers)
- **Database**: RDS PostgreSQL
- **Cache**: ElastiCache Redis
- **DNS**: Route 53
- **CDN**: CloudFront
- **Load Balancing**: Application Load Balancer
- **Monitoring**: CloudWatch
- **Logging**: CloudWatch Logs

### Deployment Steps

1. **Create ECR Repositories**
   ```bash
   aws ecr create-repository --repository-name nigerian-directory-backend
   aws ecr create-repository --repository-name nigerian-directory-frontend
   aws ecr create-repository --repository-name nigerian-directory-crawler
   ```

2. **Push Docker Images**
   ```bash
   # Authenticate Docker with ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   
   # Build and push backend
   docker build -t nigerian-directory-backend:latest backend/
   docker tag nigerian-directory-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/nigerian-directory-backend:latest
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/nigerian-directory-backend:latest
   ```

3. **Create RDS PostgreSQL**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier nigerian-directory-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --allocated-storage 20 \
     --master-username postgres \
     --master-user-password <strong-password>
   ```

4. **Create ECS Cluster and Services** (via CloudFormation or Terraform)

---

## GitHub Actions Automated Deployment

Update `.github/workflows/deploy.yml` to automatically deploy on main branch pushes:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      # Deploy backend
      - name: Deploy Backend to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway up --service backend
      
      # Deploy frontend
      - name: Deploy Frontend to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        run: |
          npm install -g vercel
          cd frontend
          vercel deploy --prod --token=$VERCEL_TOKEN
      
      # Run smoke tests
      - name: Smoke Tests
        run: |
          curl -f https://api.nigeriandirectory.com/health || exit 1
          curl -f https://nigeriandirectory.com/ || exit 1
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Backend health
curl https://api.nigeriandirectory.com/health

# Frontend availability
curl https://nigeriandirectory.com/
```

### 2. Database Verification

```bash
# Connect to production database
psql postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Check admin user exists
SELECT * FROM users WHERE role = 'admin' LIMIT 1;

# Check school data
SELECT COUNT(*) FROM schools;
```

### 3. Logging

Check logs for errors:

```bash
# Railway
railway logs --service backend

# DigitalOcean
doctl apps logs <app-id>

# Render
render logs <service-id>
```

### 4. Performance Baseline

Test response times:

```bash
# API response time
time curl https://api.nigeriandirectory.com/api/schools?limit=10

# Frontend page load
lighthouse https://nigeriandirectory.com --view
```

---

## Scaling Strategy

### Vertical Scaling (More Powerful Servers)
- Increase instance size
- Best for: Simple deployments, I/O-bound workloads

### Horizontal Scaling (More Servers)
- Deploy multiple service replicas
- Add load balancer
- Best for: CPU-bound, high-traffic applications

### Database Scaling
- Read replicas for read-heavy workloads
- Connection pooling
- Caching layer (Redis)

### Recommended for NigerianDirectory
1. **Stage 1** (Initial): Single instance for each service
2. **Stage 2** (10k+ requests/day): Add load balancer, 2 backend replicas
3. **Stage 3** (50k+ requests/day): Add database read replica, Redis cache
4. **Stage 4** (100k+ requests/day): CDN, advanced caching, auto-scaling groups

---

## Monitoring & Alerting

### Key Metrics to Monitor

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| CPU Usage | > 80% | Scale up or optimize code |
| Memory Usage | > 85% | Scale up or identify leaks |
| Database Connections | > 80% of pool | Increase pool size or add read replicas |
| API Response Time | > 500ms p95 | Identify slow queries, add caching |
| Error Rate | > 1% | Check logs, roll back if recent deploy |
| Disk Space | > 80% | Add storage or clean old logs |

### Recommended Tools
- **Monitoring**: Datadog, New Relic, CloudWatch
- **Logging**: ELK Stack, Splunk, CloudWatch Logs
- **Error Tracking**: Sentry, Rollbar, Honeybadger
- **Status Page**: Statuspage.io, Freshstatus

---

## Disaster Recovery

### Backup Strategy

1. **Database**: Automated daily backups, retained for 30 days
2. **Code**: GitHub provides version history
3. **Static Assets**: CDN caching with automatic invalidation

### Recovery Procedures

**Database corruption detected:**
```bash
# Restore from latest backup
# (Platform-specific, consult provider)
```

**Service down:**
```bash
# Check health endpoint
curl https://api.nigeriandirectory.com/health

# Check logs for errors
railway logs

# Rollback to previous version
git revert <commit-hash>
git push main
```

**DDoS attack:**
```bash
# Enable DDoS protection (platform-specific)
# Railway: Auto-enabled
# AWS: AWS Shield, WAF
# DigitalOcean: Cloudflare integration
```

---

## Cost Optimization

### Reduce Costs While Maintaining Quality

1. **Use appropriate instance sizes**: Start small, scale as needed
2. **Enable auto-scaling**: Pay only for what you use
3. **Optimize database queries**: Reduce database load
4. **Implement caching**: Reduce database hits
5. **Use CDN**: Reduce bandwidth costs
6. **Archive old logs**: Remove unnecessary storage
7. **Monitor resource usage**: Identify waste

### Estimated Monthly Costs

| Component | Railway | DigitalOcean | AWS |
|-----------|---------|--------------|-----|
| Compute | $25-50 | $12 | $50-100 |
| Database | $15-30 | $15 | $30-50 |
| Redis | $0-20 | $0 | $20-40 |
| CDN | $5-10 | $0 | $10-20 |
| **Total** | **$45-110** | **$27-39** | **$110-210** |

---

## Troubleshooting Deployment Issues

### Build Fails

**Check logs:**
```bash
railway logs --service backend
```

**Common issues:**
- Missing Node.js version in package.json
- Missing environment variables during build
- npm install failures (lock file mismatch)

**Solution:**
```bash
# Rebuild lock files
npm ci
git push origin main
```

### Application Crashes After Deploy

**Check health endpoint:**
```bash
curl https://api.nigeriandirectory.com/health
```

**Check logs:**
```bash
railway logs --follow --service backend
```

**Common issues:**
- Database connection failure (wrong credentials)
- Missing environment variables
- Port already in use

**Solution:**
```bash
# Check environment variables are set
railway variables

# Rollback to previous version
git revert <commit-hash>
git push origin main
```

### Database Connection Issues

**Test connection:**
```bash
psql postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME -c "SELECT 1"
```

**Check firewall:**
```bash
# Ensure your IP is whitelisted
# Platform-specific (check console)
```

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Render Deployment Docs](https://render.com/docs)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
