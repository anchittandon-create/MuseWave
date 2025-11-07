/**
 * Unit tests for Circuit Breaker
 */

import { CircuitBreaker } from '../../src/utils/circuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test-service',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      resetTimeout: 2000,
    });
  });

  afterEach(() => {
    breaker.shutdown();
  });

  it('should execute successful function', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = await breaker.execute(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalled();
  });

  it('should handle function errors', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Test error'));

    await expect(breaker.execute(fn)).rejects.toThrow('Test error');
  });

  it('should timeout long-running functions', async () => {
    const fn = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => setTimeout(resolve, 5000));
    });

    await expect(breaker.execute(fn)).rejects.toThrow();
  }, 10000);

  it('should track stats', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    await breaker.execute(fn);
    await breaker.execute(fn);

    const stats = breaker.getStats();

    expect(stats.successes).toBeGreaterThan(0);
  });

  it('should not be open initially', () => {
    expect(breaker.isOpen()).toBe(false);
  });
});
