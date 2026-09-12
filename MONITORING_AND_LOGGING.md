# Monitoring & Logging Guide

Complete guide to production monitoring, structured logging, metrics collection, and health checks for NigerianDirectory.

## Logging Architecture

### Structured Logging

All logs are output in JSON format for easy parsing by log aggregation services.

```json
{
  "level": "info",
  "message": "Request received",
  "timestamp": "2026-09-12T10:30:00.123Z",
  "environment": "production",
  "service": "nigerian-directory-api",
  "requestId": "1694520600123-abc123def",
  "method": "GET",
  "path": "/api/schools",
  "ip": "192.168.1.1",
  "query": {}
}
```

### Log Levels

| Level | Usage | Threshold |
|-------|-------|-----------|
| `error` | Application errors, exceptions | Always logged |
| `warn` | Warnings, unusual conditions | LOG_LEVEL >= warn |
| `info` | General informational messages | LOG_LEVEL >= info |
| `debug` | Detailed debugging information | LOG_LEVEL = debug |

### Log Environment Variables

```bash
# Set log level (default: info)
LOG_LEVEL=debug      # Most verbose
LOG_LEVEL=info       # Standard (recommended)
LOG_LEVEL=warn       # Warnings and errors only
LOG_LEVEL=error      # Errors only
```

## Health Check Endpoints

### Liveness Probe
Indicates if the service is running. Returns immediately.

```bash
curl http://localhost:5000/health/live

# Response (200)
{
  "status": "alive",
  "timestamp": "2026-09-12T10:30:00.123Z"
}
```

**Use for**: Docker/Kubernetes liveness probe
**Configuration**: Check every 30 seconds

### Readiness Probe
Indicates if the service can handle traffic. Checks dependencies.

```bash
curl http://localhost:5000/health/ready

# Response (200) - Ready
{
  "status": "ready",
  "timestamp": "2026-09-12T10:30:00.123Z",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}

# Response (503) - Not Ready
{
  "status": "not_ready",
  "timestamp": "2026-09-12T10:30:00.123Z",
  "checks": {
    "database": "ok",
    "redis": "failed"
  }
}
```

**Use for**: Kubernetes readiness probe, load balancer health check
**Configuration**: Check every 10 seconds

### Legacy Health Check
Combined endpoint (backwards compatible)

```bash
curl http://localhost:5000/health

# Response (200)
{
  "status": "healthy",
  "timestamp": "2026-09-12T10:30:00.123Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## Metrics Collection

### Prometheus Metrics Endpoint

Metrics are exposed in Prometheus format for scraping.

```bash
curl http://localhost:5000/metrics

# Output
nigerian_directory_http_requests_total{label="GET /api/schools"} 1234
nigerian_directory_http_request_duration_seconds{label="GET /api/schools",quantile="min"} 0.15
nigerian_directory_http_request_duration_seconds{label="GET /api/schools",quantile="max"} 2.45
nigerian_directory_http_request_duration_seconds{label="GET /api/schools",quantile="avg"} 0.68
nigerian_directory_http_errors_total{status_code_400} 12
nigerian_directory_http_errors_total{status_code_500} 3
nigerian_directory_login_attempts_total 456
nigerian_directory_login_successes_total 420
nigerian_directory_login_failures_total 36
nigerian_directory_cache_hits_total 1200
nigerian_directory_cache_misses_total 300
nigerian_directory_cache_hit_ratio 80.00
nigerian_directory_db_pool_available 18
nigerian_directory_db_pool_waiting 0
nigerian_directory_db_pool_total 20
```

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `http_requests_total` | Total HTTP requests | N/A |
| `http_request_duration` | Request latency | p95 > 500ms |
| `http_errors_total` | HTTP errors by status code | 5xx > 1% |
| `login_attempts_total` | Login attempts | N/A |
| `login_failures_total` | Failed logins | > 10/min (brute force) |
| `db_pool_available` | Available DB connections | < 5 (pool exhaustion) |
| `cache_hit_ratio` | Cache effectiveness | < 50% (config issue) |
| `redis_used_memory` | Redis memory usage | > 80% of max |

## Request Tracing

### Request ID Correlation

Each request gets a unique ID for end-to-end tracing.

```
Frontend (X-Request-ID header)
  ↓
Backend receives request
  ↓
All logs include requestId
  ↓
Log aggregation service
  ↓
Search logs by requestId to see full request lifecycle
```

### Example Request Flow

```bash
# Request 1: User logs in
# X-Request-Id: 1694520600123-abc123def

# All logs for this request will include:
"requestId": "1694520600123-abc123def"

# Logs generated:
1. "message": "Request received"      # app.js requestLoggingMiddleware
2. "message": "Finding user by email"  # auth route
3. "message": "Password verified"      # auth route
4. "message": "Tokens generated"       # tokenService
5. "message": "Request completed"      # app.js (response)

# View full request in logs:
jq '.[] | select(.requestId == "1694520600123-abc123def")' logs.json
```

## Setting Up Log Aggregation

### Docker/Container Logs

Logs are sent to stdout/stderr and captured by container runtime.

**Docker:**
```bash
docker logs <container-id>
docker logs --tail 100 -f <container-id>
```

**Kubernetes:**
```bash
kubectl logs <pod-name>
kubectl logs -f <pod-name>  # Follow logs
kubectl logs <pod-name> --previous  # Previous container
```

### ELK Stack (Elasticsearch, Logstash, Kibana)

Popular open-source log aggregation.

**Logstash Configuration:**
```logstash
input {
  tcp {
    port => 5000
    codec => json
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "nigerian-directory-%{+YYYY.MM.dd}"
  }
}
```

**Kibana Queries:**
```
# Find all errors
level: "error"

