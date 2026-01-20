/**
 * Unit tests for Express server setup
 *
 * Tests the Express server initialization, middleware configuration,
 * and basic endpoint functionality.
 *
 * @requirements 12.2 - Structured JSON logging for all log entries
 * @requirements 12.4 - Include correlation IDs in logs for request tracing
 */

import request from 'supertest';
import { app } from '../../src/index.js';

// Mock the database module for health check tests
jest.mock('../../src/db/supabase.js', () => ({
  verifyConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 10 }),
  getSupabaseClient: jest.fn(),
  resetSupabaseClient: jest.fn(),
}));

// Mock the adapter configuration checks
jest.mock('../../src/adapters/telegram.js', () => ({
  isTelegramConfigured: jest.fn().mockReturnValue(true),
  telegramAdapter: {
    channelType: 'telegram',
    canSend: jest.fn(),
    send: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
  },
}));

jest.mock('../../src/adapters/email.js', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(true),
  emailAdapter: {
    channelType: 'email',
    canSend: jest.fn(),
    send: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
  },
}));

describe('Express Server Setup', () => {
  describe('Basic Server Configuration', () => {
    it('should respond to root endpoint', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('service', 'Fleetillo Dispatch Service');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('status', 'running');
    });

    it('should respond to health check endpoint', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('components');
      expect(response.body.components).toHaveProperty('database');
      expect(response.body.components).toHaveProperty('telegram');
      expect(response.body.components).toHaveProperty('email');
    });

    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/v1/unknown');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('requestId');
    });
  });

  describe('JSON Body Parsing', () => {
    it('should parse JSON request bodies', async () => {
      const response = await request(app)
        .post('/api/v1/unknown')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      // Should get 404 (route not found) but body should be parsed
      expect(response.status).toBe(404);
    });

    it('should handle URL-encoded bodies', async () => {
      const response = await request(app)
        .post('/api/v1/unknown')
        .send('test=data')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.status).toBe(404);
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers in response', async () => {
      const response = await request(app)
        .options('/')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should allow X-API-Key header', async () => {
      const response = await request(app)
        .options('/')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'X-API-Key');

      expect(response.headers['access-control-allow-headers']).toContain('X-API-Key');
    });

    it('should expose X-Correlation-ID header', async () => {
      const response = await request(app).get('/');

      expect(response.headers['access-control-expose-headers']).toContain('X-Correlation-ID');
    });
  });

  describe('Correlation ID Middleware', () => {
    it('should generate correlation ID if not provided', async () => {
      const response = await request(app).get('/');

      expect(response.headers['x-correlation-id']).toBeDefined();
      // UUID format check
      expect(response.headers['x-correlation-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should use provided correlation ID', async () => {
      const customCorrelationId = 'custom-correlation-id-123';
      const response = await request(app)
        .get('/')
        .set('X-Correlation-ID', customCorrelationId);

      expect(response.headers['x-correlation-id']).toBe(customCorrelationId);
    });

    it('should include correlation ID in error responses', async () => {
      const response = await request(app).get('/api/v1/unknown');

      expect(response.status).toBe(404);
      expect(response.body.requestId).toBe(response.headers['x-correlation-id']);
    });
  });
});
