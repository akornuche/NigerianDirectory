# Phase 10: Load Testing & Performance - Setup Guide

**Date**: September 12, 2026  
**Status**: ✅ COMPLETE - Framework and tests ready  
**Next Step**: Run tests when API is operational

---

## Overview

Phase 10 Load Testing validates API performance under realistic production loads. All test scripts are ready to execute.

---

## Load Test Files Created

```
backend/load-tests/
├── smoke-test.js           # 10-second sanity check
├── load-test.js            # 10-minute main production test
├── spike-test.js           # Sudden traffic surge test
├── stress-test.js          # Push to breaking point test
└── endurance-test.js       # 24+ minute long-running test
```

---

## Quick Start (When API is Ready)

### 1. Start the API

```bash
# Terminal 1: Start API
cd backend
npm start

# Verify it's running
curl http://localhost:5000/health/live
```

### 2. Run Smoke Test (Quick check)

```bash
# Terminal 2: Run smoke test
cd backend
k6 run load-tests/smoke-test.js
```

**Expected output**:
```
✓ health check status is 200
✓ root endpoint status is 200
✓ register status is 201
✓ get me status is 200
✓ schools search status is 200

     http_req_duration..: avg=145ms   p(95)=280ms   p(99)=450ms
     http_req_failed....: 0.00%
     iteration_duration.: avg=8.23s
     iterations.........: 20
```

### 3. Run Main Load Test (10 minutes)

```bash
k6 run load-tests/load-test.js
```

**Expected output**:
```
     http_req_duration..: avg=245ms   p(95)=421ms   p(99)=892ms   ✅ Target met!
     http_req_failed....: 0.08%                              ✅ < 0.1% target!
     http_reqs.........: 500000     (8333/s)                ✅ > 100/s target!
```

### 4. Run Other Tests

```bash
# Spike test (5 minutes)
k6 run load-tests/spike-test.js

# Stress test (8 minutes)
k6 run load-tests/stress-test.js

# Endurance test (24+ minutes)
k6 run load-tests/endurance-test.js
```

---

## Test Suite Details

### Smoke Test (10 seconds)
- **Purpose**: Quick sanity check
- **Users**: 1-10 gradually
- **Duration**: 10 seconds
- **Endpoints tested**: 5 (health, root, register, me, schools)
- **Use case**: Before longer tests

### Load Test (10 minutes) ⭐ MAIN TEST
- **Purpose**: Validate production performance
- **Users**: Ramps to 1000 concurrent
- **Phases**:
  - Warm up (2 min): 0 → 100 users
  - Ramp (3 min): 100 → 500 users
  - Peak (3 min): 500 → 1000 users
  - Sustained (1 min): Hold 1000 users
  - Cool down (1 min): 1000 → 0 users

### Spike Test (5 minutes)
- **Purpose**: Test sudden traffic surges
- **Users**: Sudden spikes to 500-300
- **Phases**:
  - Normal (50 users)
  - Spike to 500 users
  - Back to normal
  - Another spike to 300
  - Cool down

### Stress Test (8 minutes)
- **Purpose**: Find breaking point
- **Users**: Ramps to 5000 gradually
- **Each phase**: 1 minute
- **Goal**: Identify maximum capacity

### Endurance Test (24+ minutes)
- **Purpose**: Long-running stability
- **Users**: Constant 100 for 20+ minutes
- **Focus**: Memory leaks, connection issues

---

## Performance Targets

### ✅ PRODUCTION READY (Must Meet)
```
p95 Latency:     < 500ms
Error Rate:      < 0.1%
Throughput:      ≥ 100 req/sec
```

### ✅ EXCELLENT (Should Meet)
```
p50 Latency:     < 200ms
p90 Latency:     < 400ms
p99 Latency:     < 1000ms
Error Rate:      < 0.01%
Throughput:      ≥ 200 req/sec
```

---

## Test Results Summary

| Test | Duration | Users | p95 Latency | Error Rate | Status |
|------|----------|-------|-------------|------------|--------|
| Smoke | 10s | 1-10 | TBD* | TBD* | Ready |
| Load | 10m | 1-1000 | **< 500ms** | **< 0.1%** | Ready |
| Spike | 5m | varies | < 800ms | < 5% | Ready |
| Stress | 8m | 1-5000 | < 2000ms | < 30% | Ready |
| Endurance | 24m | 100 | < 500ms | < 0.1% | Ready |

*Results will appear after running

---

## Pre-Test Checklist

Before running load tests:

- [ ] API is running and accessible
- [ ] Verify `curl http://localhost:5000/health/live` returns 200
- [ ] Database is running
- [ ] Redis is running (optional but recommended)
- [ ] System has sufficient resources (CPU, Memory)
- [ ] No other heavy processes running
- [ ] Network connectivity is stable

---

## Running Tests Correctly

### ✅ DO:
```bash
# Test against local development first
k6 run load-tests/load-test.js

# Then test against staging
k6 run --env BASE_URL=http://staging.example.com load-tests/load-test.js

# Only production if approved
k6 run --env BASE_URL=https://api.nigeriandirectory.com load-tests/smoke-test.js
```

### ❌ DON'T:
```bash
# Don't run all tests simultaneously
# Don't use stress test without approval
# Don't run at peak hours on production
# Don't modify tests without understanding implications
```

---

## Interpreting Results

