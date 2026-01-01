/**
 * Google Routes API Service
 *
 * Provides route computation and optimization functionality using the Google Routes API (v2).
 * Includes proper error handling, retry logic, and batching capabilities for efficient processing.
 */

import { config } from '../config/index.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result } from '../types/index.js';
import type {
  ComputeRoutesInput,
  ComputeRoutesResponse,
  ComputeRouteMatrixInput,
  ComputeRouteMatrixResponse,
  BatchComputeRoutesItem,
  BatchComputeRoutesResult,
  Route,
  Waypoint,
} from '../types/google-routes.js';
import { ErrorCodes } from '../errors/codes.js';

/**
 * Logger instance for Google Routes service operations
 */
const logger = createContextLogger('GoogleRoutesService');

/**
 * Google Routes API configuration
 */
const ROUTES_API_BASE_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const ROUTE_MATRIX_API_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

/**
 * Default configuration for API requests
 */
const DEFAULT_TIMEOUT_MS = 30000; // Routes API can be slower than other APIs
const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Batching configuration
 */
const DEFAULT_BATCH_CONCURRENCY = 5;
const DEFAULT_BATCH_DELAY_MS = 200;

/**
 * Google Routes API service error
 */
export class GoogleRoutesServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isRetryable: boolean;

  constructor(message: string, code: string, details?: unknown, isRetryable = false) {
    super(message);
    this.name = 'GoogleRoutesServiceError';
    this.code = code;
    this.details = details;
    this.isRetryable = isRetryable;
  }
}

/**
 * Error codes for Google Routes service errors
 */
export const GoogleRoutesErrorCodes = {
  // Configuration errors
  MISSING_API_KEY: ErrorCodes.GOOGLEROUTES_MISSING_API_KEY.code,

  // Request errors
  INVALID_WAYPOINT: ErrorCodes.GOOGLEROUTES_INVALID_WAYPOINT.code,
  INVALID_REQUEST: ErrorCodes.GOOGLEROUTES_INVALID_REQUEST.code,
  MAX_WAYPOINTS_EXCEEDED: ErrorCodes.GOOGLEROUTES_MAX_WAYPOINTS_EXCEEDED.code,
  MAX_ROUTE_LENGTH_EXCEEDED: ErrorCodes.GOOGLEROUTES_MAX_ROUTE_LENGTH_EXCEEDED.code,

  // API errors
  API_ERROR: ErrorCodes.GOOGLEROUTES_API_ERROR.code,
  QUOTA_EXCEEDED: ErrorCodes.GOOGLEROUTES_QUOTA_EXCEEDED.code,
  REQUEST_DENIED: ErrorCodes.GOOGLEROUTES_REQUEST_DENIED.code,
  ZERO_RESULTS: ErrorCodes.GOOGLEROUTES_ZERO_RESULTS.code,
  TIMEOUT: ErrorCodes.GOOGLEROUTES_TIMEOUT.code,
  NETWORK_ERROR: ErrorCodes.GOOGLEROUTES_NETWORK_ERROR.code,
} as const;

/**
 * Maps HTTP status codes and API errors to internal error handling
 */
function mapApiErrorToServiceError(
  statusCode: number,
  errorMessage?: string,
  errorDetails?: unknown
): GoogleRoutesServiceError {
  // Map HTTP status codes
  switch (statusCode) {
    case 400:
      return new GoogleRoutesServiceError(
        errorMessage || 'Invalid request to Google Routes API',
        GoogleRoutesErrorCodes.INVALID_REQUEST,
        errorDetails
      );

    case 403:
      return new GoogleRoutesServiceError(
        errorMessage || 'Google Routes API request was denied',
        GoogleRoutesErrorCodes.REQUEST_DENIED,
        errorDetails
      );

    case 404:
      return new GoogleRoutesServiceError(
        'No routes found for the provided waypoints',
        GoogleRoutesErrorCodes.ZERO_RESULTS,
        errorDetails
      );

    case 429:
      return new GoogleRoutesServiceError(
        'Google Routes API quota exceeded',
        GoogleRoutesErrorCodes.QUOTA_EXCEEDED,
        errorDetails,
        true // Retryable with delay
      );

    case 500:
    case 502:
    case 503:
      return new GoogleRoutesServiceError(
        errorMessage || 'Google Routes API service error',
        GoogleRoutesErrorCodes.API_ERROR,
        errorDetails,
        true // Retryable
      );

    case 504:
      return new GoogleRoutesServiceError(
        'Google Routes API request timed out',
        GoogleRoutesErrorCodes.TIMEOUT,
        errorDetails,
        true // Retryable
      );

    default:
      return new GoogleRoutesServiceError(
        errorMessage || 'An unknown error occurred with Google Routes API',
        GoogleRoutesErrorCodes.API_ERROR,
        { statusCode, ...(typeof errorDetails === 'object' && errorDetails !== null ? errorDetails : {}) },
        true // Retryable by default for unknown errors
      );
  }
}

