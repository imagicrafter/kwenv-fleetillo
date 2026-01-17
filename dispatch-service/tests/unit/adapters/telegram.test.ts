/**
 * Unit tests for Telegram Channel Adapter
 *
 * @requirements 4.1 - Use Telegram Bot API to deliver message to driver's telegram_chat_id
 * @requirements 4.2 - Update channel_dispatch status to 'delivered' and record message_id on success
 * @requirements 4.3 - Return failure if driver doesn't have telegram_chat_id configured
 * @requirements 4.4 - Update channel_dispatch status to 'failed' and record error on API error
 */

import {
  TelegramAdapter,
  isTelegramConfigured,
} from '../../../src/adapters/telegram.js';
import { DispatchContext } from '../../../src/adapters/interface.js';
import { Driver, Dispatch, Route, Booking } from '../../../src/types/index.js';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('TelegramAdapter', () => {
  let adapter: TelegramAdapter;
  let originalEnv: string | undefined;

  // Test fixtures
  const createDriver = (overrides: Partial<Driver> = {}): Driver => ({
    id: 'driver-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    telegramChatId: '123456789',
    preferredChannel: 'telegram',
    fallbackEnabled: true,
    status: 'active',
    ...overrides,
  });

  const createDispatch = (overrides: Partial<Dispatch> = {}): Dispatch => ({
    id: 'dispatch-123',
    routeId: 'route-123',
    driverId: 'driver-123',
    status: 'pending',
    requestedChannels: ['telegram'],
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
    template: '**Route Assignment**\n\nYou have been assigned a new route.',
    ...overrides,
  });

  beforeEach(() => {
    adapter = new TelegramAdapter();
    originalEnv = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    mockFetch.mockReset();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.TELEGRAM_BOT_TOKEN = originalEnv;
    } else {
      delete process.env.TELEGRAM_BOT_TOKEN;
    }
  });

  describe('channelType', () => {
    it('should return telegram as channel type', () => {
      expect(adapter.channelType).toBe('telegram');
    });
  });

  describe('isTelegramConfigured', () => {
    it('should return true when TELEGRAM_BOT_TOKEN is set', () => {
      process.env.TELEGRAM_BOT_TOKEN = 'valid-token';
      expect(isTelegramConfigured()).toBe(true);
    });

    it('should return false when TELEGRAM_BOT_TOKEN is not set', () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      expect(isTelegramConfigured()).toBe(false);
    });

    it('should return false when TELEGRAM_BOT_TOKEN is empty', () => {
      process.env.TELEGRAM_BOT_TOKEN = '';
      expect(isTelegramConfigured()).toBe(false);
    });

    it('should return false when TELEGRAM_BOT_TOKEN is whitespace only', () => {
      process.env.TELEGRAM_BOT_TOKEN = '   ';
      expect(isTelegramConfigured()).toBe(false);
    });
  });

  describe('canSend', () => {
    describe('Requirement 4.3 - Check telegram_chat_id configuration', () => {
      it('should return true when driver has telegram_chat_id', () => {
        const driver = createDriver({ telegramChatId: '123456789' });
        expect(adapter.canSend(driver)).toBe(true);
      });

      it('should return false when driver has no telegram_chat_id', () => {
        const driver = createDriver({ telegramChatId: undefined });
        expect(adapter.canSend(driver)).toBe(false);
      });

      it('should return false when telegram_chat_id is empty string', () => {
        const driver = createDriver({ telegramChatId: '' });
        expect(adapter.canSend(driver)).toBe(false);
      });

      it('should return false when telegram_chat_id is whitespace only', () => {
        const driver = createDriver({ telegramChatId: '   ' });
        expect(adapter.canSend(driver)).toBe(false);
      });
    });
  });

  describe('send', () => {
    describe('Requirement 4.1 - Use Telegram Bot API', () => {
      it('should call Telegram sendMessage API with correct parameters', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: { message_id: 12345 },
          }),
        });

        const context = createDispatchContext();
        await adapter.send(context);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.telegram.org/bottest-bot-token/sendMessage',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: '123456789',
              text: context.template,
              parse_mode: 'Markdown',
            }),
          })
        );
      });

      it('should use Markdown parse mode for message formatting', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: { message_id: 12345 },
          }),
        });

        const context = createDispatchContext();
        await adapter.send(context);

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.parse_mode).toBe('Markdown');
      });
    });

    describe('Requirement 4.2 - Record message_id on success', () => {
      it('should return success with providerMessageId on successful send', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: { message_id: 12345 },
          }),
        });

        const context = createDispatchContext();
        const result = await adapter.send(context);

        expect(result.success).toBe(true);
        expect(result.channelType).toBe('telegram');
        expect(result.providerMessageId).toBe('12345');
        expect(result.error).toBeUndefined();
        expect(result.sentAt).toBeInstanceOf(Date);
      });

      it('should convert message_id to string', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: { message_id: 99999 },
          }),
        });

        const context = createDispatchContext();
        const result = await adapter.send(context);

        expect(result.providerMessageId).toBe('99999');
        expect(typeof result.providerMessageId).toBe('string');
      });
    });

    describe('Requirement 4.3 - Return failure for missing telegram_chat_id', () => {
      it('should return failure when driver has no telegram_chat_id', async () => {
        const context = createDispatchContext({
          driver: createDriver({ telegramChatId: undefined }),
        });

        const result = await adapter.send(context);

        expect(result.success).toBe(false);
        expect(result.channelType).toBe('telegram');
        expect(result.error).toBe(
          'Driver does not have telegram_chat_id configured'
        );
        expect(result.providerMessageId).toBeUndefined();
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return failure when telegram_chat_id is empty', async () => {
        const context = createDispatchContext({
          driver: createDriver({ telegramChatId: '' }),
        });

        const result = await adapter.send(context);

        expect(result.success).toBe(false);
        expect(result.error).toBe(
          'Driver does not have telegram_chat_id configured'
        );
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('Requirement 4.4 - Record error on API error', () => {
      it('should return failure with error message when API returns error', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: false,
            error_code: 400,
            description: 'Bad Request: chat not found',
          }),
        });

        const context = createDispatchContext();
        const result = await adapter.send(context);

        expect(result.success).toBe(false);
        expect(result.channelType).toBe('telegram');
        expect(result.error).toBe('Bad Request: chat not found');
        expect(result.providerMessageId).toBeUndefined();
      });

      it('should return generic error when API returns error without description', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: false,
            error_code: 500,
          }),
        });

        const context = createDispatchContext();
        const result = await adapter.send(context);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown Telegram API error');
      });

      it('should return failure when fetch throws network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const context = createDispatchContext();
        const result = await adapter.send(context);

        expect(result.success).toBe(false);
        expect(result.channelType).toBe('telegram');
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

    describe('Bot token not configured', () => {
      it('should return failure when TELEGRAM_BOT_TOKEN is not set', async () => {
        delete process.env.TELEGRAM_BOT_TOKEN;

        const context = createDispatchContext();
        const result = await adapter.send(context);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Telegram bot token is not configured');
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('sentAt timestamp', () => {
      it('should include sentAt timestamp in result', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: { message_id: 12345 },
          }),
        });

        const beforeSend = new Date();
        const context = createDispatchContext();
        const result = await adapter.send(context);
        const afterSend = new Date();

        expect(result.sentAt).toBeInstanceOf(Date);
        expect(result.sentAt.getTime()).toBeGreaterThanOrEqual(
          beforeSend.getTime()
        );
        expect(result.sentAt.getTime()).toBeLessThanOrEqual(afterSend.getTime());
      });

      it('should include sentAt even on failure', async () => {
        const context = createDispatchContext({
          driver: createDriver({ telegramChatId: undefined }),
        });

        const result = await adapter.send(context);

        expect(result.sentAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('healthCheck', () => {
    describe('Bot connectivity verification', () => {
      it('should return healthy when getMe API succeeds', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: {
              id: 123456789,
              is_bot: true,
              first_name: 'TestBot',
              username: 'test_bot',
            },
          }),
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(true);
        expect(result.message).toBe('Bot connected: @test_bot');
      });

      it('should include bot first_name when username is not available', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: {
              id: 123456789,
              is_bot: true,
              first_name: 'TestBot',
            },
          }),
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(true);
        expect(result.message).toBe('Bot connected: @TestBot');
      });

      it('should call getMe API endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: { id: 123, is_bot: true, first_name: 'Bot' },
          }),
        });

        await adapter.healthCheck();

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.telegram.org/bottest-bot-token/getMe',
          { method: 'GET' }
        );
      });
    });

    describe('Unhealthy states', () => {
      it('should return unhealthy when bot token is not configured', async () => {
        delete process.env.TELEGRAM_BOT_TOKEN;

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.message).toBe('Telegram bot token is not configured');
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return unhealthy when getMe API returns error', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: false,
            error_code: 401,
            description: 'Unauthorized',
          }),
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.message).toBe('Unauthorized');
      });

      it('should return unhealthy with generic message when API error has no description', async () => {
        mockFetch.mockResolvedValueOnce({
          json: async () => ({
            ok: false,
            error_code: 500,
          }),
        });

        const result = await adapter.healthCheck();

        expect(result.healthy).toBe(false);
        expect(result.message).toBe('Failed to verify bot connectivity');
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
