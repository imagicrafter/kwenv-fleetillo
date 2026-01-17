/**
 * Property-Based Tests for Health Check Response Structure
 *
 * Feature: dispatch-service, Property 18: Health Check Response Structure
 *
 * **Validates: Requirements 10.1, 10.2**
 *
 * Property 18 from design.md states:
 * "For any GET request to /api/v1/health, the response SHALL include: status field
 * ('healthy', 'degraded', or 'unhealthy'), database connectivity check, and channel
 * adapter availability for each configured adapter."
 */

import * as fc from 'fast-check';
import { Request, Response } from 'express';
import {
  createHealthHandler,
  HealthCheckResponse,
} from '../../src/api/handlers/health.js';
import { ChannelAdapter, HealthStatus, ChannelResult } from '../../src/adapters/interface.js';

// Import to get the Express Request type extension for correlationId
import '../../src/middleware/correlation.js';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the database connection verification
jest.mock('../../src/db/supabase.js', () => ({
  verifyConnection: jest.fn(),
}));

// Mock the adapter configuration checks
jest.mock('../../src/adapters/telegram.js', () => ({
  isTelegramConfigured: jest.fn(),
}));

jest.mock('../../src/adapters/email.js', () => ({
  isEmailConfigured: jest.fn(),
}));

import { verifyConnection } from '../../src/db/supabase.js';
import { isTelegramConfigured } from '../../src/adapters/telegram.js';
import { isEmailConfigured } from '../../src/adapters/email.js';

const mockVerifyConnection = verifyConnection as jest.MockedFunction<typeof verifyConnection>;
const mockIsTelegramConfigured = isTelegramConfigured as jest.MockedFunction<typeof isTelegramConfigured>;
const mockIsEmailConfigured = isEmailConfigured as jest.MockedFunction<typeof isEmailConfigured>;

