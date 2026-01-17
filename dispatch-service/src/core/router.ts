/**
 * Channel Router
 *
 * Determines which communication channels to use for a dispatch based on:
 * - Request channel override (highest priority)
 * - Driver's preferred channel
 * - System default (telegram)
 *
 * Also handles fallback channel selection when primary channel fails.
 *
 * @module core/router
 * @requirements 6.1 - Apply priority: request override > driver preference > system default
 * @requirements 6.2 - When multi_channel: true, send to all available channels concurrently
 * @requirements 6.3 - When primary channel fails and fallback_enabled is true, attempt next available channel
 * @requirements 6.4 - Only attempt channels for which driver has valid configuration
 */

import { ChannelType, Driver } from '../types/index.js';
import { ChannelAdapter } from '../adapters/interface.js';
import { logger } from '../utils/logger.js';

/**
 * Dispatch request parameters relevant to channel routing
 */
export interface DispatchRequest {
  routeId: string;
  driverId: string;
  /** Override channels - takes highest priority */
  channels?: ChannelType[];
  /** When true, send to all available channels */
  multiChannel?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * System default channel when no preference is set
 */
export const DEFAULT_CHANNEL: ChannelType = 'telegram';

/**
 * Ordered list of supported channels for fallback purposes
 * Order determines fallback priority
 */
export const SUPPORTED_CHANNELS: ChannelType[] = ['telegram', 'email'];

/**
 * Channel Router Interface
 *
 * Determines which channels to use for a dispatch based on request and driver preferences.
 */
export interface IChannelRouter {
  /**
   * Determine channels for a dispatch based on request and driver preferences.
   *
   * Priority order:
   * 1. Request channel override (if specified)
   * 2. Driver's preferred channel (if set)
   * 3. System default (telegram)
   *
   * When multiChannel is true, returns all available channels for the driver.
   *
   * @param request - The dispatch request
   * @param driver - The driver receiving the dispatch
   * @returns Array of channel types to use for the dispatch
   */
  resolveChannels(request: DispatchRequest, driver: Driver): ChannelType[];

  /**
   * Get fallback channel if primary fails.
   *
   * Returns the next available channel for the driver that hasn't been tried yet.
   * Only returns a fallback if the driver has fallback_enabled set to true.
   *
   * @param driver - The driver receiving the dispatch
   * @param failedChannel - The channel that failed
   * @returns The fallback channel type, or null if no fallback available
   */
  getFallbackChannel(driver: Driver, failedChannel: ChannelType): ChannelType | null;
}

/**
 * Channel Router Implementation
 *
 * Implements channel selection logic with priority-based resolution
 * and fallback support.
 */
export class ChannelRouter implements IChannelRouter {
  private adapters: Map<ChannelType, ChannelAdapter>;

  /**
   * Create a new ChannelRouter instance.
   *
   * @param adapters - Map of channel adapters for checking driver configuration
   */
  constructor(adapters?: Map<ChannelType, ChannelAdapter>) {
    this.adapters = adapters || new Map();
  }

