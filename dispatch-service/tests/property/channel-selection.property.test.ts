/**
 * Property-Based Tests for Channel Selection Priority
 *
 * Feature: dispatch-service, Property 2: Channel Selection Priority
 *
 * **Validates: Requirements 1.2, 1.3, 6.1, 11.2**
 *
 * Property 2 from design.md states:
 * "For any dispatch request and driver configuration, the channel selection SHALL
 * follow the priority order: (1) request channel override if specified, (2) driver's
 * preferred_channel if set, (3) system default 'telegram'. The selected channel(s)
 * SHALL always match exactly one of these three sources."
 *
 * This test verifies:
 * 1. Request channel override takes highest priority when specified
 * 2. Driver's preferred_channel is used when no override is specified
 * 3. System default 'telegram' is used when no override and no preference
 * 4. Selected channels always come from exactly one of the three sources
 */

import * as fc from 'fast-check';
import {
  ChannelRouter,
  DispatchRequest,
  DEFAULT_CHANNEL,
  SUPPORTED_CHANNELS,
} from '../../src/core/router.js';
import { ChannelType, Driver } from '../../src/types/index.js';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Feature: dispatch-service, Property 2: Channel Selection Priority', () => {
  let router: ChannelRouter;

  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  /**
   * Arbitrary generator for non-empty strings.
   */
  const arbitraryNonEmptyString = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

  /**
   * Arbitrary generator for supported channel types.
   */
  const arbitraryChannelType = (): fc.Arbitrary<ChannelType> =>
    fc.constantFrom('telegram', 'email') as fc.Arbitrary<ChannelType>;

  /**
   * Arbitrary generator for telegram chat IDs (valid format).
   */
  const arbitraryTelegramChatId = (): fc.Arbitrary<string> =>
    fc.oneof(
      // Numeric chat IDs (most common)
      fc.integer({ min: 1, max: 9999999999 }).map((n) => n.toString()),
      // Negative chat IDs (group chats)
      fc.integer({ min: -9999999999, max: -1 }).map((n) => n.toString())
    );

  /**
   * Arbitrary generator for email addresses.
   */
  const arbitraryEmail = (): fc.Arbitrary<string> => fc.emailAddress();

  /**
   * Arbitrary generator for driver with both channels configured.
   * This ensures we can test all priority scenarios.
   */
  const arbitraryDriverWithBothChannels = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmail(),
      telegramChatId: arbitraryTelegramChatId(),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver with only telegram configured.
   */
  const arbitraryDriverWithTelegramOnly = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: fc.constant(undefined),
      telegramChatId: arbitraryTelegramChatId(),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver with only email configured.
   */
  const arbitraryDriverWithEmailOnly = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmail(),
      telegramChatId: fc.constant(undefined),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver with no channels configured.
   */
  const arbitraryDriverWithNoChannels = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: fc.constant(undefined),
      telegramChatId: fc.constant(undefined),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for any driver configuration.
   */
  const arbitraryDriver = (): fc.Arbitrary<Driver> =>
    fc.oneof(
      arbitraryDriverWithBothChannels(),
      arbitraryDriverWithTelegramOnly(),
      arbitraryDriverWithEmailOnly(),
      arbitraryDriverWithNoChannels()
    );

  /**
   * Arbitrary generator for dispatch request with channel override.
   */
  const arbitraryRequestWithChannelOverride = (): fc.Arbitrary<DispatchRequest> =>
    fc.record({
      routeId: fc.uuid(),
      driverId: fc.uuid(),
      channels: fc.array(arbitraryChannelType(), { minLength: 1, maxLength: 2 }),
      multiChannel: fc.option(fc.boolean(), { nil: undefined }),
      metadata: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
    });

  /**
   * Arbitrary generator for dispatch request without channel override.
   */
  const arbitraryRequestWithoutChannelOverride = (): fc.Arbitrary<DispatchRequest> =>
    fc.record({
      routeId: fc.uuid(),
      driverId: fc.uuid(),
      channels: fc.constant(undefined),
      multiChannel: fc.option(fc.constant(false), { nil: undefined }), // Exclude multiChannel: true
      metadata: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
    });

  /**
   * Arbitrary generator for any dispatch request.
   */
  const arbitraryDispatchRequest = (): fc.Arbitrary<DispatchRequest> =>
    fc.record({
      routeId: fc.uuid(),
      driverId: fc.uuid(),
      channels: fc.option(fc.array(arbitraryChannelType(), { minLength: 0, maxLength: 2 }), {
        nil: undefined,
      }),
      multiChannel: fc.option(fc.boolean(), { nil: undefined }),
      metadata: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
    });

  // =============================================================================
  // Helper Functions
  // =============================================================================

  /**
   * Check if a driver has valid configuration for a channel.
   */
  const hasValidConfig = (driver: Driver, channel: ChannelType): boolean => {
    switch (channel) {
      case 'telegram':
        return !!driver.telegramChatId && driver.telegramChatId.trim().length > 0;
      case 'email':
        return !!driver.email && driver.email.trim().length > 0;
      default:
        return false;
    }
  };

  /**
   * Get all available channels for a driver.
   */
  const getAvailableChannels = (driver: Driver): ChannelType[] => {
    return SUPPORTED_CHANNELS.filter((channel) => hasValidConfig(driver, channel));
  };

  /**
   * Determine the expected source of channel selection.
   * Returns: 'override' | 'preference' | 'default' | 'fallback' | 'none'
   */
  const determineExpectedSource = (
    request: DispatchRequest,
    driver: Driver
  ): 'override' | 'preference' | 'default' | 'fallback' | 'none' => {
    const availableChannels = getAvailableChannels(driver);

    if (availableChannels.length === 0) {
      return 'none';
    }

    // Check for valid channel override
    if (request.channels && request.channels.length > 0) {
      const validOverrides = request.channels.filter((ch) => hasValidConfig(driver, ch));
      if (validOverrides.length > 0) {
        return 'override';
      }
    }

    // Check for multi-channel mode (special case - not one of the three sources)
    if (request.multiChannel === true) {
      return 'fallback'; // Multi-channel is a special case
    }

    // Check for driver preference
    if (driver.preferredChannel && hasValidConfig(driver, driver.preferredChannel)) {
      return 'preference';
    }

    // Check for system default
    if (hasValidConfig(driver, DEFAULT_CHANNEL)) {
      return 'default';
    }

    // Fallback to first available
    return 'fallback';
  };

  // =============================================================================
  // Setup
  // =============================================================================

  beforeEach(() => {
    router = new ChannelRouter();
  });

  // =============================================================================
  // Property Tests
  // =============================================================================

  describe('Requirement 1.2: Request channel override takes highest priority', () => {
    /**
     * Property: For any dispatch request with channel override and driver with
     * matching configuration, the selected channels SHALL be exactly the
     * requested channels that the driver has configured.
     */
    it('should use request channel override when specified and driver has configuration', () => {
      fc.assert(
        fc.property(
          arbitraryRequestWithChannelOverride(),
          arbitraryDriverWithBothChannels(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Filter requested channels to only those the driver has configured
            const expectedChannels = request.channels!.filter((ch) => hasValidConfig(driver, ch));

            // Selected channels should match the valid override channels
            expect(selected).toEqual(expectedChannels);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch request with channel override, the override
     * SHALL take priority over driver's preferred_channel.
     */
    it('should prioritize request override over driver preference', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.uuid(),
            driverId: fc.uuid(),
            channels: fc.constant(['email'] as ChannelType[]), // Override to email
          }),
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: arbitraryEmail(),
            telegramChatId: arbitraryTelegramChatId(),
            preferredChannel: fc.constant('telegram' as ChannelType), // Preference is telegram
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should use override (email), not preference (telegram)
            expect(selected).toEqual(['email']);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 1.3 & 11.2: Driver preferred_channel when no override', () => {
    /**
     * Property: For any dispatch request without channel override and driver
     * with preferred_channel set and configured, the selected channel SHALL
     * be the driver's preferred_channel.
     */
    it('should use driver preferred_channel when no override specified', () => {
      fc.assert(
        fc.property(
          arbitraryRequestWithoutChannelOverride(),
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: arbitraryEmail(),
            telegramChatId: arbitraryTelegramChatId(),
            preferredChannel: arbitraryChannelType(), // Has a preference
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should use driver's preferred channel
            expect(selected).toContain(driver.preferredChannel);
            expect(selected.length).toBe(1);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with preferred_channel that is not configured,
     * the router SHALL fall through to the next priority level.
     */
    it('should skip preferred_channel if not configured for driver', () => {
      fc.assert(
        fc.property(
          arbitraryRequestWithoutChannelOverride(),
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: arbitraryEmail(),
            telegramChatId: fc.constant(undefined), // No telegram
            preferredChannel: fc.constant('telegram' as ChannelType), // Prefers telegram
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should NOT use telegram (not configured)
            expect(selected).not.toContain('telegram');
            // Should use email (the only available channel)
            expect(selected).toEqual(['email']);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 6.1: System default telegram when no override and no preference', () => {
    /**
     * Property: For any dispatch request without channel override and driver
     * without preferred_channel, the selected channel SHALL be the system
     * default 'telegram' if configured.
     */
    it('should use system default telegram when no override and no preference', () => {
      fc.assert(
        fc.property(
          arbitraryRequestWithoutChannelOverride(),
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: arbitraryEmail(),
            telegramChatId: arbitraryTelegramChatId(),
            preferredChannel: fc.constant(undefined), // No preference
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should use system default (telegram)
            expect(selected).toEqual([DEFAULT_CHANNEL]);
            expect(selected).toEqual(['telegram']);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: The system default channel SHALL be 'telegram'.
     */
    it('should have telegram as the system default channel', () => {
      expect(DEFAULT_CHANNEL).toBe('telegram');
    });
  });

  describe('Channel selection source consistency', () => {
    /**
     * Property: For any dispatch request and driver configuration, the selected
     * channels SHALL always come from exactly one of the three sources:
     * (1) request override, (2) driver preference, (3) system default,
     * or be empty if no channels are available.
     */
    it('should select channels from exactly one source', () => {
      fc.assert(
        fc.property(
          arbitraryDispatchRequest(),
          arbitraryDriver(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);
            const availableChannels = getAvailableChannels(driver);

            // If no channels available, should return empty
            if (availableChannels.length === 0) {
              expect(selected).toEqual([]);
              return true;
            }

            // Determine expected source
            const source = determineExpectedSource(request, driver);

            switch (source) {
              case 'override': {
                // Selected should be subset of requested channels
                const validOverrides = request.channels!.filter((ch) => hasValidConfig(driver, ch));
                expect(selected).toEqual(validOverrides);
                break;
              }
              case 'preference': {
                // Selected should be driver's preferred channel
                expect(selected).toEqual([driver.preferredChannel]);
                break;
              }
              case 'default': {
                // Selected should be system default
                expect(selected).toEqual([DEFAULT_CHANNEL]);
                break;
              }
              case 'fallback': {
                // Multi-channel or first available
                if (request.multiChannel === true) {
                  expect(selected).toEqual(availableChannels);
                } else {
                  expect(selected.length).toBe(1);
                  expect(availableChannels).toContain(selected[0]);
                }
                break;
              }
              case 'none': {
                expect(selected).toEqual([]);
                break;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any dispatch request and driver, the selected channels
     * SHALL only include channels for which the driver has valid configuration.
     */
    it('should only select channels the driver has configured', () => {
      fc.assert(
        fc.property(arbitraryDispatchRequest(), arbitraryDriver(), (request, driver) => {
          const selected = router.resolveChannels(request, driver);
          const availableChannels = getAvailableChannels(driver);

          // All selected channels should be in available channels
          for (const channel of selected) {
            expect(availableChannels).toContain(channel);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Priority order verification', () => {
    /**
     * Property: The priority order SHALL be strictly:
     * override > preference > default
     *
     * This means if a higher priority source is valid, lower priority
     * sources SHALL NOT be used.
     */
    it('should follow strict priority order: override > preference > default', () => {
      fc.assert(
        fc.property(
          // Request with email override
          fc.record({
            routeId: fc.uuid(),
            driverId: fc.uuid(),
            channels: fc.constant(['email'] as ChannelType[]),
          }),
          // Driver with telegram preference and both channels configured
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: arbitraryEmail(),
            telegramChatId: arbitraryTelegramChatId(),
            preferredChannel: fc.constant('telegram' as ChannelType),
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Override (email) should win over preference (telegram) and default (telegram)
            expect(selected).toEqual(['email']);
            expect(selected).not.toContain('telegram');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: When override is not specified, preference SHALL take
     * priority over default.
     */
    it('should prioritize preference over default when no override', () => {
      fc.assert(
        fc.property(
          // Request without override
          fc.record({
            routeId: fc.uuid(),
            driverId: fc.uuid(),
          }),
          // Driver with email preference (different from default telegram)
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: arbitraryEmail(),
            telegramChatId: arbitraryTelegramChatId(),
            preferredChannel: fc.constant('email' as ChannelType),
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Preference (email) should win over default (telegram)
            expect(selected).toEqual(['email']);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge cases for channel selection', () => {
    /**
     * Property: For any driver with no channels configured, the router
     * SHALL return an empty array regardless of request or preferences.
     */
    it('should return empty array when driver has no channels configured', () => {
      fc.assert(
        fc.property(arbitraryDispatchRequest(), arbitraryDriverWithNoChannels(), (request, driver) => {
          const selected = router.resolveChannels(request, driver);

          expect(selected).toEqual([]);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request with empty channels array, the router
     * SHALL fall through to the next priority level.
     */
    it('should fall through when channels array is empty', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.uuid(),
            driverId: fc.uuid(),
            channels: fc.constant([] as ChannelType[]),
          }),
          arbitraryDriverWithBothChannels(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should fall through to preference or default
            if (driver.preferredChannel && hasValidConfig(driver, driver.preferredChannel)) {
              expect(selected).toEqual([driver.preferredChannel]);
            } else {
              expect(selected).toEqual([DEFAULT_CHANNEL]);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any request with channels that the driver doesn't have
     * configured, the router SHALL fall through to the next priority level.
     */
    it('should fall through when requested channels are not configured', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.uuid(),
            driverId: fc.uuid(),
            channels: fc.constant(['email'] as ChannelType[]), // Request email
          }),
          arbitraryDriverWithTelegramOnly(), // Driver only has telegram
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should fall through since email is not configured
            // Should use telegram (the only available channel)
            expect(selected).toEqual(['telegram']);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: When system default is not configured but other channels are,
     * the router SHALL use the first available channel.
     */
    it('should use first available channel when default is not configured', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.uuid(),
            driverId: fc.uuid(),
          }),
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: arbitraryEmail(),
            telegramChatId: fc.constant(undefined), // No telegram (default)
            preferredChannel: fc.constant(undefined), // No preference
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should use email (the only available channel)
            expect(selected).toEqual(['email']);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Determinism of channel selection', () => {
    /**
     * Property: For any given dispatch request and driver configuration,
     * calling resolveChannels multiple times SHALL return the same result.
     */
    it('should return consistent results for the same input', () => {
      fc.assert(
        fc.property(arbitraryDispatchRequest(), arbitraryDriver(), (request, driver) => {
          const result1 = router.resolveChannels(request, driver);
          const result2 = router.resolveChannels(request, driver);
          const result3 = router.resolveChannels(request, driver);

          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Property-Based Tests for Multi-Channel Dispatch
 *
 * Feature: dispatch-service, Property 13: Multi-Channel Dispatch
 *
 * **Validates: Requirements 6.2**
 *
 * Property 13 from design.md states:
 * "For any dispatch request with multi_channel: true and a driver with multiple
 * configured channels, the dispatch SHALL create channel_dispatch records for ALL
 * configured channels, and all channels SHALL be attempted."
 *
 * This test verifies:
 * 1. When multi_channel: true, ALL available channels for the driver are returned
 * 2. The returned channels match exactly the driver's configured channels
 * 3. Multi-channel mode works regardless of driver preferences
 * 4. Multi-channel mode returns all channels even when override is not specified
 */
describe('Feature: dispatch-service, Property 13: Multi-Channel Dispatch', () => {
  let router: ChannelRouter;

  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  /**
   * Arbitrary generator for non-empty strings.
   */
  const arbitraryNonEmptyString = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

  /**
   * Arbitrary generator for supported channel types.
   */
  const arbitraryChannelType = (): fc.Arbitrary<ChannelType> =>
    fc.constantFrom('telegram', 'email') as fc.Arbitrary<ChannelType>;

  /**
   * Arbitrary generator for telegram chat IDs (valid format).
   */
  const arbitraryTelegramChatId = (): fc.Arbitrary<string> =>
    fc.oneof(
      // Numeric chat IDs (most common)
      fc.integer({ min: 1, max: 9999999999 }).map((n) => n.toString()),
      // Negative chat IDs (group chats)
      fc.integer({ min: -9999999999, max: -1 }).map((n) => n.toString())
    );

  /**
   * Arbitrary generator for email addresses.
   */
  const arbitraryEmail = (): fc.Arbitrary<string> => fc.emailAddress();

  /**
   * Arbitrary generator for driver with BOTH channels configured.
   * This is essential for testing multi-channel dispatch.
   */
  const arbitraryDriverWithBothChannels = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmail(),
      telegramChatId: arbitraryTelegramChatId(),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver with only telegram configured.
   */
  const arbitraryDriverWithTelegramOnly = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: fc.constant(undefined),
      telegramChatId: arbitraryTelegramChatId(),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver with only email configured.
   */
  const arbitraryDriverWithEmailOnly = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmail(),
      telegramChatId: fc.constant(undefined),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver with no channels configured.
   */
  const arbitraryDriverWithNoChannels = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: fc.constant(undefined),
      telegramChatId: fc.constant(undefined),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for any driver configuration.
   */
  const arbitraryDriver = (): fc.Arbitrary<Driver> =>
    fc.oneof(
      arbitraryDriverWithBothChannels(),
      arbitraryDriverWithTelegramOnly(),
      arbitraryDriverWithEmailOnly(),
      arbitraryDriverWithNoChannels()
    );

  /**
   * Arbitrary generator for multi-channel dispatch request.
   */
  const arbitraryMultiChannelRequest = (): fc.Arbitrary<DispatchRequest> =>
    fc.record({
      routeId: fc.uuid(),
      driverId: fc.uuid(),
      channels: fc.constant(undefined), // No channel override
      multiChannel: fc.constant(true), // Multi-channel enabled
      metadata: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
    });

  // =============================================================================
  // Helper Functions
  // =============================================================================

  /**
   * Check if a driver has valid configuration for a channel.
   */
  const hasValidConfig = (driver: Driver, channel: ChannelType): boolean => {
    switch (channel) {
      case 'telegram':
        return !!driver.telegramChatId && driver.telegramChatId.trim().length > 0;
      case 'email':
        return !!driver.email && driver.email.trim().length > 0;
      default:
        return false;
    }
  };

  /**
   * Get all available channels for a driver.
   */
  const getAvailableChannels = (driver: Driver): ChannelType[] => {
    return SUPPORTED_CHANNELS.filter((channel) => hasValidConfig(driver, channel));
  };

  // =============================================================================
  // Setup
  // =============================================================================

  beforeEach(() => {
    router = new ChannelRouter();
  });

  // =============================================================================
  // Property Tests
  // =============================================================================

  describe('Requirement 6.2: Multi-channel dispatch returns ALL configured channels', () => {
    /**
     * Property: For any dispatch request with multi_channel: true and a driver
     * with multiple configured channels, the router SHALL return ALL configured
     * channels for the driver.
     */
    it('should return ALL available channels when multi_channel is true', () => {
      fc.assert(
        fc.property(
          arbitraryMultiChannelRequest(),
          arbitraryDriverWithBothChannels(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);
            const availableChannels = getAvailableChannels(driver);

            // Multi-channel should return ALL available channels
            expect(selected.length).toBe(availableChannels.length);
            expect(selected).toEqual(expect.arrayContaining(availableChannels));
            expect(availableChannels).toEqual(expect.arrayContaining(selected));

            // Should include both telegram and email for driver with both configured
            expect(selected).toContain('telegram');
            expect(selected).toContain('email');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with multiple configured channels and multi_channel: true,
     * the number of returned channels SHALL equal the number of configured channels.
     */
    it('should return exactly the same number of channels as configured', () => {
      fc.assert(
        fc.property(
          arbitraryMultiChannelRequest(),
          arbitraryDriver(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);
            const availableChannels = getAvailableChannels(driver);

            // The count should match exactly
            expect(selected.length).toBe(availableChannels.length);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with both telegram and email configured,
     * multi_channel: true SHALL return both channels.
     */
    it('should return both telegram and email for driver with both configured', () => {
      fc.assert(
        fc.property(
          arbitraryMultiChannelRequest(),
          arbitraryDriverWithBothChannels(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Must include both channels
            expect(selected).toContain('telegram');
            expect(selected).toContain('email');
            expect(selected.length).toBe(2);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Multi-channel with single channel configured', () => {
    /**
     * Property: For any driver with only telegram configured and multi_channel: true,
     * the router SHALL return only telegram (the only available channel).
     */
    it('should return only telegram when driver has only telegram configured', () => {
      fc.assert(
        fc.property(
          arbitraryMultiChannelRequest(),
          arbitraryDriverWithTelegramOnly(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should return only telegram
            expect(selected).toEqual(['telegram']);
            expect(selected.length).toBe(1);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with only email configured and multi_channel: true,
     * the router SHALL return only email (the only available channel).
     */
    it('should return only email when driver has only email configured', () => {
      fc.assert(
        fc.property(
          arbitraryMultiChannelRequest(),
          arbitraryDriverWithEmailOnly(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should return only email
            expect(selected).toEqual(['email']);
            expect(selected.length).toBe(1);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Multi-channel with no channels configured', () => {
    /**
     * Property: For any driver with no channels configured and multi_channel: true,
     * the router SHALL return an empty array.
     */
    it('should return empty array when driver has no channels configured', () => {
      fc.assert(
        fc.property(
          arbitraryMultiChannelRequest(),
          arbitraryDriverWithNoChannels(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should return empty array
            expect(selected).toEqual([]);
            expect(selected.length).toBe(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Multi-channel ignores driver preferences', () => {
    /**
     * Property: For any driver with a preferred_channel set and multi_channel: true,
     * the router SHALL return ALL available channels, not just the preferred one.
     */
    it('should return all channels regardless of driver preference', () => {
      fc.assert(
        fc.property(
          arbitraryMultiChannelRequest(),
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: arbitraryEmail(),
            telegramChatId: arbitraryTelegramChatId(),
            preferredChannel: fc.constant('telegram' as ChannelType), // Has preference
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should return ALL channels, not just preferred
            expect(selected).toContain('telegram');
            expect(selected).toContain('email');
            expect(selected.length).toBe(2);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Multi-channel mode SHALL take precedence over driver's preferred_channel.
     */
    it('should prioritize multi_channel over preferred_channel', () => {
      fc.assert(
        fc.property(
          arbitraryMultiChannelRequest(),
          fc.record({
            id: fc.uuid(),
            firstName: arbitraryNonEmptyString(),
            lastName: arbitraryNonEmptyString(),
            email: arbitraryEmail(),
            telegramChatId: arbitraryTelegramChatId(),
            preferredChannel: fc.constant('email' as ChannelType), // Prefers email only
            fallbackEnabled: fc.boolean(),
            status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
          }),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Multi-channel should override preference and return all
            expect(selected.length).toBe(2);
            expect(selected).toContain('telegram');
            expect(selected).toContain('email');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Multi-channel with channel override interaction', () => {
    /**
     * Property: When both channels override and multi_channel: true are specified,
     * the channel override SHALL take priority (as per priority order).
     */
    it('should prioritize channel override over multi_channel mode', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.uuid(),
            driverId: fc.uuid(),
            channels: fc.constant(['email'] as ChannelType[]), // Override to email only
            multiChannel: fc.constant(true), // Also multi-channel
            metadata: fc.constant(undefined),
          }),
          arbitraryDriverWithBothChannels(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Channel override should take priority
            expect(selected).toEqual(['email']);
            expect(selected.length).toBe(1);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: When channel override is empty array and multi_channel: true,
     * multi_channel mode SHALL be used.
     */
    it('should use multi_channel when channel override is empty', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.uuid(),
            driverId: fc.uuid(),
            channels: fc.constant([] as ChannelType[]), // Empty override
            multiChannel: fc.constant(true),
            metadata: fc.constant(undefined),
          }),
          arbitraryDriverWithBothChannels(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);

            // Should fall through to multi-channel mode
            expect(selected).toContain('telegram');
            expect(selected).toContain('email');
            expect(selected.length).toBe(2);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('All channels SHALL be attempted (completeness)', () => {
    /**
     * Property: For any driver configuration, multi_channel: true SHALL return
     * a set of channels that is exactly equal to the set of available channels.
     * No channel SHALL be omitted, and no unavailable channel SHALL be included.
     */
    it('should return exactly the set of available channels', () => {
      fc.assert(
        fc.property(
          arbitraryMultiChannelRequest(),
          arbitraryDriver(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);
            const availableChannels = getAvailableChannels(driver);

            // Sets should be equal
            const selectedSet = new Set(selected);
            const availableSet = new Set(availableChannels);

            expect(selectedSet.size).toBe(availableSet.size);
            for (const channel of selectedSet) {
              expect(availableSet.has(channel)).toBe(true);
            }
            for (const channel of availableSet) {
              expect(selectedSet.has(channel)).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with N configured channels and multi_channel: true,
     * exactly N channels SHALL be returned (all channels attempted).
     */
    it('should attempt all N configured channels', () => {
      fc.assert(
        fc.property(
          arbitraryMultiChannelRequest(),
          arbitraryDriver(),
          (request, driver) => {
            const selected = router.resolveChannels(request, driver);
            const availableChannels = getAvailableChannels(driver);

            // Count should match exactly
            expect(selected.length).toBe(availableChannels.length);

            // Each available channel should be in selected
            for (const channel of availableChannels) {
              expect(selected).toContain(channel);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Determinism of multi-channel selection', () => {
    /**
     * Property: For any given multi-channel request and driver configuration,
     * calling resolveChannels multiple times SHALL return the same result.
     */
    it('should return consistent results for multi-channel requests', () => {
      fc.assert(
        fc.property(
          arbitraryMultiChannelRequest(),
          arbitraryDriver(),
          (request, driver) => {
            const result1 = router.resolveChannels(request, driver);
            const result2 = router.resolveChannels(request, driver);
            const result3 = router.resolveChannels(request, driver);

            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property-Based Tests for Fallback Channel Behavior
 *
 * Feature: dispatch-service, Property 14: Fallback Channel Behavior
 *
 * **Validates: Requirements 6.3**
 *
 * Property 14 from design.md states:
 * "For any driver with fallback_enabled: true and multiple configured channels,
 * if the primary channel fails, the dispatch SHALL attempt delivery through the
 * next available channel. The fallback attempt SHALL be recorded as a separate
 * channel_dispatch."
 *
 * This test verifies:
 * 1. When fallback_enabled is true, getFallbackChannel returns the next available channel
 * 2. When fallback_enabled is false, getFallbackChannel returns null
 * 3. The fallback channel excludes the failed channel
 * 4. Fallback returns null when no other channels are available
 */
describe('Feature: dispatch-service, Property 14: Fallback Channel Behavior', () => {
  let router: ChannelRouter;

  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  /**
   * Arbitrary generator for non-empty strings.
   */
  const arbitraryNonEmptyString = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

  /**
   * Arbitrary generator for supported channel types.
   */
  const arbitraryChannelType = (): fc.Arbitrary<ChannelType> =>
    fc.constantFrom('telegram', 'email') as fc.Arbitrary<ChannelType>;

  /**
   * Arbitrary generator for telegram chat IDs (valid format).
   */
  const arbitraryTelegramChatId = (): fc.Arbitrary<string> =>
    fc.oneof(
      // Numeric chat IDs (most common)
      fc.integer({ min: 1, max: 9999999999 }).map((n) => n.toString()),
      // Negative chat IDs (group chats)
      fc.integer({ min: -9999999999, max: -1 }).map((n) => n.toString())
    );

  /**
   * Arbitrary generator for email addresses.
   */
  const arbitraryEmail = (): fc.Arbitrary<string> => fc.emailAddress();

  /**
   * Arbitrary generator for driver with BOTH channels configured and fallback ENABLED.
   */
  const arbitraryDriverWithBothChannelsFallbackEnabled = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmail(),
      telegramChatId: arbitraryTelegramChatId(),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.constant(true), // Fallback enabled
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver with BOTH channels configured and fallback DISABLED.
   */
  const arbitraryDriverWithBothChannelsFallbackDisabled = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmail(),
      telegramChatId: arbitraryTelegramChatId(),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.constant(false), // Fallback disabled
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver with only telegram configured and fallback enabled.
   */
  const arbitraryDriverWithTelegramOnlyFallbackEnabled = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: fc.constant(undefined),
      telegramChatId: arbitraryTelegramChatId(),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.constant(true),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver with only email configured and fallback enabled.
   */
  const arbitraryDriverWithEmailOnlyFallbackEnabled = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: arbitraryEmail(),
      telegramChatId: fc.constant(undefined),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.constant(true),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for driver with no channels configured.
   */
  const arbitraryDriverWithNoChannels = (): fc.Arbitrary<Driver> =>
    fc.record({
      id: fc.uuid(),
      firstName: arbitraryNonEmptyString(),
      lastName: arbitraryNonEmptyString(),
      email: fc.constant(undefined),
      telegramChatId: fc.constant(undefined),
      preferredChannel: fc.option(arbitraryChannelType(), { nil: undefined }),
      fallbackEnabled: fc.boolean(),
      status: fc.constantFrom('active', 'inactive') as fc.Arbitrary<'active' | 'inactive'>,
    });

  /**
   * Arbitrary generator for any driver configuration.
   */
  const arbitraryDriver = (): fc.Arbitrary<Driver> =>
    fc.oneof(
      arbitraryDriverWithBothChannelsFallbackEnabled(),
      arbitraryDriverWithBothChannelsFallbackDisabled(),
      arbitraryDriverWithTelegramOnlyFallbackEnabled(),
      arbitraryDriverWithEmailOnlyFallbackEnabled(),
      arbitraryDriverWithNoChannels()
    );

  // =============================================================================
  // Helper Functions
  // =============================================================================

  /**
   * Check if a driver has valid configuration for a channel.
   */
  const hasValidConfig = (driver: Driver, channel: ChannelType): boolean => {
    switch (channel) {
      case 'telegram':
        return !!driver.telegramChatId && driver.telegramChatId.trim().length > 0;
      case 'email':
        return !!driver.email && driver.email.trim().length > 0;
      default:
        return false;
    }
  };

  /**
   * Get all available channels for a driver.
   */
  const getAvailableChannels = (driver: Driver): ChannelType[] => {
    return SUPPORTED_CHANNELS.filter((channel) => hasValidConfig(driver, channel));
  };

  // =============================================================================
  // Setup
  // =============================================================================

  beforeEach(() => {
    router = new ChannelRouter();
  });

  // =============================================================================
  // Property Tests
  // =============================================================================

  describe('Requirement 6.3: Fallback returns next available channel when fallback_enabled is true', () => {
    /**
     * Property: For any driver with fallback_enabled: true and multiple configured
     * channels, if the primary channel fails, getFallbackChannel SHALL return
     * the next available channel.
     */
    it('should return next available channel when fallback_enabled is true', () => {
      fc.assert(
        fc.property(
          arbitraryDriverWithBothChannelsFallbackEnabled(),
          arbitraryChannelType(),
          (driver, failedChannel) => {
            const fallback = router.getFallbackChannel(driver, failedChannel);
            const availableChannels = getAvailableChannels(driver);

            // If driver has multiple channels and fallback is enabled
            if (availableChannels.length > 1 && hasValidConfig(driver, failedChannel)) {
              // Fallback should be returned
              expect(fallback).not.toBeNull();
              // Fallback should be different from failed channel
              expect(fallback).not.toBe(failedChannel);
              // Fallback should be an available channel
              expect(availableChannels).toContain(fallback);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with both telegram and email configured and
     * fallback_enabled: true, if telegram fails, email SHALL be returned as fallback.
     */
    it('should return email as fallback when telegram fails', () => {
      fc.assert(
        fc.property(
          arbitraryDriverWithBothChannelsFallbackEnabled(),
          (driver) => {
            const fallback = router.getFallbackChannel(driver, 'telegram');

            // Should return email as fallback
            expect(fallback).toBe('email');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with both telegram and email configured and
     * fallback_enabled: true, if email fails, telegram SHALL be returned as fallback.
     */
    it('should return telegram as fallback when email fails', () => {
      fc.assert(
        fc.property(
          arbitraryDriverWithBothChannelsFallbackEnabled(),
          (driver) => {
            const fallback = router.getFallbackChannel(driver, 'email');

            // Should return telegram as fallback
            expect(fallback).toBe('telegram');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 6.3: Fallback returns null when fallback_enabled is false', () => {
    /**
     * Property: For any driver with fallback_enabled: false, getFallbackChannel
     * SHALL return null regardless of available channels.
     */
    it('should return null when fallback_enabled is false', () => {
      fc.assert(
        fc.property(
          arbitraryDriverWithBothChannelsFallbackDisabled(),
          arbitraryChannelType(),
          (driver, failedChannel) => {
            const fallback = router.getFallbackChannel(driver, failedChannel);

            // Should return null when fallback is disabled
            expect(fallback).toBeNull();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with fallback_enabled: false and multiple channels,
     * getFallbackChannel SHALL return null even when other channels are available.
     */
    it('should return null even with multiple channels when fallback disabled', () => {
      fc.assert(
        fc.property(
          arbitraryDriverWithBothChannelsFallbackDisabled(),
          (driver) => {
            // Try both channels as failed
            const fallbackFromTelegram = router.getFallbackChannel(driver, 'telegram');
            const fallbackFromEmail = router.getFallbackChannel(driver, 'email');

            // Both should return null
            expect(fallbackFromTelegram).toBeNull();
            expect(fallbackFromEmail).toBeNull();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Fallback excludes the failed channel', () => {
    /**
     * Property: For any driver and failed channel, the fallback channel
     * SHALL NOT be the same as the failed channel.
     */
    it('should never return the failed channel as fallback', () => {
      fc.assert(
        fc.property(
          arbitraryDriver(),
          arbitraryChannelType(),
          (driver, failedChannel) => {
            const fallback = router.getFallbackChannel(driver, failedChannel);

            // If a fallback is returned, it must be different from failed channel
            if (fallback !== null) {
              expect(fallback).not.toBe(failedChannel);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with fallback_enabled: true, the fallback channel
     * SHALL be from the set of available channels excluding the failed channel.
     */
    it('should return fallback from available channels excluding failed', () => {
      fc.assert(
        fc.property(
          arbitraryDriverWithBothChannelsFallbackEnabled(),
          arbitraryChannelType(),
          (driver, failedChannel) => {
            const fallback = router.getFallbackChannel(driver, failedChannel);
            const availableChannels = getAvailableChannels(driver);
            const expectedFallbackOptions = availableChannels.filter((ch) => ch !== failedChannel);

            if (fallback !== null) {
              // Fallback should be in the expected options
              expect(expectedFallbackOptions).toContain(fallback);
              // Fallback should not be the failed channel
              expect(fallback).not.toBe(failedChannel);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Fallback returns null when no other channels available', () => {
    /**
     * Property: For any driver with only one channel configured and fallback_enabled: true,
     * if that channel fails, getFallbackChannel SHALL return null.
     */
    it('should return null when only telegram is configured and it fails', () => {
      fc.assert(
        fc.property(
          arbitraryDriverWithTelegramOnlyFallbackEnabled(),
          (driver) => {
            const fallback = router.getFallbackChannel(driver, 'telegram');

            // No fallback available since only telegram is configured
            expect(fallback).toBeNull();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with only email configured and fallback_enabled: true,
     * if email fails, getFallbackChannel SHALL return null.
     */
    it('should return null when only email is configured and it fails', () => {
      fc.assert(
        fc.property(
          arbitraryDriverWithEmailOnlyFallbackEnabled(),
          (driver) => {
            const fallback = router.getFallbackChannel(driver, 'email');

            // No fallback available since only email is configured
            expect(fallback).toBeNull();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any driver with no channels configured, getFallbackChannel
     * SHALL return null regardless of the failed channel.
     */
    it('should return null when driver has no channels configured', () => {
      fc.assert(
        fc.property(
          arbitraryDriverWithNoChannels(),
          arbitraryChannelType(),
          (driver, failedChannel) => {
            const fallback = router.getFallbackChannel(driver, failedChannel);

            // No fallback available
            expect(fallback).toBeNull();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Fallback channel is a valid available channel', () => {
    /**
     * Property: For any driver and failed channel, if a fallback is returned,
     * it SHALL be a channel for which the driver has valid configuration.
     */
    it('should only return channels the driver has configured', () => {
      fc.assert(
        fc.property(
          arbitraryDriver(),
          arbitraryChannelType(),
          (driver, failedChannel) => {
            const fallback = router.getFallbackChannel(driver, failedChannel);
            const availableChannels = getAvailableChannels(driver);

            if (fallback !== null) {
              // Fallback must be in available channels
              expect(availableChannels).toContain(fallback);
              // Verify the driver has valid config for the fallback
              expect(hasValidConfig(driver, fallback)).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Determinism of fallback selection', () => {
    /**
     * Property: For any given driver and failed channel, calling getFallbackChannel
     * multiple times SHALL return the same result.
     */
    it('should return consistent fallback results', () => {
      fc.assert(
        fc.property(
          arbitraryDriver(),
          arbitraryChannelType(),
          (driver, failedChannel) => {
            const result1 = router.getFallbackChannel(driver, failedChannel);
            const result2 = router.getFallbackChannel(driver, failedChannel);
            const result3 = router.getFallbackChannel(driver, failedChannel);

            expect(result1).toBe(result2);
            expect(result2).toBe(result3);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Fallback behavior completeness', () => {
    /**
     * Property: For any driver with fallback_enabled: true and N configured channels,
     * if channel C fails, the fallback SHALL be one of the remaining N-1 channels
     * (or null if N=1 or C is not configured).
     */
    it('should provide fallback from remaining channels', () => {
      fc.assert(
        fc.property(
          arbitraryDriverWithBothChannelsFallbackEnabled(),
          arbitraryChannelType(),
          (driver, failedChannel) => {
            const fallback = router.getFallbackChannel(driver, failedChannel);
            const availableChannels = getAvailableChannels(driver);
            const remainingChannels = availableChannels.filter((ch) => ch !== failedChannel);

            if (hasValidConfig(driver, failedChannel) && remainingChannels.length > 0) {
              // Should have a fallback
              expect(fallback).not.toBeNull();
              expect(remainingChannels).toContain(fallback);
            } else if (!hasValidConfig(driver, failedChannel)) {
              // Failed channel wasn't configured, so all channels are still available
              // Fallback should be from available channels
              if (availableChannels.length > 0) {
                expect(fallback).not.toBeNull();
                expect(availableChannels).toContain(fallback);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