describe('Feature: dispatch-service, Property 18: Health Check Response Structure', () => {
  // =============================================================================
  // Arbitrary Generators
  // =============================================================================

  const arbitraryDatabaseResult = (): fc.Arbitrary<{ connected: boolean; error?: string }> =>
    fc.oneof(
      fc.constant({ connected: true }),
      fc.record({
        connected: fc.constant(false),
        error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
      })
    );

  const arbitraryAdapterConfigured = (): fc.Arbitrary<boolean> => fc.boolean();

  const arbitraryCorrelationId = (): fc.Arbitrary<string> =>
    fc.string({ minLength: 1, maxLength: 36 }).filter((s) => s.trim().length > 0);

  // =============================================================================
  // Mock Helpers
  // =============================================================================

  function createMockHealthRequest(correlationId: string): Partial<Request> {
    return {
      correlationId,
      path: '/api/v1/health',
      method: 'GET',
    };
  }

  function createMockResponse(): {
    response: Partial<Response>;
    getStatus: () => number | undefined;
    getJson: () => unknown;
  } {
    let statusCode: number | undefined;
    let jsonBody: unknown;

    const response: Partial<Response> = {
      status: jest.fn().mockImplementation((code: number) => {
        statusCode = code;
        return response;
      }),
      json: jest.fn().mockImplementation((body: unknown) => {
        jsonBody = body;
        return response;
      }),
    };

    return {
      response,
      getStatus: () => statusCode,
      getJson: () => jsonBody,
    };
  }

  function createMockAdapter(
    channelType: 'telegram' | 'email',
    healthStatus: HealthStatus
  ): ChannelAdapter {
    return {
      channelType,
      canSend: jest.fn().mockReturnValue(true),
      send: jest.fn().mockResolvedValue({
        success: true,
        channelType,
        sentAt: new Date(),
      } as ChannelResult),
      healthCheck: jest.fn().mockResolvedValue(healthStatus),
    };
  }

  // Setup default mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyConnection.mockResolvedValue({ connected: true });
    mockIsTelegramConfigured.mockReturnValue(true);
    mockIsEmailConfigured.mockReturnValue(true);
  });

  // =============================================================================
  // Property Tests - Requirement 10.1: Health endpoint returns service health status
  // =============================================================================

  describe('Requirement 10.1: Health endpoint returns service health status', () => {
    /**
     * Property: For any GET request to /api/v1/health, the response SHALL
     * always include a status field with a valid value.
     */
    it('should always return a response with valid status field', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          arbitraryDatabaseResult(),
          arbitraryAdapterConfigured(),
          arbitraryAdapterConfigured(),
          async (correlationId, dbResult, telegramConfigured, emailConfigured) => {
            // Configure mocks for this iteration
            mockVerifyConnection.mockResolvedValue(dbResult);
            mockIsTelegramConfigured.mockReturnValue(telegramConfigured);
            mockIsEmailConfigured.mockReturnValue(emailConfigured);

            const handler = createHealthHandler();
            const mockRequest = createMockHealthRequest(correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as HealthCheckResponse;
            
            // Assert: Response has status field with valid value
            expect(jsonResponse).toHaveProperty('status');
            expect(['healthy', 'degraded', 'unhealthy']).toContain(jsonResponse.status);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Requirement 10.2: Health response includes required components
  // =============================================================================

  describe('Requirement 10.2: Health response includes database connectivity', () => {
    /**
     * Property: For any health check request, the response SHALL include
     * database connectivity check in the components.
     */
    it('should always include database component in response', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          arbitraryDatabaseResult(),
          arbitraryAdapterConfigured(),
          arbitraryAdapterConfigured(),
          async (correlationId, dbResult, telegramConfigured, emailConfigured) => {
            mockVerifyConnection.mockResolvedValue(dbResult);
            mockIsTelegramConfigured.mockReturnValue(telegramConfigured);
            mockIsEmailConfigured.mockReturnValue(emailConfigured);

            const handler = createHealthHandler();
            const mockRequest = createMockHealthRequest(correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as HealthCheckResponse;
            
            // Assert: Response has components.database with status
            expect(jsonResponse).toHaveProperty('components');
            expect(jsonResponse.components).toHaveProperty('database');
            expect(jsonResponse.components.database).toHaveProperty('status');
            expect(['healthy', 'degraded', 'unhealthy']).toContain(jsonResponse.components.database.status);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: The database component status SHALL reflect actual database connectivity.
     */
    it('should reflect database connectivity in database component status', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          arbitraryDatabaseResult(),
          async (correlationId, dbResult) => {
            mockVerifyConnection.mockResolvedValue(dbResult);
            mockIsTelegramConfigured.mockReturnValue(true);
            mockIsEmailConfigured.mockReturnValue(true);

            const handler = createHealthHandler();
            const mockRequest = createMockHealthRequest(correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as HealthCheckResponse;
            
            // Assert: Database status reflects connectivity
            if (dbResult.connected) {
              expect(jsonResponse.components.database.status).toBe('healthy');
            } else {
              expect(jsonResponse.components.database.status).toBe('unhealthy');
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirement 10.2: Health response includes channel adapter availability', () => {
    /**
     * Property: For any health check request, the response SHALL include
     * telegram and email adapter availability in the components.
     */
    it('should always include telegram and email components in response', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          arbitraryDatabaseResult(),
          arbitraryAdapterConfigured(),
          arbitraryAdapterConfigured(),
          async (correlationId, dbResult, telegramConfigured, emailConfigured) => {
            mockVerifyConnection.mockResolvedValue(dbResult);
            mockIsTelegramConfigured.mockReturnValue(telegramConfigured);
            mockIsEmailConfigured.mockReturnValue(emailConfigured);

            const handler = createHealthHandler();
            const mockRequest = createMockHealthRequest(correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as HealthCheckResponse;
            
            // Assert: Response has components.telegram and components.email
            expect(jsonResponse.components).toHaveProperty('telegram');
            expect(jsonResponse.components).toHaveProperty('email');
            expect(jsonResponse.components.telegram).toHaveProperty('status');
            expect(jsonResponse.components.email).toHaveProperty('status');
            
            // Assert: All adapter statuses are valid
            expect(['healthy', 'degraded', 'unhealthy']).toContain(jsonResponse.components.telegram.status);
            expect(['healthy', 'degraded', 'unhealthy']).toContain(jsonResponse.components.email.status);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Response Structure Consistency
  // =============================================================================

  describe('Response Structure Consistency', () => {
    /**
     * Property: For any health check request, the response SHALL always
     * include a timestamp field with valid ISO date.
     */
    it('should always include valid timestamp in response', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          arbitraryDatabaseResult(),
          arbitraryAdapterConfigured(),
          arbitraryAdapterConfigured(),
          async (correlationId, dbResult, telegramConfigured, emailConfigured) => {
            mockVerifyConnection.mockResolvedValue(dbResult);
            mockIsTelegramConfigured.mockReturnValue(telegramConfigured);
            mockIsEmailConfigured.mockReturnValue(emailConfigured);

            const handler = createHealthHandler();
            const mockRequest = createMockHealthRequest(correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as HealthCheckResponse;
            
            // Assert: Response has valid timestamp
            expect(jsonResponse).toHaveProperty('timestamp');
            expect(typeof jsonResponse.timestamp).toBe('string');
            expect(new Date(jsonResponse.timestamp).toString()).not.toBe('Invalid Date');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any health check request, the response structure SHALL
     * be consistent regardless of component health states.
     */
    it('should maintain consistent response structure across all health states', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          arbitraryDatabaseResult(),
          arbitraryAdapterConfigured(),
          arbitraryAdapterConfigured(),
          async (correlationId, dbResult, telegramConfigured, emailConfigured) => {
            mockVerifyConnection.mockResolvedValue(dbResult);
            mockIsTelegramConfigured.mockReturnValue(telegramConfigured);
            mockIsEmailConfigured.mockReturnValue(emailConfigured);

            const handler = createHealthHandler();
            const mockRequest = createMockHealthRequest(correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as HealthCheckResponse;
            
            // Assert: All required top-level fields exist
            expect(jsonResponse).toHaveProperty('status');
            expect(jsonResponse).toHaveProperty('timestamp');
            expect(jsonResponse).toHaveProperty('components');
            
            // Assert: All required component fields exist
            expect(jsonResponse.components).toHaveProperty('database');
            expect(jsonResponse.components).toHaveProperty('telegram');
            expect(jsonResponse.components).toHaveProperty('email');
            
            // Assert: Each component has status field
            expect(jsonResponse.components.database).toHaveProperty('status');
            expect(jsonResponse.components.telegram).toHaveProperty('status');
            expect(jsonResponse.components.email).toHaveProperty('status');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - HTTP Status Code Consistency
  // =============================================================================

  describe('HTTP Status Code Consistency', () => {
    /**
     * Property: When overall status is 'unhealthy', HTTP status SHALL be 503.
     * When overall status is 'healthy' or 'degraded', HTTP status SHALL be 200.
     */
    it('should return appropriate HTTP status code based on overall health', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          arbitraryDatabaseResult(),
          arbitraryAdapterConfigured(),
          arbitraryAdapterConfigured(),
          async (correlationId, dbResult, telegramConfigured, emailConfigured) => {
            mockVerifyConnection.mockResolvedValue(dbResult);
            mockIsTelegramConfigured.mockReturnValue(telegramConfigured);
            mockIsEmailConfigured.mockReturnValue(emailConfigured);

            const handler = createHealthHandler();
            const mockRequest = createMockHealthRequest(correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as HealthCheckResponse;
            const httpStatus = getStatus();
            
            // Assert: HTTP status matches overall health status
            if (jsonResponse.status === 'unhealthy') {
              expect(httpStatus).toBe(503);
            } else {
              expect(httpStatus).toBe(200);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Database being unhealthy SHALL always result in overall unhealthy status.
     */
    it('should return unhealthy status when database is down', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          arbitraryAdapterConfigured(),
          arbitraryAdapterConfigured(),
          async (correlationId, errorMessage, telegramConfigured, emailConfigured) => {
            // Database is down
            mockVerifyConnection.mockResolvedValue({ 
              connected: false, 
              error: errorMessage 
            });
            mockIsTelegramConfigured.mockReturnValue(telegramConfigured);
            mockIsEmailConfigured.mockReturnValue(emailConfigured);

            const handler = createHealthHandler();
            const mockRequest = createMockHealthRequest(correlationId);
            const { response, getStatus, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as HealthCheckResponse;
            
            // Assert: Overall status is unhealthy
            expect(jsonResponse.status).toBe('unhealthy');
            expect(getStatus()).toBe(503);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Health Check with Adapters
  // =============================================================================

  describe('Health Check with Registered Adapters', () => {
    /**
     * Property: When adapters are provided, the health check SHALL include
     * valid status for each adapter in the response.
     */
    it('should include valid adapter status when adapters are provided', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          fc.boolean(), // telegramHealthy
          fc.boolean(), // emailHealthy
          async (correlationId, telegramHealthy, emailHealthy) => {
            mockVerifyConnection.mockResolvedValue({ connected: true });
            mockIsTelegramConfigured.mockReturnValue(true);
            mockIsEmailConfigured.mockReturnValue(true);

            // Create mock adapters with specific health statuses
            const telegramAdapter = createMockAdapter('telegram', { healthy: telegramHealthy });
            const emailAdapter = createMockAdapter('email', { healthy: emailHealthy });

            const handler = createHealthHandler({
              adapters: [telegramAdapter, emailAdapter],
            });
            const mockRequest = createMockHealthRequest(correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as HealthCheckResponse;
            
            // Assert: Response has all required components with valid statuses
            expect(jsonResponse.components).toHaveProperty('telegram');
            expect(jsonResponse.components).toHaveProperty('email');
            expect(['healthy', 'degraded', 'unhealthy']).toContain(jsonResponse.components.telegram.status);
            expect(['healthy', 'degraded', 'unhealthy']).toContain(jsonResponse.components.email.status);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // =============================================================================
  // Property Tests - Error Handling
  // =============================================================================

  describe('Error Handling in Health Check', () => {
    /**
     * Property: When database check throws an exception, the response SHALL
     * still include all required fields with database marked as unhealthy.
     */
    it('should handle database check exceptions gracefully', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (correlationId, errorMessage) => {
            // Database check throws exception
            mockVerifyConnection.mockRejectedValue(new Error(errorMessage));
            mockIsTelegramConfigured.mockReturnValue(true);
            mockIsEmailConfigured.mockReturnValue(true);

            const handler = createHealthHandler();
            const mockRequest = createMockHealthRequest(correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as HealthCheckResponse;
            
            // Assert: Response still has all required fields
            expect(jsonResponse).toHaveProperty('status');
            expect(jsonResponse).toHaveProperty('timestamp');
            expect(jsonResponse).toHaveProperty('components');
            expect(jsonResponse.components).toHaveProperty('database');
            expect(jsonResponse.components).toHaveProperty('telegram');
            expect(jsonResponse.components).toHaveProperty('email');
            
            // Assert: Database is marked as unhealthy
            expect(jsonResponse.components.database.status).toBe('unhealthy');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: When adapter health check throws an exception, the response SHALL
     * still include all required fields with that adapter marked as unhealthy.
     */
    it('should handle adapter health check exceptions gracefully', () => {
      fc.assert(
        fc.asyncProperty(
          arbitraryCorrelationId(),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (correlationId, errorMessage) => {
            mockVerifyConnection.mockResolvedValue({ connected: true });
            mockIsTelegramConfigured.mockReturnValue(true);
            mockIsEmailConfigured.mockReturnValue(true);

            // Create adapter that throws on health check
            const telegramAdapter: ChannelAdapter = {
              channelType: 'telegram',
              canSend: jest.fn().mockReturnValue(true),
              send: jest.fn(),
              healthCheck: jest.fn().mockRejectedValue(new Error(errorMessage)),
            };
            const emailAdapter = createMockAdapter('email', { healthy: true });

            const handler = createHealthHandler({
              adapters: [telegramAdapter, emailAdapter],
            });
            const mockRequest = createMockHealthRequest(correlationId);
            const { response, getJson } = createMockResponse();

            await handler(mockRequest as Request, response as Response);

            const jsonResponse = getJson() as HealthCheckResponse;
            
            // Assert: Response still has all required fields
            expect(jsonResponse).toHaveProperty('status');
            expect(jsonResponse).toHaveProperty('timestamp');
            expect(jsonResponse).toHaveProperty('components');
            expect(jsonResponse.components).toHaveProperty('telegram');
            expect(jsonResponse.components).toHaveProperty('email');
            
            // Assert: Telegram is marked as unhealthy due to exception
            expect(jsonResponse.components.telegram.status).toBe('unhealthy');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