/**
 * Validates that the API key is configured
 */
function validateApiKey(): Result<string> {
  const apiKey = config.googleMaps.apiKey;

  if (!apiKey || apiKey.trim().length === 0) {
    logger.error('Google Routes API key is not configured');
    return {
      success: false,
      error: new GoogleRoutesServiceError(
        'Google Routes API key is not configured',
        GoogleRoutesErrorCodes.MISSING_API_KEY
      ),
    };
  }

  return { success: true, data: apiKey };
}

/**
 * Validates a waypoint
 */
function validateWaypoint(waypoint: Waypoint, label: string): Result<void> {
  if (!waypoint) {
    return {
      success: false,
      error: new GoogleRoutesServiceError(
        `${label} is required`,
        GoogleRoutesErrorCodes.INVALID_WAYPOINT,
        { waypoint }
      ),
    };
  }

  // Must have at least one of: location, placeId
  const hasLocation = waypoint.location?.latLng || waypoint.location?.placeId || waypoint.location?.address;
  const hasPlaceId = waypoint.placeId;

  if (!hasLocation && !hasPlaceId) {
    return {
      success: false,
      error: new GoogleRoutesServiceError(
        `${label} must have either a location (latLng, placeId, or address) or placeId`,
        GoogleRoutesErrorCodes.INVALID_WAYPOINT,
        { waypoint }
      ),
    };
  }

  // Validate latitude/longitude if provided
  if (waypoint.location?.latLng) {
    const { latitude, longitude } = waypoint.location.latLng;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return {
        success: false,
        error: new GoogleRoutesServiceError(
          'Coordinates must be numeric values',
          GoogleRoutesErrorCodes.INVALID_WAYPOINT,
          { latLng: waypoint.location.latLng }
        ),
      };
    }

    if (latitude < -90 || latitude > 90) {
      return {
        success: false,
        error: new GoogleRoutesServiceError(
          'Latitude must be between -90 and 90',
          GoogleRoutesErrorCodes.INVALID_WAYPOINT,
          { latitude }
        ),
      };
    }

    if (longitude < -180 || longitude > 180) {
      return {
        success: false,
        error: new GoogleRoutesServiceError(
          'Longitude must be between -180 and 180',
          GoogleRoutesErrorCodes.INVALID_WAYPOINT,
          { longitude }
        ),
      };
    }
  }

  return { success: true };
}

/**
 * Executes a fetch request with retry logic and exponential backoff
 */
