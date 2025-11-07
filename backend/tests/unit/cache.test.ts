/**
 * Unit tests for CacheService
 */

import { CacheService } from '../../src/cache/cacheService';
import { Redis } from 'ioredis';

jest.mock('ioredis');

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    cacheService = new CacheService();
    (cacheService as any).redis = mockRedis;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const testData = { foo: 'bar' };
      const buffer = Buffer.from(JSON.stringify(testData));
      
      mockRedis.getBuffer = jest.fn().mockResolvedValue(buffer);

      const result = await cacheService.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedis.getBuffer).toHaveBeenCalledWith('musewave:default:test-key');
    });

    it('should return null for cache miss', async () => {
      mockRedis.getBuffer = jest.fn().mockResolvedValue(null);

      const result = await cacheService.get('missing-key');

      expect(result).toBeNull();
    });

    it('should handle compressed data', async () => {
      const testData = { foo: 'bar'.repeat(1000) }; // Large data
      const compressed = Buffer.from([0x1f, 0x8b, 0x08]); // gzip header
      
      mockRedis.getBuffer = jest.fn().mockResolvedValue(compressed);

      // This will fail decompression in test, but tests the path
      await expect(cacheService.get('compressed-key')).resolves.toBeNull();
    });
  });

  describe('set', () => {
    it('should cache value with TTL', async () => {
      const testData = { foo: 'bar' };
      
      mockRedis.setex = jest.fn().mockResolvedValue('OK');

      await cacheService.set('test-key', testData, { ttl: 3600 });

      expect(mockRedis.setex).toHaveBeenCalled();
      const callArgs = mockRedis.setex.mock.calls[0];
      expect(callArgs[0]).toBe('musewave:default:test-key');
      expect(callArgs[1]).toBe(3600);
    });

    it('should use default TTL when not specified', async () => {
      mockRedis.setex = jest.fn().mockResolvedValue('OK');

      await cacheService.set('test-key', { foo: 'bar' });

      expect(mockRedis.setex).toHaveBeenCalled();
      const callArgs = mockRedis.setex.mock.calls[0];
      expect(callArgs[1]).toBe(3600); // Default TTL
    });
  });

  describe('delete', () => {
    it('should delete key from cache', async () => {
      mockRedis.del = jest.fn().mockResolvedValue(1);

      await cacheService.delete('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('musewave:default:test-key');
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists = jest.fn().mockResolvedValue(1);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists = jest.fn().mockResolvedValue(0);

      const result = await cacheService.exists('missing-key');

      expect(result).toBe(false);
    });
  });

  describe('cached', () => {
    it('should return cached value if exists', async () => {
      const cachedData = { foo: 'bar' };
      const buffer = Buffer.from(JSON.stringify(cachedData));
      
      mockRedis.getBuffer = jest.fn().mockResolvedValue(buffer);

      const fn = jest.fn();
      const result = await cacheService.cached('test-key', fn);

      expect(result).toEqual(cachedData);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should execute function and cache result on miss', async () => {
      mockRedis.getBuffer = jest.fn().mockResolvedValue(null);
      mockRedis.setex = jest.fn().mockResolvedValue('OK');

      const fnResult = { baz: 'qux' };
      const fn = jest.fn().mockResolvedValue(fnResult);

      const result = await cacheService.cached('test-key', fn);

      expect(result).toEqual(fnResult);
      expect(fn).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
    });
  });

  describe('hash', () => {
    it('should generate deterministic hash', () => {
      const obj1 = { foo: 'bar', baz: 'qux' };
      const obj2 = { baz: 'qux', foo: 'bar' }; // Different order

      const hash1 = CacheService.hash(obj1);
      const hash2 = CacheService.hash(obj2);

      expect(hash1).toBe(hash2); // Should be same regardless of key order
      expect(hash1).toHaveLength(16);
    });

    it('should generate different hashes for different objects', () => {
      const obj1 = { foo: 'bar' };
      const obj2 = { foo: 'baz' };

      const hash1 = CacheService.hash(obj1);
      const hash2 = CacheService.hash(obj2);

      expect(hash1).not.toBe(hash2);
    });
  });
});
