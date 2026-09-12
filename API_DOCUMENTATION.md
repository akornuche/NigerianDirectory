# NigerianDirectory API Documentation

**API Version**: 1.0.0  
**Base URL**: `https://api.nigeriandirectory.com` (production) / `http://localhost:5000` (development)  
**Status**: Production Ready  
**Last Updated**: September 12, 2026

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Data Models](#data-models)

---

## Getting Started

### Prerequisites

- API key or JWT token (for authenticated requests)
- Valid JSON request/response format
- HTTPS required for production

### Base URL

```
Development: http://localhost:5000
Production:  https://api.nigeriandirectory.com
```

### Health Check

Verify the API is running:

```bash
curl -X GET http://localhost:5000/health/live
```

Response:
```json
{
    "status": "alive",
    "timestamp": "2026-09-12T10:00:00Z"
}
```

---

## Authentication

### JWT Tokens

The API uses JWT (JSON Web Tokens) for authentication.

#### Token Types

1. **Access Token** (15 minutes expiry)
   - Used for API requests
   - Short-lived for security
   - Include in `Authorization` header

2. **Refresh Token** (7 days expiry)
   - Used to obtain new access tokens
   - Store securely (httpOnly cookie recommended)
   - Never expose to frontend directly

#### Getting Tokens

**Register a new user:**

```bash
POST /api/auth/register
Content-Type: application/json

{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
}
```

**Login:**

```bash
POST /api/auth/login
Content-Type: application/json

{
    "email": "john@example.com",
    "password": "securepassword123"
}
```

Response:
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

#### Using Tokens

Include the access token in the `Authorization` header:

```bash
curl -X GET http://localhost:5000/api/schools \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Refreshing Access Token

When access token expires, use refresh token to get a new one:

```bash
POST /api/auth/refresh
Content-Type: application/json

{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Response:
```json
{
    "message": "Token refreshed successfully",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## API Endpoints

### Health & Status

#### Get API Status

```
GET /
```

Returns basic API information:

```json
{
    "name": "NigerianDirectory API",
    "version": "1.0.0",
    "status": "running",
    "documentation": "/api/docs",
    "health": "/health",
    "metrics": "/metrics"
}
```

**View Interactive API Documentation:**
- Swagger UI: `GET /api/docs`
- OpenAPI JSON: `GET /api/docs.json`
- ReDoc: `GET /api/redoc`

#### Get Readiness Status

```
GET /health/ready
```

Check if API dependencies (database, Redis) are available:

```json
{
    "status": "healthy",
    "timestamp": "2026-09-12T10:00:00Z",
    "services": {
        "database": "connected",
        "redis": "connected"
    }
}
```

---

### Authentication Endpoints

#### Register User

```
POST /api/auth/register
Content-Type: application/json
```

**Request:**
```json
{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
}
```

**Response:** (201 Created)
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
    "accessToken": "...",
    "refreshToken": "..."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid email or weak password
- `409 Conflict` - Email already registered

#### Login

```
POST /api/auth/login
Content-Type: application/json
```

**Request:**
```json
{
    "email": "john@example.com",
    "password": "securepassword123"
}
```

**Response:** (200 OK)
```json
{
    "message": "Login successful",
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `429 Too Many Requests` - Rate limited (max 5 attempts per 15 minutes)

#### Refresh Access Token

```
POST /api/auth/refresh
Content-Type: application/json
```

**Request:**
```json
{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** (200 OK)
```json
{
    "message": "Token refreshed successfully",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or expired refresh token
- `429 Too Many Requests` - Rate limited (max 10 attempts per minute)

#### Logout

```
POST /api/auth/logout
Authorization: Bearer <access_token>
```

**Response:** (200 OK)
```json
{
    "message": "Logout successful"
}
```

---

### Schools Endpoints

#### List Schools

```
GET /api/schools
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (integer, default: 1) - Page number for pagination
- `pageSize` (integer, default: 20) - Number of schools per page
- `search` (string) - Search by school name
- `location_id` (integer) - Filter by location/state
- `category` (string) - Filter by category (primary, secondary, tertiary, mixed)
- `verified` (boolean) - Filter by verified status
- `claimed` (boolean) - Filter by claimed status
- `sort` (string) - Sort field (name, created_at, student_count)
- `order` (string) - Sort order (asc, desc)

**Example:**
```bash
GET /api/schools?page=1&pageSize=20&search=international&location_id=1&verified=true
```

**Response:** (200 OK)
```json
{
    "data": [
        {
            "id": 1,
            "uuid": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Lagos International School",
            "slug": "lagos-international-school",
            "description": "Premier international school in Lagos",
            "address": "123 Main Street, Lagos",
            "latitude": 6.5244,
            "longitude": 3.3792,
            "category": "secondary",
            "phone": "+234801234567",
            "email": "info@lagosintl.edu.ng",
            "website": "https://lagosintl.edu.ng",
            "established_year": 2005,
            "principal_name": "Dr. Jane Okonkwo",
            "student_count": 450,
            "teacher_count": 35,
            "curriculum": "British Curriculum",
            "verified": true,
            "claimed": false,
            "location": {
                "id": 1,
                "name": "Lagos",
                "type": "state"
            },
            "created_at": "2026-01-15T10:00:00Z",
            "updated_at": "2026-09-01T14:30:00Z"
        }
    ],
    "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 250,
        "totalPages": 13,
        "hasNextPage": true
    }
}
```

#### Get School Details

```
GET /api/schools/:id
Authorization: Bearer <access_token>
```

**Response:** (200 OK)
```json
{
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Lagos International School",
    // ... full school object
}
```

**Error Responses:**
- `404 Not Found` - School not found

#### Search Schools by Location

```
GET /api/schools/search/location/:locationId
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (integer, default: 1)
- `pageSize` (integer, default: 20)
- `category` (string) - Optional category filter

**Response:** (200 OK)
```json
{
    "data": [ ... ],
    "pagination": { ... }
}
```

---

### Locations Endpoints

#### List All Locations

```
GET /api/locations
```

**Query Parameters:**
- `type` (string) - Filter by type (state, lga, area)
- `parent_id` (integer) - Filter by parent location
- `page` (integer, default: 1)
- `pageSize` (integer, default: 50)

**Response:** (200 OK)
```json
{
    "data": [
        {
            "id": 1,
            "uuid": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Lagos",
            "slug": "lagos",
            "code": "LG",
            "latitude": 6.5244,
            "longitude": 3.3792,
            "type": "state",
            "school_count": 45
        }
    ],
    "pagination": { ... }
}
```

#### Get Location Details

```
GET /api/locations/:id
```

**Response:** (200 OK)
```json
{
    "id": 1,
    "name": "Lagos",
    "type": "state",
    "school_count": 45,
    "schools": [ ... ]  // Schools in this location
}
```

---

### Claims Endpoints

#### Create Claim

```
POST /api/claims
Authorization: Bearer <access_token>
Content-Type: application/json
X-CSRF-Token: <csrf_token>
```

**Request:**
```json
{
    "school_id": 1,
    "verification_details": {
        "position": "Principal",
        "document_type": "registration_certificate",
        "document_url": "https://example.com/cert.pdf"
    }
}
```

**Response:** (201 Created)
```json
{
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "school_id": 1,
    "user_id": 1,
    "status": "pending",
    "created_at": "2026-09-12T10:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request data
- `409 Conflict` - School already claimed
- `429 Too Many Requests` - Too many claims (max 5 per hour)

#### Get My Claims

```
GET /api/claims/my-claims
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` (string) - Filter by status (pending, verified, rejected)
- `page` (integer, default: 1)
- `pageSize` (integer, default: 20)

**Response:** (200 OK)
```json
{
    "data": [
        {
            "id": 1,
            "uuid": "...",
            "school_id": 1,
            "school": { ... },
            "status": "pending",
            "created_at": "2026-09-12T10:00:00Z"
        }
    ],
    "pagination": { ... }
}
```

#### Get Claim Details

```
GET /api/claims/:id
Authorization: Bearer <access_token>
```

**Response:** (200 OK)
```json
{
    "id": 1,
    "uuid": "...",
    "school_id": 1,
    "school": { ... },
    "user_id": 1,
    "user": { ... },
    "status": "pending",
    "verification_details": { ... },
    "created_at": "2026-09-12T10:00:00Z"
}
```

---

### Admin Endpoints

#### List All Claims (Admin)

```
GET /api/admin/claims
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status` (string) - Filter by status
- `page` (integer, default: 1)
- `pageSize` (integer, default: 20)
- `sort` (string) - Sort field

**Response:** (200 OK)
```json
{
    "data": [ ... ],
    "pagination": { ... }
}
```

#### Approve Claim (Admin)

```
POST /api/admin/claims/:id/approve
Authorization: Bearer <admin_token>
Content-Type: application/json
X-CSRF-Token: <csrf_token>
```

**Request:**
```json
{
    "notes": "Documentation verified"
}
```

**Response:** (200 OK)
```json
{
    "message": "Claim approved successfully",
    "claim": { ... }
}
```

#### Reject Claim (Admin)

```
POST /api/admin/claims/:id/reject
Authorization: Bearer <admin_token>
Content-Type: application/json
X-CSRF-Token: <csrf_token>
```

**Request:**
```json
{
    "reason": "Documentation incomplete",
    "notes": "Please provide updated registration certificate"
}
```

**Response:** (200 OK)
```json
{
    "message": "Claim rejected successfully",
    "claim": { ... }
}
```

#### Get Admin Statistics

```
GET /api/admin/statistics
Authorization: Bearer <admin_token>
```

**Response:** (200 OK)
```json
{
    "schools": {
        "total": 250,
        "verified": 245,
        "claimed": 120
    },
    "claims": {
        "pending": 15,
        "approved": 120,
        "rejected": 5
    },
    "users": {
        "total": 500,
        "active_this_week": 125
    },
    "locations": {
        "states": 36,
        "coverage": "92%"
    }
}
```

---

### Views/Analytics Endpoints

#### Record Page View

```
POST /api/views
Content-Type: application/json
```

**Request:**
```json
{
    "school_id": 1,
    "user_agent": "Mozilla/5.0...",
    "referrer": "https://google.com",
    "country": "Nigeria"
}
```

**Response:** (201 Created)
```json
{
    "message": "Page view recorded"
}
```

#### Get School Views Statistics

```
GET /api/views/schools/:schoolId/stats
```

**Query Parameters:**
- `period` (string) - Time period (day, week, month, year)
- `start_date` (string) - ISO date
- `end_date` (string) - ISO date

**Response:** (200 OK)
```json
{
    "school_id": 1,
    "total_views": 1250,
    "unique_views": 450,
    "period": "month",
    "daily_breakdown": [
        {
            "date": "2026-09-01",
            "views": 45,
            "unique": 30
        }
    ]
}
```

---

### Crawler Endpoints (Admin Only)

#### Trigger Crawl Job

```
POST /api/crawl/start
Authorization: Bearer <admin_token>
Content-Type: application/json
X-CSRF-Token: <csrf_token>
```

**Request:**
```json
{
    "target": "all",
    "priority": "high",
    "depth": 3
}
```

**Response:** (202 Accepted)
```json
{
    "message": "Crawl job started",
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued"
}
```

#### Check Crawl Status

```
GET /api/crawl/status/:jobId
Authorization: Bearer <admin_token>
```

**Response:** (200 OK)
```json
{
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "running",
    "progress": 65,
    "items_processed": 130,
    "items_total": 200,
    "started_at": "2026-09-12T10:00:00Z",
    "estimated_completion": "2026-09-12T10:15:00Z"
}
```

#### Get Crawl Logs

```
GET /api/crawl/logs
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `limit` (integer, default: 50)
- `offset` (integer, default: 0)
- `status` (string) - Filter by status

**Response:** (200 OK)
```json
{
    "logs": [
        {
            "id": 1,
            "timestamp": "2026-09-12T10:00:00Z",
            "level": "info",
            "message": "Crawl job started",
            "details": { ... }
        }
    ],
    "total": 150
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
    "error": "Error message",
    "details": "Additional details",
    "code": "ERROR_CODE",
    "timestamp": "2026-09-12T10:00:00Z"
}
```

### HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | OK | Successful request |
| 201 | Created | Resource successfully created |
| 202 | Accepted | Request accepted (async operation) |
| 400 | Bad Request | Invalid input or validation error |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | Database or service down |

### Common Error Codes

```
VALIDATION_ERROR       - Input validation failed
UNAUTHORIZED           - Authentication required
FORBIDDEN              - Insufficient permissions
NOT_FOUND              - Resource not found
CONFLICT               - Resource already exists
RATE_LIMIT_EXCEEDED    - Too many requests
DATABASE_ERROR         - Database operation failed
EXTERNAL_SERVICE_ERROR - External service unavailable
```

---

## Rate Limiting

API uses multiple rate limiting strategies:

### Global Rate Limit
- 100 requests per 15 minutes per IP
- Applied to `/api/*` routes

### Auth Rate Limits
- **Login**: 5 attempts per 15 minutes per IP
- **Register**: 5 registrations per 15 minutes per IP
- **Token Refresh**: 10 attempts per minute per IP

### School Rate Limits
- **Search**: 30 requests per minute per IP

### Claims Rate Limits
- **Create Claim**: 5 claims per hour per user
- **Update Claim**: 10 updates per hour per user

### Admin Rate Limits
- **No rate limit** (admin users are exempt)

### Rate Limit Headers

Responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1694515200
```

### Handling Rate Limits

When rate limited (429 response):

```json
{
    "error": "Too many requests",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "retryAfter": 60
}
```

---

## Data Models

### User Model

```json
{
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "created_at": "2026-09-12T10:00:00Z",
    "updated_at": "2026-09-12T10:00:00Z"
}
```

### School Model

```json
{
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Lagos International School",
    "slug": "lagos-international-school",
    "description": "Premier international school in Lagos",
    "address": "123 Main Street, Lagos",
    "latitude": 6.5244,
    "longitude": 3.3792,
    "category": "secondary",
    "phone": "+234801234567",
    "email": "info@lagosintl.edu.ng",
    "website": "https://lagosintl.edu.ng",
    "established_year": 2005,
    "principal_name": "Dr. Jane Okonkwo",
    "student_count": 450,
    "teacher_count": 35,
    "curriculum": "British Curriculum",
    "verified": true,
    "claimed": false,
    "claimed_by": null,
    "location_id": 1,
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-09-01T14:30:00Z"
}
```

### Claim Model

```json
{
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "school_id": 1,
    "user_id": 1,
    "status": "pending",
    "verification_details": {
        "position": "Principal",
        "document_type": "registration_certificate",
        "document_url": "https://example.com/cert.pdf"
    },
    "created_at": "2026-09-12T10:00:00Z",
    "updated_at": "2026-09-12T10:00:00Z"
}
```

---

## Testing the API

### Using cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'

# Get schools
curl -X GET http://localhost:5000/api/schools \
  -H "Authorization: Bearer <access_token>"
```

### Using Postman

1. Create new collection
2. Set base URL: `http://localhost:5000`
3. Import endpoints from OpenAPI spec
4. Configure authentication tab with Bearer token

### Using Swagger UI

Interactive API documentation available at:
- Development: `http://localhost:5000/api/docs`
- Production: `https://api.nigeriandirectory.com/docs`

---

## Support & Troubleshooting

### Common Issues

**401 Unauthorized**
- Check if token is included in Authorization header
- Verify token hasn't expired (15 minutes)
- Use refresh endpoint to get new access token

**429 Too Many Requests**
- Wait for rate limit window to reset
- Check `Retry-After` header
- Implement exponential backoff

**503 Service Unavailable**
- Database or Redis connection issue
- Check `/health/ready` endpoint
- Retry after 30 seconds

### Getting Help

- Documentation: https://docs.nigeriandirectory.com
- Support Email: support@nigeriandirectory.com
- GitHub Issues: https://github.com/nigeriandirectory/backend/issues

---

**API Documentation Generated**: September 12, 2026  
**Status**: Production Ready  
**Version**: 1.0.0

