"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressValidationErrorCodes = exports.AddressValidationServiceError = void 0;
exports.validateAddressWithDetails = validateAddressWithDetails;
exports.standardizeAddress = standardizeAddress;
exports.geocodeWithValidation = geocodeWithValidation;
exports.batchValidateAddresses = batchValidateAddresses;
exports.isAddressValid = isAddressValid;
exports.getValidatedCoordinates = getValidatedCoordinates;
const logger_js_1 = require("../utils/logger.js");
const index_js_1 = require("../config/index.js");
const googlemaps_service_js_1 = require("./googlemaps.service.js");
const googlemaps_js_1 = require("../types/googlemaps.js");
/**
 * Logger instance for Address Validation service operations
 */
const logger = (0, logger_js_1.createContextLogger)('AddressValidationService');
/**
 * Address Validation service error
 */
class AddressValidationServiceError extends Error {
    code;
    details;
    isRetryable;
    constructor(message, code, details, isRetryable = false) {
        super(message);
        this.name = 'AddressValidationServiceError';
        this.code = code;
        this.details = details;
        this.isRetryable = isRetryable;
    }
}
exports.AddressValidationServiceError = AddressValidationServiceError;
/**
 * Error codes for Address Validation service errors
 */
exports.AddressValidationErrorCodes = {
    // Input errors
    EMPTY_ADDRESS: 'ADDRESS_VALIDATION_EMPTY_ADDRESS',
    INVALID_INPUT: 'ADDRESS_VALIDATION_INVALID_INPUT',
    // Configuration errors
    MISSING_API_KEY: 'ADDRESS_VALIDATION_MISSING_API_KEY',
    // Processing errors
    GEOCODING_FAILED: 'ADDRESS_VALIDATION_GEOCODING_FAILED',
    VALIDATION_FAILED: 'ADDRESS_VALIDATION_FAILED',
    STANDARDIZATION_FAILED: 'ADDRESS_VALIDATION_STANDARDIZATION_FAILED',
    // API errors
    API_ERROR: 'ADDRESS_VALIDATION_API_ERROR',
    QUOTA_EXCEEDED: 'ADDRESS_VALIDATION_QUOTA_EXCEEDED',
    TIMEOUT: 'ADDRESS_VALIDATION_TIMEOUT',
    NETWORK_ERROR: 'ADDRESS_VALIDATION_NETWORK_ERROR',
};
/**
 * Default validation options
 */
const DEFAULT_OPTIONS = {
    includeGeocoding: true,
    includeSuggestions: true,
    maxSuggestions: 3,
    minConfidenceScore: 50,
};
/**
 * Validates that the API key is configured
 */
function validateApiKey() {
    const apiKey = index_js_1.config.googleMaps.apiKey;
    if (!apiKey || apiKey.trim().length === 0) {
        logger.error('Google Maps API key is not configured');
        return {
            success: false,
            error: new AddressValidationServiceError('Google Maps API key is not configured', exports.AddressValidationErrorCodes.MISSING_API_KEY),
        };
    }
    return { success: true, data: apiKey };
}
/**
 * Converts an AddressInput to a single address string
 */
function addressInputToString(input) {
    if (input.fullAddress) {
        return input.fullAddress.trim();
    }
    const parts = [
        input.addressLine1,
        input.addressLine2,
        input.city,
        input.state,
        input.postalCode,
        input.country,
    ].filter(Boolean);
    return parts.join(', ').trim();
}
/**
 * Validates that the address input is not empty
 */
function validateAddressInput(input) {
    const addressString = addressInputToString(input);
    if (!addressString || addressString.length === 0) {
        return {
            success: false,
            error: new AddressValidationServiceError('Address input is empty', exports.AddressValidationErrorCodes.EMPTY_ADDRESS, { input }),
        };
    }
    return { success: true, data: addressString };
}
/**
 * Maps Google Maps location type to confidence level
 */
function locationTypeToConfidence(locationType) {
    switch (locationType) {
        case 'ROOFTOP':
            return { level: 'HIGH', score: 95 };
        case 'RANGE_INTERPOLATED':
            return { level: 'MEDIUM', score: 70 };
        case 'GEOMETRIC_CENTER':
            return { level: 'LOW', score: 50 };
        case 'APPROXIMATE':
            return { level: 'LOW', score: 30 };
        default:
            return { level: 'UNVERIFIED', score: 0 };
    }
}
/**
 * Creates standardized address from geocoding result
 */
