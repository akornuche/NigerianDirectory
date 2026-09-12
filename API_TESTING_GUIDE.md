# API Testing Guide

**API Version**: 1.0.0  
**Documentation**: http://localhost:5000/api/docs (development)  
**Status**: Production Ready

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Testing with cURL](#testing-with-curl)
4. [Testing with Postman](#testing-with-postman)
5. [Testing with JavaScript/Node.js](#testing-with-javascriptnodejs)
6. [Testing with Python](#testing-with-python)
7. [Automated Testing](#automated-testing)
8. [Common Test Scenarios](#common-test-scenarios)

---

## Quick Start

### 1. Access Interactive Documentation

**Swagger UI** (recommended for testing):
```
http://localhost:5000/api/docs
```

**ReDoc** (read-only documentation):
```
http://localhost:5000/api/redoc
```

**OpenAPI JSON** (raw specification):
```
http://localhost:5000/api/docs.json
```

### 2. Get API Status

```bash
curl http://localhost:5000/
```

### 3. Register a Test Account

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

---

## Authentication

### Getting Access Tokens

All authenticated endpoints require a Bearer token in the `Authorization` header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Lifecycle

1. **Register** or **Login** → Get `accessToken` and `refreshToken`
2. Use `accessToken` for API requests (valid 15 minutes)
3. When expired, use `refreshToken` to get a new `accessToken` (valid 7 days)
4. Tokens are revoked on **logout** or **password change**

### Example: Full Authentication Flow

```bash
#!/bin/bash

# 1. Register
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123"
  }')

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.refreshToken')

echo "Access Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN"

# 2. Get current user (authenticated request)
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 3. Refresh token when expired
NEW_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{ \"refreshToken\": \"$REFRESH_TOKEN\" }" | jq -r '.accessToken')

echo "New Access Token: $NEW_TOKEN"

# 4. Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Testing with cURL

### Basic School Search

```bash
# List all schools
curl -X GET "http://localhost:5000/api/schools?page=1&pageSize=10"

# Search for specific school
curl -X GET "http://localhost:5000/api/schools?search=international&pageSize=5"

# Filter by state
curl -X GET "http://localhost:5000/api/schools/state/Lagos"

# Filter by area
curl -X GET "http://localhost:5000/api/schools/area/Lagos/Ikoyi"
```

### Get School Details

```bash
# Get school by slug
curl -X GET "http://localhost:5000/api/schools/Lagos/Ikoyi/lagos-international-school"
```

### Locations

```bash
# List all locations
curl -X GET "http://localhost:5000/api/locations"

# Get location details
curl -X GET "http://localhost:5000/api/locations/1"
```

### Create Claim (Authenticated)

```bash
# First, get an access token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "School Admin",
    "email": "admin@school.com",
    "password": "AdminPassword123"
  }' | jq -r '.accessToken')

# Get CSRF token
CSRF_TOKEN=$(curl -s -X GET "http://localhost:5000/api/csrf-token" | jq -r '.csrfToken')

# Create claim
curl -X POST http://localhost:5000/api/claims \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{
    "school_id": 1,
    "verification_details": {
      "position": "Principal",
      "document_type": "registration_certificate",
      "document_url": "https://example.com/certificate.pdf"
    }
  }'
```

### Admin Operations

```bash
# Get statistics (admin only)
curl -X GET http://localhost:5000/api/admin/statistics \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# List pending claims (admin only)
curl -X GET http://localhost:5000/api/admin/claims?status=pending \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Approve claim (admin only)
curl -X POST http://localhost:5000/api/admin/claims/1/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{
    "notes": "Documentation verified and complete"
  }'
```

---

## Testing with Postman

### Setup

1. **Create New Collection**: "NigerianDirectory API"
2. **Add Environment Variables**:
   - `baseUrl`: `http://localhost:5000`
   - `accessToken`: (leave empty, will be populated)
   - `refreshToken`: (leave empty, will be populated)
   - `csrfToken`: (leave empty, will be populated)

### Import OpenAPI

1. Click **Import**
2. Select **Link** tab
3. Enter: `http://localhost:5000/api/docs.json`
4. Collection automatically populated with all endpoints

### Pre-configured Requests

**1. Register**
```
POST {{baseUrl}}/api/auth/register
Body (JSON):
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "TestPassword123"
}

Tests (JavaScript):
var jsonData = pm.response.json();
pm.environment.set("accessToken", jsonData.accessToken);
pm.environment.set("refreshToken", jsonData.refreshToken);
```

**2. Get Current User**
```
GET {{baseUrl}}/api/auth/me
Headers:
  Authorization: Bearer {{accessToken}}

Tests:
pm.test("Status is 200", function () {
  pm.response.to.have.status(200);
});
pm.test("Response has user email", function () {
  pm.expect(pm.response.json().user.email).to.exist;
});
```

**3. Search Schools**
```
GET {{baseUrl}}/api/schools?search=international&pageSize=5

Tests:
pm.test("Returns paginated data", function () {
  var jsonData = pm.response.json();
  pm.expect(jsonData.data).to.be.an('array');
  pm.expect(jsonData.pagination.page).to.equal(1);
});
```

**4. Create Claim**
```
POST {{baseUrl}}/api/claims
Headers:
  Authorization: Bearer {{accessToken}}
  X-CSRF-Token: {{csrfToken}}
Body (JSON):
{
  "school_id": 1,
  "verification_details": {
    "position": "Principal",
    "document_type": "registration_certificate",
    "document_url": "https://example.com/cert.pdf"
  }
}

Tests:
pm.test("Claim created successfully", function () {
  pm.response.to.have.status(201);
});
```

---

## Testing with JavaScript/Node.js

### Setup

```bash
npm install axios dotenv
```

### Example: Test Suite

```javascript
// test-api.js
const axios = require('axios');
require('dotenv').config();

const API_BASE = process.env.API_BASE || 'http://localhost:5000';
let accessToken = '';
let refreshToken = '';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(config => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Test: Register
async function testRegister() {
  console.log('Testing: Register...');
  try {
    const response = await api.post('/api/auth/register', {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123'
    });
    
    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;
    
    console.log('✅ Register successful');
    console.log('   User ID:', response.data.user.id);
    console.log('   Token expires in: 15 minutes');
  } catch (error) {
    console.error('❌ Register failed:', error.response?.data);
  }
}

// Test: Get Current User
async function testGetMe() {
  console.log('Testing: Get current user...');
  try {
    const response = await api.get('/api/auth/me');
    console.log('✅ Get me successful');
    console.log('   User:', response.data.user);
  } catch (error) {
    console.error('❌ Get me failed:', error.response?.data);
  }
}

// Test: Search Schools
async function testSearchSchools() {
  console.log('Testing: Search schools...');
  try {
    const response = await api.get('/api/schools', {
      params: {
        search: 'international',
        pageSize: 5
      }
    });
    
    console.log('✅ Search successful');
    console.log('   Found:', response.data.pagination.total, 'schools');
    console.log('   Showing:', response.data.data.length, 'on this page');
  } catch (error) {
    console.error('❌ Search failed:', error.response?.data);
  }
}

// Test: Refresh Token
async function testRefreshToken() {
  console.log('Testing: Refresh token...');
  try {
    const response = await api.post('/api/auth/refresh', {
      refreshToken: refreshToken
    });
    
    accessToken = response.data.accessToken;
    console.log('✅ Refresh successful');
    console.log('   New token expires in: 15 minutes');
  } catch (error) {
    console.error('❌ Refresh failed:', error.response?.data);
  }
}

// Test: Logout
async function testLogout() {
  console.log('Testing: Logout...');
  try {
    const response = await api.post('/api/auth/logout');
    accessToken = '';
    refreshToken = '';
    
    console.log('✅ Logout successful');
  } catch (error) {
    console.error('❌ Logout failed:', error.response?.data);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting API tests...\n');
  
  await testRegister();
  await testGetMe();
  await testSearchSchools();
  await testRefreshToken();
  await testLogout();
  
  console.log('\n✅ Tests completed');
}

runTests().catch(console.error);
```

### Run Tests

```bash
node test-api.js
```

---

## Testing with Python

### Setup

```bash
pip install requests python-dotenv
```

### Example: Test Suite

```python
# test_api.py
import requests
import json
import os
from datetime import datetime

API_BASE = os.getenv('API_BASE', 'http://localhost:5000')

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.access_token = None
        self.refresh_token = None
    
    def set_auth_header(self):
        """Set authorization header with current token"""
        if self.access_token:
            self.session.headers['Authorization'] = f'Bearer {self.access_token}'
    
    def test_register(self):
        """Test user registration"""
        print('Testing: Register...')
        data = {
            'name': 'Test User',
            'email': f'test-{datetime.now().timestamp()}@example.com',
            'password': 'TestPassword123'
        }
        
        response = self.session.post(f'{API_BASE}/api/auth/register', json=data)
        
        if response.status_code == 201:
            self.access_token = response.json()['accessToken']
            self.refresh_token = response.json()['refreshToken']
            print('✅ Register successful')
            print(f"   User ID: {response.json()['user']['id']}")
        else:
            print(f"❌ Register failed: {response.json()}")
    
    def test_get_me(self):
        """Test get current user"""
        print('Testing: Get current user...')
        self.set_auth_header()
        
        response = self.session.get(f'{API_BASE}/api/auth/me')
        
        if response.status_code == 200:
            print('✅ Get me successful')
            print(f"   User: {response.json()['user']['name']}")
        else:
            print(f"❌ Get me failed: {response.json()}")
    
    def test_search_schools(self):
        """Test school search"""
        print('Testing: Search schools...')
        
        params = {
            'search': 'international',
            'pageSize': 5
        }
        
        response = self.session.get(f'{API_BASE}/api/schools', params=params)
        
        if response.status_code == 200:
            data = response.json()
            print('✅ Search successful')
            print(f"   Found: {data['pagination']['total']} schools")
            print(f"   Showing: {len(data['data'])} on this page")
        else:
            print(f"❌ Search failed: {response.json()}")
    
    def test_get_locations(self):
        """Test get locations"""
        print('Testing: Get locations...')
        
        response = self.session.get(f'{API_BASE}/api/locations', 
                                   params={'pageSize': 10})
        
        if response.status_code == 200:
            data = response.json()
            print('✅ Get locations successful')
            print(f"   Found: {len(data['data'])} locations")
        else:
            print(f"❌ Get locations failed: {response.json()}")
    
    def test_logout(self):
        """Test logout"""
        print('Testing: Logout...')
        self.set_auth_header()
        
        response = self.session.post(f'{API_BASE}/api/auth/logout')
        
        if response.status_code == 200:
            self.access_token = None
            self.refresh_token = None
            print('✅ Logout successful')
        else:
            print(f"❌ Logout failed: {response.json()}")
    
    def run_all_tests(self):
        """Run all tests"""
        print('🚀 Starting API tests...\n')
        
        self.test_register()
        self.test_get_me()
        self.test_search_schools()
        self.test_get_locations()
        self.test_logout()
        
        print('\n✅ Tests completed')

if __name__ == '__main__':
    tester = APITester()
    tester.run_all_tests()
```

### Run Tests

```bash
python test_api.py
```

---

## Automated Testing

### Jest/Supertest (Already Configured)

The project includes comprehensive Jest tests:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- auth-service.test.js
```

### GitHub Actions CI/CD

Tests automatically run on:
- Every push to repository
- Every pull request
- Scheduled daily at 2 AM UTC

View results: `.github/workflows/ci.yml`

---

## Common Test Scenarios

### Scenario 1: Complete User Journey

```bash
#!/bin/bash

echo "📝 Scenario 1: Complete User Journey"

# 1. Register
echo "1. Registering new user..."
REGISTER=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane-'$(date +%s)'@example.com",
    "password": "JanePassword123"
  }')

TOKEN=$(echo $REGISTER | jq -r '.accessToken')
USER_ID=$(echo $REGISTER | jq -r '.user.id')

echo "✅ User registered with ID: $USER_ID"

# 2. Get profile
echo "2. Fetching user profile..."
curl -s -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '.user'

# 3. Update profile
echo "3. Updating profile..."
curl -s -X PATCH http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Smith"}' | jq '.user.name'

# 4. Search schools
echo "4. Searching for schools..."
curl -s -X GET "http://localhost:5000/api/schools?search=secondary&pageSize=3" \
  | jq '.data | length'

# 5. Logout
echo "5. Logging out..."
curl -s -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" | jq '.message'

echo "✅ Scenario completed"
```

### Scenario 2: Rate Limiting

```bash
#!/bin/bash

echo "📝 Scenario 2: Rate Limiting"

# Try to login 6 times (limit is 5 per 15 minutes)
for i in {1..6}; do
  echo "Attempt $i:"
  curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "WrongPassword"
    }' | jq '.error'
done

echo "✅ Rate limiting verified"
```

### Scenario 3: Error Handling

```bash
#!/bin/bash

echo "📝 Scenario 3: Error Handling"

# 1. Invalid email format
echo "1. Invalid email:"
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "email": "invalid", "password": "Pass123"}' | jq '.error'

