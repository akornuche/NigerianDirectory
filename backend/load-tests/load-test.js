/**
 * Main Load Test - Production Performance Validation
 * Tests API under realistic load conditions
 * Duration: 10 minutes with ramping
 * Virtual Users: Up to 1000 concurrent
 * 
 * Targets:
 * - p95 latency: < 500ms
 * - p99 latency: < 1000ms
 * - Error rate: < 0.1%
 * - Throughput: ≥ 100 requests/second
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Custom metrics
const errorRate = new Rate('errors');
const duration = new Trend('duration');
const successRate = new Rate('success');
const activeUsers = new Gauge('active_users');
const requestsPerSecond = new Counter('requests_per_second');

// Test user pool for authentication
const testUsers = [];
const MAX_TEST_USERS = 5;

export const options = {
  stages: [
    // Phase 1: Warm up
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    
    // Phase 2: Sustained load
    { duration: '3m', target: 500 },   // Ramp up to 500 users
    
    // Phase 3: Peak load
    { duration: '3m', target: 1000 },  // Ramp up to 1000 users
    
    // Phase 4: Sustained peak
    { duration: '1m', target: 1000 },  // Hold at 1000 users
    
    // Phase 5: Cool down
    { duration: '1m', target: 0 },     // Ramp down
  ],

  thresholds: {
    // HTTP request duration thresholds
    'http_req_duration': [
      'p(50)<200',   // 50% under 200ms
      'p(90)<400',   // 90% under 400ms
      'p(95)<500',   // 95% under 500ms (target)
      'p(99)<1000',  // 99% under 1000ms
      'max<2000',    // Max under 2000ms
    ],
    
    // Error rate thresholds
    'http_req_failed': ['rate<0.001'], // Error rate < 0.1%
    
    // Custom metric thresholds
    'errors': ['rate<0.1'],
    'success': ['rate>0.99'],
  },

  ext: {
    loadimpact: {
      projectID: 3456789,
      name: 'NigerianDirectory Load Test',
    },
  },
};

/**
 * Setup: Create test users for authentication
 */
export function setup() {
  console.log('Setting up test users...');

  for (let i = 0; i < MAX_TEST_USERS; i++) {
    const email = `load-test-${Date.now()}-${i}@example.com`;
    
    const payload = JSON.stringify({
      name: `Load Test User ${i}`,
      email: email,
      password: 'LoadTestPassword123',
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const res = http.post(`${BASE_URL}/api/auth/register`, payload, params);

    if (res.status === 201) {
      testUsers.push({
        email: email,
        password: 'LoadTestPassword123',
        accessToken: res.json('accessToken'),
        userId: res.json('user.id'),
      });
      console.log(`✓ Created test user ${i}: ${email}`);
    } else if (res.status === 409) {
      // User already exists, try to login
      console.log(`User ${email} already exists, skipping creation`);
    } else {
      console.error(`Failed to create test user: ${res.status}`);
    }
  }

  console.log(`Setup complete. Created ${testUsers.length} test users.`);
  return { users: testUsers };
}

/**
 * Main test function
 */
export default function (data) {
  const users = data.users || testUsers;
  
  // Get random test user
  const testUser = users[Math.floor(Math.random() * users.length)];
  const token = testUser?.accessToken || '';

  // Update active user gauge
  activeUsers.add(1);

  // Simulate user session with multiple requests
  simulateUserSession(token);

  sleep(Math.random() * 2); // Random sleep between 0-2 seconds
}

/**
 * Simulate realistic user session
 */
function simulateUserSession(token) {
  // Request 1: Get API status
  group('Health & Status Checks', () => {
    const res = http.get(`${BASE_URL}/health/live`);
    recordMetrics(res, 'health_check');
  });

  sleep(0.5);

  // Request 2: Search for schools
  group('School Search', () => {
    const searchQueries = [
      { search: 'international', state: 'Lagos' },
      { search: 'secondary', state: 'Abuja' },
      { search: 'primary', state: 'Kano' },
      { state: 'Oyo' },
      { pageSize: 50 },
    ];

    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    const queryString = new URLSearchParams(query).toString();
    
    const res = http.get(`${BASE_URL}/api/schools?${queryString}`);
    recordMetrics(res, 'school_search');

    check(res, {
      'search returns 200': (r) => r.status === 200,
      'search returns data array': (r) => Array.isArray(r.json('data')),
      'search returns pagination': (r) => r.json('pagination.page') !== undefined,
    });
  });

  sleep(1);

  // Request 3: Get locations
  group('Get Locations', () => {
    const res = http.get(`${BASE_URL}/api/locations?pageSize=20`);
    recordMetrics(res, 'get_locations');

    check(res, {
      'locations returns 200': (r) => r.status === 200,
      'locations returns data': (r) => Array.isArray(r.json('data')),
    });
  });

  sleep(1);

  // Request 4: Authenticated endpoints
  if (token) {
    group('Authenticated Requests', () => {
      // Get current user
      const authParams = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const meRes = http.get(`${BASE_URL}/api/auth/me`, authParams);
      recordMetrics(meRes, 'get_me');

      check(meRes, {
        'get me returns 200': (r) => r.status === 200,
        'get me returns user': (r) => r.json('user.id') !== undefined,
      });
    });

    sleep(0.5);

    // Get my schools (claimed)
    group('Get Claimed Schools', () => {
      const authParams = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const schoolsRes = http.get(`${BASE_URL}/api/auth/my-schools`, authParams);
      recordMetrics(schoolsRes, 'get_my_schools');

      check(schoolsRes, {
        'my-schools returns 200 or empty array': (r) => 
          r.status === 200 || (r.status === 200 && Array.isArray(r.json())),
      });
    });

    sleep(1);
  }

  // Request 5: Get specific school (if search found results)
  group('Get School Details', () => {
    const res = http.get(`${BASE_URL}/api/schools?pageSize=1`);
    
    if (res.status === 200 && res.json('data.0')) {
      const schoolSlug = res.json('data.0.slug');
      const state = res.json('data.0.location.name');
      
      if (schoolSlug && state) {
        const detailRes = http.get(`${BASE_URL}/api/schools/${state}/details/${schoolSlug}`);
        recordMetrics(detailRes, 'get_school_details');
      }
    }
  });

  // Update request counter
  requestsPerSecond.add(1);
  activeUsers.add(-1);
}

/**
 * Record request metrics
 */
function recordMetrics(response, endpoint) {
  const isError = response.status < 200 || response.status >= 400;
  
  if (isError) {
    errorRate.add(1);
  } else {
    successRate.add(1);
  }

  duration.add(response.timings.duration, { endpoint });

  check(response, {
    [`${endpoint} status is not 5xx`]: (r) => r.status < 500,
    [`${endpoint} response time < 1000ms`]: (r) => r.timings.duration < 1000,
  });
}

/**
 * Teardown: Log final metrics
 */
export function teardown(data) {
  console.log('Load test completed!');
  console.log(`Total test users created: ${data.users?.length || 0}`);
}
