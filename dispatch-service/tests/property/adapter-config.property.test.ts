/**
 * Property-Based Tests for Adapter Configuration Validation
 *
 * Feature: dispatch-service, Property 9: Adapter Configuration Validation
 *
 * **Validates: Requirements 4.3, 5.3, 6.4**
 *
 * Property 9 from design.md states:
 * "For any channel adapter and driver, the adapter's canSend() method SHALL return
 * true if and only if the driver has the required configuration (telegram_chat_id
 * for Telegram, email for Email). Attempting to send without valid configuration
 * SHALL result in a failure with descriptive error."
 *
 * This test verifies:
 * 1. TelegramAdapter.canSend() returns true iff driver has telegram_chat_id
 * 2. EmailAdapter.canSend() returns true iff driver has email
 * 3. TelegramAdapter.send() returns failure with descriptive error when telegram_chat_id missing
 * 4. EmailAdapter.send() returns failure with descriptive error when email missing
 */

import * as fc from 'fast-check';
import { TelegramAdapter } from '../../src/adapters/telegram.js';
import { EmailAdapter } from '../../src/adapters/email.js';
import { DispatchContext } from '../../src/adapters/interface.js';
import { Driver, Dispatch, Route, Booking, Vehicle } from '../../src/types/index.js';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch globally to prevent actual API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Feature: dispatch-service, Property 9: Adapter Configuration Validation', () => {
  let telegramAdapter: TelegramAdapter;
  let emailAdapter: EmailAdapter;
  let originalEnv: NodeJS.ProcessEnv;

  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  /**
   * Arbitrary generator for non-empty strings (valid configuration values).
   */
  const arbitraryNonEmptyString = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

  /**
   * Arbitrary generator for empty/invalid configuration values.
   * These represent missing or invalid configuration.
   */
  const arbitraryEmptyOrWhitespace = (): fc.Arbitrary<string | undefined> =>
    fc.oneof(
      fc.constant(undefined),
      fc.constant(''),
      fc.constant('   '),
      fc.constant('\t'),
      fc.constant('\n')
    );

  /**
   * Arbitrary generator for telegram chat IDs (valid format).
   */
  const arbitraryTelegramChatId = (): fc.Arbitrary<string> =>
    fc.oneof(
      // Numeric chat IDs (most common)
      fc.integer({ min: 1, max: 9999999999 }).map((n) => n.toString()),
      // Negative chat IDs (group chats)
      fc.integer({ min: -9999999999, max: -1 }).map((n) => n.toString()),
      // String chat IDs
      arbitraryNonEmptyString()
    );

  /**
   * Arbitrary generator for email addresses.
   */
  const arbitraryEmail = (): fc.Arbitrary<string> =>
    fc.emailAddress();

  /**
   * Arbitrary generator for driver with valid telegram configuration.
   */
  const arbitraryDriverWithTelegram = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: fc.option(arbitraryEmail(), { nil: undefined }),
      telegramChatId: arbitraryTelegramChatId(),
      preferredChannel: fc.option(fc.constantFrom('telegram', 'email') as fc.Arbitrary<'telegram' | 'email'>, { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver without telegram configuration.
   */
  const arbitraryDriverWithoutTelegram = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: fc.option(arbitraryEmail(), { nil: undefined }),
      telegramChatId: arbitraryEmptyOrWhitespace(),
      preferredChannel: fc.option(fc.constantFrom('telegram', 'email') as fc.Arbitrary<'telegram' | 'email'>, { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver with valid email configuration.
   */
  const arbitraryDriverWithEmail = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmail(),
      telegramChatId: fc.option(arbitraryTelegramChatId(), { nil: undefined }),
      preferredChannel: fc.option(fc.constantFrom('telegram', 'email') as fc.Arbitrary<'telegram' | 'email'>, { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver without email configuration.
   */
  const arbitraryDriverWithoutEmail = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmptyOrWhitespace(),
      telegramChatId: fc.option(arbitraryTelegramChatId(), { nil: undefined }),
      preferredChannel: fc.option(fc.constantFrom('telegram', 'email') as fc.Arbitrary<'telegram' | 'email'>, { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for dispatch record.
   */
  const arbitraryDispatch = (): fc.Arbitrary<Dispatch> =>
    fc.record({
      id: fc.uuid(),
      routeId: fc.uuid(),
      driverId: fc.uuid(),
      status: fc.constantFrom('pending', 'sending', 'delivered', 'partial', 'failed') as fc.Arbitrary<Dispatch['status']>,
      requestedChannels: fc.array(fc.constantFrom('telegram', 'email') as fc.Arbitrary<'telegram' | 'email'>, { minLength: 1, maxLength: 2 }),
      metadata: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
      createdAt: fc.date(),
      updatedAt: fc.date(),
    });

  /**
   * Arbitrary generator for time string in HH:MM format.
   */
  const arbitraryTimeString = (): fc.Arbitrary<string> =>
    fc.record({
      hour: fc.integer({ min: 0, max: 23 }),
      minute: fc.integer({ min: 0, max: 59 }),
    }).map(({ hour, minute }) => `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);

  /**
   * Arbitrary generator for date string in YYYY-MM-DD format.
   */
  const arbitraryDateString = (): fc.Arbitrary<string> =>
    fc.record({
      year: fc.integer({ min: 2020, max: 2030 }),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 28 }),
    }).map(({ year, month, day }) =>
      `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    );

  /**
   * Arbitrary generator for route record.
   */
  const arbitraryRoute = (): fc.Arbitrary<Route> =>
    fc.record({
      id: fc.uuid(),
      name: arbitraryNonEmptyString(),
      code: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      date: arbitraryDateString(),
      plannedStartTime: fc.option(arbitraryTimeString(), { nil: undefined }),
      plannedEndTime: fc.option(arbitraryTimeString(), { nil: undefined }),
      totalStops: fc.integer({ min: 0, max: 100 }),
      totalDistanceKm: fc.option(fc.float({ min: 0, max: 1000 }), { nil: undefined }),
      totalDurationMinutes: fc.option(fc.integer({ min: 0, max: 1440 }), { nil: undefined }),
      vehicleId: fc.option(fc.uuid(), { nil: undefined }),
      driverId: fc.option(fc.uuid(), { nil: undefined }),
    });

  /**
   * Arbitrary generator for vehicle record.
   */
  const arbitraryVehicle = (): fc.Arbitrary<Vehicle | null> =>
    fc.option(
      fc.record({
        id: fc.uuid(),
        name: arbitraryNonEmptyString(),
        licensePlate: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
        make: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
        model: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      }),
      { nil: null }
    );

  /**
   * Arbitrary generator for booking record.
   */
  const arbitraryBooking = (): fc.Arbitrary<Booking> =>
    fc.record({
      id: fc.uuid(),
      routeId: fc.uuid(),
      stopNumber: fc.integer({ min: 1, max: 100 }),
      clientName: arbitraryNonEmptyString(),
      address: arbitraryNonEmptyString(),
      scheduledTime: fc.option(
        fc.record({
          hour: fc.integer({ min: 0, max: 23 }),
          minute: fc.integer({ min: 0, max: 59 }),
        }).map(({ hour, minute }) => `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`),
        { nil: undefined }
      ),
      services: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
      specialInstructions: fc.option(arbitraryNonEmptyString(), { nil: undefined }),
    });

  /**
   * Arbitrary generator for dispatch context with a specific driver.
   */
  const arbitraryDispatchContext = (driver: Driver): fc.Arbitrary<DispatchContext> =>
    fc.record({
      dispatch: arbitraryDispatch(),
      driver: fc.constant(driver),
      route: arbitraryRoute(),
      vehicle: arbitraryVehicle(),
      bookings: fc.array(arbitraryBooking(), { minLength: 0, maxLength: 10 }),
      template: arbitraryNonEmptyString(),
    });

  // =============================================================================
  // Setup
  // =============================================================================

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    telegramAdapter = new TelegramAdapter();
    emailAdapter = new EmailAdapter();
    mockFetch.mockReset();

    // Set up environment variables for adapters
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
    process.env.EMAIL_FROM_ADDRESS = 'dispatch@test.com';
    process.env.EMAIL_FROM_NAME = 'Test Dispatch';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // =============================================================================
  // Property Tests for Telegram Adapter Configuration Validation
  // =============================================================================

  describe('Requirement 4.3: Telegram adapter configuration validation', () => {
    /**
     * Property: For any driver with a valid telegram_chat_id (non-empty, non-whitespace),
     * TelegramAdapter.canSend() SHALL return true.
     */
    it('should return canSend() = true for any driver with valid telegram_chat_id', () => {
      fc.assert(
        fc.property(arbitraryDriverWithTelegram(), (driver) => {
          const result = telegramAdapter.canSend(driver);
          expect(result).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver without a valid telegram_chat_id (undefined, empty, or whitespace),
     * TelegramAdapter.canSend() SHALL return false.
     */
    it('should return canSend() = false for any driver without valid telegram_chat_id', () => {
      fc.assert(
        fc.property(arbitraryDriverWithoutTelegram(), (driver) => {
          const result = telegramAdapter.canSend(driver);
          expect(result).toBe(false);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver without valid telegram_chat_id, TelegramAdapter.send()
     * SHALL return a failure result with a descriptive error message.
     */
    it('should return failure with descriptive error when sending without telegram_chat_id', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithoutTelegram().chain((driver) =>
            arbitraryDispatchContext(driver).map((context) => ({ driver, context }))
          ),
          async ({ context }) => {
            const result = await telegramAdapter.send(context);

            // Should fail
            expect(result.success).toBe(false);
            expect(result.channelType).toBe('telegram');

            // Should have descriptive error
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);
            expect(result.error).toContain('telegram_chat_id');

            // Should not have provider message ID
            expect(result.providerMessageId).toBeUndefined();

            // Should have sentAt timestamp
            expect(result.sentAt).toBeInstanceOf(Date);

            // Should NOT have called the API
            expect(mockFetch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: The canSend() result SHALL be consistent with whether send() would
     * fail due to missing configuration (not API errors).
     */
    it('should have consistent canSend() and send() behavior for configuration validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(arbitraryDriverWithTelegram(), arbitraryDriverWithoutTelegram()).chain((driver) =>
            arbitraryDispatchContext(driver).map((context) => ({ driver, context }))
          ),
          async ({ driver, context }) => {
            const canSendResult = telegramAdapter.canSend(driver);

            if (!canSendResult) {
              // If canSend returns false, send should fail with config error
              const sendResult = await telegramAdapter.send(context);
              expect(sendResult.success).toBe(false);
              expect(sendResult.error).toContain('telegram_chat_id');
              expect(mockFetch).not.toHaveBeenCalled();
            }
            // Note: If canSend returns true, send might still fail due to API errors,
            // but that's not a configuration validation issue

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests for Email Adapter Configuration Validation
  // =============================================================================

  describe('Requirement 5.3: Email adapter configuration validation', () => {
    /**
     * Property: For any driver with a valid email address (non-empty, non-whitespace),
     * EmailAdapter.canSend() SHALL return true.
     */
    it('should return canSend() = true for any driver with valid email', () => {
      fc.assert(
        fc.property(arbitraryDriverWithEmail(), (driver) => {
          const result = emailAdapter.canSend(driver);
          expect(result).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver without a valid email address (undefined, empty, or whitespace),
     * EmailAdapter.canSend() SHALL return false.
     */
    it('should return canSend() = false for any driver without valid email', () => {
      fc.assert(
        fc.property(arbitraryDriverWithoutEmail(), (driver) => {
          const result = emailAdapter.canSend(driver);
          expect(result).toBe(false);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver without valid email, EmailAdapter.send()
     * SHALL return a failure result with a descriptive error message.
     */
    it('should return failure with descriptive error when sending without email', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDriverWithoutEmail().chain((driver) =>
            arbitraryDispatchContext(driver).map((context) => ({ driver, context }))
          ),
          async ({ context }) => {
            const result = await emailAdapter.send(context);

            // Should fail
            expect(result.success).toBe(false);
            expect(result.channelType).toBe('email');

            // Should have descriptive error
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);
            expect(result.error).toContain('email');

            // Should not have provider message ID
            expect(result.providerMessageId).toBeUndefined();

            // Should have sentAt timestamp
            expect(result.sentAt).toBeInstanceOf(Date);

            // Should NOT have called the API
            expect(mockFetch).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: The canSend() result SHALL be consistent with whether send() would
     * fail due to missing configuration (not API errors).
     */
    it('should have consistent canSend() and send() behavior for configuration validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(arbitraryDriverWithEmail(), arbitraryDriverWithoutEmail()).chain((driver) =>
            arbitraryDispatchContext(driver).map((context) => ({ driver, context }))
          ),
          async ({ driver, context }) => {
            const canSendResult = emailAdapter.canSend(driver);

            if (!canSendResult) {
              // If canSend returns false, send should fail with config error
              const sendResult = await emailAdapter.send(context);
              expect(sendResult.success).toBe(false);
              expect(sendResult.error).toContain('email');
              expect(mockFetch).not.toHaveBeenCalled();
            }
            // Note: If canSend returns true, send might still fail due to API errors,
            // but that's not a configuration validation issue

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests for Requirement 6.4: Channel Router Configuration Check
  // =============================================================================

  describe('Requirement 6.4: Channel router only attempts channels with valid configuration', () => {
    /**
     * Property: For any driver, the set of channels where canSend() returns true
     * SHALL exactly match the channels with valid configuration.
     */
    it('should correctly identify available channels based on driver configuration', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: fc.option(arbitraryEmail(), { nil: undefined }),
            telegramChatId: fc.option(arbitraryTelegramChatId(), { nil: undefined }),
            preferredChannel: fc.option(fc.constantFrom('telegram', 'email') as fc.Arbitrary<'telegram' | 'email'>, { nil: undefined }),
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (driver) => {
            const telegramAvailable = telegramAdapter.canSend(driver);
            const emailAvailable = emailAdapter.canSend(driver);

            // Telegram should be available iff telegram_chat_id is valid
            const hasTelegramConfig = !!driver.telegramChatId && driver.telegramChatId.trim().length > 0;
            expect(telegramAvailable).toBe(hasTelegramConfig);

            // Email should be available iff email is valid
            const hasEmailConfig = !!driver.email && driver.email.trim().length > 0;
            expect(emailAvailable).toBe(hasEmailConfig);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with both telegram_chat_id and email configured,
     * both adapters SHALL return canSend() = true.
     */
    it('should return canSend() = true for both adapters when driver has both configurations', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: arbitraryEmail(),
            telegramChatId: arbitraryTelegramChatId(),
            preferredChannel: fc.option(fc.constantFrom('telegram', 'email') as fc.Arbitrary<'telegram' | 'email'>, { nil: undefined }),
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (driver) => {
            expect(telegramAdapter.canSend(driver)).toBe(true);
            expect(emailAdapter.canSend(driver)).toBe(true);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with neither telegram_chat_id nor email configured,
     * both adapters SHALL return canSend() = false.
     */
    it('should return canSend() = false for both adapters when driver has no configurations', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: arbitraryEmptyOrWhitespace(),
            telegramChatId: arbitraryEmptyOrWhitespace(),
            preferredChannel: fc.option(fc.constantFrom('telegram', 'email') as fc.Arbitrary<'telegram' | 'email'>, { nil: undefined }),
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (driver) => {
            expect(telegramAdapter.canSend(driver)).toBe(false);
            expect(emailAdapter.canSend(driver)).toBe(false);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Edge Cases for Configuration Validation
  // =============================================================================

  describe('Edge cases for configuration validation', () => {
    /**
     * Property: For any driver with telegram_chat_id containing only whitespace,
     * TelegramAdapter.canSend() SHALL return false.
     */
    it('should treat whitespace-only telegram_chat_id as invalid', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 }),
          (whitespace) => {
            const driver: Driver = {
              id: 'test-id',
              firstName: 'Test',
              lastName: 'Driver',
              telegramChatId: whitespace,
              fallbackEnabled: true,
              status: 'active',
            };

            expect(telegramAdapter.canSend(driver)).toBe(false);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with email containing only whitespace,
     * EmailAdapter.canSend() SHALL return false.
     */
    it('should treat whitespace-only email as invalid', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 }),
          (whitespace) => {
            const driver: Driver = {
              id: 'test-id',
              firstName: 'Test',
              lastName: 'Driver',
              email: whitespace,
              fallbackEnabled: true,
              status: 'active',
            };

            expect(emailAdapter.canSend(driver)).toBe(false);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: The error message for missing configuration SHALL be descriptive
     * and indicate which configuration is missing.
     */
    it('should provide descriptive error messages that identify the missing configuration', async () => {
      // Test Telegram adapter
      const telegramDriver: Driver = {
        id: 'test-id',
        firstName: 'Test',
        lastName: 'Driver',
        telegramChatId: undefined,
        fallbackEnabled: true,
        status: 'active',
      };

      const telegramContext: DispatchContext = {
        dispatch: {
          id: 'dispatch-1',
          routeId: 'route-1',
          driverId: 'driver-1',
          status: 'pending',
          requestedChannels: ['telegram'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        driver: telegramDriver,
        route: {
          id: 'route-1',
          name: 'Test Route',
          date: '2024-01-15',
          totalStops: 5,
        },
        vehicle: null,
        bookings: [],
        template: 'Test message',
      };

      const telegramResult = await telegramAdapter.send(telegramContext);
      expect(telegramResult.error).toMatch(/telegram_chat_id/i);

      // Test Email adapter
      const emailDriver: Driver = {
        id: 'test-id',
        firstName: 'Test',
        lastName: 'Driver',
        email: undefined,
        fallbackEnabled: true,
        status: 'active',
      };

      const emailContext: DispatchContext = {
        ...telegramContext,
        driver: emailDriver,
      };

      const emailResult = await emailAdapter.send(emailContext);
      expect(emailResult.error).toMatch(/email/i);
    });
  });
});