function createStandardizedAddress(result) {
    const structured = (0, googlemaps_js_1.extractStructuredAddress)(result);
    // Build address line 1 from street number and route
    let addressLine1 = '';
    if (structured.streetNumber && structured.route) {
        addressLine1 = `${structured.streetNumber} ${structured.route}`;
    }
    else if (structured.route) {
        addressLine1 = structured.route;
    }
    return {
        formattedAddress: result.formattedAddress,
        streetNumber: structured.streetNumber,
        streetName: structured.route,
        addressLine1: addressLine1 || result.formattedAddress.split(',')[0] || '',
        city: structured.locality || '',
        state: structured.administrativeAreaLevel1 || '',
        stateCode: structured.administrativeAreaLevel1 || '',
        postalCode: structured.postalCode || '',
        country: structured.country || '',
        countryCode: structured.country || '',
        county: structured.administrativeAreaLevel2,
        neighborhood: undefined, // Would need to extract from components
        sublocality: undefined, // Would need to extract from components
    };
}
/**
 * Analyzes geocoding result for validation issues
 */
function analyzeValidationIssues(input, result, standardized) {
    const issues = [];
    // Check for approximate location
    if (result.locationType === 'APPROXIMATE') {
        issues.push({
            severity: 'WARNING',
            code: 'APPROXIMATE_LOCATION',
            message: 'Address location is approximate and may not be precise',
        });
    }
    // Check for interpolated location
    if (result.locationType === 'RANGE_INTERPOLATED') {
        issues.push({
            severity: 'INFO',
            code: 'INTERPOLATED_LOCATION',
            message: 'Address location was interpolated between known points',
        });
    }
    // Check for missing street number
    if (!standardized.streetNumber) {
        issues.push({
            severity: 'WARNING',
            code: 'MISSING_STREET_NUMBER',
            message: 'Street number could not be verified',
            field: 'streetNumber',
        });
    }
    // Check for missing city
    if (!standardized.city) {
        issues.push({
            severity: 'ERROR',
            code: 'MISSING_CITY',
            message: 'City could not be determined',
            field: 'city',
        });
    }
    // Check for missing postal code
    if (!standardized.postalCode) {
        issues.push({
            severity: 'WARNING',
            code: 'MISSING_POSTAL_CODE',
            message: 'Postal code could not be determined',
            field: 'postalCode',
        });
    }
    // Check if address was significantly modified
    const inputAddress = addressInputToString(input).toLowerCase();
    const resultAddress = result.formattedAddress.toLowerCase();
    // Simple check for significant modifications
    if (inputAddress && resultAddress) {
        // Check if key parts changed (very basic comparison)
        const inputParts = inputAddress.split(/[,\s]+/).filter(p => p.length > 2);
        const resultParts = resultAddress.split(/[,\s]+/).filter(p => p.length > 2);
        const changedParts = inputParts.filter(part => !resultParts.some(rp => rp.includes(part) || part.includes(rp)));
        if (changedParts.length > 0) {
            issues.push({
                severity: 'INFO',
                code: 'ADDRESS_CORRECTED',
                message: 'Address was standardized/corrected during validation',
            });
        }
    }
    return issues;
}
/**
 * Creates component validation details
 */
function createComponentValidation(input, standardized) {
    const validations = [];
    // Validate street address
    const inputStreet = input.addressLine1 || '';
    const standardizedStreet = standardized.addressLine1;
    validations.push({
        component: 'addressLine1',
        inputValue: inputStreet || undefined,
        standardizedValue: standardizedStreet || undefined,
        isValid: !!standardizedStreet,
        wasModified: inputStreet.toLowerCase() !== standardizedStreet.toLowerCase(),
    });
    // Validate city
    const inputCity = input.city || '';
    const standardizedCity = standardized.city;
    validations.push({
        component: 'city',
        inputValue: inputCity || undefined,
        standardizedValue: standardizedCity || undefined,
        isValid: !!standardizedCity,
        wasModified: inputCity.toLowerCase() !== standardizedCity.toLowerCase(),
    });
    // Validate state
    const inputState = input.state || '';
    const standardizedState = standardized.stateCode;
    validations.push({
        component: 'state',
        inputValue: inputState || undefined,
        standardizedValue: standardizedState || undefined,
        isValid: !!standardizedState,
        wasModified: inputState.toLowerCase() !== standardizedState.toLowerCase(),
    });
    // Validate postal code
    const inputPostal = input.postalCode || '';
    const standardizedPostal = standardized.postalCode;
    validations.push({
        component: 'postalCode',
        inputValue: inputPostal || undefined,
        standardizedValue: standardizedPostal || undefined,
        isValid: !!standardizedPostal,
        wasModified: inputPostal !== standardizedPostal,
    });
    // Validate country
    const inputCountry = input.country || '';
    const standardizedCountry = standardized.countryCode;
    validations.push({
        component: 'country',
        inputValue: inputCountry || undefined,
        standardizedValue: standardizedCountry || undefined,
        isValid: !!standardizedCountry,
        wasModified: inputCountry.toLowerCase() !== standardizedCountry.toLowerCase(),
    });
    return validations;
}
/**
 * Determines overall validation status from issues
 */
