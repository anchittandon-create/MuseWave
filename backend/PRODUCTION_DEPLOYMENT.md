# Production Deployment Guide for MuseWave

## Overview

This guide covers deploying MuseWave to production using Docker Compose or Kubernetes with enterprise-grade reliability, monitoring, and scalability.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Docker Compose Deployment](#docker-compose-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Monitoring & Observability](#monitoring--observability)
6. [Scaling](#scaling)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

- **Database**: PostgreSQL 15+ (managed service recommended: AWS RDS, Google Cloud SQL)
- **Cache/Queue**: Redis 7+ (managed service recommended: AWS ElastiCache, Google Cloud Memorystore)
- **Container Runtime**: Docker 24+ or Kubernetes 1.28+
- **Monitoring**: Prometheus + Grafana (optional but recommended)

### Required Tools

```bash
# Docker Compose
docker --version  # 24.0+
docker-compose --version  # 2.20+

# OR Kubernetes
kubectl version  # 1.28+
helm version  # 3.12+
```

### API Keys & Secrets

- Google Gemini API key (for AI features)
- Database credentials
- Redis password (if authentication enabled)

---

## Environment Configuration

### 1. Create `.env.production` file

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@postgres:5432/musewave
POSTGRES_USER=musewave
POSTGRES_PASSWORD=<STRONG_PASSWORD>
POSTGRES_DB=musewave

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<REDIS_PASSWORD>
REDIS_DB=0

# API Keys
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>

# Worker Configuration
WORKER_CONCURRENCY=2
WORKER_REPLICAS=2

# Security
CORS_ORIGIN=https://musewave.com
API_RATE_LIMIT=100

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_PASSWORD=<STRONG_PASSWORD>
```

### 2. Generate Strong Passwords

```bash
# Generate secure passwords
openssl rand -base64 32
```

### 3. Database Migration

```bash
# Run Prisma migrations
npm run db:migrate:prod
```

---

## Docker Compose Deployment

### Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd backend

# 2. Configure environment
cp .env.example .env.production
nano .env.production  # Edit with your values

# 3. Build and start services
docker-compose -f docker-compose.prod.yml up -d

# 4. Check health
curl http://localhost:3000/health

# 5. View logs
docker-compose logs -f api
```

### Service Architecture

```
┌─────────────────────────────────────────────────┐
│                   Load Balancer                 │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼─────┐            ┌─────▼────┐
   │   API    │            │  Worker  │
   │ (Node.js)│            │ (Node.js)│
   └────┬─────┘            └─────┬────┘
        │                        │
   ┌────▼──────────────────┬────▼────┐
   │                       │         │
┌──▼────────┐     ┌───────▼──┐  ┌──▼─────┐
│ PostgreSQL│     │  Redis   │  │ Metrics│
└───────────┘     └──────────┘  └────────┘
```

### Scaling with Docker Compose

```bash
# Scale workers
docker-compose -f docker-compose.prod.yml up -d --scale worker=4

# Scale API instances (requires load balancer)
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

### Updating Deployment

```bash
# 1. Pull latest changes
git pull origin main

# 2. Rebuild images
docker-compose -f docker-compose.prod.yml build

# 3. Rolling update (zero downtime)
docker-compose -f docker-compose.prod.yml up -d --no-deps api
docker-compose -f docker-compose.prod.yml up -d --no-deps worker
```

---

## Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
brew install kubectl  # macOS
# OR
sudo apt-get install kubectl  # Ubuntu

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### 1. Create Namespace

```bash
kubectl create namespace musewave
kubectl config set-context --current --namespace=musewave
```

### 2. Create Secrets

```bash
# Create database secret
kubectl create secret generic musewave-secrets \
  --from-literal=database-url='postgresql://user:password@postgres:5432/musewave' \
  --from-literal=gemini-api-key='YOUR_API_KEY' \
  --from-literal=postgres-user='musewave' \
  --from-literal=postgres-password='YOUR_PASSWORD'
```

### 3. Deploy Infrastructure (Redis, PostgreSQL)

```bash
kubectl apply -f k8s/infrastructure.yaml
```

### 4. Deploy Application

```bash
kubectl apply -f k8s/deployment.yaml
```

### 5. Verify Deployment

```bash
# Check pods
kubectl get pods

# Check services
kubectl get services

# Check ingress
kubectl get ingress

# View logs
kubectl logs -f deployment/musewave-api

# Check health
kubectl port-forward service/musewave-api-service 3000:80
curl http://localhost:3000/health
```

### Horizontal Pod Autoscaling (HPA)

```bash
# HPA is automatically configured in k8s/deployment.yaml
# View HPA status
kubectl get hpa

# Manual scaling
kubectl scale deployment musewave-api --replicas=5
```

### Rolling Updates

```bash
# Update image
kubectl set image deployment/musewave-api api=musewave/api:v1.2.0

# Monitor rollout
kubectl rollout status deployment/musewave-api

# Rollback if needed
kubectl rollout undo deployment/musewave-api
```

---

## Monitoring & Observability

### 1. Prometheus Metrics

All services expose metrics at `/metrics`:

```bash
# View metrics
curl http://localhost:3000/metrics
```

**Key Metrics:**

- `musewave_jobs_completed_total` - Total successful jobs
- `musewave_jobs_failed_total` - Total failed jobs
- `musewave_job_duration_ms` - Job processing time
- `musewave_queue_waiting` - Jobs in queue
- `musewave_cache_hits_total` - Cache efficiency
- `musewave_http_requests_total` - API traffic

### 2. Grafana Dashboards

Access Grafana: `http://localhost:3001` (default: admin/admin)

**Pre-configured Dashboards:**

- **System Overview**: CPU, memory, disk usage
- **Application Performance**: Request rates, latencies, errors
- **Queue Health**: Job throughput, waiting time, failures
- **Cache Performance**: Hit/miss ratio, evictions

### 3. Log Aggregation

```bash
# View structured logs
docker-compose logs -f api | jq

# Filter by level
docker-compose logs api | grep '"level":"error"'

# Kubernetes logs
kubectl logs -f deployment/musewave-api --all-containers=true
```

### 4. Health Checks

```bash
# Liveness (is app running?)
curl http://localhost:3000/health/live

# Readiness (can app accept traffic?)
curl http://localhost:3000/health/ready

# Detailed health
curl http://localhost:3000/health | jq
```

---

## Scaling

### Vertical Scaling (Resources)

**Docker Compose:**

Edit `docker-compose.prod.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'      # Increase CPU
      memory: 8G     # Increase RAM
```

**Kubernetes:**

Edit `k8s/deployment.yaml`:

```yaml
resources:
  requests:
    memory: "4Gi"
    cpu: "2000m"
  limits:
    memory: "8Gi"
    cpu: "4000m"
```

### Horizontal Scaling (Replicas)

**Docker Compose:**

```bash
docker-compose up -d --scale worker=10
```

**Kubernetes:**

```bash
# Manual
kubectl scale deployment musewave-api --replicas=10

# Automatic (HPA already configured)
# Scales based on CPU/memory utilization (70%/80% thresholds)
```

### Queue Worker Scaling

Increase `WORKER_CONCURRENCY` environment variable:

```bash
# Process more jobs per worker
WORKER_CONCURRENCY=4
```

### Database Scaling

**Connection Pooling** (already configured in Prisma):

```typescript
// Increase pool size in prisma/schema.prisma
datasource db {
  url = env("DATABASE_URL")
  connectionLimit = 20  // Increase for high traffic
}
```

**Read Replicas:**

Use read replicas for heavy read workloads:

```bash
DATABASE_URL=postgresql://primary-host/db
DATABASE_READ_URL=postgresql://replica-host/db
```

---

## Backup & Recovery

### Database Backups

**Automated Daily Backups:**

```bash
# Cron job for PostgreSQL
0 2 * * * docker exec postgres pg_dump -U musewave musewave > /backups/musewave-$(date +\%Y\%m\%d).sql
```

**Manual Backup:**

```bash
# Export
docker exec postgres pg_dump -U musewave musewave > backup.sql

# Restore
docker exec -i postgres psql -U musewave musewave < backup.sql
```

### Redis Persistence

Redis is configured with AOF (Append Only File):

```bash
# Backup Redis data
docker exec redis redis-cli BGSAVE
docker cp redis:/data/dump.rdb ./redis-backup.rdb
```

### Application State

Generated files are stored in persistent volumes:

```bash
# Docker Compose volumes
docker volume ls
docker volume inspect backend_outputs

# Kubernetes PVCs
kubectl get pvc
kubectl describe pvc musewave-outputs-pvc
```

---

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check logs
docker-compose logs api
kubectl logs deployment/musewave-api

# Check environment variables
docker exec api env | grep -E 'DATABASE|REDIS|GEMINI'

# Test database connection
docker exec api npx prisma db push
```

#### 2. Jobs Not Processing

```bash
# Check queue stats
curl http://localhost:3000/health/queue | jq

# Check Redis connection
docker exec redis redis-cli PING

# Check worker logs
docker-compose logs worker
```

#### 3. High Memory Usage

```bash
# Check metrics
curl http://localhost:3000/health/system | jq

# Inspect container
docker stats

# Adjust cache settings
REDIS_MAXMEMORY=512mb  # Reduce if needed
```

#### 4. Circuit Breaker Open

```bash
# Check metrics
curl http://localhost:3000/metrics | grep circuit_breaker

# Check external service health
docker exec api python3 --version  # Python bridge
docker exec api ffmpeg -version     # FFmpeg
```

### Emergency Procedures

**Stop All Services:**

```bash
docker-compose -f docker-compose.prod.yml down
# OR
kubectl scale deployment musewave-api --replicas=0
```

**Clear Queue (Emergency):**

```bash
docker exec redis redis-cli FLUSHDB
```

**Restart Services:**

```bash
docker-compose -f docker-compose.prod.yml restart
# OR
kubectl rollout restart deployment/musewave-api
```

---

## Performance Benchmarks

### Expected Performance

- **Throughput**: 10-50 jobs/minute (depends on hardware)
- **Latency**: <5s API response, 30-120s generation time
- **Concurrency**: 20-100 concurrent API requests
- **Memory**: 2-4GB per worker process
- **CPU**: 1-2 cores per worker

### Load Testing

```bash
# Install Artillery
npm install -g artillery

# Create artillery-config.yml
artillery quick --count 100 --num 10 http://localhost:3000/health

# Full test
artillery run tests/load-test.yml
```

---

## Security Checklist

- [ ] Use strong passwords (32+ characters)
- [ ] Enable HTTPS (TLS certificates via Let's Encrypt)
- [ ] Configure CORS properly (`CORS_ORIGIN`)
- [ ] Enable rate limiting (configured in ingress)
- [ ] Keep dependencies updated (`npm audit fix`)
- [ ] Use secrets management (Kubernetes Secrets, AWS Secrets Manager)
- [ ] Enable network policies (Kubernetes)
- [ ] Configure firewall rules
- [ ] Regular security audits

---

## Support

For issues or questions:

- GitHub Issues: [repository-url]/issues
- Documentation: [docs-url]
- Email: support@musewave.com

---

**Last Updated**: 2024
**Version**: 1.0.0
