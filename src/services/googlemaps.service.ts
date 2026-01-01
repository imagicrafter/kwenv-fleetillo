/**
 * Google Maps Service
 *
 * Provides geocoding and address validation functionality using the Google Maps API.
 * Includes proper error handling, retry logic, and caching for transient failures.
 */

import { config } from '../config/index.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result } from '../types/index.js';
import type {
  Coordinates,
  GeocodingResult,
  AddressValidationResult,
  GeocodeAddressInput,
  ReverseGeocodeInput,
  ValidateAddressInput,
  PlacePrediction,
  PlaceAutocompleteInput,
  DistanceMatrixEntry,
  DistanceMatrixInput,
  RawGeocodingResponse,
  GoogleMapsStatus,
  AddressIssue,
  AddressIssueCode,
  ValidationGranularity,
} from '../types/googlemaps.js';
import { rawToGeocodingResult, extractStructuredAddress } from '../types/googlemaps.js';

/**
 * Logger instance for Google Maps service operations
 */
const logger = createContextLogger('GoogleMapsService');

/**
 * Google Maps API base URLs
 */
const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DISTANCE_MATRIX_API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

/**
 * Default configuration for API requests
 */
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Google Maps service error
 */
export class GoogleMapsServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isRetryable: boolean;

  constructor(message: string, code: string, details?: unknown, isRetryable = false) {
    super(message);
    this.name = 'GoogleMapsServiceError';
    this.code = code;
    this.details = details;
    this.isRetryable = isRetryable;
  }
}

/**
 * Error codes for Google Maps service errors
 */
export const GoogleMapsErrorCodes = {
  // Configuration errors
  MISSING_API_KEY: 'GOOGLEMAPS_MISSING_API_KEY',

  // Request errors
  INVALID_ADDRESS: 'GOOGLEMAPS_INVALID_ADDRESS',
  INVALID_COORDINATES: 'GOOGLEMAPS_INVALID_COORDINATES',
  INVALID_INPUT: 'GOOGLEMAPS_INVALID_INPUT',

  // API errors
  API_ERROR: 'GOOGLEMAPS_API_ERROR',
  QUOTA_EXCEEDED: 'GOOGLEMAPS_QUOTA_EXCEEDED',
  REQUEST_DENIED: 'GOOGLEMAPS_REQUEST_DENIED',
  ZERO_RESULTS: 'GOOGLEMAPS_ZERO_RESULTS',
  TIMEOUT: 'GOOGLEMAPS_TIMEOUT',
  NETWORK_ERROR: 'GOOGLEMAPS_NETWORK_ERROR',

  // Validation errors
  ADDRESS_NOT_FOUND: 'GOOGLEMAPS_ADDRESS_NOT_FOUND',
  UNVERIFIABLE_ADDRESS: 'GOOGLEMAPS_UNVERIFIABLE_ADDRESS',
} as const;

/**
 * Maps Google Maps API status to internal error handling
 */
function mapApiStatusToError(status: GoogleMapsStatus, errorMessage?: string): GoogleMapsServiceError {
  switch (status) {
    case 'ZERO_RESULTS':
      return new GoogleMapsServiceError(
        'No results found for the provided address',
        GoogleMapsErrorCodes.ZERO_RESULTS,
        { status }
      );

    case 'OVER_DAILY_LIMIT':
    case 'OVER_QUERY_LIMIT':
      return new GoogleMapsServiceError(
        'Google Maps API quota exceeded',
        GoogleMapsErrorCodes.QUOTA_EXCEEDED,
        { status },
        true // Retryable with delay
      );

    case 'REQUEST_DENIED':
      return new GoogleMapsServiceError(
        errorMessage || 'Google Maps API request was denied',
        GoogleMapsErrorCodes.REQUEST_DENIED,
        { status, errorMessage }
      );

    case 'INVALID_REQUEST':
      return new GoogleMapsServiceError(
        errorMessage || 'Invalid request to Google Maps API',
        GoogleMapsErrorCodes.INVALID_INPUT,
        { status, errorMessage }
      );

    case 'UNKNOWN_ERROR':
    default:
      return new GoogleMapsServiceError(
        errorMessage || 'An unknown error occurred with Google Maps API',
        GoogleMapsErrorCodes.API_ERROR,
        { status, errorMessage },
        true // Retryable
      );
  }
}

