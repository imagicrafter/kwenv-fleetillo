/**
 * Address Validation Service
 *
 * Provides comprehensive address validation, standardization, and geocoding
 * functionality using the Google Maps API. This service wraps the lower-level
 * Google Maps service to provide a higher-level, more focused API for
 * address-related operations.
 *
 * Features:
 * - Address validation with confidence scoring
 * - Address standardization (consistent formatting)
 * - Geocoding with validation
 * - Batch address processing
 * - Detailed validation feedback
 */
import type { Result } from '../types/index';
import type { AddressInput, AddressValidationResponse, AddressValidationOptions, BatchValidationRequest, BatchValidationResponse, StandardizeAddressInput, StandardizeAddressResponse, GeocodeWithValidationInput, GeocodeWithValidationResponse } from '../types/address-validation';
import type { Coordinates } from '../types/googlemaps';
/**
 * Address Validation service error
 */
export declare class AddressValidationServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    readonly isRetryable: boolean;
    constructor(message: string, code: string, details?: unknown, isRetryable?: boolean);
}
/**
 * Error codes for Address Validation service errors
 */
export declare const AddressValidationErrorCodes: {
    readonly EMPTY_ADDRESS: "ADDRESS_VALIDATION_EMPTY_ADDRESS";
    readonly INVALID_INPUT: "ADDRESS_VALIDATION_INVALID_INPUT";
    readonly MISSING_API_KEY: "ADDRESS_VALIDATION_MISSING_API_KEY";
    readonly GEOCODING_FAILED: "ADDRESS_VALIDATION_GEOCODING_FAILED";
    readonly VALIDATION_FAILED: "ADDRESS_VALIDATION_FAILED";
    readonly STANDARDIZATION_FAILED: "ADDRESS_VALIDATION_STANDARDIZATION_FAILED";
    readonly API_ERROR: "ADDRESS_VALIDATION_API_ERROR";
    readonly QUOTA_EXCEEDED: "ADDRESS_VALIDATION_QUOTA_EXCEEDED";
    readonly TIMEOUT: "ADDRESS_VALIDATION_TIMEOUT";
    readonly NETWORK_ERROR: "ADDRESS_VALIDATION_NETWORK_ERROR";
};
/**
 * Validates a single address with comprehensive analysis
 *
 * @param input - The address to validate
 * @param options - Validation options
 * @returns Result containing detailed validation response
 */
export declare function validateAddressWithDetails(input: AddressInput, options?: AddressValidationOptions): Promise<Result<AddressValidationResponse>>;
/**
 * Standardizes an address without full validation
 *
 * @param input - The address to standardize
 * @returns Result containing standardized address
 */
export declare function standardizeAddress(input: StandardizeAddressInput): Promise<Result<StandardizeAddressResponse>>;
/**
 * Geocodes an address with optional validation
 *
 * @param input - The address or string to geocode
 * @returns Result containing coordinates and validation status
 */
export declare function geocodeWithValidation(input: GeocodeWithValidationInput): Promise<Result<GeocodeWithValidationResponse>>;
/**
 * Validates multiple addresses in batch
 *
 * @param request - Batch validation request
 * @returns Result containing batch validation response
 */
export declare function batchValidateAddresses(request: BatchValidationRequest): Promise<Result<BatchValidationResponse>>;
/**
 * Quick validation check - returns simple boolean
 *
 * @param input - The address to validate
 * @param options - Validation options
 * @returns Result containing boolean indicating if address is valid
 */
export declare function isAddressValid(input: AddressInput, options?: AddressValidationOptions): Promise<Result<boolean>>;
/**
 * Gets coordinates for an address with validation
 *
 * @param address - Address string or input
 * @param regionBias - Country code to bias results
 * @returns Result containing coordinates or error
 */
export declare function getValidatedCoordinates(address: string | AddressInput, regionBias?: string): Promise<Result<Coordinates>>;
//# sourceMappingURL=address-validation.service.d.ts.map