function determineValidationStatus(issues, confidenceScore, minConfidenceScore) {
    const hasErrors = issues.some(i => i.severity === 'ERROR');
    const hasWarnings = issues.some(i => i.severity === 'WARNING');
    const wasCorrected = issues.some(i => i.code === 'ADDRESS_CORRECTED');
    if (hasErrors) {
        return 'INVALID';
    }
    if (confidenceScore < minConfidenceScore) {
        return 'PARTIAL';
    }
    if (wasCorrected) {
        return 'VALID_CORRECTED';
    }
    if (hasWarnings) {
        return 'PARTIAL';
    }
    return 'VALID';
}
/**
 * Gets address suggestions using Places Autocomplete
 */
async function getSuggestions(addressString, options) {
    try {
        const result = await (0, googlemaps_service_js_1.getPlaceAutocomplete)({
            input: addressString,
            types: ['address'],
            region: options.regionBias,
            sessionToken: options.sessionToken,
        });
        if (!result.success || !result.data) {
            return [];
        }
        return result.data.slice(0, options.maxSuggestions || 3).map((pred) => ({
            formattedAddress: pred.description,
            placeId: pred.placeId,
            confidence: 80, // Default confidence for autocomplete suggestions
            description: pred.description,
        }));
    }
    catch {
        logger.warn('Failed to get address suggestions');
        return [];
    }
}
/**
 * Validates a single address with comprehensive analysis
 *
 * @param input - The address to validate
 * @param options - Validation options
 * @returns Result containing detailed validation response
 */
