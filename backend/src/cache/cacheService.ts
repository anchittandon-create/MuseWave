/**
 * Production-grade Redis caching layer
 * Features:
 * - Intelligent TTL management
 * - Cache warming strategies
 * - Duplicate detection
 * - Compression for large objects
 * - Cache invalidation patterns
 */

import { Redis, ChainableCommander } from 'ioredis';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Compress large values
  namespace?: string; // Cache key namespace
}

export class CacheService {
  private redis: Redis;
  private readonly compressionThreshold = 1024; // 1KB

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn({ times, delay }, 'Retrying Redis connection');
        return delay;
      },
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected');
    });

    this.redis.on('error', (error: Error) => {
      logger.error({ error }, 'Redis connection error');
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const fullKey = this.buildKey(key, options.namespace);

    try {
      const value = await this.redis.getBuffer(fullKey);

      if (!value) {
        metrics.cacheMisses.inc();
        return null;
      }

      metrics.cacheHits.inc();

      // Check if compressed
      const isCompressed = value[0] === 0x1f && value[1] === 0x8b; // gzip magic number
      
      let data: Buffer = value;
      if (isCompressed) {
        data = await gunzipAsync(value);
      }

      return JSON.parse(data.toString('utf-8'));
    } catch (error) {
      logger.error({ key, error }, 'Cache get error');
      metrics.cacheMisses.inc();
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.buildKey(key, options.namespace);
    const ttl = options.ttl || 3600; // Default 1 hour

    try {
      const json = JSON.stringify(value);
      let data: Buffer = Buffer.from(json, 'utf-8');

      // Compress if large
      if (options.compress !== false && data.length > this.compressionThreshold) {
        data = await gzipAsync(data);
      }

      await this.redis.setex(fullKey, ttl, data);
    } catch (error) {
      logger.error({ key, error }, 'Cache set error');
      throw error;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.buildKey(key, options.namespace);

    try {
      await this.redis.del(fullKey);
    } catch (error) {
      logger.error({ key, error }, 'Cache delete error');
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.buildKey(key, options.namespace);

    try {
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error({ key, error }, 'Cache exists error');
      return false;
    }
  }

  /**
   * Delete keys by pattern
   */
  async deletePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    const fullPattern = this.buildKey(pattern, options.namespace);

    try {
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const pipeline = this.redis.pipeline();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();

      logger.info({ pattern, count: keys.length }, 'Deleted keys by pattern');
      return keys.length;
    } catch (error) {
      logger.error({ pattern, error }, 'Cache delete pattern error');
      return 0;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<Array<T | null>> {
    const fullKeys = keys.map((key) => this.buildKey(key, options.namespace));

    try {
      const values = await this.redis.mget(...fullKeys);

      return await Promise.all(
        values.map(async (value) => {
          if (!value) {
            metrics.cacheMisses.inc();
            return null;
          }

          metrics.cacheHits.inc();

          let data = Buffer.from(value, 'utf-8');

          // Check if compressed
          if (data[0] === 0x1f && data[1] === 0x8b) {
            data = await gunzipAsync(data);
          }

          return JSON.parse(data.toString('utf-8'));
        })
      );
    } catch (error) {
      logger.error({ keys, error }, 'Cache mget error');
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys at once
   */
  async mset<T = any>(entries: Array<{ key: string; value: T; ttl?: number }>, options: CacheOptions = {}): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const entry of entries) {
        const fullKey = this.buildKey(entry.key, options.namespace);
        const ttl = entry.ttl || options.ttl || 3600;

        const json = JSON.stringify(entry.value);
        let data: Buffer = Buffer.from(json, 'utf-8');

        if (options.compress !== false && data.length > this.compressionThreshold) {
          data = await gzipAsync(data);
        }

        pipeline.setex(fullKey, ttl, data);
      }

      await pipeline.exec();
    } catch (error) {
      logger.error({ count: entries.length, error }, 'Cache mset error');
      throw error;
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, by: number = 1, options: CacheOptions = {}): Promise<number> {
    const fullKey = this.buildKey(key, options.namespace);

    try {
      const result = await this.redis.incrby(fullKey, by);

      // Set expiry if new key
      if (result === by && options.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }

      return result;
    } catch (error) {
      logger.error({ key, error }, 'Cache increment error');
      throw error;
    }
  }

  /**
   * Add to set
   */
  async sadd(key: string, members: string[], options: CacheOptions = {}): Promise<number> {
    const fullKey = this.buildKey(key, options.namespace);

    try {
      const result = await this.redis.sadd(fullKey, ...members);

      if (options.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }

      return result;
    } catch (error) {
      logger.error({ key, error }, 'Cache sadd error');
      throw error;
    }
  }

  /**
   * Check if member in set
   */
  async sismember(key: string, member: string, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.buildKey(key, options.namespace);

    try {
      const result = await this.redis.sismember(fullKey, member);
      return result === 1;
    } catch (error) {
      logger.error({ key, error }, 'Cache sismember error');
      return false;
    }
  }

  /**
   * Get all set members
   */
  async smembers(key: string, options: CacheOptions = {}): Promise<string[]> {
    const fullKey = this.buildKey(key, options.namespace);

    try {
      return await this.redis.smembers(fullKey);
    } catch (error) {
      logger.error({ key, error }, 'Cache smembers error');
      return [];
    }
  }

  /**
   * Build full cache key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    const prefix = 'musewave';
    const ns = namespace || 'default';
    return `${prefix}:${ns}:${key}`;
  }

  /**
   * Generate deterministic hash for cache key
   */
  static hash(obj: any): string {
    const normalized = JSON.stringify(obj, Object.keys(obj).sort());
    return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * Cache decorator for functions
   */
  async cached<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const result = await fn();

    // Store in cache
    await this.set(key, result, options);

    return result;
  }

  /**
   * Warm cache with data
   */
  async warm(entries: Array<{ key: string; value: any; ttl?: number }>, options: CacheOptions = {}): Promise<void> {
    logger.info({ count: entries.length }, 'Warming cache');

    try {
      await this.mset(entries, options);
      logger.info({ count: entries.length }, 'Cache warmed successfully');
    } catch (error) {
      logger.error({ error }, 'Cache warming failed');
    }
  }

  /**
   * Get cache statistics
   */
  async stats() {
    try {
      const info = await this.redis.info('stats');
      const lines = info.split('\r\n');
      const stats: Record<string, string> = {};

      lines.forEach((line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      return stats;
    } catch (error) {
      logger.error({ error }, 'Failed to get cache stats');
      return {};
    }
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
      logger.warn('Cache flushed');
    } catch (error) {
      logger.error({ error }, 'Cache flush error');
      throw error;
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down cache service');
    await this.redis.quit();
    logger.info('Cache service shutdown complete');
  }
}

// Singleton instance
export const cacheService = new CacheService();

export default cacheService;
