/**
 * Spike Test - Sudden traffic surge
 * Tests API resilience to sudden traffic spikes
 * Duration: 5 minutes
 * Simulates: Normal traffic → Sudden spike → Normal traffic
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

const responseTimes = new Trend('response_times');
const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    // Normal traffic
    { duration: '1m', target: 50 },
    
    // Sudden spike
    { duration: '30s', target: 500 },
    
    // Back to normal
    { duration: '1m', target: 50 },
    
    // Another spike
    { duration: '30s', target: 300 },
    
    // Cool down
    { duration: '1m', target: 0 },
  ],

  thresholds: {
    'http_req_duration': [
      'p(95)<800',   // Spike test is more lenient
      'p(99)<2000',
    ],
    'http_req_failed': ['rate<0.05'],  // Allow up to 5% error during spikes
  },
};

export default function () {
  group('Spike Test - School Search', () => {
    const res = http.get(`${BASE_URL}/api/schools?pageSize=20&search=school`);
    
    responseTimes.add(res.timings.duration);
    errorRate.add(res.status < 200 || res.status >= 400 ? 1 : 0);

    check(res, {
      'response status is 200': (r) => r.status === 200,
      'response time < 2000ms': (r) => r.timings.duration < 2000,
      'response contains data': (r) => r.json('data') !== undefined,
    });
  });

  sleep(0.5);

  group('Spike Test - Locations', () => {
    const res = http.get(`${BASE_URL}/api/locations`);
    
    responseTimes.add(res.timings.duration);
    errorRate.add(res.status < 200 || res.status >= 400 ? 1 : 0);

    check(res, {
      'locations status is 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}
