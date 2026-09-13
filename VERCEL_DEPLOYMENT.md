# Vercel Deployment Guide

**Status**: Ready for Production  
**Last Updated**: September 12, 2026  
**Target**: https://api.nigeriandirectory.com

---

## Prerequisites

1. **Vercel Account**
   - Created at https://vercel.com
   - Team access configured

2. **Vercel CLI**
   ```bash
   npm install -g vercel
   vercel --version  # Should show 58.9.0+
   ```

3. **GitHub Repository**
   - Code pushed to GitHub
   - All branches up to date

4. **Environment Variables**
   - All secrets configured in Vercel
   - No secrets in code

---

## Deployment Steps

### Step 1: Login to Vercel

```bash
# Login to your Vercel account
vercel login

# You'll be prompted to authenticate
# Choose authentication method:
# - GitHub (recommended)
# - GitLab
# - Bitbucket
# - Email
```

### Step 2: Set Project Configuration

```bash
# Navigate to backend directory
cd backend

# Link project to Vercel
vercel link

# This will:
# - Create/link project on Vercel
# - Set up Git integration
# - Configure deployment settings
```

### Step 3: Configure Environment Variables

```bash
# Set all required environment variables
vercel env add JWT_SECRET
vercel env add DB_HOST
vercel env add DB_PORT
vercel env add DB_NAME
vercel env add DB_USER
vercel env add DB_PASSWORD
vercel env add REDIS_HOST
vercel env add REDIS_PORT
vercel env add FRONTEND_URL
vercel env add PORT

# Verify environment variables
vercel env list
```

**Environment Variables Needed:**
```
JWT_SECRET=<32+ character secure string>
DB_HOST=<PostgreSQL host>
DB_PORT=5432
DB_NAME=nigerian_directory
DB_USER=postgres
DB_PASSWORD=<secure password>
REDIS_HOST=<Redis host>
REDIS_PORT=6379
FRONTEND_URL=https://nigeriandirectory.com
PORT=3000
NODE_ENV=production
```

### Step 4: Deploy to Production

```bash
# Deploy to production
vercel --prod

# This will:
# - Build the application
# - Run tests
# - Deploy to Vercel edge network
# - Assign production URL

# Output will show:
# ✓ Deployed to https://api.nigeriandirectory.com
```

### Step 5: Verify Deployment

```bash
# Check deployment status
curl https://api.nigeriandirectory.com/health/live
# Should return: {"status": "alive"}

# Check API is responding
curl https://api.nigeriandirectory.com/
# Should return: API version and endpoints

# View deployment logs
vercel logs --prod

# Monitor performance
vercel analytics --prod
```

---

## Environment Variables Setup

### Via Vercel CLI

```bash
# Add individual variables
vercel env add JWT_SECRET
# You'll be prompted to enter value

# View all variables
vercel env list

# Remove a variable
vercel env remove JWT_SECRET
```

### Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select "nigerian-directory-api" project
3. Click "Settings" → "Environment Variables"
4. Add each variable:
   - Key: `JWT_SECRET`
   - Value: `<32+ char secure string>`
   - Select environments: "Production"
5. Repeat for all variables
6. Save and redeploy

---

## Deployment Verification

### Health Checks

```bash
# Check API liveness
curl https://api.nigeriandirectory.com/health/live
# Expected: {"status": "alive", "timestamp": "2026-09-16T..."}

# Check API readiness
curl https://api.nigeriandirectory.com/health/ready
# Expected: {"status": "healthy", "services": {"database": "connected", "redis": "connected"}}

# Check API root
curl https://api.nigeriandirectory.com/
# Expected: API info with version and endpoints

# Check Swagger UI
curl https://api.nigeriandirectory.com/api/docs
# Should return HTML with Swagger interface
```

### Performance Checks

```bash
# Test response time
time curl https://api.nigeriandirectory.com/api/schools?pageSize=1

# Test search endpoint
curl https://api.nigeriandirectory.com/api/schools?search=international

# Test authentication
curl -X POST https://api.nigeriandirectory.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"Test123"}'
```

---

## Rollback Procedure

If deployment fails:

```bash
# View recent deployments
vercel list

# Rollback to previous version
vercel rollback

# Specify deployment to restore
vercel rollback <deployment-id>

# Verify rollback successful
curl https://api.nigeriandirectory.com/health/live
```

---

## Monitoring

### View Logs

```bash
# Real-time logs
vercel logs --prod --follow

# Last 100 log entries
vercel logs --prod --lines 100

# Filter by level
vercel logs --prod --level error
```

