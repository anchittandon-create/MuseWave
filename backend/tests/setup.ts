/**
 * Jest test setup and global configurations
 */

import { logger } from '../src/utils/logger';

// Suppress logs during tests
logger.level = 'silent';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '15'; // Use separate DB for tests
process.env.DATABASE_URL = 'file:./test.db';

// Global test timeout
jest.setTimeout(30000);

// Global setup
beforeAll(async () => {
  // Setup test database, Redis, etc.
  console.log('🧪 Test environment initialized');
});

// Global teardown
afterAll(async () => {
  // Cleanup
  console.log('🧪 Test environment cleaned up');
});

// Reset between tests
beforeEach(() => {
  jest.clearAllMocks();
});

export {};
