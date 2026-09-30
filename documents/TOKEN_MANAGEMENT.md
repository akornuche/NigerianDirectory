# Token Management Guide

Complete guide to JWT token handling, refresh tokens, logout, and token security in NigerianDirectory.

## Token Architecture

### Access Token (Short-lived)
- **Purpose**: Used for API requests
- **Lifetime**: 15 minutes (configurable via `ACCESS_TOKEN_EXPIRES_IN`)
- **Audience**: API endpoints
- **Revocation**: Not immediately revoked (short lifetime)
- **Type**: `access` token

### Refresh Token (Long-lived)
- **Purpose**: Used to obtain new access tokens without re-authenticating
- **Lifetime**: 7 days (configurable via `REFRESH_TOKEN_EXPIRES_IN`)
- **Audience**: `/api/auth/refresh` endpoint only
- **Revocation**: Stored in Redis blacklist on logout
- **Type**: `refresh` token

## API Endpoints

### Authentication Endpoints

#### `POST /api/auth/register`
Register a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201):**
```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### `POST /api/auth/login`
Authenticate user and get tokens.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Rate Limiting**: 5 attempts per 15 minutes per IP address

#### `POST /api/auth/refresh`
Get a new access token using a refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401):**
```json
{
  "error": "Refresh token expired",
  "code": "REFRESH_TOKEN_EXPIRED"
}
```

**Rate Limiting**: 10 attempts per 1 minute per IP address

#### `POST /api/auth/logout`
Revoke access and refresh tokens.

**Request:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "message": "Logout successful",
  "accessTokenRevoked": true,
  "refreshTokenRevoked": true
}
```

#### `GET /api/auth/me`
Get current authenticated user information and token expiration.

**Request:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "email_verified": true,
    "created_at": "2026-09-12T10:30:00Z"
  },
  "token": {
    "expiresIn": 900,
    "expiresAt": "2026-09-12T11:00:00Z"
  }
}
```

#### `GET /api/auth/token-info`
Get detailed information about current token (debug endpoint).

**Request:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "token": {
    "valid": true,
    "type": "access",
    "expiresIn": 890,
    "isExpired": false,
    "expiresAt": "2026-09-12T11:00:00Z",
    "user": {
      "id": 1,
      "email": "john@example.com",
      "role": "user"
    }
  },
  "user": {
    "id": 1,
    "email": "john@example.com"
  }
}
```

#### `POST /api/auth/change-password`
Change user password (revokes all tokens).

**Request:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully. Please log in again.",
  "code": "PASSWORD_CHANGED"
}
```

## Frontend Implementation

### Login Flow

```javascript
// 1. Register or Login
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Store tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.user;
  }
  throw new Error(data.error);
}
```

### Making API Requests

```javascript
// 2. Use access token for API requests
async function fetchSchools() {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('/api/schools', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.status === 401) {
    // Token expired, refresh it
    await refreshToken();
    // Retry request
    return fetchSchools();
  }
  
  return response.json();
}
```

### Token Refresh Flow

```javascript
// 3. Refresh token when access token expires
async function refreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  if (!response.ok) {
    // Refresh token expired, user must log in again
    logout();
    window.location.href = '/login';
    return;
  }
  
  const data = await response.json();
  
  // Update tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
}
```

### Logout Flow

```javascript
// 4. Logout (revoke tokens)
async function logout() {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  });
  
  // Clear tokens
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  
  window.location.href = '/login';
}
```

### Axios Interceptor (Optional)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
});

// Request interceptor: Add access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken }
        );
        
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        
        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

## Token Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ 1. User Logs In                                         │
│    - Email + Password → Backend                         │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Generate Token Pair                                  │
│    - Access Token (15m): For API requests               │
│    - Refresh Token (7d): For getting new access tokens  │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Use Access Token                                     │
│    - All API requests include: Bearer <accessToken>     │
│    - Backend verifies token & checks Redis blacklist    │
└──────────────────────┬──────────────────────────────────┘
                       ↓
        ┌──────────────┴──────────────┐
        ↓                             ↓
   ┌────────────┐             ┌──────────────┐
   │ Token      │             │ Token        │
   │ Expires    │             │ Valid        │
   │ (15m)      │             │              │
   └──────┬─────┘             └──────────────┘
          ↓
   ┌──────────────┐
   │ 4A. Refresh  │
   │ POST /refresh│
   │ + refreshTok │
   └──────┬───────┘
          ↓
   ┌──────────────┐
   │ Get new      │
   │ tokens, retry│
   │ request      │
   └──────────────┘

   ┌──────────────┐
   │ 4B. Logout   │
   │ POST /logout │
   │ Revoke both  │
   │ tokens in    │
   │ Redis        │
   └──────┬───────┘
          ↓
   ┌──────────────┐
   │ User must    │
   │ log in again │
   └──────────────┘
```