### Performance Analytics

```bash
# View analytics
vercel analytics --prod

# Check performance metrics
# - Response times
# - Error rates
# - Throughput
```

### Status Page

Visit: https://vercel.com/status

---

## Auto-Deployment Setup

### GitHub Integration (Recommended)

1. Connect GitHub repository to Vercel:
   ```bash
   vercel link
   # Select GitHub integration
   ```

2. Automatic deployments on push:
   - Push to `main` → Deploy to staging
   - Create pull request → Deploy to preview
   - Merge to `main` → Deploy to production

3. Configure branch deployment:
   - Production: `main`
   - Preview: `develop`, `feature/*`
   - Ignore: `docs/*`, `*.md`

### GitHub Actions Integration

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to Vercel
        uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## Custom Domain Setup

### Add Domain to Vercel

1. Go to Vercel dashboard
2. Project → Settings → Domains
3. Add domain: `api.nigeriandirectory.com`
4. Choose DNS provider:
   - **Vercel Nameservers** (recommended)
   - **External DNS** (manual)

### Update DNS Records

If using external DNS:

```
Type: CNAME
Name: api
Value: api-nigerian-directory-api.vercel.app
TTL: 3600
```

Or for root domain:

```
Type: A
Name: @
Value: 76.76.19.165 (Vercel IP)
TTL: 3600
```

### Verify Domain

```bash
# Check DNS propagation
dig api.nigeriandirectory.com

# Test HTTPS
curl https://api.nigeriandirectory.com/health/live
```

---

## Security Checklist

- [ ] All environment variables stored in Vercel (not in code)
- [ ] JWT secret is 32+ characters, secure
- [ ] Database credentials are strong
- [ ] No hardcoded secrets in repository
- [ ] HTTPS enforced for all endpoints
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers configured

---

## Performance Optimization

### Build Optimization

```bash
# Check build size
vercel build

# Optimize dependencies
npm audit
npm update

# Remove unused packages
npm prune --production
```

### Runtime Optimization

1. **Connection Pooling**: Enabled in database config
2. **Caching**: Redis configured
3. **Compression**: gzip enabled
4. **CDN**: Vercel edge network
5. **Monitoring**: Analytics enabled

---

## Troubleshooting

### Deployment Fails

**Check logs:**
```bash
vercel logs --prod --level error
```

**Common issues:**
- Missing environment variables → Add to Vercel dashboard
- Build errors → Check `npm run build`
- Port already in use → Change PORT variable
- Database connection → Verify credentials

### Slow Response Times

```bash
# Check analytics
vercel analytics --prod

# Identify slow endpoints
# Optimize database queries
# Check cache hit rates
```

### 502 Bad Gateway

- Database connection issue
- Memory exhausted
- Process crashed
- Check logs: `vercel logs --prod`

---

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Check error logs
- [ ] Monitor performance metrics
- [ ] Verify health checks passing

**Monthly:**
- [ ] Review analytics
- [ ] Update dependencies
- [ ] Check security alerts
- [ ] Test disaster recovery

---

## Team Collaboration

### Share Project Access

```bash
# Add team member
vercel teams create <name>
vercel teams add <email> <team>

# Grant project access
# Via dashboard: Project → Settings → Team Access
```

### Deployment Notifications

Configure in Vercel dashboard:
- Slack notifications
- Email alerts
- GitHub status checks

---

## Post-Deployment Checklist

- [ ] API responding to requests
- [ ] Health checks passing
- [ ] Database connected
- [ ] Redis available
- [ ] Swagger UI accessible
- [ ] Monitoring active
- [ ] Logs flowing
- [ ] Error rate < 0.1%
- [ ] Response time < 500ms
- [ ] Users reporting success

---

## Rollback Checklist

If problems detected:

- [ ] Identify the issue
- [ ] Check deployment logs
- [ ] Run health checks
- [ ] Execute rollback
- [ ] Verify old version working
- [ ] Investigate root cause
- [ ] Plan fix
- [ ] Deploy again

---

## URLs & Resources

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Project**: https://vercel.com/dashboard/projects
- **Deployment**: https://vercel.com/deployments
- **Settings**: https://vercel.com/settings
- **API Status**: https://vercel.com/status
- **Documentation**: https://vercel.com/docs

---

## Support

**Vercel Support**: https://vercel.com/support  
**CLI Help**: `vercel --help`  
**Contact**: support@vercel.com  

---

**Deployment Status**: ✅ READY  
**Environment**: Production  
**Expected Uptime**: 99.9%+  

