/**
 * Address Validation Service Types
 *
 * Provides comprehensive type definitions for address validation,
 * standardization, and geocoding operations.
 */

import type { Coordinates } from './googlemaps.js';

/**
 * Address input for validation - supports multiple formats
 */
export interface AddressInput {
  // Full address string (alternative to component-based input)
  fullAddress?: string;

  // Component-based address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Standardized address format
 * All address components are normalized and properly formatted
 */
export interface StandardizedAddress {
  // Full formatted address string
  formattedAddress: string;

  // Individual components (standardized)
  streetNumber?: string;
  streetName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  postalCodeSuffix?: string;
  country: string;
  countryCode: string;

  // Additional location info
  neighborhood?: string;
  sublocality?: string;
  county?: string;
}

/**
 * Confidence level for address validation
 */
export type AddressConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED';

/**
 * Address validation status
 */
export type AddressValidationStatus =
  | 'VALID'           // Address is valid and deliverable
  | 'VALID_CORRECTED' // Address is valid but was corrected
  | 'PARTIAL'         // Some components could not be validated
  | 'INVALID'         // Address is invalid
  | 'UNDELIVERABLE'   // Address exists but may not be deliverable
  | 'UNKNOWN';        // Could not determine validity

/**
 * Component-level validation status
 */
export interface ComponentValidation {
  component: string;
  inputValue?: string;
  standardizedValue?: string;
  isValid: boolean;
  wasModified: boolean;
  issue?: string;
}

/**
 * Detailed validation result from the address validation service
 */
export interface AddressValidationResponse {
  // Overall validation status
  status: AddressValidationStatus;
  isValid: boolean;
  confidence: AddressConfidenceLevel;
  confidenceScore: number; // 0-100

  // Original input preserved
  originalInput: AddressInput;

  // Standardized/validated address
  standardizedAddress?: StandardizedAddress;

  // Geocoding information
  geocode?: {
    coordinates: Coordinates;
    placeId: string;
    locationType: string;
    viewport?: {
      northeast: Coordinates;
      southwest: Coordinates;
    };
  };

  // Component-level validation details
  componentValidation: ComponentValidation[];

  // Any issues or warnings found
  issues: AddressValidationIssue[];

  // Suggested corrections (if address had problems)
  suggestions: ValidationSuggestion[];

  // Metadata
  metadata: {
    validatedAt: Date;
    processingTimeMs: number;
    apiProvider: 'google_maps';
  };
}

/**
 * Issue found during address validation
 */
export interface AddressValidationIssue {
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: ValidationIssueCode;
  message: string;
  field?: string;
  suggestedValue?: string;
}

/**
 * Issue codes for address validation service
 */
export type ValidationIssueCode =
  // Input issues
  | 'EMPTY_ADDRESS'
  | 'INCOMPLETE_ADDRESS'
  | 'INVALID_FORMAT'

  // Component issues
  | 'MISSING_STREET_NUMBER'
  | 'MISSING_STREET_NAME'
  | 'MISSING_CITY'
  | 'MISSING_STATE'
  | 'MISSING_POSTAL_CODE'
  | 'MISSING_COUNTRY'

  // Validation issues
  | 'INVALID_STREET_NUMBER'
  | 'INVALID_POSTAL_CODE'
  | 'INVALID_STATE_CODE'
  | 'STATE_CITY_MISMATCH'
  | 'POSTAL_CODE_CITY_MISMATCH'

  // Geocoding issues
  | 'ADDRESS_NOT_FOUND'
  | 'MULTIPLE_MATCHES'
  | 'APPROXIMATE_LOCATION'
  | 'INTERPOLATED_LOCATION'

  // Deliverability issues
  | 'UNDELIVERABLE_ADDRESS'
  | 'PO_BOX_ONLY'
  | 'VACANT_ADDRESS'

  // Correction notices
  | 'ADDRESS_CORRECTED'
  | 'SPELLING_CORRECTED'
  | 'ABBREVIATION_STANDARDIZED';

/**
 * Address correction suggestion from validation service
 */
export interface ValidationSuggestion {
  formattedAddress: string;
  placeId: string;
  confidence: number;
  description: string;
  components?: Partial<StandardizedAddress>;
}

/**
 * Options for address validation
 */
export interface AddressValidationOptions {
  // Country to bias results towards (ISO 3166-1 alpha-2 code)
  regionBias?: string;

  // Whether to include geocoding in the response
  includeGeocoding?: boolean;

  // Whether to return suggestions if address has issues
  includeSuggestions?: boolean;

  // Maximum number of suggestions to return
  maxSuggestions?: number;

  // Minimum confidence score to consider valid (0-100)
  minConfidenceScore?: number;

  // Session token for Places API (reduces billing)
  sessionToken?: string;
}

/**
 * Batch validation request
 */
export interface BatchValidationRequest {
  addresses: AddressInput[];
  options?: AddressValidationOptions;
}

/**
 * Single result in batch validation response
 */
export interface BatchValidationResult {
  index: number;
  input: AddressInput;
  result: AddressValidationResponse;
}

/**
 * Batch validation response
 */
export interface BatchValidationResponse {
  results: BatchValidationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    partial: number;
    processingTimeMs: number;
  };
}

/**
 * Input for address standardization only (no full validation)
 */
export interface StandardizeAddressInput {
  address: AddressInput;
  regionBias?: string;
}

/**
 * Response for address standardization
 */
export interface StandardizeAddressResponse {
  success: boolean;
  originalInput: AddressInput;
  standardizedAddress?: StandardizedAddress;
  wasModified: boolean;
  modifications: string[];
  error?: string;
}

/**
 * Input for geocoding with validation
 */
export interface GeocodeWithValidationInput {
  address: AddressInput | string;
  regionBias?: string;
  validateFirst?: boolean;
}

/**
 * Response for geocoding with validation
 */
export interface GeocodeWithValidationResponse {
  success: boolean;
  coordinates?: Coordinates;
  placeId?: string;
  formattedAddress?: string;
  validationStatus?: AddressValidationStatus;
  confidence?: AddressConfidenceLevel;
  error?: string;
}
