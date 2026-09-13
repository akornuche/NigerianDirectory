/**
 * Smoke Test - Quick sanity check
 * Verifies API is responding correctly before running full load test
 * Duration: 10 seconds
 * Virtual Users: 1-10
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const TEST_USER_EMAIL = `test-${Date.now()}@example.com`;
let accessToken = '';

export const options = {
  stages: [
    { duration: '5s', target: 10 },   // Ramp up to 10 users
    { duration: '5s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  group('Smoke Test - Health Check', () => {
    const res = http.get(`${BASE_URL}/health/live`);
    check(res, {
      'health check status is 200': (r) => r.status === 200,
      'response time < 100ms': (r) => r.timings.duration < 100,
    });
  });

  sleep(0.5);

  group('Smoke Test - API Root', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      'root endpoint status is 200': (r) => r.status === 200,
      'response has version': (r) => r.json('version') !== undefined,
    });
  });

  sleep(0.5);

  group('Smoke Test - Register User', () => {
    const payload = JSON.stringify({
      name: 'Smoke Test User',
      email: TEST_USER_EMAIL,
      password: 'SmokeTestPassword123',
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const res = http.post(`${BASE_URL}/api/auth/register`, payload, params);
    check(res, {
      'register status is 201': (r) => r.status === 201,
      'register returns access token': (r) => r.json('accessToken') !== undefined,
      'register returns user id': (r) => r.json('user.id') !== undefined,
    });

    if (res.status === 201) {
      accessToken = res.json('accessToken');
    }
  });

  sleep(0.5);

  if (accessToken) {
    group('Smoke Test - Get Current User', () => {
      const params = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      };

      const res = http.get(`${BASE_URL}/api/auth/me`, params);
      check(res, {
        'get me status is 200': (r) => r.status === 200,
        'get me returns user email': (r) => r.json('user.email') !== undefined,
      });
    });

    sleep(0.5);

    group('Smoke Test - Search Schools', () => {
      const params = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      };

      const res = http.get(`${BASE_URL}/api/schools?pageSize=5`, params);
      check(res, {
        'schools search status is 200': (r) => r.status === 200,
        'schools search returns data': (r) => r.json('data') !== undefined,
        'schools search returns pagination': (r) => r.json('pagination') !== undefined,
      });
    });
  }
}
