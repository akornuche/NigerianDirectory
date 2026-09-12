# GitHub Actions Secrets Setup

This document outlines how to configure GitHub Actions secrets for CI/CD pipeline and production deployment.

## Setting Up Secrets

### Access GitHub Secrets

1. Go to: **Repository Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Enter `Name` and `Value`
4. Click **"Add secret"**

### Required Secrets for Production

#### Database Configuration

| Name | Value | Description | Example |
|------|-------|-------------|---------|
| `DB_HOST` | Your database host | PostgreSQL endpoint (AWS RDS, DigitalOcean, etc.) | `db.example.com` |
| `DB_PORT` | Database port | Usually 5432 for PostgreSQL | `5432` |
| `DB_NAME` | Database name | Same for all environments | `nigerian_directory` |
| `DB_USER` | Database user | Service account user | `api_user` |
| `DB_PASSWORD` | Database password | **Strong random password** | `$(openssl rand -base64 32)` |

#### Redis Configuration

| Name | Value | Description | Example |
|------|-------|-------------|---------|
| `REDIS_HOST` | Redis host | Redis endpoint (Redis Cloud, AWS ElastiCache, etc.) | `redis.example.com` |
| `REDIS_PORT` | Redis port | Usually 6379 | `6379` |
| `REDIS_PASSWORD` | Redis password | **Strong random password** | `$(openssl rand -base64 32)` |

#### Authentication & Security

| Name | Value | Description | How to Generate |
|------|-------|-------------|-----------------|
| `JWT_SECRET` | JWT signing key | **Cryptographically secure random string** | `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | Token expiration | Time before tokens expire | `7d` (recommended) |

#### Frontend Configuration

| Name | Value | Description |
|------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.nigeriandirectory.com/api` |
| `NEXT_PUBLIC_SITE_URL` | Frontend site URL | `https://nigeriandirectory.com` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | From Google Cloud Console |
| `NEXT_PUBLIC_GOOGLE_ADSENSE_ID` | AdSense account ID | From Google AdSense |

#### Deployment Platform Credentials

Choose based on your deployment platform:

##### Railway

| Name | Value |
|------|-------|
| `RAILWAY_TOKEN` | API token from Railway dashboard |

##### DigitalOcean

| Name | Value |
|------|-------|
| `DIGITALOCEAN_TOKEN` | Personal access token from DigitalOcean |
| `DIGITALOCEAN_APP_NAME` | Your app name in DigitalOcean |

##### Vercel

| Name | Value |
|------|-------|
| `VERCEL_TOKEN` | Vercel authentication token |
| `VERCEL_ORG_ID` | Your organization ID |
| `VERCEL_PROJECT_ID` | Your project ID |

##### AWS

| Name | Value |
|------|-------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region (e.g., `us-east-1`) |

#### Error Tracking & Monitoring

| Name | Value | Description |
|------|-------|-------------|
| `SENTRY_DSN` | Error tracking endpoint | From Sentry dashboard |
| `DATADOG_API_KEY` | Datadog API key | From Datadog organization |

### Optional Secrets

| Name | Value | When Needed |
|------|-------|-------------|
| `SMTP_HOST` | Email server host | For email notifications |
| `SMTP_PORT` | Email server port | For email notifications |
| `SMTP_USER` | Email server username | For email notifications |
| `SMTP_PASSWORD` | Email server password | For email notifications |
| `OPENAI_API_KEY` | OpenAI API key | For content enrichment |
| `PAYSTACK_SECRET_KEY` | Paystack API key | For payment processing |

---

## Environment-Specific Secret Sets

Create separate environment configurations for staging and production:

### Staging Environment (`staging` environment)

Settings → **Environments** → **New environment** → Name: `staging`

Configure secrets with staging values:
- `DB_HOST`: staging database endpoint
- `DB_PASSWORD`: staging database password
- `NEXT_PUBLIC_API_URL`: `https://api-staging.nigeriandirectory.com/api`
- All other secrets same as production (or staging-specific)

### Production Environment (`production` environment)

Settings → **Environments** → **New environment** → Name: `production`

Configure secrets with production values:
- `DB_HOST`: production database endpoint
- `DB_PASSWORD`: **strong production password**
- `NEXT_PUBLIC_API_URL`: `https://api.nigeriandirectory.com/api`
- All other secrets for production

---

## Generating Secure Values

### Generate JWT Secret (32+ characters)

```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Option 3: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Generate Strong Database Password

```bash
# Option 1: OpenSSL (cryptographically secure)
openssl rand -base64 24

# Option 2: Python
python -c "import secrets; print(secrets.token_urlsafe(24))"

# Option 3: Linux command
< /dev/urandom tr -dc '_A-Z-a-z-0-9' | head -c 32; echo
```

### Verify Secret Is Set

Add this to your workflow to verify secrets are properly configured:

```yaml
- name: Verify secrets
  run: |
    [ -n "${{ secrets.DB_HOST }}" ] && echo "✓ DB_HOST is set" || echo "✗ DB_HOST is missing"
    [ -n "${{ secrets.JWT_SECRET }}" ] && echo "✓ JWT_SECRET is set" || echo "✗ JWT_SECRET is missing"
    [ -n "${{ secrets.NEXT_PUBLIC_API_URL }}" ] && echo "✓ NEXT_PUBLIC_API_URL is set" || echo "✗ NEXT_PUBLIC_API_URL is missing"
