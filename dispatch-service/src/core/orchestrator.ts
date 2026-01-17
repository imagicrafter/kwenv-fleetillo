/**
 * Dispatch Orchestrator
 *
 * Coordinates the dispatch workflow:
 * - Fetches route, driver, vehicle, bookings data
 * - Creates dispatch records in the database
 * - Determines channels using ChannelRouter
 * - Renders messages using TemplateEngine
 * - Sends via appropriate channel adapters
 * - Updates dispatch status based on results
 *
 * @module core/orchestrator
 * @requirements 1.1 - Create dispatch record and initiate message delivery
 * @requirements 1.2 - Use specified channel override
 * @requirements 1.3 - Use driver's preferred_channel or default
 * @requirements 1.4 - Return dispatch_id and status immediately
 * @requirements 8.3 - Update dispatch status on changes
 * @requirements 8.4 - Update channel_dispatches on completion/failure
 */

import { logger } from '../utils/logger.js';
import { ChannelRouter, DispatchRequest as RouterDispatchRequest } from './router.js';
import { TemplateEngine, buildTemplateContext } from './templates.js';
import { ChannelAdapter, DispatchContext } from '../adapters/interface.js';
import {
  createDispatch,
  updateDispatchStatus,
  createChannelDispatch,
  updateChannelDispatch,
  getDispatchWithChannels,
} from '../db/dispatch.repository.js';
import {
  getRoute,
  getDriver,
  getVehicle,
  getBookingsForRoute,
  getVehicleStartLocation,
} from '../db/entities.repository.js';
import type {
  ChannelType,
  Dispatch,
  DispatchStatus,
  ChannelDispatch,
  Route,
  Driver,
  Vehicle,
  Booking,
} from '../types/index.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Dispatch request input
 */
