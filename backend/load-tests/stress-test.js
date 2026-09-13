/**
 * Stress Test - Push to breaking point
 * Tests API stability under extreme load
 * Gradually increases load until failure
 * Duration: 10 minutes
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

const responseTimes = new Trend('response_times');
const errorRate = new Rate('error_rate');
const timeouts = new Counter('timeouts');

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up
    { duration: '1m', target: 500 },   // Ramp up
    { duration: '1m', target: 1000 },  // Ramp up
    { duration: '1m', target: 2000 },  // Stress level 1
    { duration: '1m', target: 3000 },  // Stress level 2
    { duration: '1m', target: 4000 },  // Stress level 3
    { duration: '1m', target: 5000 },  // Maximum stress
    { duration: '2m', target: 0 },     // Ramp down
  ],

  thresholds: {
    // Very lenient thresholds for stress test
    'http_req_duration': [
      'p(99)<5000', // 99% under 5 seconds
    ],
    'http_req_failed': ['rate<0.3'], // Allow up to 30% error at extreme stress
  },
};

export default function () {
  group('Stress Test - Read Operations', () => {
    // Light read operations
    const searchRes = http.get(`${BASE_URL}/api/schools?pageSize=10`);
    
    responseTimes.add(searchRes.timings.duration);
    if (searchRes.status < 200 || searchRes.status >= 400) {
      errorRate.add(1);
    }

    check(searchRes, {
      'search status ok': (r) => r.status < 500,
      'search response time < 5s': (r) => r.timings.duration < 5000,
    });

    // Track timeouts
    if (searchRes.status === 0) {
      timeouts.add(1);
    }
  });

  sleep(0.3);

  group('Stress Test - Location Data', () => {
    const locRes = http.get(`${BASE_URL}/api/locations`);
    
    responseTimes.add(locRes.timings.duration);
    if (locRes.status < 200 || locRes.status >= 400) {
      errorRate.add(1);
    }

    check(locRes, {
      'locations status ok': (r) => r.status < 500,
    });
  });

  sleep(0.3);

  group('Stress Test - Health Check', () => {
    const healthRes = http.get(`${BASE_URL}/health/live`);
    
    if (healthRes.status < 200 || healthRes.status >= 400) {
      errorRate.add(1);
    }
  });

  sleep(0.5);
}