# 2. Weak password
echo "2. Weak password:"
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "email": "test@example.com", "password": "weak"}' | jq '.error'

# 3. Missing required field
echo "3. Missing field:"
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "email": "test@example.com"}' | jq '.error'

# 4. Unauthorized access
echo "4. Unauthorized access:"
curl -s -X GET http://localhost:5000/api/admin/statistics | jq '.error'

echo "✅ Error handling verified"
```

---

## Troubleshooting

### Issue: "Unauthorized" on authenticated endpoints

**Solution**: 
- Check token is in Authorization header
- Verify token hasn't expired (15 minutes)
- Use refresh endpoint to get new token

### Issue: "Too many requests" (429)

**Solution**:
- Wait for the rate limit window to reset
- Check X-RateLimit-Reset header for exact time
- Implement exponential backoff in your client

### Issue: "Conflict - Email already registered"

**Solution**:
- Use a unique email (include timestamp: `test-${Date.now()}@example.com`)
- Or use existing account and login instead

### Issue: CORS errors

**Solution**:
- API allows CORS from configured FRONTEND_URL
- Check .env file for CORS configuration
- For local testing, CORS is enabled for all origins

---

## Performance Testing

### Load Testing with k6 (Coming in Phase 10)

```javascript
// load-test.js (preview)
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.1'],     // Error rate < 0.1%
  }
};

export default function () {
  let response = http.get('http://localhost:5000/api/schools');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

## Next Steps

1. **Interactive Testing**: Open http://localhost:5000/api/docs and try requests
2. **Automated Testing**: Run `npm test` to execute all test suites
3. **Load Testing**: See Phase 10 for performance validation
4. **Integration**: Use this API documentation in your frontend application

---

**Last Updated**: September 12, 2026  
**API Version**: 1.0.0  
**Status**: Production Ready

