# Security Hardening Guide

## Overview
This document outlines all security hardening measures implemented in the NigerianDirectory backend for production readiness.

**Status**: Phase 8 ✅ Complete

## 1. Security Headers

### Content Security Policy (CSP)
- **Default**: `'self'` - Only allow resources from own origin
- **Scripts**: `'self'`, inline (for legacy), Google Maps
- **Styles**: `'self'`, inline, Google Fonts, CDNs
- **Images**: Allow all HTTPS, data URIs, blobs
- **Frames**: `'self'` only (prevent clickjacking)
- **Objects**: `'none'` (disable plugins)
- **Upgrade**: HTTP → HTTPS in production

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' maps.googleapis.com;
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' maps.googleapis.com *.googleapis.com;
  frame-src 'self';
  object-src 'none'
```

### HTTP Strict Transport Security (HSTS)
- **Max-Age**: 31536000 (1 year)
- **Subdomains**: Included
- **Preload**: Enabled for HSTS preload list

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Other Security Headers
- **X-Frame-Options**: `deny` - Prevent clickjacking
- **X-Content-Type-Options**: `nosniff` - Prevent MIME sniffing
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: Disable camera, microphone, USB, geolocation (except self)

## 2. Rate Limiting

### Global Rate Limiter
- **Limit**: 100 requests per 15 minutes per IP
- **Window**: 15 minutes
- **Purpose**: Basic DDoS protection

### Endpoint-Specific Limits

#### Authentication Endpoints
- **Login/Register**: 5 attempts per 15 minutes
- **Token Refresh**: 10 attempts per 1 minute
- **Exception**: Admin accounts are exempt

#### Resource Endpoints
- **Schools**: 30 requests per 1 minute
- **Search**: 50 requests per 1 minute
- **Claims**: 5 attempts per 1 hour (strict - prevent spam)

### Implementation
- Uses `express-rate-limit` with Redis backing
- Per-IP tracking (via X-Forwarded-For header in production)
- Custom response messages for each limit type

```javascript
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts' }
});
```

## 3. Input Sanitization

### XSS Prevention
- HTML entity escaping via `validator.escape()`
- Maximum string length enforcement
- Null byte removal
- Recursive object sanitization

### Injection Prevention
- No dynamic SQL (all queries use parameterized statements)
- Input validation before database operations
- Type coercion and validation

### Prototype Pollution Prevention
- Blacklist `__proto__`, `constructor`, `prototype` keys
- Depth limits on nested object sanitization

### Request Smuggling Prevention
- Detect suspicious headers (Transfer-Encoding, Content-Length conflicts)
- Reject chunked transfer encoding in production

### Field-Specific Validators
```javascript
fieldValidators = {
    email: (v) => validator.isEmail(v),
    password: (v) => v.length >= 8 && v.length <= 128,
    username: (v) => /^[a-zA-Z0-9_-]+$/.test(v),
    url: (v) => validator.isURL(v, { require_protocol: true }),
    phone: (v) => /^\d{10,15}$/.test(v.replace(/\D/g, '')),
    slug: (v) => /^[a-z0-9-]+$/.test(v)
}
```

### Integration
- Applied globally via `sanitizationMiddleware`
- Sanitizes `req.body`, `req.query`, `req.params`
- Runs before CSRF and route handlers

## 4. CSRF Protection

### Pattern: Double-Submit Cookie with Redis Backend

```
GET /api/csrf-token
    ↓ generates token
    ↓ stores in Redis (1 hour expiry)
    ← returns token to client

POST /api/resource with X-CSRF-Token header
    ↓ verify token exists in Redis
    ↓ remove token from Redis (single use)
    ← process request
```

### Safe Methods (Skip CSRF Check)
- GET
- HEAD
- OPTIONS

### Token Format
- 32 random bytes (64 hex characters)
- Redis TTL: 3600 seconds (1 hour)
- Invalidated after first use

### Endpoint
```
GET /api/csrf-token
{
    "csrfToken": "a1b2c3d4...",
    "expiresIn": 3600
}
```

### Frontend Implementation
```javascript
// Get token
const token = await fetch('/api/csrf-token').then(r => r.json());