  /**
   * Register a channel adapter for configuration checking.
   *
   * @param adapter - The channel adapter to register
   */
  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.channelType, adapter);
  }

  /**
   * Check if a driver has valid configuration for a specific channel.
   *
   * @param driver - The driver to check
   * @param channel - The channel type to check
   * @returns true if the driver can receive messages on this channel
   * @requirements 6.4 - Only attempt channels for which driver has valid configuration
   */
  hasValidConfiguration(driver: Driver, channel: ChannelType): boolean {
    // If we have an adapter registered, use its canSend method
    const adapter = this.adapters.get(channel);
    if (adapter) {
      return adapter.canSend(driver);
    }

    // Fallback to direct configuration check
    switch (channel) {
      case 'telegram':
        return !!driver.telegramChatId && driver.telegramChatId.trim().length > 0;
      case 'email':
        return !!driver.email && driver.email.trim().length > 0;
      case 'sms':
        // SMS not yet implemented - would check phone number
        return false;
      case 'push':
        // Push not yet implemented - would check device token
        return false;
      default:
        return false;
    }
  }

  /**
   * Get all channels for which the driver has valid configuration.
   *
   * @param driver - The driver to check
   * @returns Array of channel types the driver can receive
   */
  getAvailableChannels(driver: Driver): ChannelType[] {
    return SUPPORTED_CHANNELS.filter((channel) =>
      this.hasValidConfiguration(driver, channel)
    );
  }

  /**
   * Determine channels for a dispatch based on request and driver preferences.
   *
   * @param request - The dispatch request
   * @param driver - The driver receiving the dispatch
   * @returns Array of channel types to use for the dispatch
   * @requirements 6.1 - Apply priority: request override > driver preference > system default
   * @requirements 6.2 - When multi_channel: true, send to all available channels concurrently
   * @requirements 6.4 - Only attempt channels for which driver has valid configuration
   */
  resolveChannels(request: DispatchRequest, driver: Driver): ChannelType[] {
    const availableChannels = this.getAvailableChannels(driver);

    // If no channels available, return empty array
    if (availableChannels.length === 0) {
      logger.warn('No available channels for driver', {
        driverId: driver.id,
        routeId: request.routeId,
      });
      return [];
    }

    // Priority 1: Request channel override
    if (request.channels && request.channels.length > 0) {
      // Filter to only channels the driver has configured
      const validOverrideChannels = request.channels.filter((channel) =>
        this.hasValidConfiguration(driver, channel)
      );

      if (validOverrideChannels.length > 0) {
        logger.debug('Using request channel override', {
          driverId: driver.id,
          routeId: request.routeId,
          requestedChannels: request.channels,
          validChannels: validOverrideChannels,
        });
        return validOverrideChannels;
      }

      // If none of the requested channels are valid, log warning and fall through
      logger.warn('Requested channels not available for driver', {
        driverId: driver.id,
        routeId: request.routeId,
        requestedChannels: request.channels,
        availableChannels,
      });
    }

    // Priority 2: Multi-channel mode - send to all available channels
    if (request.multiChannel === true) {
      logger.debug('Using multi-channel mode', {
        driverId: driver.id,
        routeId: request.routeId,
        channels: availableChannels,
      });
      return availableChannels;
    }

    // Priority 3: Driver's preferred channel
    if (driver.preferredChannel && this.hasValidConfiguration(driver, driver.preferredChannel)) {
      logger.debug('Using driver preferred channel', {
        driverId: driver.id,
        routeId: request.routeId,
        preferredChannel: driver.preferredChannel,
      });
      return [driver.preferredChannel];
    }

    // Priority 4: System default
    if (this.hasValidConfiguration(driver, DEFAULT_CHANNEL)) {
      logger.debug('Using system default channel', {
        driverId: driver.id,
        routeId: request.routeId,
        defaultChannel: DEFAULT_CHANNEL,
      });
      return [DEFAULT_CHANNEL];
    }

    // Fallback: Use first available channel
    const firstAvailable = availableChannels[0];
    if (firstAvailable) {
      logger.debug('Using first available channel as fallback', {
        driverId: driver.id,
        routeId: request.routeId,
        channel: firstAvailable,
      });
      return [firstAvailable];
    }

    // Should not reach here since we check availableChannels.length > 0 above
    return [];
  }

  /**
   * Get fallback channel if primary fails.
   *
   * @param driver - The driver receiving the dispatch
   * @param failedChannel - The channel that failed
   * @returns The fallback channel type, or null if no fallback available
   * @requirements 6.3 - When primary channel fails and fallback_enabled is true, attempt next available channel
   * @requirements 6.4 - Only attempt channels for which driver has valid configuration
   */
  getFallbackChannel(driver: Driver, failedChannel: ChannelType): ChannelType | null {
    // Check if fallback is enabled for this driver
    if (!driver.fallbackEnabled) {
      logger.debug('Fallback disabled for driver', {
        driverId: driver.id,
        failedChannel,
      });
      return null;
    }

    // Get available channels excluding the failed one
    const availableChannels = this.getAvailableChannels(driver);
    const fallbackChannels = availableChannels.filter(
      (channel) => channel !== failedChannel
    );

    if (fallbackChannels.length === 0) {
      logger.debug('No fallback channels available for driver', {
        driverId: driver.id,
        failedChannel,
        availableChannels,
      });
      return null;
    }

    // Return the first available fallback channel
    const fallbackChannel = fallbackChannels[0];
    if (fallbackChannel) {
      logger.debug('Fallback channel selected', {
        driverId: driver.id,
        failedChannel,
        fallbackChannel,
      });
      return fallbackChannel;
    }

    return null;
  }
}

// Export singleton instance with no adapters (adapters can be registered later)
export const channelRouter = new ChannelRouter();

