# Production Deployment - Vercel + Neon

## Quick Start

### Step 1: Get Neon Credentials

1. Go to https://console.neon.tech
2. Create a new project or select existing one
3. Find your connection details:
   - **Host**: `ep-xxxxx.us-east-1.neon.tech`
   - **Database**: `neon_db` or your database name
   - **User**: `neon_user` or your username
   - **Password**: Your secure password
   - **Port**: `5432`

### Step 2: Create Credentials File

```bash
cd backend

# Copy example to actual credentials file
cp neon-credentials.json.example neon-credentials.json
```

### Step 3: Edit Credentials

Open `backend/neon-credentials.json` and fill in your Neon details:

```json
{
  "DB_HOST": "ep-xxxxx.us-east-1.neon.tech",
  "DB_PORT": "5432",
  "DB_NAME": "nigerian_directory",
  "DB_USER": "neon_user",
  "DB_PASSWORD": "your_actual_password",
  "JWT_SECRET": "generate_a_32_character_random_string",
  "FRONTEND_URL": "https://nigeriandirectory.com",
  "PORT": "3000"
}
```

### Step 4: Deploy

```bash
cd backend
node deploy-with-credentials.js
```

This will:
1. ✓ Validate credentials
2. ✓ Check Vercel authentication
3. ✓ Deploy to Vercel production
4. ✓ Assign production URL

---

## What Happens During Deployment

1. **Build**: Vercel builds your Node.js application
2. **Environment**: Sets all environment variables
3. **Deploy**: Deploys serverless functions to Vercel edge network
4. **DNS**: Assigns production URL (e.g., backend-production.vercel.app)

---

## After Deployment

### 1. Verify API is Live

```bash
# Check health
curl https://your-deployment.vercel.app/health/live

# Expected response:
# {"status": "alive", "timestamp": "2026-09-16T10:30:00Z"}
```

### 2. Run Database Migrations

```bash
# If needed, run migrations on Neon database
npm run migrate:prod
```

### 3. Check Logs

```bash
vercel logs --prod
```

### 4. Test Endpoints

```bash
# Get all schools
curl https://your-deployment.vercel.app/api/schools?pageSize=5

# Get Swagger UI
curl https://your-deployment.vercel.app/api/docs
```

---

## Environment Variables

The deployment script sets these automatically:

| Variable | Source | Example |
|----------|--------|---------|
| DB_HOST | Neon | ep-xxxxx.us-east-1.neon.tech |
| DB_PORT | Neon | 5432 |
| DB_NAME | Neon | nigerian_directory |
| DB_USER | Neon | neon_user |
| DB_PASSWORD | Neon | (secure password) |
| JWT_SECRET | Your choice | (32+ random chars) |
| FRONTEND_URL | Your choice | https://nigeriandirectory.com |
| PORT | Config | 3000 |
| NODE_ENV | Automatic | production |

---

## Troubleshooting

### "Credentials file not found"

```bash
cd backend
cp neon-credentials.json.example neon-credentials.json
# Then edit with your credentials
```

### "Vercel CLI not found"

```bash
npm install -g vercel
vercel login
```

### "Database connection failed"

Check your Neon credentials:
- DB_HOST is correct
- DB_PASSWORD is exact
- Database exists in Neon

### "502 Bad Gateway"

Check deployment logs:
```bash
vercel logs --prod --level error
```

---

## Security

⚠️ **IMPORTANT**: Never commit `neon-credentials.json` to GitHub!

The file is already in `.gitignore`, but double-check:

```bash
git status
# Should NOT show neon-credentials.json
```

---

## What Gets Deployed

✅ Backend API (all endpoints)
✅ Express server with all middleware
✅ Authentication system
✅ Database connections
✅ Redis cache (if configured)
✅ Swagger UI documentation
✅ Health check endpoints
✅ Rate limiting
✅ Security headers

---

## Accessing Your API

After deployment, your API is available at:

```
https://your-deployment.vercel.app/
```

### Main Endpoints

- **API Docs**: `/api/docs` (Swagger UI)
- **Health**: `/health/live`
- **Schools**: `/api/schools`
- **Auth**: `/api/auth/register`, `/api/auth/login`
- **Search**: `/api/schools?search=keyword`

---

## Custom Domain (Optional)

To use a custom domain like `api.nigeriandirectory.com`:

1. In Vercel dashboard → Project → Settings → Domains
2. Add domain: `api.nigeriandirectory.com`
3. Configure DNS (follow Vercel's instructions)
4. Wait for DNS propagation (5-30 minutes)

---

## Monitoring

### Real-time Logs

```bash
vercel logs --prod --follow
```

### Analytics

```bash
vercel analytics --prod
```

### In Vercel Dashboard

https://vercel.com/dashboard/projects → Your Project

---

## Rollback

If something goes wrong:

```bash
# View deployments
vercel list

# Rollback to previous
vercel rollback
```

---

## Next Steps

1. ✓ Create Neon account (if not done)
2. ✓ Create neon-credentials.json
3. ✓ Run deployment script
4. ✓ Test endpoints
5. ✓ Configure custom domain
6. ✓ Set up monitoring
7. ✓ Celebrate! 🎉

---

## Resources

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **API Docs**: See NEON_VERCEL_SETUP.md
- **GitHub**: https://github.com/akornuche/NigerianDirectory

---

**Status**: Ready for Production  
**Deployment Method**: Vercel + Neon PostgreSQL  
**Expected Uptime**: 99.9%+  
**Time to Deploy**: < 5 minutes  

