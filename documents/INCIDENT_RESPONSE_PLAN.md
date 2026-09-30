# Incident Response Plan - NigerianDirectory

**Effective Date**: September 16, 2026  
**Last Updated**: September 12, 2026  
**Status**: Production Ready

---

## Overview

This document defines procedures for responding to production incidents affecting NigerianDirectory API services. It covers detection, response, escalation, and resolution.

---

## Table of Contents

1. [Incident Severity Levels](#incident-severity-levels)
2. [On-Call Structure](#on-call-structure)
3. [Detection & Alerts](#detection--alerts)
4. [Response Procedures](#response-procedures)
5. [Common Incident Playbooks](#common-incident-playbooks)
6. [Communication](#communication)
7. [Post-Incident](#post-incident)

---

## Incident Severity Levels

### CRITICAL (SEV-1)
**Response Time**: Immediate (< 5 minutes)

**Criteria**:
- Complete service outage (all users affected)
- Data loss or corruption occurring
- Security breach in progress
- > 50% error rate
- p95 latency > 5 seconds

**Actions**:
1. Page on-call engineer immediately
2. Engage full incident team
3. Open war room (Slack #incidents)
4. Notify stakeholders immediately
5. Begin status updates every 5 minutes

**Example Incidents**:
- Database completely down
- API not responding
- All requests returning 500 errors
- Massive data corruption

---

### HIGH (SEV-2)
**Response Time**: 15 minutes

**Criteria**:
- Significant degradation (10-50% users affected)
- Some features unavailable
- p95 latency 2-5 seconds
- Error rate 1-10%
- Data consistency issues

**Actions**:
1. Page on-call engineer
2. Create incident ticket
3. Assess impact and scope
4. Notify affected users if appropriate
5. Status updates every 15 minutes

**Example Incidents**:
- Database slow queries
- API response time elevated
- Some endpoints timing out
- Cache layer issues

---

### MEDIUM (SEV-3)
**Response Time**: 1 hour

**Criteria**:
- Minor degradation (< 10% users affected)
- Single feature affected
- p95 latency 1-2 seconds
- Error rate < 1%
- Intermittent issues

**Actions**:
1. Create incident ticket
2. Assign to on-call engineer
3. Begin investigation
4. Status updates every hour
5. Target resolution within business day

**Example Incidents**:
- Single endpoint slow
- Minor search latency
- Authentication occasionally failing
- Specific user region affected

---

### LOW (SEV-4)
**Response Time**: Business hours

**Criteria**:
- No user impact or very minimal
- Non-critical features
- Documentation issues
- Minor UI glitches

**Actions**:
1. Create ticket in backlog
2. Assign to next available engineer
3. Resolve when convenient
4. Target resolution within 1 week

---

## On-Call Structure

### On-Call Rotation

```
Week 1: Engineer A (Mon-Sun 24/7)
Week 2: Engineer B (Mon-Sun 24/7)
Week 3: Engineer C (Mon-Sun 24/7)
...

Backup: Senior Engineer (covers all weeks)
Escalation: Engineering Lead
Final: CTO
```

### On-Call Responsibilities

1. **Availability**
   - Respond to alerts within 5 minutes
   - Have production access
   - Have communication tools ready

2. **During Incident**
   - Assess severity
   - Begin troubleshooting
   - Communicate status
   - Escalate if needed

3. **After Incident**
   - Document root cause
   - Create improvement ticket
   - Participate in postmortem

---

## Detection & Alerts

### Key Metrics Monitored

```
Endpoint Availability:
- Alert if down for > 30 seconds
- Alert if error rate > 5%

Response Time:
- Alert if p95 > 1000ms
- Alert if p99 > 2000ms

Database:
- Alert if connection pool > 80%
- Alert if queries > 5s
- Alert if replication lag > 10s

Infrastructure:
- Alert if CPU > 85%
- Alert if Memory > 85%
- Alert if Disk > 80%

Cache:
- Alert if Redis down
- Alert if hit rate < 50%

Security:
- Alert on failed logins > 10/min
- Alert on 429 rate limit > 100/min
```

### Alert Channels

**CRITICAL**: SMS + Slack + PagerDuty  
**HIGH**: Slack + PagerDuty  
**MEDIUM**: Slack + Email  
**LOW**: Slack + Jira Ticket

---

## Response Procedures

### Step 1: Initial Assessment (5 min)

```
1. Confirm the alert
   ✓ Check dashboard
   ✓ Check health endpoints
   ✓ Verify it's not a false alarm

2. Determine severity
   ✓ How many users affected?
   ✓ What features are down?
   ✓ Is data at risk?

3. Initial classification
   ✓ SEV-1: Escalate immediately
   ✓ SEV-2: Start troubleshooting
   ✓ SEV-3/4: Follow standard process

4. Create incident ticket
   ✓ Timestamp
   ✓ Severity
   ✓ Services affected
   ✓ Initial diagnosis
```

### Step 2: Triage (10 min)

```
1. Gather information
   ✓ When did it start?
   ✓ What changed recently?
   ✓ Check recent deployments
   ✓ Review error logs

2. Check dependencies
   ✓ Database status
   ✓ Redis status
   ✓ External services
   ✓ Network connectivity

3. Isolate the problem
   ✓ Which service?
   ✓ Which endpoint?
   ✓ Which region?
```

### Step 3: Response (15 min)

```
Option A: Quick Fix (if obvious)
  1. Apply hotfix
  2. Deploy immediately
  3. Verify resolution
  4. Monitor closely

Option B: Temporary Mitigation
  1. Scale up resources
  2. Switch to backup service
  3. Enable circuit breaker
  4. Work on fix in parallel

Option C: Escalate
  1. If unsure
  2. If fix not obvious
  3. If risk of making worse
  4. Get backup/senior engineer
```

### Step 4: Resolution & Verification

```
1. Fix applied
   ✓ Code changed or config updated
   ✓ Tests pass
   ✓ Deployed successfully

2. Verification
   ✓ Health checks pass
   ✓ Error rate back to normal
   ✓ Latency acceptable
   ✓ Users can use service

3. Monitoring
   ✓ Watch for 30 minutes
   ✓ Check for new errors
   ✓ Verify metrics stable
```

---

## Common Incident Playbooks

### Playbook 1: API Unresponsive

**Detection**: All requests timing out or 503 errors

**Diagnosis**:
```bash
# Check if API process running
ps aux | grep node

# Check if port listening
netstat -an | grep 5000

# Check recent logs
tail -100 logs/error.log

# Check Docker container
docker ps | grep nigerian-directory

# Check resource usage
top
free -h
```

**Response Options**:
1. **Restart API**: `npm restart` or `docker restart`
2. **Scale up**: Add more API instances
3. **Check database**: Verify PostgreSQL responding
4. **Check Redis**: Verify cache layer available

**Verification**:
```bash
curl -X GET http://localhost:5000/health/live
# Should return 200 OK with {"status": "alive"}
```

---

### Playbook 2: High Latency

**Detection**: p95 latency > 1000ms (warning at 500ms)

**Diagnosis**:
```bash
# Check slow queries
SELECT query, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;

# Check connection count
SELECT count(*) FROM pg_stat_activity;

# Check cache hit rate
redis-cli INFO stats | grep keyspace_hits
```

**Response Options**:
1. **Optimize query**: Add index, rewrite query
2. **Scale database**: More resources
3. **Improve caching**: Implement missing caches
4. **Rate limit**: Reduce load temporarily

---

### Playbook 3: High Error Rate

**Detection**: Error rate > 1%

**Diagnosis**:
```bash
# Check error logs
grep ERROR logs/app.log | tail -50

# Check specific errors
grep "Failed to" logs/app.log | sort | uniq -c

# Check database errors
grep "ECONNREFUSED\|timeout" logs/app.log

# Check validation errors
grep "validation failed" logs/app.log
```

**Common Causes**:
- Database connection lost
- Redis connection lost
- Validation rules too strict
- Rate limiting too aggressive
- Memory exhausted

---

### Playbook 4: Database Slow/Unresponsive

**Detection**: Database queries slow or failing

**Diagnosis**:
```bash
# Connect to database
psql -U postgres -d nigerian_directory

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check locks
SELECT * FROM pg_locks;

# Check slow queries
SELECT query, calls, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 5;
```

**Response Options**:
1. **Kill slow queries**: `SELECT pg_terminate_backend(pid);`
2. **Restart database**: Full restart if corrupted
3. **Add index**: If query plan poor
4. **Increase connections**: If pool exhausted
5. **Failover**: Switch to backup database

---

### Playbook 5: Security Alert

**Detection**: Unusual login attempts, rate limit spikes

**Response**:
1. **Don't panic**: Check if legitimate
2. **Isolate**: Rate limit to IP
3. **Block**: Add to firewall if attack
4. **Monitor**: Watch for spread
5. **Notify**: Security team

**Commands**:
```bash
# Check failed logins
grep "Invalid email or password" logs/app.log | wc -l

# Check rate limiting
grep "Too many" logs/app.log | tail -20

# Check for pattern
grep "401\|403" logs/app.log | awk '{print $NF}' | sort | uniq -c | sort -rn
```

---

## Communication

### During Incident

**Immediate (< 5 min)**:
- Notify on-call team
- Create incident ticket
- Post in #incidents Slack

**Update Frequency**:
- SEV-1: Every 5 minutes
- SEV-2: Every 15 minutes
- SEV-3: Every hour
- SEV-4: Daily or as resolved

**Template**:
```
🔴 INCIDENT UPDATE #123

Status: INVESTIGATING
Severity: SEV-2
Duration: 15 min
Impact: 5% of users (schools search affected)

Current Action: Analyzing slow database queries
ETA: 15 minutes
```

### Status Page Updates

When SEV-1 or SEV-2:
- Update status page immediately
- Set to "Degraded" or "Down"
- Give ETA for resolution
- Update every 15 minutes

---

## Post-Incident

### Incident Debrief (Within 24 hours)

**Participants**: On-call engineer, senior engineer, product

**Agenda**:
1. Timeline of events
2. What went wrong
3. Why it wasn't caught earlier
4. How to prevent recurrence
5. Lessons learned

### Follow-up Actions

**For Each SEV-1/2 Incident**:
- [ ] Root cause document created
- [ ] Monitoring/alert added if needed
- [ ] Ticket created for improvement
- [ ] Code/config change made if needed
- [ ] Test case added to prevent regression
- [ ] Team trained on new procedure

### Incident Report Template

```markdown
# Incident Report #123

## Summary
Brief description of what happened

## Timeline
- 14:30 - Alert triggered
- 14:35 - On-call engineer started
- 14:42 - Root cause identified
- 14:50 - Fix deployed
- 15:00 - Verified resolved

## Impact
- Duration: 20 minutes
- Users affected: ~1000
- Requests failed: 50,000
- Data loss: None

## Root Cause
Detailed explanation

## Resolution
What was done to fix it

## Prevention
How to prevent this in future

## Follow-up Tickets
- #456 - Add index to slow query
- #457 - Improve database monitoring
- #458 - Update runbook
```

---

## Escalation Path

```
Level 1: On-Call Engineer
  ↓ (can't resolve in 15 min)
  
Level 2: Senior Engineer
  ↓ (can't resolve in 30 min)
  
Level 3: Engineering Lead
  ↓ (can't resolve in 60 min)
  
Level 4: CTO
  ↓ (critical business decisions)
  
Level 5: CEO (for public communication)
```

---

## Prevention Best Practices

### Before Production
- ✅ Load testing complete
- ✅ All tests passing
- ✅ Code reviewed
- ✅ Database backed up
- ✅ Monitoring configured
- ✅ Alert thresholds set

### After Deployment
- ✅ Monitor closely for 1 hour
- ✅ Watch error logs
- ✅ Check performance metrics
- ✅ Verify no regressions
- ✅ Document any issues

### Ongoing
- ✅ Weekly incident review
- ✅ Monthly runbook review
- ✅ Quarterly disaster recovery test
- ✅ Continuous monitoring improvement

---

## Quick Reference

### Emergency Contacts
```
On-Call: [Phone number from rotation schedule]
Engineering Lead: [Number]
CTO: [Number]
```

### Important Commands
```bash
# API health
curl http://localhost:5000/health/live

# Database status
psql -U postgres -c "SELECT 1"

# Redis status
redis-cli ping

# Recent errors
tail -100 logs/error.log

# API logs
docker logs nigerian-directory-api

# Restart API
docker restart nigerian-directory-api

# Restart database
docker restart nigerian-directory-db

# Restart cache
docker restart nigerian-directory-redis
```

### Alert Dashboard
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- PagerDuty: https://pagerduty.com

---

## Testing

### Incident Response Drills

**Monthly**: 
1. Simulate SEV-2 incident
2. Test response procedures
3. Verify escalation path
4. Time response

**Quarterly**:
1. Full disaster recovery test
2. Database failover test
3. API failover test
4. Communication channels test

---

## Continuous Improvement

After each incident:
1. Update this document if procedures changed
2. Update runbooks if new patterns found
3. Add new alerts if detection missed issue
4. Train team on lessons learned

---

**Document Version**: 1.0  
**Last Review**: September 12, 2026  
**Next Review**: December 12, 2026  
**Status**: APPROVED - Production Ready

