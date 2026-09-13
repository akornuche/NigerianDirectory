/**
 * Endurance Test - Long-running stability
 * Tests API stability over extended period
 * Duration: 30 minutes (simulated as shorter version)
 * Constant moderate load
 * Detects memory leaks and connection issues
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Gauge } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

const responseTimes = new Trend('response_times');
const errorRate = new Rate('error_rate');
const httpErrors = new Rate('http_errors');
const memoryUsage = new Gauge('memory_usage');

export const options = {
  stages: [
    // Warm up
    { duration: '2m', target: 100 },
    
    // Constant load for 20+ minutes
    { duration: '20m', target: 100 },
    
    // Cool down
    { duration: '2m', target: 0 },
  ],

  thresholds: {
    // Endurance test focuses on stability over time
    'http_req_duration': [
      'p(50)<200',   // Median < 200ms
      'p(90)<400',   // 90% < 400ms
      'p(95)<500',   // 95% < 500ms
    ],
    'http_req_failed': ['rate<0.001'], // Errors must stay < 0.1%
    'http_errors': ['rate<0.001'],     // HTTP errors must stay consistent
  },

  // Extended timeout for long test
  timeout: '30s',
};

let requestCount = 0;

export default function () {
  group('Endurance Test - Cycle', () => {
    requestCount++;

    // Cycle through different endpoints
    if (requestCount % 5 === 0) {
      testSchoolSearch();
    } else if (requestCount % 5 === 1) {
      testLocations();
    } else if (requestCount % 5 === 2) {
      testHealth();
    } else if (requestCount % 5 === 3) {
      testSchoolDetails();
    } else {
      testRoot();
    }
  });

  // Consistent pacing
  sleep(1);
}

function testSchoolSearch() {
  const res = http.get(`${BASE_URL}/api/schools?pageSize=20`);
  
  recordMetrics(res, 'school_search');
  check(res, {
    'schools returns 200': (r) => r.status === 200,
  });
}

function testLocations() {
  const res = http.get(`${BASE_URL}/api/locations`);
  
  recordMetrics(res, 'locations');
  check(res, {
    'locations returns 200': (r) => r.status === 200,
  });
}

function testHealth() {
  const res = http.get(`${BASE_URL}/health/ready`);
  
  recordMetrics(res, 'health');
  check(res, {
    'health ready returns 200': (r) => r.status === 200,
    'health services healthy': (r) => {
      const body = r.json();
      return body.status === 'healthy' || body.status === 'alive';
    },
  });
}

function testSchoolDetails() {
  const res = http.get(`${BASE_URL}/api/schools?pageSize=1`);
  
  recordMetrics(res, 'school_detail_prep');
  
  if (res.status === 200 && res.json('data.0')) {
    sleep(0.5);
  }
}

function testRoot() {
  const res = http.get(`${BASE_URL}/`);
  
  recordMetrics(res, 'root');
  check(res, {
    'root returns 200': (r) => r.status === 200,
  });
}

function recordMetrics(response, endpoint) {
  const isError = response.status < 200 || response.status >= 400;
  
  responseTimes.add(response.timings.duration, { endpoint });
  errorRate.add(isError ? 1 : 0);
  
  if (response.status >= 400) {
    httpErrors.add(1);
  }
}
