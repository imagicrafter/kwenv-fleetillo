/**
 * Unit tests for Email Channel Adapter
 *
 * @requirements 5.1 - Use configured email provider (SendGrid or Resend) to deliver email
 * @requirements 5.2 - Update channel_dispatch status to 'delivered' and record provider message_id on success
 * @requirements 5.3 - Return failure if driver doesn't have email address configured
 * @requirements 5.4 - Update channel_dispatch status to 'failed' and record error on provider error
 */

import {
  EmailAdapter,
  isEmailConfigured,
  getEmailProvider,
} from '../../../src/adapters/email.js';
import { DispatchContext } from '../../../src/adapters/interface.js';
import { Driver, Dispatch, Route, Booking } from '../../../src/types/index.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('EmailAdapter', () => {
  let adapter: EmailAdapter;
  let originalEnv: NodeJS.ProcessEnv;

  // Test fixtures
  const createDriver = (overrides: Partial<Driver> = {}): Driver => ({
    id: 'driver-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    telegramChatId: '123456789',
    preferredChannel: 'email',
    fallbackEnabled: true,
    status: 'active',
    ...overrides,
  });

  const createDispatch = (overrides: Partial<Dispatch> = {}): Dispatch => ({
    id: 'dispatch-123',
    routeId: 'route-123',
    driverId: 'driver-123',
    status: 'pending',
    requestedChannels: ['email'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createRoute = (overrides: Partial<Route> = {}): Route => ({
    id: 'route-123',
    name: 'Morning Route',
    code: 'MR-001',
    date: '2024-01-15',
    plannedStartTime: '08:00',
    plannedEndTime: '12:00',
    totalStops: 5,
    totalDistanceKm: 25.5,
    totalDurationMinutes: 180,
    vehicleId: 'vehicle-123',
    driverId: 'driver-123',
    ...overrides,
  });

  const createBooking = (overrides: Partial<Booking> = {}): Booking => ({
    id: 'booking-123',
    routeId: 'route-123',
    stopNumber: 1,
    clientName: 'Client A',
    address: '123 Main St',
    scheduledTime: '08:30',
    services: 'Delivery',
    specialInstructions: 'Ring doorbell',
    ...overrides,
  });

  const createDispatchContext = (
    overrides: Partial<DispatchContext> = {}
  ): DispatchContext => ({
    dispatch: createDispatch(),
    driver: createDriver(),
    route: createRoute(),
    vehicle: {
      id: 'vehicle-123',
      name: 'Van 1',
      licensePlate: 'ABC-123',
      make: 'Ford',
      model: 'Transit',
    },
    bookings: [createBooking()],
    template: '<html><body><h1>Route Assignment</h1><p>You have been assigned a new route.</p></body></html>',
    ...overrides,
  });

  beforeEach(() => {
    adapter = new EmailAdapter();
    originalEnv = { ...process.env };
    // Default to SendGrid configuration
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
    process.env.EMAIL_FROM_ADDRESS = 'dispatch@test.com';
    process.env.EMAIL_FROM_NAME = 'Test Dispatch';
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('channelType', () => {
    it('should return email as channel type', () => {
      expect(adapter.channelType).toBe('email');
    });
  });

  describe('getEmailProvider', () => {
    it('should return sendgrid when EMAIL_PROVIDER is sendgrid', () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      expect(getEmailProvider()).toBe('sendgrid');
    });

    it('should return resend when EMAIL_PROVIDER is resend', () => {
      process.env.EMAIL_PROVIDER = 'resend';
      expect(getEmailProvider()).toBe('resend');
    });

    it('should return sendgrid as default when EMAIL_PROVIDER is not set', () => {
      delete process.env.EMAIL_PROVIDER;
      expect(getEmailProvider()).toBe('sendgrid');
    });

    it('should be case-insensitive for provider name', () => {
      process.env.EMAIL_PROVIDER = 'RESEND';
      expect(getEmailProvider()).toBe('resend');
    });
  });

  describe('isEmailConfigured', () => {
    describe('SendGrid configuration', () => {
      beforeEach(() => {
        process.env.EMAIL_PROVIDER = 'sendgrid';
      });

      it('should return true when SENDGRID_API_KEY is set', () => {
        process.env.SENDGRID_API_KEY = 'valid-key';
        expect(isEmailConfigured()).toBe(true);
      });

      it('should return false when SENDGRID_API_KEY is not set', () => {
        delete process.env.SENDGRID_API_KEY;
        expect(isEmailConfigured()).toBe(false);
      });

      it('should return false when SENDGRID_API_KEY is empty', () => {
        process.env.SENDGRID_API_KEY = '';
        expect(isEmailConfigured()).toBe(false);
      });

      it('should return false when SENDGRID_API_KEY is whitespace only', () => {
        process.env.SENDGRID_API_KEY = '   ';
        expect(isEmailConfigured()).toBe(false);
      });
    });

    describe('Resend configuration', () => {
      beforeEach(() => {
        process.env.EMAIL_PROVIDER = 'resend';
        delete process.env.SENDGRID_API_KEY;
      });

      it('should return true when RESEND_API_KEY is set', () => {
        process.env.RESEND_API_KEY = 'valid-key';
        expect(isEmailConfigured()).toBe(true);
      });

      it('should return false when RESEND_API_KEY is not set', () => {
        delete process.env.RESEND_API_KEY;
        expect(isEmailConfigured()).toBe(false);
      });

      it('should return false when RESEND_API_KEY is empty', () => {
        process.env.RESEND_API_KEY = '';
        expect(isEmailConfigured()).toBe(false);
      });
    });
  });

  describe('canSend', () => {
    describe('Requirement 5.3 - Check email address configuration', () => {
      it('should return true when driver has email address', () => {
        const driver = createDriver({ email: 'john@example.com' });
        expect(adapter.canSend(driver)).toBe(true);
      });

      it('should return false when driver has no email address', () => {
        const driver = createDriver({ email: undefined });
        expect(adapter.canSend(driver)).toBe(false);
      });

      it('should return false when email is empty string', () => {
        const driver = createDriver({ email: '' });
        expect(adapter.canSend(driver)).toBe(false);
      });

      it('should return false when email is whitespace only', () => {
        const driver = createDriver({ email: '   ' });
        expect(adapter.canSend(driver)).toBe(false);
      });
    });
  });

  describe('send', () => {
    describe('SendGrid provider', () => {
      beforeEach(() => {
        process.env.EMAIL_PROVIDER = 'sendgrid';
        process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
      });

      describe('Requirement 5.1 - Use SendGrid API', () => {
        it('should call SendGrid API with correct parameters', async () => {
          const mockHeaders = new Map([['x-message-id', 'sg-msg-123']]);
          mockFetch.mockResolvedValueOnce({
            status: 202,
            ok: true,
            headers: {
              get: (name: string) => mockHeaders.get(name) || null,
            },
          });

          const context = createDispatchContext();
          await adapter.send(context);

          expect(mockFetch).toHaveBeenCalledWith(
            'https://api.sendgrid.com/v3/mail/send',
            expect.objectContaining({
              method: 'POST',
              headers: {
                'Authorization': 'Bearer test-sendgrid-key',
                'Content-Type': 'application/json',
              },
            })
          );

          const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
          expect(callBody.personalizations[0].to[0].email).toBe('john@example.com');
          expect(callBody.from.email).toBe('dispatch@test.com');
          expect(callBody.from.name).toBe('Test Dispatch');
          expect(callBody.subject).toBe('Route Assignment: Morning Route - 2024-01-15');
          expect(callBody.content[0].type).toBe('text/html');
        });
      });

      describe('Requirement 5.2 - Record message_id on success', () => {
        it('should return success with providerMessageId from x-message-id header', async () => {
          const mockHeaders = new Map([['x-message-id', 'sg-msg-456']]);
          mockFetch.mockResolvedValueOnce({
            status: 202,
            ok: true,
            headers: {
              get: (name: string) => mockHeaders.get(name) || null,
            },
          });

          const context = createDispatchContext();
          const result = await adapter.send(context);

          expect(result.success).toBe(true);
          expect(result.channelType).toBe('email');
          expect(result.providerMessageId).toBe('sg-msg-456');
          expect(result.error).toBeUndefined();
          expect(result.sentAt).toBeInstanceOf(Date);
        });

        it('should handle success without message_id header', async () => {
          mockFetch.mockResolvedValueOnce({
            status: 202,
            ok: true,
            headers: {
              get: () => null,
            },
          });

          const context = createDispatchContext();
          const result = await adapter.send(context);

          expect(result.success).toBe(true);
          expect(result.providerMessageId).toBeUndefined();
        });
      });

      describe('Requirement 5.4 - Record error on API error', () => {
        it('should return failure with error message when API returns error', async () => {
          mockFetch.mockResolvedValueOnce({
            status: 400,
            ok: false,
            json: async () => ({
              errors: [{ message: 'Invalid email address' }],
            }),
          });

          const context = createDispatchContext();
          const result = await adapter.send(context);

          expect(result.success).toBe(false);
          expect(result.channelType).toBe('email');
          expect(result.error).toBe('Invalid email address');
          expect(result.providerMessageId).toBeUndefined();
        });

        it('should return generic error when API returns error without message', async () => {
          mockFetch.mockResolvedValueOnce({
            status: 500,
            ok: false,
            json: async () => ({}),
          });

          const context = createDispatchContext();
          const result = await adapter.send(context);

          expect(result.success).toBe(false);
          expect(result.error).toBe('SendGrid API error: 500');
        });
      });
    });

    describe('Resend provider', () => {
      beforeEach(() => {
        process.env.EMAIL_PROVIDER = 'resend';
        process.env.RESEND_API_KEY = 'test-resend-key';
        delete process.env.SENDGRID_API_KEY;
      });

      describe('Requirement 5.1 - Use Resend API', () => {
        it('should call Resend API with correct parameters', async () => {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'resend-msg-123' }),
          });

          const context = createDispatchContext();
          await adapter.send(context);

          expect(mockFetch).toHaveBeenCalledWith(
            'https://api.resend.com/emails',
            expect.objectContaining({
              method: 'POST',
              headers: {
                'Authorization': 'Bearer test-resend-key',
                'Content-Type': 'application/json',
              },
            })
          );

          const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
          expect(callBody.to).toEqual(['john@example.com']);
          expect(callBody.from).toBe('Test Dispatch <dispatch@test.com>');
          expect(callBody.subject).toBe('Route Assignment: Morning Route - 2024-01-15');
          expect(callBody.html).toBe(context.template);
        });
      });

      describe('Requirement 5.2 - Record message_id on success', () => {
        it('should return success with providerMessageId from response body', async () => {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 'resend-msg-789' }),
          });

          const context = createDispatchContext();
          const result = await adapter.send(context);

          expect(result.success).toBe(true);
          expect(result.channelType).toBe('email');
          expect(result.providerMessageId).toBe('resend-msg-789');
          expect(result.error).toBeUndefined();
        });
      });

      describe('Requirement 5.4 - Record error on API error', () => {
        it('should return failure with error message when API returns error', async () => {
          mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({
              message: 'Invalid API key',
              statusCode: 401,
            }),
          });

          const context = createDispatchContext();
          const result = await adapter.send(context);

          expect(result.success).toBe(false);
          expect(result.error).toBe('Invalid API key');
        });

        it('should return generic error when API returns error without message', async () => {
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({}),
          });

          const context = createDispatchContext();
          const result = await adapter.send(context);

          expect(result.success).toBe(false);
          expect(result.error).toBe('Resend API error: 500');
        });
      });
    });

    describe('Requirement 5.3 - Return failure for missing email address', () => {
      it('should return failure when driver has no email address', async () => {
        const context = createDispatchContext({
          driver: createDriver({ email: undefined }),
        });

        const result = await adapter.send(context);

        expect(result.success).toBe(false);
        expect(result.channelType).toBe('email');
        expect(result.error).toBe('Driver does not have email address configured');
        expect(result.providerMessageId).toBeUndefined();
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return failure when email is empty', async () => {
        const context = createDispatchContext({
          driver: createDriver({ email: '' }),
        });

        const result = await adapter.send(context);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Driver does not have email address configured');
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('Provider not configured', () => {
      it('should return failure when email provider is not configured', async () => {
        delete process.env.SENDGRID_API_KEY;
        delete process.env.RESEND_API_KEY;

        const context = createDispatchContext();
        const result = await adapter.send(context);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Email provider is not configured');
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('Network errors', () => {
      it('should return failure when fetch throws network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const context = createDispatchContext();
        const result = await adapter.send(context);

        expect(result.success).toBe(false);
        expect(result.channelType).toBe('email');
        expect(result.error).toBe('Network error');
      });

      it('should handle non-Error exceptions', async () => {
        mockFetch.mockRejectedValueOnce('String error');

        const context = createDispatchContext();
        const result = await adapter.send(context);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error occurred');
      });
    });

    describe('sentAt timestamp', () => {
      it('should include sentAt timestamp in result', async () => {
        const mockHeaders = new Map([['x-message-id', 'sg-msg-123']]);
        mockFetch.mockResolvedValueOnce({
          status: 202,
          ok: true,
          headers: {
            get: (name: string) => mockHeaders.get(name) || null,
          },
        });

        const beforeSend = new Date();
        const context = createDispatchContext();
        const result = await adapter.send(context);
        const afterSend = new Date();

        expect(result.sentAt).toBeInstanceOf(Date);
        expect(result.sentAt.getTime()).toBeGreaterThanOrEqual(beforeSend.getTime());
        expect(result.sentAt.getTime()).toBeLessThanOrEqual(afterSend.getTime());
      });

      it('should include sentAt even on failure', async () => {
        const context = createDispatchContext({
          driver: createDriver({ email: undefined }),
        });

        const result = await adapter.send(context);

        expect(result.sentAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('healthCheck', () => {
    describe('SendGrid health check', () => {
      beforeEach(() => {
        process.env.EMAIL_PROVIDER = 'sendgrid';
        process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
      });

      it('should return healthy when SendGrid API succeeds', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ first_name: 'Test', last_name: 'User' }),
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(true);
        expect(result.message).toBe('SendGrid API connected');
      });

      it('should call SendGrid user profile endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

        await adapter.healthCheck();

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.sendgrid.com/v3/user/profile',
          expect.objectContaining({
            method: 'GET',
            headers: {
              'Authorization': 'Bearer test-sendgrid-key',
            },
          })
        );
      });

      it('should return unhealthy when API returns 401', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.message).toBe('Invalid API key');
      });

      it('should return unhealthy with status code for other errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.message).toBe('API error: 500');
      });
    });

    describe('Resend health check', () => {
      beforeEach(() => {
        process.env.EMAIL_PROVIDER = 'resend';
        process.env.RESEND_API_KEY = 'test-resend-key';
        delete process.env.SENDGRID_API_KEY;
      });

      it('should return healthy when Resend API succeeds', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(true);
        expect(result.message).toBe('Resend API connected');
      });

      it('should call Resend domains endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

        await adapter.healthCheck();

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.resend.com/domains',
          expect.objectContaining({
            method: 'GET',
            headers: {
              'Authorization': 'Bearer test-resend-key',
            },
          })
        );
      });

      it('should return unhealthy when API returns 401', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.message).toBe('Invalid API key');
      });
    });

    describe('Unhealthy states', () => {
      it('should return unhealthy when email provider is not configured', async () => {
        delete process.env.SENDGRID_API_KEY;
        delete process.env.RESEND_API_KEY;

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.message).toBe('Email provider is not configured');
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return unhealthy when fetch throws error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.message).toBe('Health check failed: Connection refused');
      });

      it('should handle non-Error exceptions in health check', async () => {
        mockFetch.mockRejectedValueOnce('String error');

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.message).toBe('Health check failed: Unknown error occurred');
      });
    });
  });
});