/**
 * Validates that the API key is configured
 */
function validateApiKey(): Result<string> {
  const apiKey = config.googleMaps.apiKey;

  if (!apiKey || apiKey.trim().length === 0) {
    logger.error('Google Maps API key is not configured');
    return {
      success: false,
      error: new GoogleMapsServiceError(
        'Google Maps API key is not configured',
        GoogleMapsErrorCodes.MISSING_API_KEY
      ),
    };
  }

  return { success: true, data: apiKey };
}

/**
 * Validates geographic coordinates
 */
function validateCoordinates(coords: Coordinates): Result<void> {
  if (typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    return {
      success: false,
      error: new GoogleMapsServiceError(
        'Coordinates must be numeric values',
        GoogleMapsErrorCodes.INVALID_COORDINATES,
        { coordinates: coords }
      ),
    };
  }

  if (coords.latitude < -90 || coords.latitude > 90) {
    return {
      success: false,
      error: new GoogleMapsServiceError(
        'Latitude must be between -90 and 90',
        GoogleMapsErrorCodes.INVALID_COORDINATES,
        { latitude: coords.latitude }
      ),
    };
  }

  if (coords.longitude < -180 || coords.longitude > 180) {
    return {
      success: false,
      error: new GoogleMapsServiceError(
        'Longitude must be between -180 and 180',
        GoogleMapsErrorCodes.INVALID_COORDINATES,
        { longitude: coords.longitude }
      ),
    };
  }

  return { success: true };
}

/**
 * Executes a fetch request with retry logic
 */
async function fetchWithRetry<T>(
  url: string,
  options: {
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

      logger.debug(`Making API request (attempt ${attempt}/${maxRetries})`, { url: url.split('?')[0] });

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as T;
      return { success: true, data };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === 'AbortError') {
        logger.warn(`Request timeout on attempt ${attempt}`, { timeoutMs });
        lastError = new GoogleMapsServiceError(
          'Request timed out',
          GoogleMapsErrorCodes.TIMEOUT,
          { timeoutMs },
          true
        );
      }

      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        logger.debug(`Retrying in ${delay}ms`, { attempt, maxRetries });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('All retry attempts failed', lastError);
  return {
    success: false,
    error: lastError instanceof GoogleMapsServiceError
      ? lastError
      : new GoogleMapsServiceError(
          lastError?.message || 'Network error',
          GoogleMapsErrorCodes.NETWORK_ERROR,
          lastError,
          true
        ),
  };
}

/**
 * Geocodes an address to coordinates
 *
 * @param input - The address to geocode
 * @returns Result containing geocoding result or error
 */
