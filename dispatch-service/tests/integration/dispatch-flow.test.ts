/**
 * Integration Tests for Dispatch Flow
 * @requirements 1.1, 2.1, 8.1, 8.2
 */

import request from 'supertest';

const VALID_API_KEY = 'test-api-key-12345';
process.env.DISPATCH_API_KEYS = VALID_API_KEY;

const TEST_ROUTE_ID = '11111111-1111-4111-a111-111111111111';
const TEST_DRIVER_ID = '22222222-2222-4222-a222-222222222222';
const TEST_DRIVER_2_ID = '33333333-3333-4333-a333-333333333333';
const TEST_VEHICLE_ID = '44444444-4444-4444-a444-444444444444';
const NON_EXISTENT_ROUTE = '99999999-9999-4999-a999-999999999999';
const NON_EXISTENT_DRIVER = '88888888-8888-4888-a888-888888888888';
const NON_EXISTENT_DISPATCH = '77777777-7777-4777-a777-777777777777';

const mockRouteData = {
  id: TEST_ROUTE_ID, route_name: 'Test Route 1', route_code: 'TR001', route_date: '2026-01-16',
  planned_start_time: '08:00:00', planned_end_time: '17:00:00', total_stops: 3,
  total_distance_km: 50, total_duration_minutes: 480, vehicle_id: TEST_VEHICLE_ID,
  assigned_to: TEST_DRIVER_ID, deleted_at: null, stop_sequence: [],
};

const mockDriverData = {
  id: TEST_DRIVER_ID, first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com',
  telegram_chat_id: '123456789', preferred_channel: 'telegram', fallback_enabled: true,
  status: 'active', deleted_at: null,
};

const mockDriver2Data = {
  id: TEST_DRIVER_2_ID, first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com',
  telegram_chat_id: null, preferred_channel: 'email', fallback_enabled: true,
  status: 'active', deleted_at: null,
};

const mockVehicleData = {
  id: TEST_VEHICLE_ID, name: 'Van 1', license_plate: 'ABC-123', make: 'Ford', model: 'Transit', deleted_at: null,
};

const mockDispatches = new Map<string, Record<string, unknown>>();
const mockChannelDispatches = new Map<string, Record<string, unknown>>();
let dispatchIdCounter = 0;

