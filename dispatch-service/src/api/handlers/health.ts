/**
 * Health Check API Handler
 *
 * Handles GET /api/v1/health endpoint for monitoring service health.
 * Checks database connectivity and channel adapter availability.
 *
 * @module api/handlers/health
 * @requirements 10.1 - Return service health status on GET /api/v1/health
 * @requirements 10.2 - Include status, database connectivity, and channel adapter availability
 * @requirements 10.3 - Return status 'healthy' with HTTP 200 when all dependencies available
 * @requirements 10.4 - Return status 'unhealthy' with HTTP 503 when critical dependency unavailable
 */

import { Request, Response } from 'express';
import { logger } from '../../utils/logger.js';
import { verifyConnection } from '../../db/supabase.js';
import { ChannelAdapter, HealthStatus } from '../../adapters/interface.js';
import { isTelegramConfigured } from '../../adapters/telegram.js';
import { isEmailConfigured } from '../../adapters/email.js';

/**
 * Component health status
 */
type ComponentStatus = 'healthy' | 'unhealthy' | 'degraded';

/**
 * Individual component health check result
 */
interface ComponentHealth {
  status: ComponentStatus;
  error?: string;
}

/**
 * Health check response structure matching design.md specification
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  components: {
    database: ComponentHealth;
    telegram: ComponentHealth;
    email: ComponentHealth;
  };
}

/**
 * Registered channel adapters for health checking
 */
interface HealthCheckDependencies {
  adapters: ChannelAdapter[];
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<ComponentHealth> {
  try {
    const result = await verifyConnection();
    
    if (result.connected) {
      return { status: 'healthy' };
    } else {
      return {
        status: 'unhealthy',
        error: result.error || 'Database connection failed',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    return {
      status: 'unhealthy',
      error: errorMessage,
    };
  }
}

/**
 * Check adapter health and convert to component health
 */
async function checkAdapterHealth(adapter: ChannelAdapter): Promise<ComponentHealth> {
  try {
    const healthStatus: HealthStatus = await adapter.healthCheck();
    
    if (healthStatus.healthy) {
      return { status: 'healthy' };
    } else {
      // Check if it's a configuration issue (degraded) vs actual failure (unhealthy)
      const message = healthStatus.message || '';
      const isConfigIssue = message.toLowerCase().includes('not configured');
      
      return {
        status: isConfigIssue ? 'degraded' : 'unhealthy',
        error: healthStatus.message,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown adapter error';
    return {
      status: 'unhealthy',
      error: errorMessage,
    };
  }
}

/**
 * Check if an adapter is configured (without making API calls)
 */
function getAdapterConfigStatus(channelType: string): ComponentHealth {
  if (channelType === 'telegram') {
    if (!isTelegramConfigured()) {
      return { status: 'degraded', error: 'Telegram bot token is not configured' };
    }
  } else if (channelType === 'email') {
    if (!isEmailConfigured()) {
      return { status: 'degraded', error: 'Email provider is not configured' };
    }
  }
  return { status: 'healthy' };
}

/**
 * Determine overall health status based on component statuses
 * 
 * Rules:
 * - If any component is 'unhealthy', overall status is 'unhealthy'
 * - If any component is 'degraded' but none are 'unhealthy', overall status is 'degraded'
 * - If all components are 'healthy', overall status is 'healthy'
 * 
 * Note: Database is a critical dependency - if unhealthy, overall is unhealthy
 */
function determineOverallStatus(
  databaseHealth: ComponentHealth,
  telegramHealth: ComponentHealth,
  emailHealth: ComponentHealth
): 'healthy' | 'degraded' | 'unhealthy' {
  // Database is critical - if unhealthy, overall is unhealthy
  if (databaseHealth.status === 'unhealthy') {
    return 'unhealthy';
  }

  // Check if any adapter is unhealthy
  if (telegramHealth.status === 'unhealthy' || emailHealth.status === 'unhealthy') {
    return 'unhealthy';
  }

  // Check if any component is degraded
  if (
    databaseHealth.status === 'degraded' ||
    telegramHealth.status === 'degraded' ||
    emailHealth.status === 'degraded'
  ) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Create the health check handler with optional adapter dependencies
 *
 * @param dependencies - Optional dependencies for health checking (adapters)
 * @returns Express request handler
 */
export function createHealthHandler(dependencies?: HealthCheckDependencies) {
  /**
   * GET /api/v1/health
   *
   * Returns service health status including database and channel adapter availability.
   *
   * @requirements 10.1 - Return service health status
   * @requirements 10.2 - Include status, database connectivity, and channel adapter availability
   * @requirements 10.3 - Return HTTP 200 when all dependencies available
   * @requirements 10.4 - Return HTTP 503 when critical dependency unavailable
   */
  return async function healthHandler(req: Request, res: Response): Promise<void> {
    const correlationId = req.correlationId;

    logger.debug('Processing health check request', { correlationId });

    // Check database health
    const databaseHealth = await checkDatabaseHealth();

    // Check adapter health
    let telegramHealth: ComponentHealth;
    let emailHealth: ComponentHealth;

    if (dependencies?.adapters && dependencies.adapters.length > 0) {
      // Use provided adapters for health check
      const telegramAdapter = dependencies.adapters.find(a => a.channelType === 'telegram');
      const emailAdapter = dependencies.adapters.find(a => a.channelType === 'email');

      telegramHealth = telegramAdapter
        ? await checkAdapterHealth(telegramAdapter)
        : getAdapterConfigStatus('telegram');

      emailHealth = emailAdapter
        ? await checkAdapterHealth(emailAdapter)
        : getAdapterConfigStatus('email');
    } else {
      // No adapters provided - just check configuration status
      telegramHealth = getAdapterConfigStatus('telegram');
      emailHealth = getAdapterConfigStatus('email');
    }

    // Determine overall status
    const overallStatus = determineOverallStatus(databaseHealth, telegramHealth, emailHealth);

    // Build response
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      components: {
        database: databaseHealth,
        telegram: telegramHealth,
        email: emailHealth,
      },
    };

    // Log health check result
    logger.info('Health check completed', {
      correlationId,
      status: overallStatus,
      database: databaseHealth.status,
      telegram: telegramHealth.status,
      email: emailHealth.status,
    });

    // Return appropriate HTTP status code
    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

    res.status(httpStatus).json(response);
  };
}

/**
 * Export types for testing
 */
export type { HealthCheckResponse, ComponentHealth, ComponentStatus, HealthCheckDependencies };