## Security Considerations

### Token Storage
- **Frontend**: Store in HTTP-only cookies or localStorage
  - HTTP-only cookies: More secure against XSS, but vulnerable to CSRF
  - localStorage: Vulnerable to XSS, but no CSRF risk
  - **Recommendation**: Use HTTP-only cookies with CSRF tokens

### Token Transmission
- **Always use HTTPS** in production
- Include token in `Authorization: Bearer <token>` header
- Never include tokens in URL query parameters

### Token Refresh Strategy
- Refresh access tokens before they expire
- Set a timer to refresh 1 minute before expiration
- Always handle 401 responses by attempting refresh
- If refresh fails, redirect to login

### Token Revocation
- Tokens are stored in Redis with TTL equal to token expiration
- On logout, tokens are blacklisted and cannot be used
- Blacklist entries automatically expire when tokens expire
- Changes to user role/permissions apply only to new tokens

### Password Changes
- Password changes automatically revoke all tokens
- User must log in again after changing password
- This is a security feature to prevent unauthorized access

## Troubleshooting

### "Token Expired" Error
**Cause**: Access token lifetime exceeded (15 minutes by default)
**Solution**: Call `/api/auth/refresh` with refresh token to get new access token

### "Refresh Token Expired" Error  
**Cause**: Refresh token lifetime exceeded (7 days by default) or token was revoked
**Solution**: User must log in again

### "Token Revoked" Error
**Cause**: Token was explicitly revoked during logout
**Solution**: Token cannot be used, user must log in again

### "Invalid Token" Error
**Cause**: Token is malformed, tampered, or uses wrong secret
**Solution**: Check that JWT_SECRET is consistent across all requests

### Rate Limit Exceeded
**Cause**: Too many authentication attempts
**Solution**: Wait 15 minutes before retrying login

## Configuration

### Environment Variables

```bash
# JWT Secret (REQUIRED - MUST be strong and random)
JWT_SECRET=your_secure_jwt_secret_minimum_32_chars

# Token expiration times (OPTIONAL - defaults provided)
ACCESS_TOKEN_EXPIRES_IN=15m      # Short-lived access token
REFRESH_TOKEN_EXPIRES_IN=7d      # Long-lived refresh token
JWT_EXPIRES_IN=7d                # Legacy (used for backwards compatibility)
```

### Generate Secure JWT Secret

```bash
# Generate 32-character random secret
openssl rand -base64 32

# Example output:
# AbCdEfGhIjKlMnOpQrStUvWxYz1234567890ABC=
```

## Testing Tokens

### Decode JWT Token
Use [jwt.io](https://jwt.io) or command line:

```bash
# Install jq: apt-get install jq
# Extract and decode JWT
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .
```

### Test Token Endpoints
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'

# Use access token
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"

# Refresh token
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'

# Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'
```

## Production Recommendations

1. **Use strong JWT_SECRET**: Minimum 32 characters, cryptographically random
2. **Rotate secrets annually**: Generate new JWT_SECRET and redeploy
3. **Monitor token usage**: Log token refresh and logout events
4. **Enable HTTPS**: All token transmissions must be encrypted
5. **Use HTTP-only cookies**: For storing refresh tokens
6. **Implement CSRF protection**: When using cookies
7. **Monitor blacklist size**: Redis blacklist should not grow unbounded
8. **Set appropriate token lifetimes**: Balance security with user experience
9. **Test token refresh**: Ensure frontend handles token expiration
10. **Audit logs**: Log all auth failures for security analysis