```

---

## Using Secrets in Workflows

### In Workflow YAML

Reference secrets using `${{ secrets.SECRET_NAME }}`:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy backend
        env:
          DB_HOST: ${{ secrets.DB_HOST }}
          DB_PORT: ${{ secrets.DB_PORT }}
          DB_NAME: ${{ secrets.DB_NAME }}
          DB_USER: ${{ secrets.DB_USER }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
        run: |
          # Secrets are available as environment variables
          echo "Deploying with database: $DB_NAME"
```

### Masking Secrets in Logs

Secrets are automatically masked in GitHub Actions logs (shown as `***`). To verify:

1. Check the workflow run output
2. Secrets should appear as `***` in logs
3. Never echo or print secrets directly

---

## Security Best Practices

### ✅ DO

- [ ] Generate secrets using cryptographically secure methods
- [ ] Use unique secrets for each environment (staging vs production)
- [ ] Rotate secrets periodically (at least annually)
- [ ] Use strong passwords (minimum 32 characters for credentials)
- [ ] Store backup of JWT_SECRET securely (offline)
- [ ] Use environment-specific secrets for database passwords
- [ ] Audit secret access (check GitHub audit log regularly)
- [ ] Document all required secrets in this file
- [ ] Test secrets work before going to production
- [ ] Limit who can access production secrets

### ❌ DON'T

- [ ] Commit secrets to the repository (in any file)
- [ ] Use placeholder values like `your_password_here` in production
- [ ] Share secrets in email, Slack, or chat
- [ ] Reuse secrets across projects
- [ ] Use weak or simple passwords
- [ ] Store backups of secrets in public locations
- [ ] Print secrets in workflow logs
- [ ] Give all team members access to all secrets
- [ ] Use secrets that can be easily guessed or brute-forced
- [ ] Leave old secrets active after rotation

---

## Initial Admin User Setup

After deploying the application, set up the initial admin user:

```bash
# During deployment, run:
ADMIN_EMAIL="admin@example.com" \
ADMIN_PASSWORD="$(openssl rand -base64 32)" \
node backend/src/database/setup-admin.js

# Save the generated password in a secure vault (1Password, Bitwarden, etc.)
# Email must be changed after first login
```

---

## Secret Rotation

### Rotating Database Password

1. Generate new password: `openssl rand -base64 24`
2. Update in database management console
3. Update `DB_PASSWORD` secret in GitHub
4. Redeploy application
5. Monitor logs for errors

### Rotating JWT Secret

1. Generate new secret: `openssl rand -base64 32`
2. Update `JWT_SECRET` in GitHub
3. Existing tokens become invalid (users must re-login)
4. Redeploy application
5. Keep old secret for grace period (24-48 hours) for backward compatibility if needed

### Rotating API Credentials

1. Generate new credential in external service
2. Update corresponding secret in GitHub
3. Test with new credentials
4. Revoke old credentials in external service

---

## Troubleshooting

### Deployment Fails with "Invalid Credentials"

1. Verify all secrets are set: Settings → Secrets and variables → Actions
2. Check secret values are correct (copy-paste errors common)
3. Verify environment-specific secrets (staging vs production)
4. Check secret hasn't expired or been revoked

### "Secret not defined" Error in Workflow

```yaml
# Wrong: Reference secret outside job context
- run: echo ${{ secrets.MY_SECRET }}

# Correct: Pass through environment variable
env:
  MY_SECRET: ${{ secrets.MY_SECRET }}
run: echo $MY_SECRET
```

### Secrets Appear in Logs

GitHub Actions automatically masks secrets. If you see them:

1. **Immediately rotate the secret** (generate new value)
2. Update GitHub secret with new value
3. Investigate what caused the leak
4. Prevent similar issues in future workflows

### Different Secrets for Staging vs Production

Use GitHub environments:

1. Settings → Environments → New environment
2. Name: `staging` or `production`
3. Add environment-specific secrets
4. Reference in workflow: `environment: production`

---

## Verification Checklist

Before deploying to production:

- [ ] All required secrets are set in GitHub
- [ ] Secrets are verified (not placeholder values)
- [ ] Environment is set to `production` in workflow
- [ ] Database migrations have run successfully
- [ ] Initial admin user is created and credentials saved
- [ ] Health check endpoint responds successfully
- [ ] Frontend and backend can communicate
- [ ] Error tracking (Sentry) is configured
- [ ] Backup credentials in secure vault (1Password, LastPass)
- [ ] Team knows how to rotate secrets

---

## Additional Resources

- [GitHub: Creating encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub: Using environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [National Institute of Standards: Password Guidelines](https://pages.nist.gov/800-63-3/)
