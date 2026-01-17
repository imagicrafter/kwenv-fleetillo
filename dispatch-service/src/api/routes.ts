/**
 * API Routes Configuration
 *
 * Configures all API routes for the dispatch service.
 * - Health endpoint is public (no authentication required)
 * - Dispatch endpoints require API key authentication
 *
 * @module api/routes
 * @requirements 9.1 - Return 401 Unauthorized for missing API key
 * @requirements 9.2 - Return 401 Unauthorized for invalid API key
 * @requirements 9.3 - Process requests with valid API key in X-API-Key header
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createHealthHandler, HealthCheckDependencies } from './handlers/health.js';
import {
  createDispatchHandler,
  createBatchDispatchHandler,
  createGetDispatchHandler,
} from './handlers/dispatch.js';
import {
  createTelegramWebhookHandler,
  createRegistrationLinkHandler,
  createSendRegistrationEmailHandler,
} from './handlers/telegram.js';
import { DispatchOrchestrator } from '../core/orchestrator.js';

/**
 * Dependencies required to create the API router
 */
export interface RouterDependencies {
  /** The dispatch orchestrator instance */
  orchestrator: DispatchOrchestrator;
  /** Optional health check dependencies (adapters) */
  healthDependencies?: HealthCheckDependencies;
}

/**
 * Create the API router with all routes configured
 *
 * @param dependencies - The dependencies required for route handlers
 * @returns Configured Express router
 */
export function createApiRouter(dependencies: RouterDependencies): Router {
  const router = Router();
  const { orchestrator, healthDependencies } = dependencies;

  // =============================================================================
  // Public Routes (no authentication required)
  // =============================================================================

  /**
   * GET /api/v1/health
   *
   * Health check endpoint - public, no authentication required.
   * Returns service health status including database and channel adapter availability.
   *
   * @requirements 10.1 - Return service health status
   * @requirements 10.2 - Include status, database connectivity, and channel adapter availability
   */
  const healthHandler = createHealthHandler(healthDependencies);
  router.get('/health', healthHandler);

  // =============================================================================
  // Protected Routes (require API key authentication)
  // =============================================================================

  /**
   * POST /api/v1/dispatch
   *
   * Create a new dispatch request to send route assignment to a driver.
   * Requires valid API key in X-API-Key header.
   *
   * @requirements 1.1 - Create dispatch record and initiate message delivery
   * @requirements 9.1, 9.2, 9.3 - API key authentication
   */
  const dispatchHandler = createDispatchHandler(orchestrator);
  router.post('/dispatch', authMiddleware, dispatchHandler);

  /**
   * POST /api/v1/dispatch/batch
   *
   * Create multiple dispatch requests to send route assignments to drivers.
   * Requires valid API key in X-API-Key header.
   *
   * @requirements 2.1 - Process batch dispatch items and return results
   * @requirements 9.1, 9.2, 9.3 - API key authentication
   */
  const batchDispatchHandler = createBatchDispatchHandler(orchestrator);
  router.post('/dispatch/batch', authMiddleware, batchDispatchHandler);

  /**
   * GET /api/v1/dispatch/:id
   *
   * Retrieve a dispatch by ID with its channel dispatch details.
   * Requires valid API key in X-API-Key header.
   *
   * @requirements 3.1 - Return dispatch record with current status
   * @requirements 9.1, 9.2, 9.3 - API key authentication
   */
  const getDispatchHandler = createGetDispatchHandler(orchestrator);
  router.get('/dispatch/:id', authMiddleware, getDispatchHandler);

  // =============================================================================
  // Telegram Integration Routes
  // =============================================================================

  /**
   * POST /api/v1/telegram/webhook
   *
   * Telegram webhook endpoint to receive incoming messages.
   * Handles /start commands for driver registration.
   * Public endpoint (no authentication required - Telegram sends updates here).
   */
  const telegramWebhookHandler = createTelegramWebhookHandler();
  router.post('/telegram/webhook', telegramWebhookHandler);

  /**
   * GET /api/v1/telegram/registration/:driverId
   *
   * Generate a Telegram registration link and QR code for a driver.
   * Requires valid API key in X-API-Key header.
   */
  const registrationLinkHandler = createRegistrationLinkHandler();
  router.get('/telegram/registration/:driverId', authMiddleware, registrationLinkHandler);

  /**
   * POST /api/v1/telegram/send-registration
   *
   * Send a registration email to a driver with their Telegram registration link and QR code.
   * Requires valid API key in X-API-Key header.
   *
   * Request body:
   * - driverId: string (required) - The driver's ID
   * - customMessage: string (optional) - Custom message to include in the email
   */
  const sendRegistrationEmailHandler = createSendRegistrationEmailHandler();
  router.post('/telegram/send-registration', authMiddleware, sendRegistrationEmailHandler);

  return router;
}

/**
 * Export the router factory function as default
 */
export default createApiRouter;
