/**
 * Unit tests for ChannelRouter
 *
 * Tests the channel routing functionality including:
 * - Priority logic: request override > driver preference > system default (Req 6.1)
 * - Multi-channel mode sending to all available channels (Req 6.2)
 * - Fallback channel selection when primary fails (Req 6.3)
 * - Filtering channels based on driver configuration (Req 6.4)
 */

import {
  ChannelRouter,
  DispatchRequest,
  DEFAULT_CHANNEL,
  SUPPORTED_CHANNELS,
} from '../../../src/core/router.js';
import { ChannelType, Driver } from '../../../src/types/index.js';
import { ChannelAdapter, HealthStatus, ChannelResult, DispatchContext } from '../../../src/adapters/interface.js';

// Mock adapter for testing
class MockAdapter implements ChannelAdapter {
  readonly channelType: ChannelType;
  private canSendResult: boolean;

  constructor(channelType: ChannelType, canSendResult: boolean = true) {
    this.channelType = channelType;
    this.canSendResult = canSendResult;
  }

  canSend(_driver: Driver): boolean {
    return this.canSendResult;
  }

  async send(_context: DispatchContext): Promise<ChannelResult> {
    return {
      success: true,
      channelType: this.channelType,
      sentAt: new Date(),
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return { healthy: true };
  }
}

describe('ChannelRouter', () => {
  let router: ChannelRouter;

  // Sample driver with all channels configured
  const driverWithAllChannels: Driver = {
    id: 'driver-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    telegramChatId: '12345678',
    preferredChannel: 'telegram',
    fallbackEnabled: true,
    status: 'active',
  };

  // Driver with only telegram configured
  const driverTelegramOnly: Driver = {
    id: 'driver-456',
    firstName: 'Jane',
    lastName: 'Smith',
    telegramChatId: '87654321',
    fallbackEnabled: true,
    status: 'active',
  };

  // Driver with only email configured
  const driverEmailOnly: Driver = {
    id: 'driver-789',
    firstName: 'Bob',
    lastName: 'Wilson',
    email: 'bob@example.com',
    fallbackEnabled: true,
    status: 'active',
  };

  // Driver with no channels configured
  const driverNoChannels: Driver = {
    id: 'driver-000',
    firstName: 'No',
    lastName: 'Channels',
    fallbackEnabled: true,
    status: 'active',
  };

  // Driver with fallback disabled
  const driverNoFallback: Driver = {
    id: 'driver-111',
    firstName: 'No',
    lastName: 'Fallback',
    email: 'nofallback@example.com',
    telegramChatId: '11111111',
    preferredChannel: 'telegram',
    fallbackEnabled: false,
    status: 'active',
  };

  // Basic dispatch request
  const basicRequest: DispatchRequest = {
    routeId: 'route-123',
    driverId: 'driver-123',
  };

  beforeEach(() => {
    router = new ChannelRouter();
  });

  describe('resolveChannels()', () => {
    describe('Requirement 6.1: Priority - request override > driver preference > system default', () => {
      it('should use request channel override when specified (highest priority)', () => {
        const request: DispatchRequest = {
          ...basicRequest,
          channels: ['email'],
        };

        const channels = router.resolveChannels(request, driverWithAllChannels);

        expect(channels).toEqual(['email']);
      });

      it('should use multiple request channel overrides when specified', () => {
        const request: DispatchRequest = {
          ...basicRequest,
          channels: ['telegram', 'email'],
        };

        const channels = router.resolveChannels(request, driverWithAllChannels);

        expect(channels).toEqual(['telegram', 'email']);
      });

      it('should use driver preferred channel when no override specified', () => {
        const driverWithEmailPreference: Driver = {
          ...driverWithAllChannels,
          preferredChannel: 'email',
        };

        const channels = router.resolveChannels(basicRequest, driverWithEmailPreference);

        expect(channels).toEqual(['email']);
      });

      it('should use system default when no override and no preference', () => {
        const driverNoPreference: Driver = {
          ...driverWithAllChannels,
          preferredChannel: undefined,
        };

        const channels = router.resolveChannels(basicRequest, driverNoPreference);

        expect(channels).toEqual([DEFAULT_CHANNEL]);
        expect(channels).toEqual(['telegram']);
      });

      it('should prioritize request override over driver preference', () => {
        const driverWithEmailPreference: Driver = {
          ...driverWithAllChannels,
          preferredChannel: 'email',
        };
        const request: DispatchRequest = {
          ...basicRequest,
          channels: ['telegram'],
        };

        const channels = router.resolveChannels(request, driverWithEmailPreference);

        expect(channels).toEqual(['telegram']);
      });

      it('should prioritize driver preference over system default', () => {
        const driverWithEmailPreference: Driver = {
          ...driverWithAllChannels,
          preferredChannel: 'email',
        };

        const channels = router.resolveChannels(basicRequest, driverWithEmailPreference);

        expect(channels).toEqual(['email']);
      });
    });

    describe('Requirement 6.2: Multi-channel mode', () => {
      it('should send to all available channels when multiChannel is true', () => {
        const request: DispatchRequest = {
          ...basicRequest,
          multiChannel: true,
        };

        const channels = router.resolveChannels(request, driverWithAllChannels);

        expect(channels).toContain('telegram');
        expect(channels).toContain('email');
        expect(channels.length).toBe(2);
      });

      it('should only include channels driver has configured in multi-channel mode', () => {
        const request: DispatchRequest = {
          ...basicRequest,
          multiChannel: true,
        };

        const channels = router.resolveChannels(request, driverTelegramOnly);

        expect(channels).toEqual(['telegram']);
      });

      it('should prioritize request override over multi-channel mode', () => {
        const request: DispatchRequest = {
          ...basicRequest,
          channels: ['email'],
          multiChannel: true,
        };

        const channels = router.resolveChannels(request, driverWithAllChannels);

        // Request override takes priority
        expect(channels).toEqual(['email']);
      });
    });

    describe('Requirement 6.4: Filter channels based on driver configuration', () => {
      it('should return empty array when driver has no channels configured', () => {
        const channels = router.resolveChannels(basicRequest, driverNoChannels);

        expect(channels).toEqual([]);
      });

      it('should filter out unavailable channels from request override', () => {
        const request: DispatchRequest = {
          ...basicRequest,
          channels: ['telegram', 'email'],
        };

        const channels = router.resolveChannels(request, driverTelegramOnly);

        expect(channels).toEqual(['telegram']);
      });

      it('should fall through to next priority when requested channels unavailable', () => {
        const request: DispatchRequest = {
          ...basicRequest,
          channels: ['email'], // Driver only has telegram
        };

        const channels = router.resolveChannels(request, driverTelegramOnly);

        // Falls through to driver preference or default
        expect(channels).toEqual(['telegram']);
      });

      it('should use first available channel when default is not configured', () => {
        const driverEmailOnlyNoPreference: Driver = {
          ...driverEmailOnly,
          preferredChannel: undefined,
        };

        const channels = router.resolveChannels(basicRequest, driverEmailOnlyNoPreference);

        // Default is telegram, but driver only has email
        expect(channels).toEqual(['email']);
      });

      it('should skip preferred channel if not configured', () => {
        const driverWithInvalidPreference: Driver = {
          ...driverTelegramOnly,
          preferredChannel: 'email', // Not configured
        };

        const channels = router.resolveChannels(basicRequest, driverWithInvalidPreference);

        // Falls through to default or first available
        expect(channels).toEqual(['telegram']);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty channels array in request', () => {
        const request: DispatchRequest = {
          ...basicRequest,
          channels: [],
        };

        const channels = router.resolveChannels(request, driverWithAllChannels);

        // Empty array should fall through to next priority
        expect(channels).toEqual(['telegram']);
      });

      it('should handle multiChannel: false explicitly', () => {
        const request: DispatchRequest = {
          ...basicRequest,
          multiChannel: false,
        };

        const channels = router.resolveChannels(request, driverWithAllChannels);

        // Should use single channel (driver preference)
        expect(channels).toEqual(['telegram']);
      });

      it('should handle driver with whitespace-only telegramChatId', () => {
        const driverWithWhitespace: Driver = {
          ...driverNoChannels,
          telegramChatId: '   ',
        };

        const channels = router.resolveChannels(basicRequest, driverWithWhitespace);

        expect(channels).toEqual([]);
      });

      it('should handle driver with whitespace-only email', () => {
        const driverWithWhitespace: Driver = {
          ...driverNoChannels,
          email: '   ',
        };

        const channels = router.resolveChannels(basicRequest, driverWithWhitespace);

        expect(channels).toEqual([]);
      });
    });
  });

  describe('getFallbackChannel()', () => {
    describe('Requirement 6.3: Fallback channel behavior', () => {
      it('should return next available channel when primary fails', () => {
        const fallback = router.getFallbackChannel(driverWithAllChannels, 'telegram');

        expect(fallback).toBe('email');
      });

      it('should return telegram as fallback when email fails', () => {
        const fallback = router.getFallbackChannel(driverWithAllChannels, 'email');

        expect(fallback).toBe('telegram');
      });

      it('should return null when fallback is disabled', () => {
        const fallback = router.getFallbackChannel(driverNoFallback, 'telegram');

        expect(fallback).toBeNull();
      });

      it('should return null when no other channels available', () => {
        const fallback = router.getFallbackChannel(driverTelegramOnly, 'telegram');

        expect(fallback).toBeNull();
      });

      it('should return null when driver has no channels configured', () => {
        const fallback = router.getFallbackChannel(driverNoChannels, 'telegram');

        expect(fallback).toBeNull();
      });
    });

    describe('Requirement 6.4: Filter fallback based on configuration', () => {
      it('should only return configured channels as fallback', () => {
        const fallback = router.getFallbackChannel(driverEmailOnly, 'telegram');

        // Driver only has email, so email should be returned even though telegram "failed"
        expect(fallback).toBe('email');
      });

      it('should not return unconfigured channels as fallback', () => {
        const fallback = router.getFallbackChannel(driverTelegramOnly, 'telegram');

        // Driver only has telegram, no fallback available
        expect(fallback).toBeNull();
      });
    });
  });

  describe('hasValidConfiguration()', () => {
    it('should return true for telegram when telegramChatId is set', () => {
      const result = router.hasValidConfiguration(driverTelegramOnly, 'telegram');

      expect(result).toBe(true);
    });

    it('should return false for telegram when telegramChatId is not set', () => {
      const result = router.hasValidConfiguration(driverEmailOnly, 'telegram');

      expect(result).toBe(false);
    });

    it('should return true for email when email is set', () => {
      const result = router.hasValidConfiguration(driverEmailOnly, 'email');

      expect(result).toBe(true);
    });

    it('should return false for email when email is not set', () => {
      const result = router.hasValidConfiguration(driverTelegramOnly, 'email');

      expect(result).toBe(false);
    });

    it('should return false for unsupported channels', () => {
      const result = router.hasValidConfiguration(driverWithAllChannels, 'sms');

      expect(result).toBe(false);
    });

    it('should return false for push channel (not implemented)', () => {
      const result = router.hasValidConfiguration(driverWithAllChannels, 'push');

      expect(result).toBe(false);
    });
  });

  describe('getAvailableChannels()', () => {
    it('should return all configured channels for driver', () => {
      const channels = router.getAvailableChannels(driverWithAllChannels);

      expect(channels).toContain('telegram');
      expect(channels).toContain('email');
      expect(channels.length).toBe(2);
    });

    it('should return only telegram for driver with telegram only', () => {
      const channels = router.getAvailableChannels(driverTelegramOnly);

      expect(channels).toEqual(['telegram']);
    });

    it('should return only email for driver with email only', () => {
      const channels = router.getAvailableChannels(driverEmailOnly);

      expect(channels).toEqual(['email']);
    });

    it('should return empty array for driver with no channels', () => {
      const channels = router.getAvailableChannels(driverNoChannels);

      expect(channels).toEqual([]);
    });
  });

  describe('registerAdapter()', () => {
    it('should use registered adapter for configuration check', () => {
      const mockTelegramAdapter = new MockAdapter('telegram', true);
      const mockEmailAdapter = new MockAdapter('email', false);

      router.registerAdapter(mockTelegramAdapter);
      router.registerAdapter(mockEmailAdapter);

      // Should use adapter's canSend result
      expect(router.hasValidConfiguration(driverWithAllChannels, 'telegram')).toBe(true);
      expect(router.hasValidConfiguration(driverWithAllChannels, 'email')).toBe(false);
    });

    it('should affect channel resolution when adapters are registered', () => {
      // Register adapter that says email is not available
      const mockEmailAdapter = new MockAdapter('email', false);
      router.registerAdapter(mockEmailAdapter);

      const request: DispatchRequest = {
        ...basicRequest,
        multiChannel: true,
      };

      const channels = router.resolveChannels(request, driverWithAllChannels);

      // Email should be filtered out because adapter says canSend is false
      expect(channels).toEqual(['telegram']);
    });
  });

  describe('Constants', () => {
    it('should have telegram as default channel', () => {
      expect(DEFAULT_CHANNEL).toBe('telegram');
    });

    it('should have telegram and email as supported channels', () => {
      expect(SUPPORTED_CHANNELS).toContain('telegram');
      expect(SUPPORTED_CHANNELS).toContain('email');
    });

    it('should have telegram before email in supported channels (priority order)', () => {
      const telegramIndex = SUPPORTED_CHANNELS.indexOf('telegram');
      const emailIndex = SUPPORTED_CHANNELS.indexOf('email');

      expect(telegramIndex).toBeLessThan(emailIndex);
    });
  });
});

