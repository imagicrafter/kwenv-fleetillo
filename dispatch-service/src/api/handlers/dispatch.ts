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
import type { ApiError, ChannelType, SingleDispatchBody, BatchDispatchBody, DispatchDetailResponse } from '../../types/index.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum number of items allowed in a batch dispatch request
 */
const MAX_BATCH_SIZE = 100;

// =============================================================================
// Validation
// =============================================================================

/**
 * Validation error details
 */
interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a UUID format
 */
function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate channel type
 */
function isValidChannelType(value: unknown): value is ChannelType {
  return typeof value === 'string' && ['telegram', 'email', 'sms', 'push'].includes(value);
}

/**
 * Validate the dispatch request body
 *
 * @param body - The request body to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateDispatchRequest(body: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if body is an object
  if (!body || typeof body !== 'object') {
    errors.push({
      field: 'body',
      message: 'Request body must be a JSON object',
    });
    return errors;
  }

  const data = body as Record<string, unknown>;

  // Validate route_id (required)
  if (!data.route_id) {
    errors.push({
      field: 'route_id',
      message: 'route_id is required',
    });
  } else if (typeof data.route_id !== 'string') {
    errors.push({
      field: 'route_id',
      message: 'route_id must be a string',
    });
  } else if (!isValidUUID(data.route_id)) {
    errors.push({
      field: 'route_id',
      message: 'route_id must be a valid UUID',
    });
  }

  // Validate driver_id (required)
  if (!data.driver_id) {
    errors.push({
      field: 'driver_id',
      message: 'driver_id is required',
    });
  } else if (typeof data.driver_id !== 'string') {
    errors.push({
      field: 'driver_id',
      message: 'driver_id must be a string',
    });
  } else if (!isValidUUID(data.driver_id)) {
    errors.push({
      field: 'driver_id',
      message: 'driver_id must be a valid UUID',
    });
  }

  // Validate channels (optional)
  if (data.channels !== undefined) {
    if (!Array.isArray(data.channels)) {
      errors.push({
        field: 'channels',
        message: 'channels must be an array',
      });
    } else {
      for (let i = 0; i < data.channels.length; i++) {
        if (!isValidChannelType(data.channels[i])) {
          errors.push({
            field: `channels[${i}]`,
            message: `Invalid channel type: ${data.channels[i]}. Must be one of: telegram, email, sms, push`,
          });
        }
      }
    }
  }

  // Validate multi_channel (optional)
  if (data.multi_channel !== undefined && typeof data.multi_channel !== 'boolean') {
    errors.push({
      field: 'multi_channel',
      message: 'multi_channel must be a boolean',
    });
  }

  // Validate metadata (optional)
  if (data.metadata !== undefined && (typeof data.metadata !== 'object' || data.metadata === null || Array.isArray(data.metadata))) {
    errors.push({
      field: 'metadata',
      message: 'metadata must be an object',
    });
  }

  return errors;
}

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

    // Step 1: Validate request body
    const validationErrors = validateDispatchRequest(req.body);

    if (validationErrors.length > 0) {
      logger.warn('Dispatch request validation failed', {
        correlationId,
        errors: validationErrors,
      });

      const firstError = validationErrors[0];
      const error: ApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError?.message ?? 'Validation failed',
          details: {
            errors: validationErrors,
          },
        },
        requestId: correlationId,
      };

      res.status(400).json(error);
      return;
    }

    // Step 2: Convert to internal request format
    const dispatchRequest = toDispatchRequest(req.body as SingleDispatchBody);

    try {
      // Step 3: Call orchestrator to create dispatch
      const result = await orchestrator.dispatch(dispatchRequest);

      logger.info('Dispatch created successfully', {
        correlationId,
        dispatchId: result.dispatchId,
        status: result.status,
        requestedChannels: result.requestedChannels,
      });

      // Step 4: Return 202 Accepted with dispatch info (snake_case)
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
 * Validate a UUID format
 */
