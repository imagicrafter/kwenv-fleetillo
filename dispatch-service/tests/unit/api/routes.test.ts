/**
 * Unit tests for API Routes Configuration
 *
 * Tests that routes are correctly configured with authentication:
 * - Health endpoint is public (no authentication required)
 * - Dispatch endpoints require API key authentication
 *
 * @requirements 9.1 - Return 401 Unauthorized for missing API key
 * @requirements 9.2 - Return 401 Unauthorized for invalid API key
 * @requirements 9.3 - Process requests with valid API key in X-API-Key header
 */

import express, { Express } from 'express';
import request from 'supertest';
import { createApiRouter } from '../../../src/api/routes.js';
import { DispatchOrchestrator } from '../../../src/core/orchestrator.js';
import { ChannelAdapter, HealthStatus } from '../../../src/adapters/interface.js';

// Mock the dispatch repository
jest.mock('../../../src/db/dispatch.repository.js', () => ({
  createDispatch: jest.fn(),
  updateDispatchStatus: jest.fn(),
  createChannelDispatch: jest.fn(),
  updateChannelDispatch: jest.fn(),
  getDispatchWithChannels: jest.fn(),
}));

// Mock the entities repository
jest.mock('../../../src/db/entities.repository.js', () => ({
  getRoute: jest.fn(),
  getDriver: jest.fn(),
  getVehicle: jest.fn(),
  getBookingsForRoute: jest.fn(),
}));

// Mock the supabase module
jest.mock('../../../src/db/supabase.js', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
  verifyConnection: jest.fn().mockResolvedValue({ connected: true }),
}));