export async function geocodeAddress(
  input: GeocodeAddressInput
): Promise<Result<GeocodingResult>> {
  logger.info('Geocoding address', { address: input.address, region: input.region });

  // Validate API key
  const apiKeyResult = validateApiKey();
  if (!apiKeyResult.success) {
    return apiKeyResult as unknown as Result<GeocodingResult>;
  }

  // Validate input
  if (!input.address || input.address.trim().length === 0) {
    return {
      success: false,
      error: new GoogleMapsServiceError(
        'Address is required for geocoding',
        GoogleMapsErrorCodes.INVALID_ADDRESS
      ),
    };
  }

  // Build API URL
  const params = new URLSearchParams({
    address: input.address,
    key: apiKeyResult.data!,
  });

  if (input.region) {
    params.append('region', input.region);
  }

  const url = `${GEOCODING_API_URL}?${params.toString()}`;

  // Make API request
  const fetchResult = await fetchWithRetry<RawGeocodingResponse>(url);
  if (!fetchResult.success) {
    return fetchResult as unknown as Result<GeocodingResult>;
  }

  const response = fetchResult.data!;

  // Handle API status
  if (response.status !== 'OK') {
    const error = mapApiStatusToError(response.status, response.error_message);
    logger.warn('Geocoding API returned non-OK status', {
      status: response.status,
      errorMessage: response.error_message
    });
    return { success: false, error };
  }

  const firstResult = response.results[0];
  if (!firstResult) {
    return {
      success: false,
      error: new GoogleMapsServiceError(
        'No results found for the provided address',
        GoogleMapsErrorCodes.ZERO_RESULTS
      ),
    };
  }

  // Convert and return the first result
  const result = rawToGeocodingResult(firstResult);
  logger.debug('Geocoding successful', {
    placeId: result.placeId,
    coordinates: result.coordinates
  });

  return { success: true, data: result };
}

/**
 * Performs reverse geocoding (coordinates to address)
 *
 * @param input - The coordinates to reverse geocode
 * @returns Result containing geocoding result or error
 */
export async function reverseGeocode(
  input: ReverseGeocodeInput
): Promise<Result<GeocodingResult>> {
  logger.info('Reverse geocoding coordinates', { coordinates: input.coordinates });

  // Validate API key
  const apiKeyResult = validateApiKey();
  if (!apiKeyResult.success) {
    return apiKeyResult as unknown as Result<GeocodingResult>;
  }

  // Validate coordinates
  const coordsValidation = validateCoordinates(input.coordinates);
  if (!coordsValidation.success) {
    return coordsValidation as unknown as Result<GeocodingResult>;
  }

  // Build API URL
  const latlng = `${input.coordinates.latitude},${input.coordinates.longitude}`;
  const params = new URLSearchParams({
    latlng,
    key: apiKeyResult.data!,
  });

  if (input.resultTypes && input.resultTypes.length > 0) {
    params.append('result_type', input.resultTypes.join('|'));
  }

  const url = `${GEOCODING_API_URL}?${params.toString()}`;

  // Make API request
  const fetchResult = await fetchWithRetry<RawGeocodingResponse>(url);
  if (!fetchResult.success) {
    return fetchResult as unknown as Result<GeocodingResult>;
  }

  const response = fetchResult.data!;

  // Handle API status
  if (response.status !== 'OK') {
    const error = mapApiStatusToError(response.status, response.error_message);
    logger.warn('Reverse geocoding API returned non-OK status', {
      status: response.status,
      errorMessage: response.error_message
    });
    return { success: false, error };
  }

  const firstResult = response.results[0];
  if (!firstResult) {
    return {
      success: false,
      error: new GoogleMapsServiceError(
        'No results found for the provided coordinates',
        GoogleMapsErrorCodes.ZERO_RESULTS
      ),
    };
  }

  // Convert and return the first result
  const result = rawToGeocodingResult(firstResult);
  logger.debug('Reverse geocoding successful', {
    placeId: result.placeId,
    formattedAddress: result.formattedAddress
  });

  return { success: true, data: result };
}

/**
 * Validates an address and returns detailed validation results
 *
 * @param input - The address to validate
 * @returns Result containing validation result or error
 */