jest.mock('../../src/db/supabase.js', () => {
  const createTableMock = (table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn((data: Record<string, unknown> | Record<string, unknown>[]) => ({
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => {
        if (table === 'dispatches') {
          const record = Array.isArray(data) ? data[0] : data;
          if (!record) return Promise.resolve({ data: null, error: { message: 'No data' } });
          dispatchIdCounter++;
          const id = `55555555-5555-4555-a555-${String(dispatchIdCounter).padStart(12, '0')}`;
          const dispatch = { id, route_id: record.route_id, driver_id: record.driver_id, status: record.status || 'pending', requested_channels: record.requested_channels, metadata: record.metadata, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
          mockDispatches.set(id, dispatch);
          return Promise.resolve({ data: dispatch, error: null });
        }
        if (table === 'channel_dispatches') {
          const record = Array.isArray(data) ? data[0] : data;
          if (!record) return Promise.resolve({ data: null, error: { message: 'No data' } });
          const id = `66666666-6666-4666-a666-${String(Date.now()).slice(-12)}`;
          const channelDispatch = { id, dispatch_id: record.dispatch_id, channel: record.channel, status: record.status || 'pending', provider_message_id: null, error_message: null, sent_at: null, delivered_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
          mockChannelDispatches.set(id, channelDispatch);
          return Promise.resolve({ data: channelDispatch, error: null });
        }
        return Promise.resolve({ data: null, error: { message: 'Unknown table' } });
      }),
    })),
    update: jest.fn((data: Record<string, unknown>) => ({
      eq: jest.fn((field: string, value: string) => ({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          if (table === 'dispatches' && field === 'id') {
            const dispatch = mockDispatches.get(value);
            if (dispatch) { Object.assign(dispatch, data, { updated_at: new Date().toISOString() }); return Promise.resolve({ data: dispatch, error: null }); }
          }
          if (table === 'channel_dispatches' && field === 'id') {
            const cd = mockChannelDispatches.get(value);
            if (cd) { Object.assign(cd, data, { updated_at: new Date().toISOString() }); return Promise.resolve({ data: cd, error: null }); }
          }
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        }),
      })),
    })),
    eq: jest.fn((field: string, value: string) => ({
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => {
        if (table === 'routes' && field === 'id') {
          if (value === TEST_ROUTE_ID) return Promise.resolve({ data: mockRouteData, error: null });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        }
        if (table === 'drivers' && field === 'id') {
          if (value === TEST_DRIVER_ID) return Promise.resolve({ data: mockDriverData, error: null });
          if (value === TEST_DRIVER_2_ID) return Promise.resolve({ data: mockDriver2Data, error: null });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        }
        if (table === 'vehicles' && field === 'id') {
          if (value === TEST_VEHICLE_ID) return Promise.resolve({ data: mockVehicleData, error: null });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        }
        if (table === 'dispatches' && field === 'id') {
          const dispatch = mockDispatches.get(value);
          if (dispatch) return Promise.resolve({ data: dispatch, error: null });
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        }
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
      }),
      order: jest.fn().mockImplementation(() => {
        if (table === 'channel_dispatches') return Promise.resolve({ data: Array.from(mockChannelDispatches.values()), error: null });
        return Promise.resolve({ data: [], error: null });
      }),
    })),
    in: jest.fn(() => ({ is: jest.fn().mockResolvedValue({ data: [], error: null }) })),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
  });
  return {
    verifyConnection: jest.fn().mockResolvedValue({ connected: true, latencyMs: 10 }),
    getSupabaseClient: jest.fn(() => ({ from: jest.fn((table: string) => createTableMock(table)) })),
    resetSupabaseClient: jest.fn(),
  };
});

jest.mock('../../src/adapters/telegram.js', () => ({
  isTelegramConfigured: jest.fn().mockReturnValue(true),
  telegramAdapter: {
    channelType: 'telegram',
    canSend: jest.fn((driver: { telegramChatId?: string }) => !!driver.telegramChatId),
    send: jest.fn().mockResolvedValue({ success: true, channelType: 'telegram', providerMessageId: 'tg-msg-123', sentAt: new Date() }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
  },
}));

jest.mock('../../src/adapters/email.js', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(true),
  emailAdapter: {
    channelType: 'email',
    canSend: jest.fn((driver: { email?: string }) => !!driver.email),
    send: jest.fn().mockResolvedValue({ success: true, channelType: 'email', providerMessageId: 'email-msg-456', sentAt: new Date() }),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
  },
}));

import { app } from '../../src/index.js';