// Use in request
fetch('/api/schools', {
    method: 'POST',
    headers: {
        'X-CSRF-Token': token.csrfToken,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
});
```

## 5. Authentication Security

### JWT Configuration
- **Algorithm**: HS256 (HMAC-SHA256)
- **Secret**: Minimum 32 characters, environment-specific
- **Issuer**: `nigerian-directory.com`
- **Audience**: `users`

### Token Types
- **Access Token**: 1 hour expiry, for API requests
- **Refresh Token**: 7 days expiry, for token renewal
- **Logout**: Tokens blacklisted in Redis

### Token Refresh Flow
```
POST /api/auth/refresh
{
    "refreshToken": "..."
}
↓
- Validate refresh token
- Check blacklist (Redis)
- Generate new access token
- Optionally rotate refresh token
↓
{
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token"
}
```

### Password Requirements
- **Minimum**: 8 characters
- **Complexity**: Mixed case, numbers, symbols recommended
- **Hashing**: bcryptjs with salt rounds = 10
- **Change**: Revokes all existing tokens

## 6. Authorization

### Role-Based Access Control
- **admin**: Full access, can manage users and claims
- **user**: Can create schools, claims, view content
- **public**: Can search and view schools

### Permission Matrix
| Endpoint | Public | User | Admin |
|----------|--------|------|-------|
| GET /schools | ✓ | ✓ | ✓ |
| POST /schools | ✗ | ✓ | ✓ |
| PUT /schools/:id | ✗ | ✓ (own) | ✓ |
| DELETE /schools/:id | ✗ | ✗ | ✓ |
| GET /claims | ✗ | ✓ (own) | ✓ |
| POST /claims | ✗ | ✓ | ✓ |
| POST /admin/claims/:id/approve | ✗ | ✗ | ✓ |

## 7. Error Handling & Logging

### Error Response Format
- Generic messages to users
- Detailed logs for debugging
- No sensitive data in responses
- Request correlation IDs

```javascript
// User sees:
{ "error": "Invalid credentials" }

// Logs show:
{
    "timestamp": "...",
    "level": "error",
    "requestId": "req-123",
    "error": "bcrypt comparison failed",
    "userId": "..."
}
```

### Sensitive Field Redaction
- Passwords never logged
- JWT secrets masked in logs
- Database credentials masked

## 8. Database Security

### Connection Pool
- **Min Connections**: 5
- **Max Connections**: 20
- **Idle Timeout**: 30 seconds
- **Reaper Interval**: 10 seconds

### SSL/TLS
- Enabled in production
- Certificate validation
- Connection string: `postgresql://...?sslmode=require`

### Parameterized Queries
All database operations use parameterized statements:
```javascript
// ✓ Safe
pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// ✗ Unsafe (not used)
pool.query(`SELECT * FROM users WHERE id = ${userId}`);
```

## 9. Redis Security

### Configuration
- **Database**: Separate for test/prod
- **Password**: Required in production
- **Port**: 6379 (internal network only)
- **TTL**: Automatic key expiration

### Usage
- Token blacklist: 1 hour expiry
- CSRF tokens: 1 hour expiry
- Session data: TTL-based
- Rate limiting: Window-based

## 10. Deployment Security

### Environment Variables (Required)
```
NODE_ENV=production
PORT=5000
JWT_SECRET=<minimum 32 chars>
DB_HOST=<secured endpoint>
DB_NAME=nigerian_directory
DB_USER=<dedicated user>
DB_PASSWORD=<strong password>
REDIS_HOST=<secured endpoint>
REDIS_PASSWORD=<strong password>
FRONTEND_URL=https://...
ADMIN_EMAIL=admin@...
```

### Docker Security
- Non-root user execution
- Multi-stage builds (minimal image)
- Health checks enabled
- Resource limits

### Reverse Proxy (Production)
- nginx/AWS ALB
- Rate limiting at edge
- SSL/TLS termination
- Request filtering

## 11. Security Checklist

- [x] Security headers via Helmet
- [x] Rate limiting (global + per-endpoint)
- [x] Input sanitization (XSS, injection, smuggling)
- [x] CSRF protection (double-submit + Redis)
- [x] JWT with refresh token pattern
- [x] Password hashing (bcryptjs)
- [x] Parameterized queries
- [x] Error message sanitization
- [x] Sensitive data redaction in logs
- [x] Authentication middleware
- [x] Authorization checks
- [x] Role-based access control
- [x] Environment validation
- [x] HTTPS/SSL required in production

## 12. Testing

### Run Security Tests
```bash
# All tests with coverage
npm run test:coverage

# Specific test suite
npm test -- auth.test.js

# Watch mode
npm run test:watch

# CI environment
npm run test:ci
```

### Coverage Threshold
- **Lines**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Statements**: 70%

### Critical Test Paths
- ✅ Authentication (register, login, logout, refresh)
- ✅ Authorization (role checks, permission matrix)
- ✅ Rate limiting (per-endpoint limits)
- ✅ Input sanitization (XSS, injection attempts)
- ✅ CSRF protection (token validation)
- ✅ Error handling (no data leakage)
- ✅ End-to-end flows (complete user journey)

## 13. Monitoring & Alerting

### Metrics to Monitor
- Failed login attempts (spike detection)
- Rate limit violations
- CSRF token validation failures
- Database connection pool status
- API response times (p95, p99)
- Error rates by endpoint

### Logging Levels
- **ERROR**: Security events, auth failures, exceptions
- **WARN**: Rate limit hits, token expiration
- **INFO**: Successful operations, deployments
- **DEBUG**: Detailed execution flow (dev only)

## 14. Incident Response

### If Compromised
1. Rotate JWT_SECRET immediately
2. Invalidate all refresh tokens
3. Force password reset for all users
4. Review access logs for suspicious activity
5. Deploy patched version

### Common Vulnerabilities

| Vulnerability | Prevention |
|---|---|
| SQL Injection | Parameterized queries ✓ |
| XSS | HTML escaping, CSP ✓ |
| CSRF | Double-submit + Redis ✓ |
| Rate Limit Bypass | Per-endpoint limits + Redis ✓ |
| Broken Auth | Token blacklist, refresh pattern ✓ |
| Insecure Direct Object Reference | Authorization checks ✓ |
| Sensitive Data Exposure | Logging redaction, HTTPS ✓ |
| Security Misconfiguration | Environment validation, Helmet ✓ |

## 15. References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Rate Limiting](https://owasp.org/www-community/attacks/Rate_Limiting_Evasion)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Last Updated**: September 2026
**Phase**: 8 (Security Hardening) ✅ Complete
