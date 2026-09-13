# Load Testing Guide

**Framework**: k6 (Open-source load testing tool)  
**Status**: Production Ready  
**Created**: September 12, 2026

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Types](#test-types)
3. [Running Tests](#running-tests)
4. [Interpreting Results](#interpreting-results)
5. [Performance Targets](#performance-targets)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

1. **k6 Installed**:
   ```bash
   # Windows (via chocolatey)
   choco install k6
   
   # macOS (via homebrew)
   brew install k6
   
   # Linux (via apt)
   sudo apt install k6
   
   # Verify installation
   k6 version
   ```

2. **API Running**:
   ```bash
   # Start the API in one terminal
   cd backend
   npm start
   ```

3. **Test Files Located**:
   ```
   backend/load-tests/
   ├── smoke-test.js      # Quick sanity check
   ├── load-test.js       # Main production load test
   ├── spike-test.js      # Sudden traffic surge
   ├── stress-test.js     # Push to breaking point
   └── endurance-test.js  # Long-running stability
   ```

---

## Test Types

### 1. Smoke Test (10 seconds)
**Purpose**: Quick sanity check that API is responding  
**Users**: 1-10  
**Duration**: 10 seconds  
**Use Case**: Before running longer tests

```bash
k6 run backend/load-tests/smoke-test.js
```

**What it tests**:
- Health check endpoint
- API root endpoint
- User registration
- Authentication
- School search

**Expected Results**:
- All requests succeed (200 status)
- Response time < 500ms
- Error rate < 0.1%

---

### 2. Load Test (10 minutes)
**Purpose**: Validate performance under realistic production load  
**Users**: Ramps to 1000 concurrent  
**Duration**: 10 minutes  
**Primary Test**: Use this for launch validation

```bash
k6 run backend/load-tests/load-test.js
```

**Test Phases**:
1. **Warm Up (2 min)**: 0 → 100 users (gradual startup)
2. **Ramp Up (3 min)**: 100 → 500 users
3. **Peak (3 min)**: 500 → 1000 users
4. **Sustained (1 min)**: Hold at 1000 users
5. **Cool Down (1 min)**: 1000 → 0 users

**What it tests**:
- Health checks
- School search
- Locations
- Authenticated endpoints
- School details

**Performance Targets**:
- ✅ p50 latency: < 200ms
- ✅ p90 latency: < 400ms
- ✅ p95 latency: < 500ms (CRITICAL)
- ✅ p99 latency: < 1000ms
- ✅ Error rate: < 0.1%
- ✅ Throughput: ≥ 100 req/sec

---

### 3. Spike Test (5 minutes)
**Purpose**: Test API response to sudden traffic surges  
**Users**: Sudden jumps to 500 users  
**Duration**: 5 minutes  
**Use Case**: Validate auto-scaling behavior

```bash
k6 run backend/load-tests/spike-test.js
```

**Test Phases**:
1. Normal traffic (50 users)
2. Sudden spike (50 → 500 users in 30s)
3. Back to normal (500 → 50 users)
4. Another spike (50 → 300 users)
5. Cool down

**Expected Results**:
- API recovers quickly after spike
- Error rate spikes but recovers
- Response times return to normal

---

### 4. Stress Test (8 minutes)
**Purpose**: Find breaking point and system limits  
**Users**: Gradually increases to 5000  
**Duration**: 8 minutes  
**Use Case**: Identify maximum capacity

```bash
k6 run backend/load-tests/stress-test.js
```

**Test Phases**:
- Ramps gradually: 100 → 500 → 1000 → 2000 → 3000 → 4000 → 5000
- Each phase: 1 minute
- Cool down: 2 minutes

**What Happens**:
- Response times increase
- Error rate increases
- May see timeouts
- Goal: Find breaking point

**Expected Results**:
- Should handle 1000+ users
- Error rate increases but eventually stabilizes
- Server doesn't crash

---

### 5. Endurance Test (24+ minutes)
**Purpose**: Detect memory leaks and stability issues  
**Users**: Constant 100 users  
**Duration**: 24+ minutes (shown as 24min default)  
**Use Case**: Production readiness verification

```bash
k6 run backend/load-tests/endurance-test.js
```

**What it tests**:
- Long-running stability
- Memory leak detection
- Connection pooling
- Response time consistency

**Expected Results**:
- Response times stay consistent
- No memory leaks detected
- Error rate stays < 0.1%
- No connection issues

---

## Running Tests

### Run Individual Test

```bash
# Smoke test (fastest)
k6 run backend/load-tests/smoke-test.js

# Load test (main validation)
k6 run backend/load-tests/load-test.js

# Spike test
k6 run backend/load-tests/spike-test.js

# Stress test
k6 run backend/load-tests/stress-test.js

# Endurance test
k6 run backend/load-tests/endurance-test.js
```

### Specify Custom Base URL

```bash
# Test against staging environment
k6 run --env BASE_URL=http://staging.example.com backend/load-tests/load-test.js

# Test against production (careful!)
k6 run --env BASE_URL=https://api.nigeriandirectory.com backend/load-tests/smoke-test.js
```

### Run All Tests (Full Suite)

```bash
#!/bin/bash
# run-all-tests.sh

echo "Starting Load Test Suite..."
echo "======================================"

echo "1. Running Smoke Test..."
k6 run backend/load-tests/smoke-test.js

echo ""
echo "2. Running Load Test (Main)..."
k6 run backend/load-tests/load-test.js

echo ""
echo "3. Running Spike Test..."
k6 run backend/load-tests/spike-test.js

echo ""
echo "4. Running Stress Test..."
k6 run backend/load-tests/stress-test.js

echo ""
echo "5. Running Endurance Test..."
k6 run backend/load-tests/endurance-test.js

echo ""
echo "======================================"
echo "All tests completed!"
```

### Generate HTML Report

```bash
k6 run --out html=report.html backend/load-tests/load-test.js
# Report saved to report.html
```

### Stream Results to Cloud

```bash
k6 run -o cloud backend/load-tests/load-test.js
```

---

## Interpreting Results

### Key Metrics

#### Response Time (Latency)
```
✅ Good:
  - p50: 100-200ms
  - p90: 300-400ms  
  - p95: 400-500ms
  - p99: 800-1000ms

⚠️  Warning:
  - p95: 600-800ms
  - p99: 1500-2000ms

❌ Bad:
  - p95: > 1000ms
  - p99: > 2000ms
  - High variance
```

#### Error Rate
```
✅ Good:
  - < 0.01% (1 in 10,000)
  - < 0.1% (1 in 1,000)

⚠️  Warning:
  - 0.1% - 1% (1 in 100-1,000)
  - Spikes during high load

❌ Bad:
  - > 1% (1 in 100)
  - Sustained errors
  - Increasing trend
```

#### Throughput (Requests/sec)
```
✅ Good:
  - ≥ 100 req/sec at 1000 users
  - ≥ 50 req/sec at 500 users
  - ≥ 25 req/sec at 250 users

⚠️  Warning:
  - 50-100 req/sec at 1000 users
  - Decreasing with load

❌ Bad:
  - < 50 req/sec at 1000 users
  - Drops significantly under spike
```

### Sample Output Analysis

```
     data_received..................: 1.2 GB  (12.4 MB/s)
     data_sent.......................: 45 MB   (7.5 kB/s)
     http_req_blocked...............: avg=2.34ms
     http_req_connecting............: avg=1.12ms
     http_req_duration..............: avg=245ms min=12ms max=1.89s
                                        p(50)=198ms
                                        p(90)=378ms  ← Good
                                        p(95)=421ms  ← Target met!
                                        p(99)=892ms  ← Acceptable
     http_req_failed................: 0.08%   ← Target met!
     http_req_receiving.............: avg=2.11ms
     http_req_sending...............: avg=1.23ms
     http_req_tls_handshaking.......: avg=0ms
     http_req_waiting...............: avg=241ms
     http_reqs......................: 500000  (8333/s) ← Great throughput!
     iteration_duration.............: avg=5.40s
     iterations.....................: 100000
     vus.............................: 1000
     vus_max.........................: 1000
```

#### What This Means
- ✅ p95 latency (421ms) < 500ms target
- ✅ Error rate (0.08%) < 0.1% target
- ✅ Throughput (8333/s) > 100/s target
- ✅ All thresholds passed

---

## Performance Targets

### Launch Requirements

| Metric | Target | Importance | Status |
|--------|--------|-----------|--------|
| p95 Latency | < 500ms | Critical | ✅ Must meet |
| p99 Latency | < 1000ms | High | ✅ Should meet |
| Error Rate | < 0.1% | Critical | ✅ Must meet |
| Throughput | ≥ 100/sec | High | ✅ Should meet |
| Availability | > 99.9% | Critical | ✅ Track |

### Acceptable Ranges

**At 1000 Concurrent Users:**
```
Latency (p95):     400-600ms   (target: < 500ms)
Error Rate:        0.05-0.15%  (target: < 0.1%)
Throughput:        100-200 req/s
Response Time:     50-100% variance normal
```

**During Spike (to 1000 users in 30s):**
```
Latency (p95):     500-1000ms  (temporary spike ok)
Error Rate:        0.1-1%      (brief increase ok)
Recovery Time:     < 2 minutes
```

---

## Troubleshooting

### Issue: "Connection Refused"
```
Error: connect ECONNREFUSED 127.0.0.1:5000
```

**Solution**:
```bash
# 1. Verify API is running
npm start

# 2. Check if port is correct
netstat -an | grep 5000  # Windows: netstat -ano | findstr 5000

# 3. Check firewall
# Allow port 5000 through firewall

# 4. Use correct URL
k6 run --env BASE_URL=http://localhost:5000 load-test.js
```

---

### Issue: "High Error Rate"
```
http_req_failed: 5% (instead of target < 0.1%)
```

**Solution**:
```bash
# 1. Start with smoke test
k6 run smoke-test.js

# 2. Reduce load
k6 run --vus 100 --duration 1m load-test.js

# 3. Check API logs
tail -f logs/app.log

# 4. Monitor database
# Check if database queries are slow
```

---

### Issue: "Timeout Errors"
```
Error: Request timed out after 30s
```

**Solution**:
```bash
# 1. Increase timeout
# Edit test file, change: timeout: '30s' → timeout: '60s'

# 2. Reduce load
k6 run --vus 500 stress-test.js  # Instead of 5000

# 3. Check server resources
# CPU, Memory, Disk I/O
```

---

### Issue: "Memory Exhaustion"
```
Error: Runtime out of memory
```

**Solution**:
```bash
# 1. Reduce test duration
# Edit test file: change stage duration from 20m to 5m

# 2. Reduce number of test users in setup
# Edit load-test.js: change MAX_TEST_USERS = 5 → 2

# 3. Run on more powerful machine
```

---

### Issue: "Inconsistent Results"
```
Run 1: p95=450ms, Run 2: p95=650ms, Run 3: p95=520ms
```

**Solution**:
```bash
# 1. Isolate system
# Close other applications
# Disable background processes

# 2. Run multiple times
# Average results from 3-5 runs

# 3. Check for external factors
# Network congestion
# Other services on same server
```

---

## Performance Optimization

### If Performance Targets Not Met

1. **Identify Bottleneck** (in order):
   - Database queries (most common)
   - Network latency
   - Caching issues
   - Server CPU/Memory

2. **Quick Wins**:
   ```bash
   # Enable query result caching
   # Add Redis caching for frequently queried data
   # Add database indexes
   # Optimize slow queries
   ```

3. **Scaling Strategy**:
   ```bash
   # Horizontal scaling (more servers)
   # Load balancing
   # Caching layer
   # Database optimization
   ```

---

## Pre-Production Checklist

Before deploying to production:

- [ ] Run smoke test successfully
- [ ] Run load test and meet all targets
- [ ] Run spike test and verify recovery
- [ ] Run endurance test for ≥ 5 minutes
- [ ] Document results
- [ ] Review error logs
- [ ] Check database performance
- [ ] Verify caching works
- [ ] Test with production-like data
- [ ] Coordinate with ops team

---

## Post-Deployment Monitoring

After launch:

```bash
# Daily sanity check
k6 run -d 5m backend/load-tests/smoke-test.js

# Weekly full test
k6 run backend/load-tests/load-test.js

# Monthly endurance test
k6 run backend/load-tests/endurance-test.js

# On-demand spike simulation
k6 run backend/load-tests/spike-test.js
```

---

## Key Takeaways

1. **Smoke Test First**: Always start with smoke-test.js
2. **Load Test Main**: Run load-test.js for launch validation
3. **Watch p95 Latency**: Most critical metric (target: < 500ms)
4. **Error Rate Critical**: Must stay < 0.1%
5. **Document Results**: Keep records for comparison
6. **Test Regular**: Run weekly to catch regressions

---

## Performance Targets Summary

```
✅ PRODUCTION READY:
   p95 latency    < 500ms
   p99 latency    < 1000ms
   Error rate     < 0.1%
   Throughput     ≥ 100 req/sec
   Uptime         > 99.9%

⚠️  NEEDS OPTIMIZATION:
   p95 latency    500-1000ms
   Error rate     0.1-1%
   Throughput     50-100 req/sec

❌ NOT READY:
   p95 latency    > 1000ms
   Error rate     > 1%
   Frequent timeouts
   Memory leaks
```

---

**Last Updated**: September 12, 2026  
**k6 Version**: 0.51.0+  
**Status**: Production Ready

