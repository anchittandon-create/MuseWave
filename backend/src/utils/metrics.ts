/**
 * Prometheus metrics for monitoring
 */

import { register, Counter, Gauge, Histogram } from 'prom-client';

// Enable default system metrics
import { collectDefaultMetrics } from 'prom-client';
collectDefaultMetrics({ prefix: 'musewave_' });

// Queue metrics
export const metrics = {
  // Job lifecycle counters
  jobEnqueued: new Counter({
    name: 'musewave_jobs_enqueued_total',
    help: 'Total number of jobs added to queue',
  }),
  
  jobCompleted: new Counter({
    name: 'musewave_jobs_completed_total',
    help: 'Total number of jobs completed successfully',
  }),
  
  jobFailed: new Counter({
    name: 'musewave_jobs_failed_total',
    help: 'Total number of jobs that failed',
  }),
  
  jobRetried: new Counter({
    name: 'musewave_jobs_retried_total',
    help: 'Total number of job retries',
  }),
  
  jobStalled: new Counter({
    name: 'musewave_jobs_stalled_total',
    help: 'Total number of stalled jobs',
  }),

  // Queue state gauges
  queueWaiting: new Gauge({
    name: 'musewave_queue_waiting',
    help: 'Number of jobs waiting in queue',
  }),
  
  queueActive: new Gauge({
    name: 'musewave_queue_active',
    help: 'Number of jobs currently being processed',
  }),
  
  queueCompleted: new Gauge({
    name: 'musewave_queue_completed',
    help: 'Total number of completed jobs',
  }),
  
  queueFailed: new Gauge({
    name: 'musewave_queue_failed',
    help: 'Total number of failed jobs',
  }),
  
  queueDelayed: new Gauge({
    name: 'musewave_queue_delayed',
    help: 'Number of delayed jobs',
  }),

  // Performance metrics
  jobDuration: new Histogram({
    name: 'musewave_job_duration_ms',
    help: 'Job processing duration in milliseconds',
    buckets: [1000, 5000, 15000, 30000, 60000, 120000, 300000], // 1s to 5min
  }),
  
  jobProgress: new Gauge({
    name: 'musewave_job_progress',
    help: 'Current job progress percentage',
  }),

  // Cache metrics
  cacheHits: new Counter({
    name: 'musewave_cache_hits_total',
    help: 'Total number of cache hits',
  }),
  
  cacheMisses: new Counter({
    name: 'musewave_cache_misses_total',
    help: 'Total number of cache misses',
  }),

  // Worker metrics
  workerErrors: new Counter({
    name: 'musewave_worker_errors_total',
    help: 'Total number of worker errors',
  }),

  // API metrics
  httpRequestsTotal: new Counter({
    name: 'musewave_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status'],
  }),
  
  httpRequestDuration: new Histogram({
    name: 'musewave_http_request_duration_ms',
    help: 'HTTP request duration in milliseconds',
    labelNames: ['method', 'path', 'status'],
    buckets: [10, 50, 100, 500, 1000, 2000, 5000],
  }),

  // Generation metrics
  generationsTotal: new Counter({
    name: 'musewave_generations_total',
    help: 'Total number of music generations',
    labelNames: ['source', 'genre'],
  }),
  
  generationDuration: new Histogram({
    name: 'musewave_generation_duration_ms',
    help: 'Music generation duration in milliseconds',
    labelNames: ['source'],
    buckets: [5000, 15000, 30000, 60000, 120000, 300000, 600000],
  }),

  // Circuit breaker metrics
  circuitBreakerOpen: new Gauge({
    name: 'musewave_circuit_breaker_open',
    help: 'Circuit breaker state (1 = open, 0 = closed)',
    labelNames: ['service'],
  }),
  
  circuitBreakerFailures: new Counter({
    name: 'musewave_circuit_breaker_failures_total',
    help: 'Total number of circuit breaker failures',
    labelNames: ['service'],
  }),
};

export { register };

export default metrics;