export async function validateAddress(
  input: ValidateAddressInput
): Promise<Result<AddressValidationResult>> {
  logger.info('Validating address', {
    city: input.city,
    state: input.state,
    country: input.country
  });

  // Validate API key
  const apiKeyResult = validateApiKey();
  if (!apiKeyResult.success) {
    return apiKeyResult as unknown as Result<AddressValidationResult>;
  }

  // Build address string from components
  const addressParts = [
    input.addressLine1,
    input.addressLine2,
    input.city,
    input.state,
    input.postalCode,
    input.country,
  ].filter(Boolean);

  if (addressParts.length === 0) {
    return {
      success: false,
      error: new GoogleMapsServiceError(
        'At least one address component is required',
        GoogleMapsErrorCodes.INVALID_ADDRESS
      ),
    };
  }

  const addressString = addressParts.join(', ');

  // Geocode the address
  const geocodeResult = await geocodeAddress({ address: addressString });

  if (!geocodeResult.success) {
    // Build validation result for failed geocoding
    const issues: AddressIssue[] = [{
      code: 'ADDRESS_NOT_FOUND' as AddressIssueCode,
      message: 'Could not find the provided address',
    }];

    return {
      success: true,
      data: {
        isValid: false,
        validationGranularity: 'OTHER' as ValidationGranularity,
        address: {
          formattedAddress: addressString,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country,
        },
        issues,
      },
    };
  }

  const geocodedData = geocodeResult.data!;
  const structuredAddress = extractStructuredAddress(geocodedData);

  // Analyze validation results
  const issues: AddressIssue[] = [];
  let granularity: ValidationGranularity = 'OTHER';

  // Determine granularity based on location type
  switch (geocodedData.locationType) {
    case 'ROOFTOP':
      granularity = 'PREMISE';
      break;
    case 'RANGE_INTERPOLATED':
      granularity = 'ROUTE';
      issues.push({
        code: 'UNCONFIRMED_ADDRESS',
        message: 'Address location was interpolated and may not be exact',
      });
      break;
    case 'GEOMETRIC_CENTER':
    case 'APPROXIMATE':
      granularity = 'ROUTE';
      issues.push({
        code: 'UNCONFIRMED_ADDRESS',
        message: 'Address location is approximate',
      });
      break;
  }

  // Check for missing components
  if (!structuredAddress.streetNumber) {
    issues.push({
      code: 'MISSING_STREET_NUMBER',
      message: 'Street number could not be confirmed',
      field: 'addressLine1',
    });
  }

  if (!structuredAddress.locality && !input.city) {
    issues.push({
      code: 'MISSING_CITY',
      message: 'City could not be determined',
      field: 'city',
    });
  }

  if (!structuredAddress.postalCode && !input.postalCode) {
    issues.push({
      code: 'MISSING_POSTAL_CODE',
      message: 'Postal code could not be determined',
      field: 'postalCode',
    });
  }

  // Build validated address
  const validatedAddress = {
    formattedAddress: geocodedData.formattedAddress,
    addressLine1: structuredAddress.streetNumber && structuredAddress.route
      ? `${structuredAddress.streetNumber} ${structuredAddress.route}`
      : input.addressLine1,
    addressLine2: input.addressLine2,
    city: structuredAddress.locality || input.city,
    state: structuredAddress.administrativeAreaLevel1 || input.state,
    postalCode: structuredAddress.postalCode || input.postalCode,
    country: structuredAddress.country || input.country,
  };

  const isValid = issues.length === 0 ||
    (issues.every(issue => issue.code === 'UNCONFIRMED_ADDRESS' || issue.code === 'MISSING_STREET_NUMBER'));

  logger.debug('Address validation complete', {
    isValid,
    granularity,
    issueCount: issues.length
  });

  return {
    success: true,
    data: {
      isValid,
      validationGranularity: granularity,
      address: validatedAddress,
      coordinates: geocodedData.coordinates,
      placeId: geocodedData.placeId,
      issues,
    },
  };
}

/**
 * Gets place autocomplete predictions
 *
 * @param input - The autocomplete input
 * @returns Result containing predictions or error
 */