async function fetchWithRetry<T>(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    maxRetries?: number;
    timeoutMs?: number;
  } = {}
): Promise<Result<T>> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      logger.debug(`Making API request (attempt ${attempt}/${maxRetries})`, {
        method: options.method || 'POST',
        url: url.split('?')[0],
      });

      const response = await fetch(url, {
        method: options.method || 'POST',
        headers: options.headers || {},
        body: options.body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response body
      const responseText = await response.text();
      let responseData: unknown;

      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        logger.warn('Failed to parse response as JSON', { responseText });
        responseData = { rawResponse: responseText };
      }

      // Check for HTTP errors
      if (!response.ok) {
        const errorData = responseData as { error?: { message?: string } };
        const error = mapApiErrorToServiceError(
          response.status,
          errorData?.error?.message,
          responseData
        );

        // If not retryable or last attempt, return error
        if (!error.isRetryable || attempt >= maxRetries) {
          logger.error('API request failed', {
            status: response.status,
            statusText: response.statusText,
            error: error.message,
          });
          return { success: false, error };
        }

        // Otherwise, retry
        lastError = error;
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(`Request failed, retrying in ${delay}ms`, {
          attempt,
          maxRetries,
          status: response.status,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return { success: true, data: responseData as T };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === 'AbortError') {
        logger.warn(`Request timeout on attempt ${attempt}`, { timeoutMs });
        lastError = new GoogleRoutesServiceError(
          'Request timed out',
          GoogleRoutesErrorCodes.TIMEOUT,
          { timeoutMs },
          true
        );
      } else {
        logger.warn(`Network error on attempt ${attempt}`, {
          error: lastError.message,
        });
        lastError = new GoogleRoutesServiceError(
          lastError.message || 'Network error',
          GoogleRoutesErrorCodes.NETWORK_ERROR,
          lastError,
          true
        );
      }

      if (attempt < maxRetries) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 200;
        const totalDelay = delay + jitter;
        logger.debug(`Retrying in ${totalDelay.toFixed(0)}ms`, { attempt, maxRetries });
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }
  }

  logger.error('All retry attempts failed', lastError);
  return {
    success: false,
    error: lastError instanceof GoogleRoutesServiceError
      ? lastError
      : new GoogleRoutesServiceError(
          lastError?.message || 'Network error',
          GoogleRoutesErrorCodes.NETWORK_ERROR,
          lastError,
          true
        ),
  };
}

/**
 * Converts ComputeRoutesInput to the API request body format
 */
function buildComputeRoutesRequestBody(input: ComputeRoutesInput): unknown {
  const body: Record<string, unknown> = {
    origin: input.origin,
    destination: input.destination,
  };

  if (input.intermediates && input.intermediates.length > 0) {
    body.intermediates = input.intermediates;
  }

  if (input.travelMode) {
    body.travelMode = input.travelMode;
  }

  if (input.routingPreference) {
    body.routingPreference = input.routingPreference;
  }

  if (input.polylineQuality) {
    body.polylineQuality = input.polylineQuality;
  }

  if (input.polylineEncoding) {
    body.polylineEncoding = input.polylineEncoding;
  }

  if (input.departureTime) {
    body.departureTime = input.departureTime.toISOString();
  }

  if (input.arrivalTime) {
    body.arrivalTime = input.arrivalTime.toISOString();
  }

  if (input.computeAlternativeRoutes !== undefined) {
    body.computeAlternativeRoutes = input.computeAlternativeRoutes;
  }

  if (input.routeModifiers) {
    body.routeModifiers = input.routeModifiers;
  }

  if (input.languageCode) {
    body.languageCode = input.languageCode;
  }

  if (input.units) {
    body.units = input.units;
  }

  if (input.optimizeWaypointOrder !== undefined) {
    body.optimizeWaypointOrder = input.optimizeWaypointOrder;
  }

  if (input.requestedReferenceRoutes && input.requestedReferenceRoutes.length > 0) {
    body.requestedReferenceRoutes = input.requestedReferenceRoutes;
  }

  if (input.extraComputations && input.extraComputations.length > 0) {
    body.extraComputations = input.extraComputations;
  }

  if (input.regionCode) {
    body.regionCode = input.regionCode;
  }

  return body;
}

/**
 * Computes routes between origin and destination
 *
 * @param input - The route computation input
 * @returns Result containing computed routes or error
 */
