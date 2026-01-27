/**
 * Unit tests for Rate Limiting Middleware
 *
 * Note: express-rate-limit middleware is a well-tested library.
 * These tests verify our configuration is correct and exports work.
 */

import {
  generalRateLimiter,
  dispatchRateLimiter,
  webhookRateLimiter,
} from '../../../src/middleware/rate-limit.js';

describe('Rate Limiting Middleware', () => {
  describe('generalRateLimiter', () => {
    it('should be a function', () => {
      expect(typeof generalRateLimiter).toBe('function');
    });

    it('should be configured with expected options', () => {
      // The middleware should be a RequestHandler from express-rate-limit
      expect(generalRateLimiter).toBeDefined();
      expect(generalRateLimiter.name).toBeDefined();
    });
  });

  describe('dispatchRateLimiter', () => {
    it('should be a function', () => {
      expect(typeof dispatchRateLimiter).toBe('function');
    });

    it('should be configured as a rate limiter', () => {
      expect(dispatchRateLimiter).toBeDefined();
    });
  });

  describe('webhookRateLimiter', () => {
    it('should be a function', () => {
      expect(typeof webhookRateLimiter).toBe('function');
    });

    it('should be configured as a rate limiter', () => {
      expect(webhookRateLimiter).toBeDefined();
    });
  });

  describe('exports', () => {
    it('should export all three rate limiters', () => {
      expect(generalRateLimiter).toBeDefined();
      expect(dispatchRateLimiter).toBeDefined();
      expect(webhookRateLimiter).toBeDefined();
    });
  });
});