// Mock the telegram adapter configuration check
jest.mock('../../../src/adapters/telegram.js', () => ({
  telegramAdapter: {
    channelType: 'telegram',
    canSend: jest.fn().mockReturnValue(true),
    send: jest.fn().mockResolvedValue({ success: true, channelType: 'telegram', sentAt: new Date() }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
  },
  isTelegramConfigured: jest.fn().mockReturnValue(true),
}));

// Mock the email adapter configuration check
jest.mock('../../../src/adapters/email.js', () => ({
  emailAdapter: {
    channelType: 'email',
    canSend: jest.fn().mockReturnValue(true),
    send: jest.fn().mockResolvedValue({ success: true, channelType: 'email', sentAt: new Date() }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
  },
  isEmailConfigured: jest.fn().mockReturnValue(true),
}));

describe('API Routes', () => {
  let app: Express;
  let mockOrchestrator: jest.Mocked<DispatchOrchestrator>;
  let originalEnv: string | undefined;

  // Create a mock adapter for health checks
  const createMockAdapter = (channelType: 'telegram' | 'email'): ChannelAdapter => ({
    channelType,
    canSend: jest.fn().mockReturnValue(true),
    send: jest.fn().mockResolvedValue({
      success: true,
      channelType,
      sentAt: new Date(),
    }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true } as HealthStatus),
  });

  beforeEach(() => {
    // Save original env
    originalEnv = process.env.DISPATCH_API_KEYS;
    // Set up valid API keys for testing
    process.env.DISPATCH_API_KEYS = 'test-api-key-1,test-api-key-2';

    // Create mock orchestrator
    mockOrchestrator = {
      dispatch: jest.fn(),
      dispatchBatch: jest.fn(),
      getDispatch: jest.fn(),
      registerAdapter: jest.fn(),
    } as unknown as jest.Mocked<DispatchOrchestrator>;

    // Create Express app with routes
    app = express();
    app.use(express.json());

    // Add correlation ID middleware (simplified for testing)
    app.use((req, _res, next) => {
      req.correlationId = 'test-correlation-id';
      next();
    });

    // Mount the API router
    const mockAdapters = [createMockAdapter('telegram'), createMockAdapter('email')];
    const apiRouter = createApiRouter({
      orchestrator: mockOrchestrator,
      healthDependencies: {
        adapters: mockAdapters,
      },
    });
    app.use('/api/v1', apiRouter);
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.DISPATCH_API_KEYS = originalEnv;
    } else {
      delete process.env.DISPATCH_API_KEYS;
    }
    jest.clearAllMocks();
  });

  describe('Health Endpoint (Public)', () => {
    it('should allow access to /api/v1/health without API key', async () => {
      const response = await request(app).get('/api/v1/health');

      // Should not return 401 Unauthorized
      expect(response.status).not.toBe(401);
      // Should return 200 OK (healthy) or 503 (unhealthy)
      expect([200, 503]).toContain(response.status);
    });

    it('should return health status without authentication', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('components');
    });

    it('should work with API key provided (optional)', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('X-API-Key', 'test-api-key-1');

      expect(response.status).not.toBe(401);
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('POST /api/v1/dispatch (Protected)', () => {
    const validDispatchBody = {
      route_id: '123e4567-e89b-12d3-a456-426614174000',
      driver_id: '123e4567-e89b-12d3-a456-426614174001',
    };

    it('should return 401 when API key is missing', async () => {
      const response = await request(app)
        .post('/api/v1/dispatch')
        .send(validDispatchBody);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Missing API key');
    });

    it('should return 401 when API key is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/dispatch')
        .set('X-API-Key', 'invalid-api-key')
        .send(validDispatchBody);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Invalid API key');
    });

    it('should process request when API key is valid', async () => {
      mockOrchestrator.dispatch.mockResolvedValue({
        dispatchId: 'dispatch-123',
        status: 'pending',
        requestedChannels: ['telegram'],
      });

      const response = await request(app)
        .post('/api/v1/dispatch')
        .set('X-API-Key', 'test-api-key-1')
        .send(validDispatchBody);

      // Should not return 401
      expect(response.status).not.toBe(401);
      // Should call the orchestrator
      expect(mockOrchestrator.dispatch).toHaveBeenCalled();
    });

    it('should accept any valid configured API key', async () => {
      mockOrchestrator.dispatch.mockResolvedValue({
        dispatchId: 'dispatch-123',
        status: 'pending',
        requestedChannels: ['telegram'],
      });

      // Test with second API key
      const response = await request(app)
        .post('/api/v1/dispatch')
        .set('X-API-Key', 'test-api-key-2')
        .send(validDispatchBody);

      expect(response.status).not.toBe(401);
      expect(mockOrchestrator.dispatch).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/dispatch/batch (Protected)', () => {
    const validBatchBody = {
      dispatches: [
        {
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
        },
      ],
    };

    it('should return 401 when API key is missing', async () => {
      const response = await request(app)
        .post('/api/v1/dispatch/batch')
        .send(validBatchBody);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when API key is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/dispatch/batch')
        .set('X-API-Key', 'invalid-api-key')
        .send(validBatchBody);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should process request when API key is valid', async () => {
      mockOrchestrator.dispatchBatch.mockResolvedValue({
        results: [{ index: 0, success: true, dispatchId: 'dispatch-123' }],
        summary: { total: 1, successful: 1, failed: 0 },
      });

      const response = await request(app)
        .post('/api/v1/dispatch/batch')
        .set('X-API-Key', 'test-api-key-1')
        .send(validBatchBody);

      expect(response.status).not.toBe(401);
      expect(mockOrchestrator.dispatchBatch).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/dispatch/:id (Protected)', () => {
    const validDispatchId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return 401 when API key is missing', async () => {
      const response = await request(app).get(`/api/v1/dispatch/${validDispatchId}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when API key is invalid', async () => {
      const response = await request(app)
        .get(`/api/v1/dispatch/${validDispatchId}`)
        .set('X-API-Key', 'invalid-api-key');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should process request when API key is valid', async () => {
      mockOrchestrator.getDispatch.mockResolvedValue({
        dispatch: {
          id: validDispatchId,
          routeId: 'route-123',
          driverId: 'driver-123',
          status: 'delivered',
          requestedChannels: ['telegram'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        channelDispatches: [],
      });

      const response = await request(app)
        .get(`/api/v1/dispatch/${validDispatchId}`)
        .set('X-API-Key', 'test-api-key-1');

      expect(response.status).not.toBe(401);
      expect(mockOrchestrator.getDispatch).toHaveBeenCalledWith(validDispatchId);
    });
  });

  describe('Route Configuration', () => {
    it('should mount health endpoint at /api/v1/health', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.status).not.toBe(404);
    });

    it('should mount dispatch endpoint at /api/v1/dispatch', async () => {
      const response = await request(app)
        .post('/api/v1/dispatch')
        .set('X-API-Key', 'test-api-key-1')
        .send({});

      // Should not be 404 (route exists), might be 400 for validation
      expect(response.status).not.toBe(404);
    });

    it('should mount batch dispatch endpoint at /api/v1/dispatch/batch', async () => {
      const response = await request(app)
        .post('/api/v1/dispatch/batch')
        .set('X-API-Key', 'test-api-key-1')
        .send({});

      // Should not be 404 (route exists), might be 400 for validation
      expect(response.status).not.toBe(404);
    });

    it('should mount get dispatch endpoint at /api/v1/dispatch/:id', async () => {
      await request(app)
        .get('/api/v1/dispatch/123e4567-e89b-12d3-a456-426614174000')
        .set('X-API-Key', 'test-api-key-1');

      // Should not be 404 for route not found (might be 404 for dispatch not found)
      // The route should exist and be processed
      expect(mockOrchestrator.getDispatch).toHaveBeenCalled();
    });
  });

  describe('Authentication Middleware Order', () => {
    it('should check authentication before processing dispatch request', async () => {
      // Without API key, orchestrator should not be called
      await request(app)
        .post('/api/v1/dispatch')
        .send({
          route_id: '123e4567-e89b-12d3-a456-426614174000',
          driver_id: '123e4567-e89b-12d3-a456-426614174001',
        });

      expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();
    });

    it('should check authentication before processing batch request', async () => {
      // Without API key, orchestrator should not be called
      await request(app)
        .post('/api/v1/dispatch/batch')
        .send({
          dispatches: [
            {
              route_id: '123e4567-e89b-12d3-a456-426614174000',
              driver_id: '123e4567-e89b-12d3-a456-426614174001',
            },
          ],
        });

      expect(mockOrchestrator.dispatchBatch).not.toHaveBeenCalled();
    });

    it('should check authentication before processing get dispatch request', async () => {
      // Without API key, orchestrator should not be called
      await request(app).get('/api/v1/dispatch/123e4567-e89b-12d3-a456-426614174000');

      expect(mockOrchestrator.getDispatch).not.toHaveBeenCalled();
    });
  });
});