export async function computeRoutes(
  input: ComputeRoutesInput
): Promise<Result<ComputeRoutesResponse>> {
  logger.info('Computing routes', {
    hasOrigin: !!input.origin,
    hasDestination: !!input.destination,
    intermediateCount: input.intermediates?.length || 0,
    travelMode: input.travelMode,
  });

  // Validate API key
  const apiKeyResult = validateApiKey();
  if (!apiKeyResult.success) {
    return apiKeyResult as unknown as Result<ComputeRoutesResponse>;
  }

  // Validate origin
  const originValidation = validateWaypoint(input.origin, 'Origin');
  if (!originValidation.success) {
    return originValidation as unknown as Result<ComputeRoutesResponse>;
  }

  // Validate destination
  const destinationValidation = validateWaypoint(input.destination, 'Destination');
  if (!destinationValidation.success) {
    return destinationValidation as unknown as Result<ComputeRoutesResponse>;
  }

  // Validate intermediates if provided
  if (input.intermediates && input.intermediates.length > 0) {
    for (let i = 0; i < input.intermediates.length; i++) {
      const waypoint = input.intermediates[i];
      if (!waypoint) continue;

      const waypointValidation = validateWaypoint(
        waypoint,
        `Intermediate waypoint ${i + 1}`
      );
      if (!waypointValidation.success) {
        return waypointValidation as unknown as Result<ComputeRoutesResponse>;
      }
    }

    // Check max waypoints (Google Routes API allows up to 25 intermediates)
    if (input.intermediates.length > 25) {
      return {
        success: false,
        error: new GoogleRoutesServiceError(
          'Maximum of 25 intermediate waypoints allowed',
          GoogleRoutesErrorCodes.MAX_WAYPOINTS_EXCEEDED,
          { count: input.intermediates.length }
        ),
      };
    }
  }

  // Build request body
  const requestBody = buildComputeRoutesRequestBody(input);

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKeyResult.data!,
    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.description,routes.warnings,routes.viewport,routes.travelAdvisory,routes.optimizedIntermediateWaypointIndex,routes.localizedValues',
  };

  // Make API request
  const fetchResult = await fetchWithRetry<ComputeRoutesResponse>(ROUTES_API_BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!fetchResult.success) {
    return fetchResult;
  }

  const response = fetchResult.data!;

  // Validate response has routes
  if (!response.routes || response.routes.length === 0) {
    logger.warn('No routes found in API response');
    return {
      success: false,
      error: new GoogleRoutesServiceError(
        'No routes found for the provided waypoints',
        GoogleRoutesErrorCodes.ZERO_RESULTS
      ),
    };
  }

  logger.info('Routes computed successfully', {
    routeCount: response.routes.length,
    primaryRouteDistance: response.routes[0]?.distanceMeters,
    primaryRouteDuration: response.routes[0]?.duration,
  });

  return { success: true, data: response };
}

/**
 * Computes a route matrix (distance and duration between multiple origins and destinations)
 *
 * @param input - The route matrix computation input
 * @returns Result containing route matrix or error
 */
export async function computeRouteMatrix(
  input: ComputeRouteMatrixInput
): Promise<Result<ComputeRouteMatrixResponse>> {
  logger.info('Computing route matrix', {
    originCount: input.origins.length,
    destinationCount: input.destinations.length,
  });

  // Validate API key
  const apiKeyResult = validateApiKey();
  if (!apiKeyResult.success) {
    return apiKeyResult as unknown as Result<ComputeRouteMatrixResponse>;
  }

  // Validate origins
  if (input.origins.length === 0) {
    return {
      success: false,
      error: new GoogleRoutesServiceError(
        'At least one origin is required',
        GoogleRoutesErrorCodes.INVALID_REQUEST
      ),
    };
  }

  for (let i = 0; i < input.origins.length; i++) {
    const origin = input.origins[i];
    if (!origin) continue;
    const validation = validateWaypoint(origin.waypoint, `Origin ${i + 1}`);
    if (!validation.success) {
      return validation as unknown as Result<ComputeRouteMatrixResponse>;
    }
  }

  // Validate destinations
  if (input.destinations.length === 0) {
    return {
      success: false,
      error: new GoogleRoutesServiceError(
        'At least one destination is required',
        GoogleRoutesErrorCodes.INVALID_REQUEST
      ),
    };
  }

  for (let i = 0; i < input.destinations.length; i++) {
    const destination = input.destinations[i];
    if (!destination) continue;
    const validation = validateWaypoint(destination.waypoint, `Destination ${i + 1}`);
    if (!validation.success) {
      return validation as unknown as Result<ComputeRouteMatrixResponse>;
    }
  }

  // Build request body
  const requestBody: Record<string, unknown> = {
    origins: input.origins,
    destinations: input.destinations,
  };

  if (input.travelMode) {
    requestBody.travelMode = input.travelMode;
  }

  if (input.routingPreference) {
    requestBody.routingPreference = input.routingPreference;
  }

  if (input.departureTime) {
    requestBody.departureTime = input.departureTime.toISOString();
  }

  if (input.arrivalTime) {
    requestBody.arrivalTime = input.arrivalTime.toISOString();
  }

  if (input.languageCode) {
    requestBody.languageCode = input.languageCode;
  }

  if (input.units) {
    requestBody.units = input.units;
  }

  if (input.regionCode) {
    requestBody.regionCode = input.regionCode;
  }

  if (input.extraComputations && input.extraComputations.length > 0) {
    requestBody.extraComputations = input.extraComputations;
  }

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKeyResult.data!,
    'X-Goog-FieldMask': 'originIndex,destinationIndex,status,condition,distanceMeters,duration,staticDuration,travelAdvisory,fallbackInfo,localizedValues',
  };

  // Make API request
  const fetchResult = await fetchWithRetry<ComputeRouteMatrixResponse>(ROUTE_MATRIX_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!fetchResult.success) {
    return fetchResult;
  }

  const response = fetchResult.data!;

  logger.info('Route matrix computed successfully', {
    elementCount: response.elements?.length || 0,
  });

  return { success: true, data: response };
}