function isValidDispatchId(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

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
   *
   * @requirements 3.1 - Return dispatch record with current status and channel delivery details
   * @requirements 3.2 - Include status for each channel_dispatch in the response
   * @requirements 3.3 - Return 404 error if dispatch_id does not exist
   */
  return async function getDispatchHandler(req: Request, res: Response): Promise<void> {
    const correlationId = req.correlationId;
    const dispatchId = req.params.id as string | undefined;

    logger.debug('Processing get dispatch request', {
      correlationId,
      dispatchId,
    });

    // Step 1: Validate dispatch_id is a valid UUID
    if (!dispatchId || !isValidDispatchId(dispatchId)) {
      logger.warn('Invalid dispatch_id format', {
        correlationId,
        dispatchId,
      });

      const error: ApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'dispatch_id must be a valid UUID',
          details: {
            field: 'id',
            value: dispatchId,
          },
        },
        requestId: correlationId,
      };

      res.status(400).json(error);
      return;
    }

    try {
      // Step 2: Fetch dispatch with channel dispatches
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

export { ValidationError, BatchValidationError, MAX_BATCH_SIZE };

// =============================================================================
// Batch Dispatch Validation
// =============================================================================

/**
 * Batch validation error details
 */
interface BatchValidationError {
  field: string;
  message: string;
  index?: number;
}

/**
 * Validate the batch dispatch request body
 *
 * @param body - The request body to validate
 * @returns Object with isValid flag and errors array
 */
export function validateBatchDispatchRequest(body: unknown): {
  isValid: boolean;
  errors: BatchValidationError[];
  itemErrors?: Map<number, ValidationError[]>;
} {
  const errors: BatchValidationError[] = [];
  const itemErrors = new Map<number, ValidationError[]>();

  // Check if body is an object
  if (!body || typeof body !== 'object') {
    errors.push({
      field: 'body',
      message: 'Request body must be a JSON object',
    });
    return { isValid: false, errors };
  }

  const data = body as Record<string, unknown>;

  // Check if dispatches array exists
  if (!data.dispatches) {
    errors.push({
      field: 'dispatches',
      message: 'dispatches array is required',
    });
    return { isValid: false, errors };
  }

  // Check if dispatches is an array
  if (!Array.isArray(data.dispatches)) {
    errors.push({
      field: 'dispatches',
      message: 'dispatches must be an array',
    });
    return { isValid: false, errors };
  }

  // Check if dispatches array is empty
  if (data.dispatches.length === 0) {
    errors.push({
      field: 'dispatches',
      message: 'dispatches array cannot be empty',
    });
    return { isValid: false, errors };
  }

  // Check batch size limit
  if (data.dispatches.length > MAX_BATCH_SIZE) {
    errors.push({
      field: 'dispatches',
      message: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} items`,
    });
    return { isValid: false, errors };
  }

  // Validate each item in the batch
  let hasItemErrors = false;
  for (let i = 0; i < data.dispatches.length; i++) {
    const itemValidationErrors = validateDispatchRequest(data.dispatches[i]);
    if (itemValidationErrors.length > 0) {
      hasItemErrors = true;
      itemErrors.set(i, itemValidationErrors);
    }
  }

  return {
    isValid: !hasItemErrors && errors.length === 0,
    errors,
    itemErrors: hasItemErrors ? itemErrors : undefined,
  };
}

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

    // Step 1: Validate request body
    const validation = validateBatchDispatchRequest(req.body);

    if (!validation.isValid) {
      // Check for top-level errors first
      if (validation.errors.length > 0) {
        const firstError = validation.errors[0];
        logger.warn('Batch dispatch request validation failed', {
          correlationId,
          errors: validation.errors,
        });

        const error: ApiError = {
          error: {
            code: 'VALIDATION_ERROR',
            message: firstError?.message ?? 'Validation failed',
            details: {
              errors: validation.errors,
            },
          },
          requestId: correlationId,
        };

        res.status(400).json(error);
        return;
      }

      // If we have item-level validation errors, we still process the batch
      // but those items will fail with validation errors in the results
    }

    // Step 2: Convert to internal request format
    const batchBody = req.body as BatchDispatchBody;
    const dispatchRequests = batchBody.dispatches.map((item) => toDispatchRequest(item));

    try {
      // Step 3: Call orchestrator to process batch
      const result = await orchestrator.dispatchBatch(dispatchRequests);

      logger.info('Batch dispatch processed', {
        correlationId,
        total: result.summary.total,
        successful: result.summary.successful,
        failed: result.summary.failed,
      });

      // Step 4: Return 202 Accepted with results (snake_case)
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
