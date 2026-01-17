/**
 * Integration Tests for Health Endpoint
 *
 * Tests the health check endpoint with various dependency states.
 *
 * @requirements 10.3 - Return status 'healthy' with HTTP 200 when all dependencies available
 * @requirements 10.4 - Return status 'unhealthy' with HTTP 503 when critical dependency unavailable
 */

import request from 'supertest';
import { app } from '../../src/index.js';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock database connection
const mockVerifyConnection = jest.fn();

jest.mock('../../src/db/supabase.js', () => ({
  verifyConnection: () => mockVerifyConnection(),
  getSupabaseClient: jest.fn(),
  resetSupabaseClient: jest.fn(),
}));

// Mock Telegram adapter
const mockTelegramHealthCheck = jest.fn();
const mockIsTelegramConfigured = jest.fn();

jest.mock('../../src/adapters/telegram.js', () => ({
  isTelegramConfigured: () => mockIsTelegramConfigured(),
  telegramAdapter: {
    channelType: 'telegram',
    canSend: jest.fn(),
    send: jest.fn(),
    healthCheck: () => mockTelegramHealthCheck(),
  },
}));

// Mock Email adapter
const mockEmailHealthCheck = jest.fn();
const mockIsEmailConfigured = jest.fn();

jest.mock('../../src/adapters/email.js', () => ({
  isEmailConfigured: () => mockIsEmailConfigured(),
  emailAdapter: {
    channelType: 'email',
    canSend: jest.fn(),
    send: jest.fn(),
    healthCheck: () => mockEmailHealthCheck(),
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('Health Endpoint Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Healthy State', () => {
    beforeEach(() => {
      // Set up all dependencies as healthy
      mockVerifyConnection.mockResolvedValue({ connected: true, latencyMs: 10 });
      mockIsTelegramConfigured.mockReturnValue(true);
      mockIsEmailConfigured.mockReturnValue(true);
      mockTelegramHealthCheck.mockResolvedValue({ healthy: true });
      mockEmailHealthCheck.mockResolvedValue({ healthy: true });
    });

    it('should return HTTP 200 when all dependencies are healthy', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should include timestamp in response', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).getTime()).not.toBeNaN();
    });

    it('should include all component statuses', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('components');
      expect(response.body.components).toHaveProperty('database');
      expect(response.body.components).toHaveProperty('telegram');
      expect(response.body.components).toHaveProperty('email');
    });

    it('should show database as healthy when connected', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.components.database).toHaveProperty('status', 'healthy');
    });

    it('should show telegram as healthy when configured and working', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.components.telegram).toHaveProperty('status', 'healthy');
    });

    it('should show email as healthy when configured and working', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.components.email).toHaveProperty('status', 'healthy');
    });

    it('should not require authentication', async () => {
      // Health endpoint should be public
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      // No 401 error
    });
  });

  describe('Unhealthy State - Database Down', () => {
    beforeEach(() => {
      // Database is down
      mockVerifyConnection.mockResolvedValue({ connected: false, error: 'Connection refused' });
      mockIsTelegramConfigured.mockReturnValue(true);
      mockIsEmailConfigured.mockReturnValue(true);
      mockTelegramHealthCheck.mockResolvedValue({ healthy: true });
      mockEmailHealthCheck.mockResolvedValue({ healthy: true });
    });

    it('should return HTTP 503 when database is unavailable', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'unhealthy');
    });

    it('should show database as unhealthy with error message', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(503);
      expect(response.body.components.database).toHaveProperty('status', 'unhealthy');
      expect(response.body.components.database).toHaveProperty('error');
    });

    it('should still show other components status', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(503);
      expect(response.body.components.telegram).toHaveProperty('status');
      expect(response.body.components.email).toHaveProperty('status');
    });
  });

  describe('Unhealthy State - Database Exception', () => {
    beforeEach(() => {
      // Database throws exception
      mockVerifyConnection.mockRejectedValue(new Error('Database connection timeout'));
      mockIsTelegramConfigured.mockReturnValue(true);
      mockIsEmailConfigured.mockReturnValue(true);
      mockTelegramHealthCheck.mockResolvedValue({ healthy: true });
      mockEmailHealthCheck.mockResolvedValue({ healthy: true });
    });

    it('should return HTTP 503 when database throws exception', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body.components.database).toHaveProperty('status', 'unhealthy');
    });
  });

  describe('Degraded State - Adapters Not Configured', () => {
    beforeEach(() => {
      // Database healthy, but adapters not configured
      mockVerifyConnection.mockResolvedValue({ connected: true, latencyMs: 10 });
      mockIsTelegramConfigured.mockReturnValue(false);
      mockIsEmailConfigured.mockReturnValue(false);
      mockTelegramHealthCheck.mockResolvedValue({ healthy: false, message: 'Telegram bot token is not configured' });
      mockEmailHealthCheck.mockResolvedValue({ healthy: false, message: 'Email provider is not configured' });
    });

    it('should return HTTP 200 with degraded status when adapters not configured', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'degraded');
    });

    it('should show telegram as degraded when not configured', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.body.components.telegram).toHaveProperty('status', 'degraded');
      expect(response.body.components.telegram).toHaveProperty('error');
    });

    it('should show email as degraded when not configured', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.body.components.email).toHaveProperty('status', 'degraded');
      expect(response.body.components.email).toHaveProperty('error');
    });
  });

  describe('Unhealthy State - Adapter Failure', () => {
    beforeEach(() => {
      // Database healthy, but telegram adapter fails
      mockVerifyConnection.mockResolvedValue({ connected: true, latencyMs: 10 });
      mockIsTelegramConfigured.mockReturnValue(true);
      mockIsEmailConfigured.mockReturnValue(true);
      mockTelegramHealthCheck.mockResolvedValue({ healthy: false, message: 'Telegram API error' });
      mockEmailHealthCheck.mockResolvedValue({ healthy: true });
    });

    it('should return HTTP 503 when adapter health check fails', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'unhealthy');
    });

    it('should show telegram as unhealthy with error', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.body.components.telegram).toHaveProperty('status', 'unhealthy');
      expect(response.body.components.telegram).toHaveProperty('error', 'Telegram API error');
    });
  });

  describe('Unhealthy State - Adapter Exception', () => {
    beforeEach(() => {
      // Database healthy, but adapter throws exception
      mockVerifyConnection.mockResolvedValue({ connected: true, latencyMs: 10 });
      mockIsTelegramConfigured.mockReturnValue(true);
      mockIsEmailConfigured.mockReturnValue(true);
      mockTelegramHealthCheck.mockRejectedValue(new Error('Network error'));
      mockEmailHealthCheck.mockResolvedValue({ healthy: true });
    });

    it('should return HTTP 503 when adapter throws exception', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body.components.telegram).toHaveProperty('status', 'unhealthy');
    });
  });

  describe('Mixed States', () => {
    it('should return degraded when only one adapter is not configured', async () => {
      mockVerifyConnection.mockResolvedValue({ connected: true, latencyMs: 10 });
      mockIsTelegramConfigured.mockReturnValue(true);
      mockIsEmailConfigured.mockReturnValue(false);
      mockTelegramHealthCheck.mockResolvedValue({ healthy: true });
      mockEmailHealthCheck.mockResolvedValue({ healthy: false, message: 'Email provider is not configured' });

      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'degraded');
      expect(response.body.components.telegram).toHaveProperty('status', 'healthy');
      expect(response.body.components.email).toHaveProperty('status', 'degraded');
    });

    it('should return unhealthy when database is down even if adapters are healthy', async () => {
      mockVerifyConnection.mockResolvedValue({ connected: false, error: 'Connection failed' });
      mockIsTelegramConfigured.mockReturnValue(true);
      mockIsEmailConfigured.mockReturnValue(true);
      mockTelegramHealthCheck.mockResolvedValue({ healthy: true });
      mockEmailHealthCheck.mockResolvedValue({ healthy: true });

      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'unhealthy');
    });
  });

  describe('Response Structure', () => {
    beforeEach(() => {
      mockVerifyConnection.mockResolvedValue({ connected: true, latencyMs: 10 });
      mockIsTelegramConfigured.mockReturnValue(true);
      mockIsEmailConfigured.mockReturnValue(true);
      mockTelegramHealthCheck.mockResolvedValue({ healthy: true });
      mockEmailHealthCheck.mockResolvedValue({ healthy: true });
    });

    it('should have correct response structure', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.any(String),
        components: {
          database: expect.objectContaining({
            status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
          }),
          telegram: expect.objectContaining({
            status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
          }),
          email: expect.objectContaining({
            status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
          }),
        },
      });
    });

    it('should include correlation ID in response headers', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });
});