async function validateAddressWithDetails(input, options = {}) {
    const startTime = Date.now();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    logger.info('Validating address', {
        hasFullAddress: !!input.fullAddress,
        hasComponents: !!(input.addressLine1 || input.city),
        options: mergedOptions,
    });
    // Validate API key
    const apiKeyResult = validateApiKey();
    if (!apiKeyResult.success) {
        return apiKeyResult;
    }
    // Validate input
    const inputResult = validateAddressInput(input);
    if (!inputResult.success) {
        // Return a validation response with INVALID status for empty input
        const emptyResponse = {
            status: 'INVALID',
            isValid: false,
            confidence: 'UNVERIFIED',
            confidenceScore: 0,
            originalInput: input,
            componentValidation: [],
            issues: [{
                    severity: 'ERROR',
                    code: 'EMPTY_ADDRESS',
                    message: 'Address input is empty or invalid',
                }],
            suggestions: [],
            metadata: {
                validatedAt: new Date(),
                processingTimeMs: Date.now() - startTime,
                apiProvider: 'google_maps',
            },
        };
        return { success: true, data: emptyResponse };
    }
    const addressString = inputResult.data;
    // Geocode the address
    const geocodeResult = await (0, googlemaps_service_js_1.geocodeAddress)({
        address: addressString,
        region: mergedOptions.regionBias,
    });
    if (!geocodeResult.success) {
        // Handle geocoding failure
        const error = geocodeResult.error;
        const isNotFound = error instanceof googlemaps_service_js_1.GoogleMapsServiceError &&
            error.code === googlemaps_service_js_1.GoogleMapsErrorCodes.ZERO_RESULTS;
        const issues = [{
                severity: 'ERROR',
                code: isNotFound ? 'ADDRESS_NOT_FOUND' : 'GEOCODING_FAILED',
                message: isNotFound
                    ? 'Address could not be found'
                    : 'Failed to validate address',
            }];
        // Get suggestions if address wasn't found
        let suggestions = [];
        if (isNotFound && mergedOptions.includeSuggestions) {
            suggestions = await getSuggestions(addressString, mergedOptions);
        }
        const failedResponse = {
            status: 'INVALID',
            isValid: false,
            confidence: 'UNVERIFIED',
            confidenceScore: 0,
            originalInput: input,
            componentValidation: [],
            issues,
            suggestions,
            metadata: {
                validatedAt: new Date(),
                processingTimeMs: Date.now() - startTime,
                apiProvider: 'google_maps',
            },
        };
        return { success: true, data: failedResponse };
    }
    const geocodedData = geocodeResult.data;
    // Create standardized address
    const standardizedAddress = createStandardizedAddress(geocodedData);
    // Calculate confidence
    const { level: confidenceLevel, score: confidenceScore } = locationTypeToConfidence(geocodedData.locationType);
    // Analyze issues
    const issues = analyzeValidationIssues(input, geocodedData, standardizedAddress);
    // Create component validation
    const componentValidation = createComponentValidation(input, standardizedAddress);
    // Determine overall status
    const status = determineValidationStatus(issues, confidenceScore, mergedOptions.minConfidenceScore || 50);
    // Get suggestions if there were issues
    let suggestions = [];
    if (mergedOptions.includeSuggestions && (status === 'PARTIAL' || status === 'INVALID')) {
        suggestions = await getSuggestions(addressString, mergedOptions);
    }
    // Build response
    const response = {
        status,
        isValid: status === 'VALID' || status === 'VALID_CORRECTED',
        confidence: confidenceLevel,
        confidenceScore,
        originalInput: input,
        standardizedAddress,
        componentValidation,
        issues,
        suggestions,
        metadata: {
            validatedAt: new Date(),
            processingTimeMs: Date.now() - startTime,
            apiProvider: 'google_maps',
        },
    };
    // Add geocoding data if requested
    if (mergedOptions.includeGeocoding) {
        response.geocode = {
            coordinates: geocodedData.coordinates,
            placeId: geocodedData.placeId,
            locationType: geocodedData.locationType,
            viewport: geocodedData.viewport,
        };
    }
    logger.info('Address validation complete', {
        status,
        isValid: response.isValid,
        confidenceScore,
        issueCount: issues.length,
        processingTimeMs: response.metadata.processingTimeMs,
    });
    return { success: true, data: response };
}
/**
 * Standardizes an address without full validation
 *
 * @param input - The address to standardize
 * @returns Result containing standardized address
 */
async function standardizeAddress(input) {
    logger.info('Standardizing address');
    const addressString = addressInputToString(input.address);
    if (!addressString) {
        return {
            success: true,
            data: {
                success: false,
                originalInput: input.address,
                wasModified: false,
                modifications: [],
                error: 'Address input is empty',
            },
        };
    }
    // Geocode to get standardized format
    const geocodeResult = await (0, googlemaps_service_js_1.geocodeAddress)({
        address: addressString,
        region: input.regionBias,
    });
    if (!geocodeResult.success) {
        return {
            success: true,
            data: {
                success: false,
                originalInput: input.address,
                wasModified: false,
                modifications: [],
                error: 'Failed to standardize address',
            },
        };
    }
    const geocodedData = geocodeResult.data;
    const standardizedAddress = createStandardizedAddress(geocodedData);
    // Determine what was modified
    const modifications = [];
    const componentValidation = createComponentValidation(input.address, standardizedAddress);
    for (const comp of componentValidation) {
        if (comp.wasModified && comp.inputValue && comp.standardizedValue) {
            modifications.push(`${comp.component}: "${comp.inputValue}" -> "${comp.standardizedValue}"`);
        }
    }
    return {
        success: true,
        data: {
            success: true,
            originalInput: input.address,
            standardizedAddress,
            wasModified: modifications.length > 0,
            modifications,
        },
    };
}
/**
 * Geocodes an address with optional validation
 *
 * @param input - The address or string to geocode
 * @returns Result containing coordinates and validation status
 */
