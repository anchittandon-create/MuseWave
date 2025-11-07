/**
 * Circuit Breaker pattern for fault tolerance
 * Prevents cascading failures by stopping requests to failing services
 */

import CircuitBreakerLib from 'opossum';
import { logger } from './logger';
import { metrics } from './metrics';

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close
  timeout: number; // Request timeout in ms
  resetTimeout: number; // Time to wait before half-opening
  name?: string;
}

export class CircuitBreaker<T = any, R = any> {
  private breaker: CircuitBreakerLib<[T], R>;
  private name: string;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name || 'default';

    this.breaker = new CircuitBreakerLib(
      async (fn: () => Promise<R>) => {
        return await fn();
      },
      {
        timeout: options.timeout,
        errorThresholdPercentage: 50,
        resetTimeout: options.resetTimeout,
        rollingCountTimeout: 10000, // 10 seconds
        rollingCountBuckets: 10,
        name: this.name,
      }
    );

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.breaker.on('open', () => {
      logger.warn({ service: this.name }, 'Circuit breaker opened');
      metrics.circuitBreakerOpen.set({ service: this.name }, 1);
    });

    this.breaker.on('halfOpen', () => {
      logger.info({ service: this.name }, 'Circuit breaker half-opened');
      metrics.circuitBreakerOpen.set({ service: this.name }, 0.5);
    });

    this.breaker.on('close', () => {
      logger.info({ service: this.name }, 'Circuit breaker closed');
      metrics.circuitBreakerOpen.set({ service: this.name }, 0);
    });

    this.breaker.on('failure', (error) => {
      logger.error({ service: this.name, error }, 'Circuit breaker failure');
      metrics.circuitBreakerFailures.inc({ service: this.name });
    });

    this.breaker.on('timeout', () => {
      logger.warn({ service: this.name }, 'Circuit breaker timeout');
    });

    this.breaker.on('reject', () => {
      logger.warn({ service: this.name }, 'Circuit breaker rejected request');
    });
  }

  async execute(fn: () => Promise<R>): Promise<R> {
    return await this.breaker.fire(fn);
  }

  isOpen(): boolean {
    return this.breaker.opened;
  }

  getStats() {
    return this.breaker.stats;
  }

  shutdown() {
    this.breaker.shutdown();
  }
}

// Pre-configured circuit breakers for different services
export const circuitBreakers = {
  python: new CircuitBreaker({
    name: 'python',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 300000, // 5 minutes
    resetTimeout: 60000, // 1 minute
  }),

  ffmpeg: new CircuitBreaker({
    name: 'ffmpeg',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 180000, // 3 minutes
    resetTimeout: 30000, // 30 seconds
  }),

  gemini: new CircuitBreaker({
    name: 'gemini',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
    resetTimeout: 60000, // 1 minute
  }),
};

export default CircuitBreaker;