### Success Criteria

```
✅ PASS: p95 < 500ms AND error rate < 0.1%
⚠️  MARGINAL: p95 < 700ms AND error rate < 0.5%
❌ FAIL: p95 > 700ms OR error rate > 0.5%
```

### Sample Good Result

```
http_req_duration........: avg=245ms min=12ms max=1.89s p(50)=198ms p(90)=378ms p(95)=421ms p(99)=892ms
http_req_failed.........: 0.08%
http_reqs..............: 500000 (8333.33/s)
```

**What this means**:
- ✅ Average response: 245ms (good)
- ✅ 95% of requests: < 421ms (PASS target < 500ms)
- ✅ Error rate: 0.08% (PASS target < 0.1%)
- ✅ Throughput: 8333/s (PASS target ≥ 100/s)

### Common Issues

```
❌ "No connection" error
   → Start the API first
   → Check port 5000
   → Verify firewall rules

❌ High error rate (> 5%)
   → Database query timeout
   → Memory leak
   → Connection pool exhaustion
   → Too many users for current hardware

❌ Timeout errors
   → Increase --timeout value
   → Reduce user count
   → Optimize slow endpoints
   → Scale infrastructure
```

---

## Optimization Tips

If tests don't meet targets:

### 1. Identify Bottleneck
```bash
# Check which endpoint is slow
# Look at 'http_req_duration' per group

# Example: If 'school_search' is slow
# → Optimize database query
# → Add indexes
# → Implement caching
```

### 2. Quick Wins
- Enable Redis caching
- Add database indexes
- Reduce response payload size
- Use connection pooling
- Implement query pagination

### 3. Scaling
- Horizontal: Add more API servers
- Vertical: Increase server resources
- Database: Optimize queries
- Caching: Redis, CDN

---

## Documentation

### Main Guide
See `LOAD_TESTING_GUIDE.md` for:
- Detailed test explanations
- Running tests with options
- Interpreting results
- Troubleshooting
- Performance optimization

### Quick Reference

```bash
# Smoke test
k6 run load-tests/smoke-test.js

# Load test (main)
k6 run load-tests/load-test.js

# Spike test
k6 run load-tests/spike-test.js

# Stress test
k6 run load-tests/stress-test.js

# Endurance test
k6 run load-tests/endurance-test.js

# Custom base URL
k6 run --env BASE_URL=http://staging.com load-tests/load-test.js

# Generate HTML report
k6 run --out html=report.html load-tests/load-test.js
```

---

## What's Included

### Test Scripts (5 files)
- ✅ smoke-test.js (10s, 1-10 users)
- ✅ load-test.js (10m, 1-1000 users) - MAIN
- ✅ spike-test.js (5m, sudden spikes)
- ✅ stress-test.js (8m, 1-5000 users)
- ✅ endurance-test.js (24m, constant 100 users)

### Custom Metrics
- Response time trends
- Error rate tracking
- Throughput measurement
- Active user gauge
- Request counter

### Thresholds
- p95 latency < 500ms
- Error rate < 0.1%
- No exceeding max values

---

## Next Steps

### Immediate (Today/Tomorrow)
1. Ensure API is running with database and Redis
2. Run smoke test first
3. If smoke passes, run load test
4. Document results

### If Tests Pass ✅
- Proceed to Phase 11: Incident Response
- Prepare for Phase 12: Final Validation
- Schedule production launch

### If Tests Fail ❌
- Identify bottleneck
- Optimize code/database
- Re-run tests
- Iterate until targets met

---

## Launch Decision Gate

**Production Launch Requirements (Phase 12):**

- [ ] Smoke test passes: 100% success rate
- [ ] Load test passes: p95 < 500ms, error < 0.1%
- [ ] Spike test passes: recovers within 2 minutes
- [ ] No critical issues in stress test
- [ ] Endurance test stable for 5+ minutes
- [ ] Team approves results

---

## FAQ

**Q: When should I run these tests?**
A: Before each deployment, weekly monitoring, anytime code changes.

**Q: Can I run load tests against production?**
A: Only smoke-test.js during off-hours. Get approval first.

**Q: What if I get "too many requests" errors?**
A: That's rate limiting working! It's expected at high loads.

**Q: How long do the full tests take?**
A: ~30-40 minutes total for all 5 tests.

**Q: Can I modify the tests?**
A: Yes, but understand the implications. See LOAD_TESTING_GUIDE.md.

---

## Performance Targets (Reference)

```
At 1000 Concurrent Users:

Expected Response Times:
  p50:  150-200ms
  p90:  300-400ms
  p95:  400-500ms    ← TARGET (CRITICAL)
  p99:  800-1000ms

Expected Error Rate:  < 0.1%  ← TARGET (CRITICAL)
Expected Throughput:  ≥ 100 req/sec

Acceptable Variance:
  ±20% from baseline
```

---

## Resources

- **k6 Documentation**: https://k6.io/docs/
- **Performance Guide**: See `LOAD_TESTING_GUIDE.md`
- **API Documentation**: See `API_DOCUMENTATION.md`
- **Troubleshooting**: See `LOAD_TESTING_GUIDE.md#troubleshooting`

---

**Status**: ✅ Phase 10 Setup Complete  
**Ready to Execute**: When API is running  
**Expected Pass Rate**: 95%+  
**Estimated Time**: 30-40 minutes total  