/**
 * Batch compute routes for multiple requests with concurrency limiting
 *
 * @param items - Array of route computation inputs
 * @param options - Batch processing options
 * @returns Result containing array of batch results
 */
export async function batchComputeRoutes(
  items: BatchComputeRoutesItem[],
  options: {
    concurrency?: number;
    delayMs?: number;
  } = {}
): Promise<Result<BatchComputeRoutesResult[]>> {
  logger.info('Batch computing routes', { count: items.length });

  if (items.length === 0) {
    return { success: true, data: [] };
  }

  const concurrency = options.concurrency ?? DEFAULT_BATCH_CONCURRENCY;
  const delayMs = options.delayMs ?? DEFAULT_BATCH_DELAY_MS;

  const results: BatchComputeRoutesResult[] = [];

  // Process items in batches with concurrency limit
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);

    logger.debug(`Processing batch ${Math.floor(i / concurrency) + 1}`, {
      batchSize: batch.length,
      processed: i,
      total: items.length,
    });

    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const result = await computeRoutes(item.input);

        return {
          input: item.input,
          requestId: item.requestId,
          result: result.success ? result.data : null,
          error: result.success ? undefined : result.error,
          success: result.success,
        } as BatchComputeRoutesResult;
      })
    );

    results.push(...batchResults);

    // Add delay between batches to respect rate limits
    if (i + concurrency < items.length) {
      logger.debug(`Waiting ${delayMs}ms before next batch`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const successCount = results.filter(r => r.success).length;
  logger.info('Batch route computation complete', {
    total: items.length,
    successful: successCount,
    failed: items.length - successCount,
  });

  return { success: true, data: results };
}

/**
 * Gets the optimal route from a compute routes response
 * Convenience function to get the first/best route
 *
 * @param response - The compute routes response
 * @returns The optimal route or undefined
 */
export function getOptimalRoute(response: ComputeRoutesResponse): Route | undefined {
  return response.routes?.[0];
}

/**
 * Calculates total route metrics across all legs
 *
 * @param route - The route to analyze
 * @returns Object with total distance (meters) and duration (seconds)
 */
export function calculateRouteTotals(route: Route): {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
} {
  const totalDistanceMeters = route.distanceMeters || 0;

  // Parse duration string (e.g., "1234s" -> 1234)
  const durationMatch = route.duration?.match(/^(\d+)s$/);
  const totalDurationSeconds = durationMatch && durationMatch[1] ? parseInt(durationMatch[1], 10) : 0;

  return {
    totalDistanceMeters,
    totalDurationSeconds,
  };
}