async function geocodeWithValidation(input) {
    logger.info('Geocoding address with validation');
    // Convert input to AddressInput if string
    const addressInput = typeof input.address === 'string'
        ? { fullAddress: input.address }
        : input.address;
    if (input.validateFirst) {
        // Full validation
        const validationResult = await validateAddressWithDetails(addressInput, {
            regionBias: input.regionBias,
            includeGeocoding: true,
        });
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error,
            };
        }
        const validation = validationResult.data;
        return {
            success: true,
            data: {
                success: validation.geocode !== undefined,
                coordinates: validation.geocode?.coordinates,
                placeId: validation.geocode?.placeId,
                formattedAddress: validation.standardizedAddress?.formattedAddress,
                validationStatus: validation.status,
                confidence: validation.confidence,
                error: validation.isValid ? undefined : 'Address validation failed',
            },
        };
    }
    // Simple geocoding without full validation
    const addressString = addressInputToString(addressInput);
    if (!addressString) {
        return {
            success: true,
            data: {
                success: false,
                error: 'Address input is empty',
            },
        };
    }
    const geocodeResult = await (0, googlemaps_service_js_1.geocodeAddress)({
        address: addressString,
        region: input.regionBias,
    });
    if (!geocodeResult.success) {
        return {
            success: true,
            data: {
                success: false,
                error: 'Geocoding failed',
            },
        };
    }
    const data = geocodeResult.data;
    const { level } = locationTypeToConfidence(data.locationType);
    return {
        success: true,
        data: {
            success: true,
            coordinates: data.coordinates,
            placeId: data.placeId,
            formattedAddress: data.formattedAddress,
            confidence: level,
        },
    };
}
/**
 * Validates multiple addresses in batch
 *
 * @param request - Batch validation request
 * @returns Result containing batch validation response
 */
async function batchValidateAddresses(request) {
    const startTime = Date.now();
    logger.info('Starting batch address validation', {
        addressCount: request.addresses.length,
    });
    if (request.addresses.length === 0) {
        return {
            success: true,
            data: {
                results: [],
                summary: {
                    total: 0,
                    valid: 0,
                    invalid: 0,
                    partial: 0,
                    processingTimeMs: 0,
                },
            },
        };
    }
    // Process addresses with concurrency limit
    const CONCURRENCY_LIMIT = 5;
    const results = [];
    for (let i = 0; i < request.addresses.length; i += CONCURRENCY_LIMIT) {
        const batch = request.addresses.slice(i, i + CONCURRENCY_LIMIT);
        const batchResults = await Promise.all(batch.map(async (address, batchIndex) => {
            const result = await validateAddressWithDetails(address, request.options);
            const validationResponse = result.success && result.data
                ? result.data
                : {
                    status: 'UNKNOWN',
                    isValid: false,
                    confidence: 'UNVERIFIED',
                    confidenceScore: 0,
                    originalInput: address,
                    componentValidation: [],
                    issues: [{
                            severity: 'ERROR',
                            code: 'GEOCODING_FAILED',
                            message: 'Validation request failed',
                        }],
                    suggestions: [],
                    metadata: {
                        validatedAt: new Date(),
                        processingTimeMs: 0,
                        apiProvider: 'google_maps',
                    },
                };
            return {
                index: i + batchIndex,
                input: address,
                result: validationResponse,
            };
        }));
        results.push(...batchResults);
        // Add delay between batches to respect rate limits
        if (i + CONCURRENCY_LIMIT < request.addresses.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    // Calculate summary
    const summary = {
        total: results.length,
        valid: results.filter(r => r.result.status === 'VALID' || r.result.status === 'VALID_CORRECTED').length,
        invalid: results.filter(r => r.result.status === 'INVALID').length,
        partial: results.filter(r => r.result.status === 'PARTIAL').length,
        processingTimeMs: Date.now() - startTime,
    };
    logger.info('Batch validation complete', summary);
    return {
        success: true,
        data: {
            results,
            summary,
        },
    };
}
/**
 * Quick validation check - returns simple boolean
 *
 * @param input - The address to validate
 * @param options - Validation options
 * @returns Result containing boolean indicating if address is valid
 */
async function isAddressValid(input, options = {}) {
    const result = await validateAddressWithDetails(input, options);
    if (!result.success) {
        return { success: false, error: result.error };
    }
    return { success: true, data: result.data.isValid };
}
/**
 * Gets coordinates for an address with validation
 *
 * @param address - Address string or input
 * @param regionBias - Country code to bias results
 * @returns Result containing coordinates or error
 */
async function getValidatedCoordinates(address, regionBias) {
    const result = await geocodeWithValidation({
        address,
        regionBias,
        validateFirst: true,
    });
    if (!result.success || !result.data?.success || !result.data.coordinates) {
        return {
            success: false,
            error: new AddressValidationServiceError(result.data?.error || 'Failed to get coordinates', exports.AddressValidationErrorCodes.GEOCODING_FAILED),
        };
    }
    return { success: true, data: result.data.coordinates };
}
//# sourceMappingURL=address-validation.service.js.map