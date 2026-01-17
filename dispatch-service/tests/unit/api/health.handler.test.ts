/**
 * Unit tests for Health Check API Handler
 *
 * @requirements 10.1 - Return service health status on GET /api/v1/health
 * @requirements 10.2 - Include status, database connectivity, and channel adapter availability
 * @requirements 10.3 - Return status 'healthy' with HTTP 200 when all dependencies available
 * @requirements 10.4 - Return status 'unhealthy' with HTTP 503 when critical dependency unavailable
 */

import { Request, Response } from 'express';
import {
  createHealthHandler,
  HealthCheckResponse,
} from '../../../src/api/handlers/health.js';
import { ChannelAdapter, HealthStatus } from '../../../src/adapters/interface.js';

// Import to get the Express Request type extension for correlationId
import '../../../src/middleware/correlation.js';

// Mock the database module
jest.mock('../../../src/db/supabase.js', () => ({
  verifyConnection: jest.fn(),
}));

// Mock the adapter configuration checks
jest.mock('../../../src/adapters/telegram.js', () => ({
  isTelegramConfigured: jest.fn(),
}));

jest.mock('../../../src/adapters/email.js', () => ({
  isEmailConfigured: jest.fn(),
}));

import { verifyConnection } from '../../../src/db/supabase.js';
import { isTelegramConfigured } from '../../../src/adapters/telegram.js';
import { isEmailConfigured } from '../../../src/adapters/email.js';

const mockVerifyConnection = verifyConnection as jest.MockedFunction<typeof verifyConnection>;
const mockIsTelegramConfigured = isTelegramConfigured as jest.MockedFunction<typeof isTelegramConfigured>;
const mockIsEmailConfigured = isEmailConfigured as jest.MockedFunction<typeof isEmailConfigured>;

/**
 * Create a mock channel adapter for testing
 */
function createMockAdapter(
  channelType: 'telegram' | 'email',
  healthStatus: HealthStatus
): ChannelAdapter {
  return {
    channelType,
    canSend: jest.fn().mockReturnValue(true),
    send: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue(healthStatus),
  };
}

