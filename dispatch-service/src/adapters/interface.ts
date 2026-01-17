/**
 * Channel Adapter Interface
 *
 * Defines the common interface that all channel adapters must implement.
 * This enables a pluggable architecture for different communication channels
 * (Telegram, Email, SMS, Push notifications).
 */

import {
  ChannelType,
  Dispatch,
  Driver,
  Route,
  Vehicle,
  Booking,
} from '../types/index.js';

/**
 * Context provided to channel adapters when sending a dispatch message.
 * Contains all the data needed to render and send the message.
 */
export interface DispatchContext {
  /** The dispatch record being processed */
  dispatch: Dispatch;
  /** The driver receiving the dispatch */
  driver: Driver;
  /** The route being dispatched */
  route: Route;
  /** The vehicle assigned to the route (may be null if unassigned) */
  vehicle: Vehicle | null;
  /** The bookings/stops included in the route */
  bookings: Booking[];
  /** The rendered message template content */
  template: string;
}

/**
 * Result returned by a channel adapter after attempting to send a message.
 */
export interface ChannelResult {
  /** Whether the message was sent successfully */
  success: boolean;
  /** The channel type that was used */
  channelType: ChannelType;
  /** Provider-specific message ID (e.g., Telegram message_id, SendGrid message ID) */
  providerMessageId?: string;
  /** Error message if the send failed */
  error?: string;
  /** Timestamp when the message was sent */
  sentAt: Date;
}

/**
 * Health status returned by a channel adapter's health check.
 */
export interface HealthStatus {
  /** Whether the adapter is healthy and can send messages */
  healthy: boolean;
  /** Optional message providing additional health details */
  message?: string;
}

/**
 * Common interface that all channel adapters must implement.
 * Provides a consistent API for sending messages through different channels.
 */
export interface ChannelAdapter {
  /** The type of channel this adapter handles */
  readonly channelType: ChannelType;

  /**
   * Check if this adapter can send to the given driver.
   * Returns true if the driver has the required configuration for this channel.
   *
   * @param driver - The driver to check
   * @returns true if the driver has valid configuration for this channel
   */
  canSend(driver: Driver): boolean;

  /**
   * Send a dispatch message to the driver through this channel.
   *
   * @param context - The dispatch context containing all message data
   * @returns A promise resolving to the channel result
   */
  send(context: DispatchContext): Promise<ChannelResult>;

  /**
   * Check the health/connectivity of this channel adapter.
   *
   * @returns A promise resolving to the health status
   */
  healthCheck(): Promise<HealthStatus>;
}

// Re-export ChannelType for convenience when importing from this module
export { ChannelType } from '../types/index.js';