# Find slow requests
duration > 1000

# Find login failures
message: "Login failed"

# Find by request ID
requestId: "1694520600123-abc123def"
```

### Cloud Log Aggregation Services

#### Google Cloud Logging (GCP)
```bash
# Automatic JSON parsing if logs are JSON
# Set up via GCP Console → Cloud Logging

# Query in Cloud Logging:
resource.type="gce_instance"
jsonPayload.level="error"
```

#### AWS CloudWatch
```bash
# Logs sent to CloudWatch automatically (if using ECS/Lambda)
# Or configure CloudWatch agent on EC2

# CloudWatch Insights queries:
fields timestamp, message, level
| filter level = "error"
| stats count() by message
```

#### Datadog
```bash
# JSON logs automatically parsed by Datadog
# Configure Datadog agent to collect logs

# Search in Datadog:
level:error service:nigerian-directory-api
```

#### Sentry (Error Tracking)
Dedicated error and crash reporting service.

**Installation:**
```bash
npm install @sentry/node
```

**Configuration:**
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

app.use(Sentry.Handlers.errorHandler());
```

## Setting Up Monitoring

### Prometheus + Grafana

Popular open-source metrics and visualization stack.

**Prometheus Configuration:**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nigerian-directory-api'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
```

**Grafana Dashboard:**
1. Add Prometheus data source
2. Create dashboard
3. Add panels:
   - HTTP request rate (requests/sec)
   - Response time (p50, p95, p99)
   - Error rate (%)
   - Database pool usage
   - Cache hit ratio

### Alerting Rules

**Prometheus Alerts:**
```yaml
groups:
  - name: nigerian-directory
    rules:
      - alert: HighErrorRate
        expr: rate(nigerian_directory_http_errors_total[5m]) > 0.01
        annotations:
          summary: "High error rate detected"

      - alert: SlowRequests
        expr: nigerian_directory_http_request_duration_seconds{quantile="p95"} > 0.5
        annotations:
          summary: "P95 latency > 500ms"

      - alert: LoginBruteForce
        expr: rate(nigerian_directory_login_failures_total[5m]) > 0.1
        annotations:
          summary: "Possible brute force attack"
```

## Monitoring Checklist

### Daily Monitoring
- [ ] Check error rate (should be < 0.1%)
- [ ] Monitor p95 latency (should be < 500ms)
- [ ] Review failed login attempts
- [ ] Check database connection pool status
- [ ] Monitor cache hit ratio (should be > 50%)

### Weekly Monitoring
- [ ] Review slow queries in database logs
- [ ] Check for memory leaks (Redis/app memory growth)
- [ ] Review authentication patterns
- [ ] Check for unusual API usage patterns
- [ ] Review backup/recovery logs

### Monthly Monitoring
- [ ] Capacity planning (growth trends)
- [ ] Performance baseline analysis
- [ ] Security incident review
- [ ] Database statistics analysis
- [ ] Cost analysis (if cloud-hosted)

## Log Retention Policy

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Application logs | 30 days | Cloud (CloudWatch, Datadog, Splunk) |
| Error logs | 90 days | Cloud storage (S3, GCS) |
| Audit logs | 1 year | Secure storage (encrypted) |
| Performance metrics | 1 year | Time-series database (Prometheus) |

## Development Tips

### Enable Debug Logging Locally

```bash
LOG_LEVEL=debug npm run dev
```

### View Structured Logs

```bash
# Pretty-print JSON logs
npm install -g jq

# View formatted logs
npm run dev | jq '.'

# Filter by level
npm run dev | jq '.[] | select(.level == "error")'
```

### Test Health Endpoints

```bash
# Liveness probe
curl http://localhost:5000/health/live

# Readiness probe
curl http://localhost:5000/health/ready

# Metrics
curl http://localhost:5000/metrics | head -20
```

### Simulate Errors for Testing

```bash
# Test error logging
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid", "password": "wrong"}'

# Check logs for error messages
npm run dev | jq '.[] | select(.level == "error")'
```

## Production Deployment Setup

### Docker Deployment

```dockerfile
# Logs go to stdout/stderr
# Container orchestrator captures logs
# Configure log driver in docker-compose or Kubernetes
```

**docker-compose:**
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**Kubernetes:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nigerian-directory-api
spec:
  containers:
  - name: api
    image: nigerian-directory-api:latest
    env:
    - name: LOG_LEVEL
      value: "info"
    - name: NODE_ENV
      value: "production"
    livenessProbe:
      httpGet:
        path: /health/live
        port: 5000
      initialDelaySeconds: 5
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 5000
      initialDelaySeconds: 10
      periodSeconds: 5
```

## Troubleshooting

### Issue: Logs not appearing in aggregation service
**Solution:**
1. Verify logs are in JSON format
2. Check network connectivity to log service
3. Verify authentication credentials
4. Check log level setting (LOG_LEVEL environment variable)

### Issue: Metrics endpoint returns 500 error
**Solution:**
1. Ensure Prometheus client installed
2. Check Redis/database connectivity
3. Review error logs for more details
4. Restart application

### Issue: Health check failing but app is responding
**Solution:**
1. Check database connectivity
2. Check Redis connectivity
3. Verify credentials
4. Check connection pool status
5. Review /metrics for pool exhaustion

### Issue: Request tracing not working
**Solution:**
1. Verify requestId is in logs
2. Check X-Request-Id header is being passed
3. Verify log aggregation service supports filtering by requestId
4. Test with curl -H "X-Request-Id: test-123"

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [ELK Stack Guide](https://www.elastic.co/what-is/elk-stack)
- [Sentry Documentation](https://docs.sentry.io/)
- [Datadog Documentation](https://docs.datadoghq.com/)
- [Kubernetes Logging](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