describe('Health Handler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: HealthCheckResponse;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      correlationId: 'test-correlation-id',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((body) => {
        responseJson = body;
        return mockResponse;
      }),
    };

    // Default mocks - all healthy
    mockVerifyConnection.mockResolvedValue({ connected: true, latencyMs: 10 });
    mockIsTelegramConfigured.mockReturnValue(true);
    mockIsEmailConfigured.mockReturnValue(true);
  });

  describe('All Components Healthy (Requirement 10.3)', () => {
    it('should return 200 with status healthy when all components are healthy', async () => {
      const telegramAdapter = createMockAdapter('telegram', { healthy: true });
      const emailAdapter = createMockAdapter('email', { healthy: true });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseJson.status).toBe('healthy');
      expect(responseJson.components.database.status).toBe('healthy');
      expect(responseJson.components.telegram.status).toBe('healthy');
      expect(responseJson.components.email.status).toBe('healthy');
    });

    it('should include timestamp in response', async () => {
      const handler = createHealthHandler();

      await handler(mockRequest as Request, mockResponse as Response);

      expect(responseJson.timestamp).toBeDefined();
      expect(new Date(responseJson.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('Database Unhealthy (Requirement 10.4)', () => {
    it('should return 503 with status unhealthy when database is down', async () => {
      mockVerifyConnection.mockResolvedValue({
        connected: false,
        error: 'Connection timeout',
      });

      const telegramAdapter = createMockAdapter('telegram', { healthy: true });
      const emailAdapter = createMockAdapter('email', { healthy: true });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(responseJson.status).toBe('unhealthy');
      expect(responseJson.components.database.status).toBe('unhealthy');
      expect(responseJson.components.database.error).toBe('Connection timeout');
    });

    it('should return 503 when database throws an error', async () => {
      mockVerifyConnection.mockRejectedValue(new Error('Database error'));

      const handler = createHealthHandler();

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(responseJson.status).toBe('unhealthy');
      expect(responseJson.components.database.status).toBe('unhealthy');
      expect(responseJson.components.database.error).toBe('Database error');
    });
  });

  describe('Adapter Unhealthy (Requirement 10.4)', () => {
    it('should return 503 when telegram adapter is unhealthy', async () => {
      const telegramAdapter = createMockAdapter('telegram', {
        healthy: false,
        message: 'Bot token invalid',
      });
      const emailAdapter = createMockAdapter('email', { healthy: true });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(responseJson.status).toBe('unhealthy');
      expect(responseJson.components.telegram.status).toBe('unhealthy');
      expect(responseJson.components.telegram.error).toBe('Bot token invalid');
    });

    it('should return 503 when email adapter is unhealthy', async () => {
      const telegramAdapter = createMockAdapter('telegram', { healthy: true });
      const emailAdapter = createMockAdapter('email', {
        healthy: false,
        message: 'API key invalid',
      });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(responseJson.status).toBe('unhealthy');
      expect(responseJson.components.email.status).toBe('unhealthy');
      expect(responseJson.components.email.error).toBe('API key invalid');
    });

    it('should return 503 when adapter healthCheck throws an error', async () => {
      const telegramAdapter: ChannelAdapter = {
        channelType: 'telegram',
        canSend: jest.fn(),
        send: jest.fn(),
        healthCheck: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      const emailAdapter = createMockAdapter('email', { healthy: true });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(responseJson.status).toBe('unhealthy');
      expect(responseJson.components.telegram.status).toBe('unhealthy');
      expect(responseJson.components.telegram.error).toBe('Network error');
    });
  });

  describe('Degraded Status', () => {
    it('should return 200 with status degraded when adapter is not configured', async () => {
      const telegramAdapter = createMockAdapter('telegram', {
        healthy: false,
        message: 'Telegram bot token is not configured',
      });
      const emailAdapter = createMockAdapter('email', { healthy: true });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseJson.status).toBe('degraded');
      expect(responseJson.components.telegram.status).toBe('degraded');
      expect(responseJson.components.telegram.error).toBe('Telegram bot token is not configured');
    });

    it('should return 200 with status degraded when email is not configured', async () => {
      const telegramAdapter = createMockAdapter('telegram', { healthy: true });
      const emailAdapter = createMockAdapter('email', {
        healthy: false,
        message: 'Email provider is not configured',
      });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseJson.status).toBe('degraded');
      expect(responseJson.components.email.status).toBe('degraded');
    });

    it('should return degraded when both adapters are not configured', async () => {
      const telegramAdapter = createMockAdapter('telegram', {
        healthy: false,
        message: 'Telegram bot token is not configured',
      });
      const emailAdapter = createMockAdapter('email', {
        healthy: false,
        message: 'Email provider is not configured',
      });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseJson.status).toBe('degraded');
      expect(responseJson.components.telegram.status).toBe('degraded');
      expect(responseJson.components.email.status).toBe('degraded');
    });
  });

  describe('No Adapters Provided', () => {
    it('should check configuration status when no adapters provided', async () => {
      mockIsTelegramConfigured.mockReturnValue(false);
      mockIsEmailConfigured.mockReturnValue(false);

      const handler = createHealthHandler();

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseJson.status).toBe('degraded');
      expect(responseJson.components.telegram.status).toBe('degraded');
      expect(responseJson.components.email.status).toBe('degraded');
    });

    it('should return healthy when adapters are configured but not provided', async () => {
      mockIsTelegramConfigured.mockReturnValue(true);
      mockIsEmailConfigured.mockReturnValue(true);

      const handler = createHealthHandler();

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseJson.status).toBe('healthy');
      expect(responseJson.components.telegram.status).toBe('healthy');
      expect(responseJson.components.email.status).toBe('healthy');
    });
  });

  describe('Response Structure (Requirement 10.2)', () => {
    it('should include all required fields in response', async () => {
      const telegramAdapter = createMockAdapter('telegram', { healthy: true });
      const emailAdapter = createMockAdapter('email', { healthy: true });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(responseJson).toHaveProperty('status');
      expect(responseJson).toHaveProperty('timestamp');
      expect(responseJson).toHaveProperty('components');
      expect(responseJson.components).toHaveProperty('database');
      expect(responseJson.components).toHaveProperty('telegram');
      expect(responseJson.components).toHaveProperty('email');
    });

    it('should include error messages for unhealthy components', async () => {
      mockVerifyConnection.mockResolvedValue({
        connected: false,
        error: 'Connection refused',
      });

      const telegramAdapter = createMockAdapter('telegram', {
        healthy: false,
        message: 'Bot offline',
      });
      const emailAdapter = createMockAdapter('email', {
        healthy: false,
        message: 'API error',
      });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(responseJson.components.database.error).toBe('Connection refused');
      expect(responseJson.components.telegram.error).toBe('Bot offline');
      expect(responseJson.components.email.error).toBe('API error');
    });
  });

  describe('Mixed Health States', () => {
    it('should return unhealthy if database is down even if adapters are healthy', async () => {
      mockVerifyConnection.mockResolvedValue({
        connected: false,
        error: 'Database down',
      });

      const telegramAdapter = createMockAdapter('telegram', { healthy: true });
      const emailAdapter = createMockAdapter('email', { healthy: true });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(responseJson.status).toBe('unhealthy');
    });

    it('should return unhealthy if any adapter is unhealthy (not just unconfigured)', async () => {
      const telegramAdapter = createMockAdapter('telegram', {
        healthy: false,
        message: 'Rate limited', // Not a configuration issue
      });
      const emailAdapter = createMockAdapter('email', { healthy: true });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(responseJson.status).toBe('unhealthy');
      expect(responseJson.components.telegram.status).toBe('unhealthy');
    });

    it('should return degraded if one adapter is degraded and others are healthy', async () => {
      const telegramAdapter = createMockAdapter('telegram', { healthy: true });
      const emailAdapter = createMockAdapter('email', {
        healthy: false,
        message: 'Email provider is not configured',
      });

      const handler = createHealthHandler({
        adapters: [telegramAdapter, emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseJson.status).toBe('degraded');
      expect(responseJson.components.telegram.status).toBe('healthy');
      expect(responseJson.components.email.status).toBe('degraded');
    });
  });

  describe('Partial Adapter Registration', () => {
    it('should handle only telegram adapter registered', async () => {
      mockIsEmailConfigured.mockReturnValue(false);

      const telegramAdapter = createMockAdapter('telegram', { healthy: true });

      const handler = createHealthHandler({
        adapters: [telegramAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(responseJson.components.telegram.status).toBe('healthy');
      expect(responseJson.components.email.status).toBe('degraded');
    });

    it('should handle only email adapter registered', async () => {
      mockIsTelegramConfigured.mockReturnValue(false);

      const emailAdapter = createMockAdapter('email', { healthy: true });

      const handler = createHealthHandler({
        adapters: [emailAdapter],
      });

      await handler(mockRequest as Request, mockResponse as Response);

      expect(responseJson.components.telegram.status).toBe('degraded');
      expect(responseJson.components.email.status).toBe('healthy');
    });
  });
});
