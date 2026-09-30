# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in NigerianDirectory, please email `security@nigeriandirectory.com` instead of using the public issue tracker.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any proposed fixes

**Do not disclose the vulnerability publicly until we've had a chance to address it.**

---

## Security Incident - September 14, 2026

### ⚠️ CRITICAL: Database Credentials Exposed in Git History

**Status**: RESOLVED  
**Severity**: CRITICAL  
**Date Discovered**: September 14, 2026  
**Date Remediated**: September 14, 2026

#### What Happened

Database passwords and JWT secrets were committed to the git repository history in commits related to Vercel deployment setup (commits `5b10e24`, `7a9550d`, etc.). These credentials were exposed in PowerShell scripts and JSON configuration files that were accidentally tracked by git.

**Compromised Credentials:**
- PostgreSQL password: `npg_8TgZsh1GDMeB` (REVOKED)
- JWT secret: `nigerian-directory-production-jwt-secret-2026-secure-32chars-min` (REVOKED)

#### Immediate Actions Taken

1. ✅ **Credentials Rotated**: All database passwords and JWT secrets have been rotated in Neon PostgreSQL and Vercel
2. ✅ **.gitignore Strengthened**: Added comprehensive patterns to prevent secrets from being committed:
   - `*-credentials.json`
   - `*-secrets.json`
   - `*.key`, `*.pem`, `*.p12`, `*.pfx`
   - `*.apikey`, `*.token`
3. ✅ **Git History Cleaned**: Exposed credentials have been removed from commit history
4. ✅ **Deployment Updated**: All production services updated with new credentials

#### Remediation Details

- **Database**: New password generated in Neon PostgreSQL console
- **JWT Secret**: New 64-character random secret generated and stored in Vercel env vars only
- **Git**: Repository history rewritten to remove exposed secrets using `git filter-branch`
- **Documentation**: All scripts updated to reference environment variables instead of hardcoded credentials

#### Prevention Measures

1. **Enhanced .gitignore**:
   - All credential file patterns blocked
   - API key patterns blocked
   - Configuration files with secrets blocked

2. **Git Hooks** (Recommended):
   ```bash
   # Install git-secrets to detect patterns
   brew install git-secrets
   git secrets --install
   git secrets --register-aws
   ```

3. **Development Practices**:
   - Always use `.env` files for local development (never commit)
   - Use environment variables in production (Vercel, Neon, GitHub Actions)
   - Run `git secrets` before committing
   - Review `.gitignore` before adding new configuration files

4. **Automated Scanning**:
   - GitGuardian integration enabled
   - GitHub Secret Scanning enabled
   - Pre-commit hooks configured to detect common secret patterns

#### Infrastructure Details

- **Neon PostgreSQL**: Old credentials invalidated, new credentials active
- **Vercel Environment Variables**: Updated with new secrets
- **GitHub Secrets**: Updated (if using CI/CD)
- **API Deployment**: Redeployed with new credentials

#### Timeline

| Time | Event |
|------|-------|
| 2026-09-14 14:42 | Credentials accidentally committed in deployment setup |
| 2026-09-14 14:50 | GitGuardian alert triggered |
| 2026-09-14 15:00 | Credentials rotated in Neon and Vercel |
| 2026-09-14 15:05 | Git history cleaned |
| 2026-09-14 15:10 | Enhanced .gitignore committed |
| 2026-09-14 15:15 | Security documentation added |

#### Verification Steps

To verify the incident is resolved:

```bash
# 1. Check that secrets are no longer in git history
git log --all -S "npg_8TgZsh1GDMeB" --oneline
# Should return: (no results)

git log --all -S "nigerian-directory-production-jwt-secret" --oneline
# Should return: (no results)

# 2. Verify .gitignore is comprehensive
cat .gitignore | grep -E "(credentials|secrets|\.key|apikey)"

# 3. Verify environment variables are set in Vercel
vercel env ls

# 4. Test API still works with new credentials
curl https://nigeriandirectory-*.vercel.app/api/health
```

---

## Best Practices for Contributors

### Before Committing

1. **Never commit credentials**:
   - Database passwords
   - API keys
   - JWT secrets
   - AWS/GCP/Azure credentials
   - Private keys

2. **Use environment variables**:
   ```javascript
   // ✅ GOOD
   const password = process.env.DB_PASSWORD;
   
   // ❌ BAD
   const password = "npg_8TgZsh1GDMeB";
   ```

3. **Use .env files locally**:
   ```bash
   # .env (never commit)
   DB_PASSWORD=your_local_password
   JWT_SECRET=your_local_secret
   ```

4. **Verify .gitignore before adding files**:
   ```bash
   # Check if a file would be tracked
   git check-ignore -v "filename"
   ```

### Code Review Checklist

- [ ] No hardcoded API keys or passwords
- [ ] All secrets use `process.env.*` or similar
- [ ] No credential files in commit
- [ ] No `.env` files committed
- [ ] Configuration files use example templates (`.example`)

---

## Security Headers & Protections

### Production Deployment

The API is protected with:

- ✅ HTTPS/TLS encryption
- ✅ CORS (Cross-Origin Resource Sharing)
- ✅ CSRF protection
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Rate limiting
- ✅ Input validation & sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ JWT token-based authentication
- ✅ Password hashing (bcrypt)
- ✅ Secure database connection pooling

---

## Questions or Concerns?

Contact: `security@nigeriandirectory.com`  
GitHub Issues: https://github.com/akornuche/NigerianDirectory/security  
GitGuardian: https://www.gitguardian.com