export interface DispatchRequest {
  routeId: string;
  driverId: string;
  /** Override channels - takes highest priority */
  channels?: ChannelType[];
  /** When true, send to all available channels */
  multiChannel?: boolean;
  /** Additional metadata to store with dispatch */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a single dispatch operation
 */
export interface DispatchResult {
  dispatchId: string;
  status: DispatchStatus;
  requestedChannels: ChannelType[];
}

/**
 * Result of a channel dispatch attempt
 */
export interface ChannelDispatchResult {
  channel: ChannelType;
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * Result of a batch dispatch operation
 */
export interface BatchDispatchResult {
  results: Array<{
    index: number;
    success: boolean;
    dispatchId?: string;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Error thrown when a required entity is not found
 */
export class EntityNotFoundError extends Error {
  public readonly entityType: 'route' | 'driver';
  public readonly entityId: string;

  constructor(entityType: 'route' | 'driver', entityId: string) {
    super(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found: ${entityId}`);
    this.name = 'EntityNotFoundError';
    this.entityType = entityType;
    this.entityId = entityId;
  }
}

// =============================================================================
// Dispatch Orchestrator Interface
// =============================================================================

/**
 * Interface for the Dispatch Orchestrator
 */
export interface IDispatchOrchestrator {
  /**
   * Process a single dispatch request
   *
   * @param request - The dispatch request
   * @returns Promise resolving to dispatch result
   * @throws EntityNotFoundError if route or driver not found
   */
  dispatch(request: DispatchRequest): Promise<DispatchResult>;

  /**
   * Process multiple dispatch requests
   *
   * @param requests - Array of dispatch requests
   * @returns Promise resolving to batch dispatch result
   */
  dispatchBatch(requests: DispatchRequest[]): Promise<BatchDispatchResult>;

  /**
   * Get dispatch status by ID
   *
   * @param dispatchId - The dispatch ID
   * @returns Promise resolving to dispatch with channel dispatches, or null
   */
  getDispatch(dispatchId: string): Promise<{
    dispatch: Dispatch;
    channelDispatches: ChannelDispatch[];
  } | null>;
}

// =============================================================================
// Dispatch Orchestrator Implementation
// =============================================================================

/**
 * Dispatch Orchestrator
 *
 * Coordinates the complete dispatch workflow from request to delivery.
 */
export class DispatchOrchestrator implements IDispatchOrchestrator {
  private channelRouter: ChannelRouter;
  private templateEngine: TemplateEngine;
  private adapters: Map<ChannelType, ChannelAdapter>;

  constructor(
    channelRouter?: ChannelRouter,
    templateEngine?: TemplateEngine,
    adapters?: Map<ChannelType, ChannelAdapter>
  ) {
    this.channelRouter = channelRouter || new ChannelRouter();
    this.templateEngine = templateEngine || new TemplateEngine();
    this.adapters = adapters || new Map();

    // Register adapters with the channel router
    for (const adapter of this.adapters.values()) {
      this.channelRouter.registerAdapter(adapter);
    }
  }

  /**
   * Register a channel adapter
   *
   * @param adapter - The channel adapter to register
   */
  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.channelType, adapter);
    this.channelRouter.registerAdapter(adapter);
    logger.debug('Adapter registered', { channel: adapter.channelType });
  }

  /**
   * Process a single dispatch request
   *
   * @param request - The dispatch request
   * @returns Promise resolving to dispatch result
   * @throws EntityNotFoundError if route or driver not found
   *
   * @requirements 1.1 - Create dispatch record and initiate message delivery
   * @requirements 1.2 - Use specified channel override
   * @requirements 1.3 - Use driver's preferred_channel or default
   * @requirements 1.4 - Return dispatch_id and status immediately
   */
  async dispatch(request: DispatchRequest): Promise<DispatchResult> {
    logger.info('Processing dispatch request', {
      routeId: request.routeId,
      driverId: request.driverId,
      channels: request.channels,
      multiChannel: request.multiChannel,
    });

    // Step 1: Fetch route and driver (required entities)
    const [route, driver] = await Promise.all([
      getRoute(request.routeId),
      getDriver(request.driverId),
    ]);

    // Validate route exists
    if (!route) {
      logger.warn('Route not found', { routeId: request.routeId });
      throw new EntityNotFoundError('route', request.routeId);
    }

    // Validate driver exists
    if (!driver) {
      logger.warn('Driver not found', { driverId: request.driverId });
      throw new EntityNotFoundError('driver', request.driverId);
    }

    // Step 2: Fetch vehicle and bookings (optional/supplementary data)
    const [vehicle, bookings] = await Promise.all([
      route.vehicleId ? getVehicle(route.vehicleId) : Promise.resolve(null),
      getBookingsForRoute(request.routeId),
    ]);

    // Fetch start location if vehicle exists
    const startLocation = vehicle ? await getVehicleStartLocation(vehicle.id) : null;

    // Step 3: Determine channels to use
    const routerRequest: RouterDispatchRequest = {
      routeId: request.routeId,
      driverId: request.driverId,
      channels: request.channels,
      multiChannel: request.multiChannel,
      metadata: request.metadata,
    };

    const channels = this.channelRouter.resolveChannels(routerRequest, driver);

    if (channels.length === 0) {
      logger.warn('No channels available for dispatch', {
        routeId: request.routeId,
        driverId: request.driverId,
      });
    }

    // Step 4: Create dispatch record in database
    const dispatch = await createDispatch({
      routeId: request.routeId,
      driverId: request.driverId,
      requestedChannels: channels,
      metadata: request.metadata,
    });

    logger.info('Dispatch record created', {
      dispatchId: dispatch.id,
      routeId: dispatch.routeId,
      driverId: dispatch.driverId,
      channels,
    });

    // Step 5: Process channels asynchronously (don't await)
    // This ensures we return immediately per requirement 1.4
    this.processChannelsAsync(dispatch, driver, route, vehicle, bookings, channels, startLocation).catch(
      (error) => {
        logger.error(
          'Async channel processing failed',
          { dispatchId: dispatch.id },
          error instanceof Error ? error : new Error(String(error))
        );
      }
    );

    // Return immediately with dispatch info
    return {
      dispatchId: dispatch.id,
      status: dispatch.status,
      requestedChannels: channels,
    };
  }

  /**
   * Process channels asynchronously after dispatch record is created
   *
   * @param dispatch - The dispatch record
   * @param driver - The driver
   * @param route - The route
   * @param vehicle - The vehicle (may be null)
   * @param bookings - The bookings
   * @param channels - The channels to send to
   */
  private async processChannelsAsync(
    dispatch: Dispatch,
    driver: Driver,
    route: Route,
    vehicle: Vehicle | null,
    bookings: Booking[],
    channels: ChannelType[],
    startLocation?: { latitude: number; longitude: number } | null
  ): Promise<void> {
    if (channels.length === 0) {
      // No channels to process, mark as failed
      await updateDispatchStatus(dispatch.id, 'failed');
      return;
    }

    // Update dispatch status to sending
    await updateDispatchStatus(dispatch.id, 'sending');

    // Process all channels
    const results = await this.sendToChannels(dispatch, driver, route, vehicle, bookings, channels, startLocation);

    // Determine final dispatch status based on results
    const finalStatus = this.determineDispatchStatus(results);

    // Update dispatch status
    await updateDispatchStatus(dispatch.id, finalStatus);

    logger.info('Dispatch processing complete', {
      dispatchId: dispatch.id,
      finalStatus,
      channelResults: results.map((r) => ({
        channel: r.channel,
        success: r.success,
      })),
    });
  }

  /**
   * Send dispatch to all specified channels
   *
   * @param dispatch - The dispatch record
   * @param driver - The driver
   * @param route - The route
   * @param vehicle - The vehicle (may be null)
   * @param bookings - The bookings
   * @param channels - The channels to send to
   * @returns Array of channel dispatch results
   */
  private async sendToChannels(
    dispatch: Dispatch,
    driver: Driver,
    route: Route,
    vehicle: Vehicle | null,
    bookings: Booking[],
    channels: ChannelType[],
    startLocation?: { latitude: number; longitude: number } | null
  ): Promise<ChannelDispatchResult[]> {
    const results: ChannelDispatchResult[] = [];

    // Process channels concurrently
    const channelPromises = channels.map(async (channel) => {
      const result = await this.sendToChannel(dispatch, driver, route, vehicle, bookings, channel, startLocation);
      results.push(result);
      return result;
    });

    await Promise.all(channelPromises);

    // Check for fallback if primary channel failed
    const failedChannels = results.filter((r) => !r.success);
    if (failedChannels.length > 0 && driver.fallbackEnabled) {
      for (const failed of failedChannels) {
        const fallbackChannel = this.channelRouter.getFallbackChannel(driver, failed.channel);
        if (fallbackChannel && !channels.includes(fallbackChannel)) {
          logger.info('Attempting fallback channel', {
            dispatchId: dispatch.id,
            failedChannel: failed.channel,
            fallbackChannel,
          });

          const fallbackResult = await this.sendToChannel(
            dispatch,
            driver,
            route,
            vehicle,
            bookings,
            fallbackChannel,
            startLocation
          );
          results.push(fallbackResult);
        }
      }
    }

    return results;
  }

  /**
   * Send dispatch to a single channel
   *
   * @param dispatch - The dispatch record
   * @param driver - The driver
   * @param route - The route
   * @param vehicle - The vehicle (may be null)
   * @param bookings - The bookings
   * @param channel - The channel to send to
   * @returns Channel dispatch result
   *
   * @requirements 8.4 - Update channel_dispatches on completion/failure
   */
  private async sendToChannel(
    dispatch: Dispatch,
    driver: Driver,
    route: Route,
    vehicle: Vehicle | null,
    bookings: Booking[],
    channel: ChannelType,
    startLocation?: { latitude: number; longitude: number } | null
  ): Promise<ChannelDispatchResult> {
    // Create channel dispatch record
    const channelDispatch = await createChannelDispatch({
      dispatchId: dispatch.id,
      channel,
      status: 'sending',
    });

    logger.debug('Channel dispatch created', {
      channelDispatchId: channelDispatch.id,
      dispatchId: dispatch.id,
      channel,
    });

    // Get adapter for this channel
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      logger.error('No adapter registered for channel', {
        dispatchId: dispatch.id,
        channel,
      });

      await updateChannelDispatch(channelDispatch.id, {
        status: 'failed',
        errorMessage: `No adapter registered for channel: ${channel}`,
      });

      return {
        channel,
        success: false,
        error: `No adapter registered for channel: ${channel}`,
      };
    }

    // Check if adapter can send to this driver
    if (!adapter.canSend(driver)) {
      logger.warn('Adapter cannot send to driver', {
        dispatchId: dispatch.id,
        channel,
        driverId: driver.id,
      });

      await updateChannelDispatch(channelDispatch.id, {
        status: 'failed',
        errorMessage: `Driver does not have ${channel} configured`,
      });

      return {
        channel,
        success: false,
        error: `Driver does not have ${channel} configured`,
      };
    }

    // Render template for this channel
    let template: string;
    try {
      const templateContext = buildTemplateContext(route, driver, vehicle, bookings, startLocation);
      template = this.templateEngine.renderForChannel(channel, templateContext);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Template rendering failed';
      logger.error(
        'Template rendering failed',
        { dispatchId: dispatch.id, channel },
        error instanceof Error ? error : new Error(errorMessage)
      );

      await updateChannelDispatch(channelDispatch.id, {
        status: 'failed',
        errorMessage,
      });

      return {
        channel,
        success: false,
        error: errorMessage,
      };
    }

    // Build dispatch context for adapter
    const context: DispatchContext = {
      dispatch,
      driver,
      route,
      vehicle,
      bookings,
      template,
    };

    // Send via adapter with error handling
    // @requirements 12.3 - Wrap adapter calls in try-catch, record failures without crashing
    try {
      const result = await adapter.send(context);

      if (result.success) {
        await updateChannelDispatch(channelDispatch.id, {
          status: 'delivered',
          providerMessageId: result.providerMessageId,
          sentAt: result.sentAt,
          deliveredAt: new Date(),
        });

        logger.info('Channel dispatch delivered', {
          channelDispatchId: channelDispatch.id,
          dispatchId: dispatch.id,
          channel,
          providerMessageId: result.providerMessageId,
        });

        return {
          channel,
          success: true,
          providerMessageId: result.providerMessageId,
        };
      } else {
        await updateChannelDispatch(channelDispatch.id, {
          status: 'failed',
          errorMessage: result.error,
          sentAt: result.sentAt,
        });

        logger.warn('Channel dispatch failed', {
          channelDispatchId: channelDispatch.id,
          dispatchId: dispatch.id,
          channel,
          error: result.error,
        });

        return {
          channel,
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      // Catch any unexpected errors from adapter
      // @requirements 12.3 - Record failure without crashing
      const errorMessage = error instanceof Error ? error.message : 'Unknown adapter error';

      logger.error(
        'Adapter threw exception',
        { dispatchId: dispatch.id, channel },
        error instanceof Error ? error : new Error(errorMessage)
      );

      await updateChannelDispatch(channelDispatch.id, {
        status: 'failed',
        errorMessage,
      });

      return {
        channel,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Determine the overall dispatch status based on channel results
   *
   * @param results - Array of channel dispatch results
   * @returns The appropriate dispatch status
   */
  private determineDispatchStatus(results: ChannelDispatchResult[]): DispatchStatus {
    if (results.length === 0) {
      return 'failed';
    }

    const delivered = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const total = results.length;

    if (delivered === total) {
      return 'delivered';
    }
    if (delivered > 0) {
      return 'partial';
    }
    if (failed === total) {
      return 'failed';
    }

    // Should not reach here, but default to sending if still in progress
    return 'sending';
  }

  /**
   * Process multiple dispatch requests
   *
   * @param requests - Array of dispatch requests
   * @returns Promise resolving to batch dispatch result
   */
  async dispatchBatch(requests: DispatchRequest[]): Promise<BatchDispatchResult> {
    logger.info('Processing batch dispatch', { count: requests.length });

    const results: BatchDispatchResult['results'] = [];

    // Process all requests concurrently using Promise.allSettled
    const promises = requests.map(async (request, index) => {
      try {
        const result = await this.dispatch(request);
        return {
          index,
          success: true,
          dispatchId: result.dispatchId,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Batch item failed', {
          index,
          routeId: request.routeId,
          driverId: request.driverId,
          error: errorMessage,
        });
        return {
          index,
          success: false,
          error: errorMessage,
        };
      }
    });

    const settledResults = await Promise.allSettled(promises);

    for (const settled of settledResults) {
      if (settled.status === 'fulfilled') {
        results.push(settled.value);
      } else {
        // This shouldn't happen since we catch errors above, but handle it
        results.push({
          index: results.length,
          success: false,
          error: settled.reason?.message || 'Unknown error',
        });
      }
    }

    // Sort results by index to maintain order
    results.sort((a, b) => a.index - b.index);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info('Batch dispatch complete', {
      total: requests.length,
      successful,
      failed,
    });

    return {
      results,
      summary: {
        total: requests.length,
        successful,
        failed,
      },
    };
  }

  /**
   * Get dispatch status by ID
   *
   * @param dispatchId - The dispatch ID
   * @returns Promise resolving to dispatch with channel dispatches, or null
   */
  async getDispatch(
    dispatchId: string
  ): Promise<{ dispatch: Dispatch; channelDispatches: ChannelDispatch[] } | null> {
    return getDispatchWithChannels(dispatchId);
  }
}

// Export a factory function to create orchestrator with adapters
export function createDispatchOrchestrator(
  adapters: ChannelAdapter[],
  channelRouter?: ChannelRouter,
  templateEngine?: TemplateEngine
): DispatchOrchestrator {
  const adapterMap = new Map<ChannelType, ChannelAdapter>();
  for (const adapter of adapters) {
    adapterMap.set(adapter.channelType, adapter);
  }

  return new DispatchOrchestrator(channelRouter, templateEngine, adapterMap);
}
