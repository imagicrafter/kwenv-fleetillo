/**
 * Dispatch API Handler
 *
 * Handles POST /api/v1/dispatch endpoint for creating single dispatch requests.
 * Handles POST /api/v1/dispatch/batch endpoint for creating batch dispatch requests.
 *
 * @module api/handlers/dispatch
 * @requirements 1.1 - Create dispatch record and initiate message delivery
 * @requirements 1.4 - Return dispatch_id and status immediately
 * @requirements 1.5 - Return 404 error if route_id or driver_id does not exist
 * @requirements 1.6 - Return 400 error for malformed or missing required fields
 * @requirements 2.1 - Process batch dispatch items and return results
 * @requirements 2.4 - Return array of results with dispatch_id and status
 * @requirements 2.5 - Return 400 error if batch array is empty
 * @requirements 2.6 - Limit batch size to maximum of 100 items
 */

import { Request, Response } from 'express';
import { logger } from '../../utils/logger.js';
import {
  DispatchOrchestrator,
  EntityNotFoundError,
  DispatchRequest,
} from '../../core/orchestrator.js';
import type { ApiError, SingleDispatchBody, BatchDispatchBody, DispatchDetailResponse } from '../../types/index.js';
import { ListDispatchesFilters } from '../../db/dispatch.repository.js';
import type { ListDispatchesQuery } from '../../validation/schemas.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum number of items allowed in a batch dispatch request
 */
const MAX_BATCH_SIZE = 100;

/**
 * Convert snake_case request body to camelCase DispatchRequest
 */
function toDispatchRequest(body: SingleDispatchBody): DispatchRequest {
  return {
    routeId: body.route_id,
    driverId: body.driver_id,
    channels: body.channels,
    multiChannel: body.multi_channel,
    metadata: body.metadata,
  };
}

// =============================================================================
// Handler Factory
// =============================================================================

/**
 * Create the dispatch handler with the given orchestrator
 *
 * @param orchestrator - The dispatch orchestrator instance
 * @returns Express request handler
 */
export function createDispatchHandler(orchestrator: DispatchOrchestrator) {
  /**
   * POST /api/v1/dispatch
   *
   * Create a new dispatch request to send route assignment to a driver.
   * Note: Request body is validated by Zod middleware before this handler.
   *
   * @requirements 1.1 - Create dispatch record and initiate message delivery
   * @requirements 1.4 - Return dispatch_id and status immediately
   * @requirements 1.5 - Return 404 error if route_id or driver_id does not exist
   * @requirements 1.6 - Return 400 error for malformed or missing required fields
   */
  return async function dispatchHandler(req: Request, res: Response): Promise<void> {
    const correlationId = req.correlationId;

    logger.debug('Processing dispatch request', {
      correlationId,
      body: req.body,
    });

    // Convert to internal request format (body already validated by Zod middleware)
    const dispatchRequest = toDispatchRequest(req.body as SingleDispatchBody);

    try {
      // Call orchestrator to create dispatch
      const result = await orchestrator.dispatch(dispatchRequest);

      logger.info('Dispatch created successfully', {
        correlationId,
        dispatchId: result.dispatchId,
        status: result.status,
        requestedChannels: result.requestedChannels,
      });

      // Return 202 Accepted with dispatch info (snake_case)
      res.status(202).json({
        dispatch_id: result.dispatchId,
        status: result.status,
        requested_channels: result.requestedChannels,
      });
    } catch (error) {
      // Handle EntityNotFoundError (404)
      if (error instanceof EntityNotFoundError) {
        logger.warn('Entity not found for dispatch', {
          correlationId,
          entityType: error.entityType,
          entityId: error.entityId,
        });

        const apiError: ApiError = {
          error: {
            code: 'NOT_FOUND',
            message: error.message,
            details: {
              entityType: error.entityType,
              entityId: error.entityId,
            },
          },
          requestId: correlationId,
        };

        res.status(404).json(apiError);
        return;
      }

      // Re-throw unexpected errors to be handled by global error handler
      throw error;
    }
  };
}

// =============================================================================
// Get Dispatch Handler Factory
// =============================================================================

/**
 * Create the get dispatch handler with the given orchestrator
 *
 * @param orchestrator - The dispatch orchestrator instance
 * @returns Express request handler
 */
