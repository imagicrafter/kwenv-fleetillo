/**
 * Google Maps Service
 *
 * Provides geocoding and address validation functionality using the Google Maps API.
 * Includes proper error handling, retry logic, and caching for transient failures.
 */
import type { Result } from '../types/index';
import type { Coordinates, GeocodingResult, AddressValidationResult, GeocodeAddressInput, ReverseGeocodeInput, ValidateAddressInput, PlacePrediction, PlaceAutocompleteInput, DistanceMatrixEntry, DistanceMatrixInput } from '../types/googlemaps';
/**
 * Google Maps service error
 */
export declare class GoogleMapsServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    readonly isRetryable: boolean;
    constructor(message: string, code: string, details?: unknown, isRetryable?: boolean);
}
/**
 * Error codes for Google Maps service errors
 */
export declare const GoogleMapsErrorCodes: {
    readonly MISSING_API_KEY: "GOOGLEMAPS_MISSING_API_KEY";
    readonly INVALID_ADDRESS: "GOOGLEMAPS_INVALID_ADDRESS";
    readonly INVALID_COORDINATES: "GOOGLEMAPS_INVALID_COORDINATES";
    readonly INVALID_INPUT: "GOOGLEMAPS_INVALID_INPUT";
    readonly API_ERROR: "GOOGLEMAPS_API_ERROR";
    readonly QUOTA_EXCEEDED: "GOOGLEMAPS_QUOTA_EXCEEDED";
    readonly REQUEST_DENIED: "GOOGLEMAPS_REQUEST_DENIED";
    readonly ZERO_RESULTS: "GOOGLEMAPS_ZERO_RESULTS";
    readonly TIMEOUT: "GOOGLEMAPS_TIMEOUT";
    readonly NETWORK_ERROR: "GOOGLEMAPS_NETWORK_ERROR";
    readonly ADDRESS_NOT_FOUND: "GOOGLEMAPS_ADDRESS_NOT_FOUND";
    readonly UNVERIFIABLE_ADDRESS: "GOOGLEMAPS_UNVERIFIABLE_ADDRESS";
};
/**
 * Geocodes an address to coordinates
 *
 * @param input - The address to geocode
 * @returns Result containing geocoding result or error
 */
export declare function geocodeAddress(input: GeocodeAddressInput): Promise<Result<GeocodingResult>>;
/**
 * Performs reverse geocoding (coordinates to address)
 *
 * @param input - The coordinates to reverse geocode
 * @returns Result containing geocoding result or error
 */
export declare function reverseGeocode(input: ReverseGeocodeInput): Promise<Result<GeocodingResult>>;
/**
 * Validates an address and returns detailed validation results
 *
 * @param input - The address to validate
 * @returns Result containing validation result or error
 */
export declare function validateAddress(input: ValidateAddressInput): Promise<Result<AddressValidationResult>>;
/**
 * Gets place autocomplete predictions
 *
 * @param input - The autocomplete input
 * @returns Result containing predictions or error
 */
export declare function getPlaceAutocomplete(input: PlaceAutocompleteInput): Promise<Result<PlacePrediction[]>>;
/**
 * Calculates distance matrix between origins and destinations
 *
 * @param input - The distance matrix input
 * @returns Result containing distance matrix entries or error
 */
export declare function getDistanceMatrix(input: DistanceMatrixInput): Promise<Result<DistanceMatrixEntry[]>>;
/**
 * Batch geocode multiple addresses
 *
 * @param addresses - Array of addresses to geocode
 * @returns Result containing array of geocoding results
 */
export declare function batchGeocodeAddresses(addresses: GeocodeAddressInput[]): Promise<Result<Array<{
    input: GeocodeAddressInput;
    result: Result<GeocodingResult>;
}>>>;
/**
 * Gets the formatted address for coordinates
 * Convenience wrapper around reverseGeocode
 *
 * @param coordinates - The coordinates to get address for
 * @returns Result containing formatted address string or error
 */
export declare function getAddressFromCoordinates(coordinates: Coordinates): Promise<Result<string>>;
/**
 * Gets coordinates for an address
 * Convenience wrapper around geocodeAddress
 *
 * @param address - The address string
 * @returns Result containing coordinates or error
 */
export declare function getCoordinatesFromAddress(address: string): Promise<Result<Coordinates>>;
//# sourceMappingURL=googlemaps.service.d.ts.map