describe('Dispatch Flow Integration Tests', () => {
  beforeEach(() => { jest.clearAllMocks(); mockDispatches.clear(); mockChannelDispatches.clear(); dispatchIdCounter = 0; });

  describe('Single Dispatch Flow', () => {
    it('should create dispatch and return dispatch_id immediately', async () => {
      const response = await request(app).post('/api/v1/dispatch').set('X-API-Key', VALID_API_KEY).send({ route_id: TEST_ROUTE_ID, driver_id: TEST_DRIVER_ID });
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('dispatch_id');
      expect(response.body).toHaveProperty('status', 'pending');
    });

    it('should return 404 when route does not exist', async () => {
      const response = await request(app).post('/api/v1/dispatch').set('X-API-Key', VALID_API_KEY).send({ route_id: NON_EXISTENT_ROUTE, driver_id: TEST_DRIVER_ID });
      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 404 when driver does not exist', async () => {
      const response = await request(app).post('/api/v1/dispatch').set('X-API-Key', VALID_API_KEY).send({ route_id: TEST_ROUTE_ID, driver_id: NON_EXISTENT_DRIVER });
      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app).post('/api/v1/dispatch').set('X-API-Key', VALID_API_KEY).send({ route_id: TEST_ROUTE_ID });
      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 401 without API key', async () => {
      const response = await request(app).post('/api/v1/dispatch').send({ route_id: TEST_ROUTE_ID, driver_id: TEST_DRIVER_ID });
      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid API key', async () => {
      const response = await request(app).post('/api/v1/dispatch').set('X-API-Key', 'invalid-api-key').send({ route_id: TEST_ROUTE_ID, driver_id: TEST_DRIVER_ID });
      expect(response.status).toBe(401);
    });
  });

  describe('Batch Dispatch Flow', () => {
    it('should process batch dispatch and return results', async () => {
      const response = await request(app).post('/api/v1/dispatch/batch').set('X-API-Key', VALID_API_KEY).send({ dispatches: [{ route_id: TEST_ROUTE_ID, driver_id: TEST_DRIVER_ID }, { route_id: TEST_ROUTE_ID, driver_id: TEST_DRIVER_2_ID }] });
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.results).toHaveLength(2);
    });

    it('should handle mixed success/failure in batch', async () => {
      const response = await request(app).post('/api/v1/dispatch/batch').set('X-API-Key', VALID_API_KEY).send({ dispatches: [{ route_id: TEST_ROUTE_ID, driver_id: TEST_DRIVER_ID }, { route_id: NON_EXISTENT_ROUTE, driver_id: TEST_DRIVER_ID }] });
      expect(response.status).toBe(202);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results.find((r: { index: number }) => r.index === 0).success).toBe(true);
      expect(response.body.results.find((r: { index: number }) => r.index === 1).success).toBe(false);
    });

    it('should return 400 for empty batch', async () => {
      const response = await request(app).post('/api/v1/dispatch/batch').set('X-API-Key', VALID_API_KEY).send({ dispatches: [] });
      expect(response.status).toBe(400);
    });

    it('should return 400 for batch exceeding 100 items', async () => {
      const dispatches = Array(101).fill({ route_id: TEST_ROUTE_ID, driver_id: TEST_DRIVER_ID });
      const response = await request(app).post('/api/v1/dispatch/batch').set('X-API-Key', VALID_API_KEY).send({ dispatches });
      expect(response.status).toBe(400);
    });

    it('should return 401 without API key', async () => {
      const response = await request(app).post('/api/v1/dispatch/batch').send({ dispatches: [{ route_id: TEST_ROUTE_ID, driver_id: TEST_DRIVER_ID }] });
      expect(response.status).toBe(401);
    });
  });

  describe('Dispatch Retrieval', () => {
    it('should retrieve dispatch by ID', async () => {
      const createResponse = await request(app).post('/api/v1/dispatch').set('X-API-Key', VALID_API_KEY).send({ route_id: TEST_ROUTE_ID, driver_id: TEST_DRIVER_ID });
      const dispatchId = createResponse.body.dispatch_id;
      const getResponse = await request(app).get(`/api/v1/dispatch/${dispatchId}`).set('X-API-Key', VALID_API_KEY);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toHaveProperty('id', dispatchId);
    });

    it('should return 404 for non-existent dispatch', async () => {
      const response = await request(app).get(`/api/v1/dispatch/${NON_EXISTENT_DISPATCH}`).set('X-API-Key', VALID_API_KEY);
      expect(response.status).toBe(404);
    });

    it('should return 401 without API key', async () => {
      const response = await request(app).get('/api/v1/dispatch/some-id');
      expect(response.status).toBe(401);
    });
  });

  describe('Request Validation', () => {
    it('should reject invalid UUID for route_id', async () => {
      const response = await request(app).post('/api/v1/dispatch').set('X-API-Key', VALID_API_KEY).send({ route_id: 'not-a-uuid', driver_id: TEST_DRIVER_ID });
      expect(response.status).toBe(400);
    });

    it('should reject invalid channel type', async () => {
      const response = await request(app).post('/api/v1/dispatch').set('X-API-Key', VALID_API_KEY).send({ route_id: TEST_ROUTE_ID, driver_id: TEST_DRIVER_ID, channels: ['invalid_channel'] });
      expect(response.status).toBe(400);
    });
  });
});