export function createGetDispatchHandler(orchestrator: DispatchOrchestrator) {
  /**
   * GET /api/v1/dispatch/:id
   *
   * Retrieve a dispatch by ID with its channel dispatch details.
   * Note: Params validated by Zod middleware before this handler.
   *
   * @requirements 3.1 - Return dispatch record with current status and channel delivery details
   * @requirements 3.2 - Include status for each channel_dispatch in the response
   * @requirements 3.3 - Return 404 error if dispatch_id does not exist
   */
  return async function getDispatchHandler(req: Request, res: Response): Promise<void> {
    const correlationId = req.correlationId;
    const dispatchId = req.params.id as string;

    logger.debug('Processing get dispatch request', {
      correlationId,
      dispatchId,
    });

    try {
      // Fetch dispatch with channel dispatches
      const result = await orchestrator.getDispatch(dispatchId);

      // Step 3: Return 404 if not found
      if (!result) {
        logger.warn('Dispatch not found', {
          correlationId,
          dispatchId,
        });

        const error: ApiError = {
          error: {
            code: 'NOT_FOUND',
            message: `Dispatch not found: ${dispatchId}`,
            details: {
              dispatchId,
            },
          },
          requestId: correlationId,
        };

        res.status(404).json(error);
        return;
      }

      const { dispatch, channelDispatches } = result;

      logger.info('Dispatch retrieved successfully', {
        correlationId,
        dispatchId: dispatch.id,
        status: dispatch.status,
        channelCount: channelDispatches.length,
      });

      // Step 4: Return full dispatch details with snake_case fields
      const response: DispatchDetailResponse = {
        id: dispatch.id,
        route_id: dispatch.routeId,
        driver_id: dispatch.driverId,
        status: dispatch.status,
        requested_channels: dispatch.requestedChannels,
        channel_dispatches: channelDispatches.map((cd) => ({
          channel: cd.channel,
          status: cd.status,
          provider_message_id: cd.providerMessageId,
          error_message: cd.errorMessage,
          sent_at: cd.sentAt?.toISOString(),
          delivered_at: cd.deliveredAt?.toISOString(),
        })),
        created_at: dispatch.createdAt.toISOString(),
        updated_at: dispatch.updatedAt.toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      // Re-throw unexpected errors to be handled by global error handler
      throw error;
    }
  };
}

// =============================================================================
// Exports
// =============================================================================

export { MAX_BATCH_SIZE };

// =============================================================================
// Batch Handler Factory
// =============================================================================

/**
 * Create the batch dispatch handler with the given orchestrator
 *
 * @param orchestrator - The dispatch orchestrator instance
 * @returns Express request handler
 */
export function createBatchDispatchHandler(orchestrator: DispatchOrchestrator) {
  /**
   * POST /api/v1/dispatch/batch
   *
   * Create multiple dispatch requests to send route assignments to drivers.
   * Note: Request body is validated by Zod middleware before this handler.
   *
   * @requirements 2.1 - Process batch dispatch items and return results
   * @requirements 2.4 - Return array of results with dispatch_id and status
   * @requirements 2.5 - Return 400 error if batch array is empty
   * @requirements 2.6 - Limit batch size to maximum of 100 items
   */
  return async function batchDispatchHandler(req: Request, res: Response): Promise<void> {
    const correlationId = req.correlationId;

    logger.debug('Processing batch dispatch request', {
      correlationId,
      itemCount: Array.isArray(req.body?.dispatches) ? req.body.dispatches.length : 0,
    });

    // Convert to internal request format (body already validated by Zod middleware)
    const batchBody = req.body as BatchDispatchBody;
    const dispatchRequests = batchBody.dispatches.map((item) => toDispatchRequest(item));

    try {
      // Call orchestrator to process batch
      const result = await orchestrator.dispatchBatch(dispatchRequests);

      logger.info('Batch dispatch processed', {
        correlationId,
        total: result.summary.total,
        successful: result.summary.successful,
        failed: result.summary.failed,
      });

      // Return 202 Accepted with results (snake_case)
      res.status(202).json({
        results: result.results.map((r) => ({
          index: r.index,
          success: r.success,
          dispatch_id: r.dispatchId,
          error: r.error,
        })),
        summary: result.summary,
      });
    } catch (error) {
      // Re-throw unexpected errors to be handled by global error handler
      throw error;
    }
  };
}

/**
 * Create the list dispatches handler with the given orchestrator
 *
 * @param orchestrator - The dispatch orchestrator instance
 * @returns Express request handler
 */
export function createListDispatchesHandler(orchestrator: DispatchOrchestrator) {
  /**
   * GET /api/v1/dispatch
   *
   * Retrieve a list of dispatches with optional filters.
   * Note: Query params validated by Zod middleware before this handler.
   */
  return async function listDispatchesHandler(req: Request, res: Response): Promise<void> {
    const correlationId = req.correlationId;

    // Use validated query from middleware (with type coercion applied)
    const validatedQuery = (req as Request & { validatedQuery: ListDispatchesQuery }).validatedQuery;
    const { status, driver_id: driverId, route_id: routeId, limit, offset } = validatedQuery;

    logger.debug('Processing list dispatches request', {
      correlationId,
      filters: { status, driverId, routeId, limit, offset },
    });

    const filters: ListDispatchesFilters = {
      status,
      driverId,
      routeId,
      limit,
      offset,
    };

    try {
      const result = await orchestrator.listDispatches(filters);

      res.status(200).json({
        dispatches: result.dispatches.map((d) => ({
          id: d.id,
          route_id: d.routeId,
          driver_id: d.driverId,
          status: d.status,
          requested_channels: d.requestedChannels,
          created_at: d.createdAt.toISOString(),
          updated_at: d.updatedAt.toISOString(),
          driver_name: d.driverName,
          route_name: d.routeName,
        })),
        total: result.total,
        limit,
        offset,
      });
    } catch (error) {
      throw error;
    }
  };
}

/**
 * Create the get dispatch stats handler with the given orchestrator
 *
 * @param orchestrator - The dispatch orchestrator instance
 * @returns Express request handler
 */
export function createGetDispatchStatsHandler(orchestrator: DispatchOrchestrator) {
  /**
   * GET /api/v1/dispatch/stats
   *
   * Retrieve dispatch statistics.
   */
  return async function getDispatchStatsHandler(req: Request, res: Response): Promise<void> {
    const correlationId = req.correlationId;

    logger.debug('Processing get dispatch stats request', {
      correlationId,
    });

    try {
      const stats = await orchestrator.getStats();

      res.status(200).json({
        total: stats.total,
        stats: {
          active: stats.active,
          success: stats.success,
          failed: stats.failed,
          pending: stats.pending,
        },
      });
    } catch (error) {
      throw error;
    }
  };
}