export async function getPlaceAutocomplete(
  input: PlaceAutocompleteInput
): Promise<Result<PlacePrediction[]>> {
  logger.info('Getting place autocomplete', { input: input.input });

  // Validate API key
  const apiKeyResult = validateApiKey();
  if (!apiKeyResult.success) {
    return apiKeyResult as unknown as Result<PlacePrediction[]>;
  }

  // Validate input
  if (!input.input || input.input.trim().length === 0) {
    return {
      success: false,
      error: new GoogleMapsServiceError(
        'Input text is required for autocomplete',
        GoogleMapsErrorCodes.INVALID_INPUT
      ),
    };
  }

  // Build API URL
  const params = new URLSearchParams({
    input: input.input,
    key: apiKeyResult.data!,
  });

  if (input.sessionToken) {
    params.append('sessiontoken', input.sessionToken);
  }

  if (input.types && input.types.length > 0) {
    params.append('types', input.types.join('|'));
  }

  if (input.location) {
    params.append('location', `${input.location.latitude},${input.location.longitude}`);
  }

  if (input.radius) {
    params.append('radius', String(input.radius));
  }

  if (input.region) {
    params.append('components', `country:${input.region}`);
  }

  const url = `${PLACES_API_URL}?${params.toString()}`;

  // Make API request
  interface PlacesAutocompleteResponse {
    status: GoogleMapsStatus;
    error_message?: string;
    predictions: Array<{
      place_id: string;
      description: string;
      structured_formatting: {
        main_text: string;
        secondary_text: string;
      };
      types: string[];
    }>;
  }

  const fetchResult = await fetchWithRetry<PlacesAutocompleteResponse>(url);
  if (!fetchResult.success) {
    return fetchResult as unknown as Result<PlacePrediction[]>;
  }

  const response = fetchResult.data!;

  // Handle API status
  if (response.status !== 'OK' && response.status !== 'ZERO_RESULTS') {
    const error = mapApiStatusToError(response.status, response.error_message);
    logger.warn('Places API returned non-OK status', {
      status: response.status,
      errorMessage: response.error_message
    });
    return { success: false, error };
  }

  // Convert predictions
  const predictions: PlacePrediction[] = response.predictions.map(pred => ({
    placeId: pred.place_id,
    description: pred.description,
    mainText: pred.structured_formatting.main_text,
    secondaryText: pred.structured_formatting.secondary_text,
    types: pred.types,
  }));

  logger.debug('Autocomplete successful', { resultCount: predictions.length });

  return { success: true, data: predictions };
}

/**
 * Calculates distance matrix between origins and destinations
 *
 * @param input - The distance matrix input
 * @returns Result containing distance matrix entries or error
 */
export async function getDistanceMatrix(
  input: DistanceMatrixInput
): Promise<Result<DistanceMatrixEntry[]>> {
  logger.info('Calculating distance matrix', {
    originCount: input.origins.length,
    destinationCount: input.destinations.length
  });

  // Validate API key
  const apiKeyResult = validateApiKey();
  if (!apiKeyResult.success) {
    return apiKeyResult as unknown as Result<DistanceMatrixEntry[]>;
  }

  // Validate input
  if (input.origins.length === 0) {
    return {
      success: false,
      error: new GoogleMapsServiceError(
        'At least one origin is required',
        GoogleMapsErrorCodes.INVALID_INPUT
      ),
    };
  }

  if (input.destinations.length === 0) {
    return {
      success: false,
      error: new GoogleMapsServiceError(
        'At least one destination is required',
        GoogleMapsErrorCodes.INVALID_INPUT
      ),
    };
  }

  // Format locations
  const formatLocation = (loc: Coordinates | string): string => {
    if (typeof loc === 'string') return loc;
    return `${loc.latitude},${loc.longitude}`;
  };

  const origins = input.origins.map(formatLocation).join('|');
  const destinations = input.destinations.map(formatLocation).join('|');

  // Build API URL
  const params = new URLSearchParams({
    origins,
    destinations,
    key: apiKeyResult.data!,
    mode: input.mode || 'driving',
  });

  if (input.avoid && input.avoid.length > 0) {
    params.append('avoid', input.avoid.join('|'));
  }

  if (input.departureTime) {
    params.append('departure_time', String(Math.floor(input.departureTime.getTime() / 1000)));
  }

  const url = `${DISTANCE_MATRIX_API_URL}?${params.toString()}`;

  // Make API request
  interface DistanceMatrixResponse {
    status: GoogleMapsStatus;
    error_message?: string;
    rows: Array<{
      elements: Array<{
        status: string;
        distance?: { value: number; text: string };
        duration?: { value: number; text: string };
      }>;
    }>;
  }

  const fetchResult = await fetchWithRetry<DistanceMatrixResponse>(url);
  if (!fetchResult.success) {
    return fetchResult as unknown as Result<DistanceMatrixEntry[]>;
  }

  const response = fetchResult.data!;

  // Handle API status
  if (response.status !== 'OK') {
    const error = mapApiStatusToError(response.status, response.error_message);
    logger.warn('Distance Matrix API returned non-OK status', {
      status: response.status,
      errorMessage: response.error_message
    });
    return { success: false, error };
  }

  // Convert to entries
  const entries: DistanceMatrixEntry[] = [];

  response.rows.forEach((row, originIndex) => {
    row.elements.forEach((element, destinationIndex) => {
      entries.push({
        originIndex,
        destinationIndex,
        distance: {
          meters: element.distance?.value ?? 0,
          text: element.distance?.text ?? 'N/A',
        },
        duration: {
          seconds: element.duration?.value ?? 0,
          text: element.duration?.text ?? 'N/A',
        },
        status: element.status as DistanceMatrixEntry['status'],
      });
    });
  });

  logger.debug('Distance matrix calculated', { entryCount: entries.length });

  return { success: true, data: entries };
}

/**
 * Batch geocode multiple addresses
 *
 * @param addresses - Array of addresses to geocode
 * @returns Result containing array of geocoding results
 */
export async function batchGeocodeAddresses(
  addresses: GeocodeAddressInput[]
): Promise<Result<Array<{ input: GeocodeAddressInput; result: Result<GeocodingResult> }>>> {
  logger.info('Batch geocoding addresses', { count: addresses.length });

  if (addresses.length === 0) {
    return { success: true, data: [] };
  }

  // Process addresses with concurrency limit
  const CONCURRENCY_LIMIT = 5;
  const results: Array<{ input: GeocodeAddressInput; result: Result<GeocodingResult> }> = [];

  for (let i = 0; i < addresses.length; i += CONCURRENCY_LIMIT) {
    const batch = addresses.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(async (input) => ({
        input,
        result: await geocodeAddress(input),
      }))
    );
    results.push(...batchResults);

    // Add delay between batches to respect rate limits
    if (i + CONCURRENCY_LIMIT < addresses.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  const successCount = results.filter(r => r.result.success).length;
  logger.info('Batch geocoding complete', {
    total: addresses.length,
    successful: successCount,
    failed: addresses.length - successCount
  });

  return { success: true, data: results };
}

/**
 * Gets the formatted address for coordinates
 * Convenience wrapper around reverseGeocode
 *
 * @param coordinates - The coordinates to get address for
 * @returns Result containing formatted address string or error
 */
export async function getAddressFromCoordinates(
  coordinates: Coordinates
): Promise<Result<string>> {
  const result = await reverseGeocode({ coordinates });

  if (!result.success) {
    return result as unknown as Result<string>;
  }

  return { success: true, data: result.data!.formattedAddress };
}

/**
 * Gets coordinates for an address
 * Convenience wrapper around geocodeAddress
 *
 * @param address - The address string
 * @returns Result containing coordinates or error
 */
export async function getCoordinatesFromAddress(
  address: string
): Promise<Result<Coordinates>> {
  const result = await geocodeAddress({ address });

  if (!result.success) {
    return result as unknown as Result<Coordinates>;
  }

  return { success: true, data: result.data!.coordinates };
}
