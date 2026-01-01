/**
 * Google Maps API type definitions for RouteIQ application
 * Provides types for geocoding and address validation functionality
 */

/**
 * Geographic coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Address component types from Google Maps API
 */
export type AddressComponentType =
  | 'street_number'
  | 'route'
  | 'locality'
  | 'administrative_area_level_1'
  | 'administrative_area_level_2'
  | 'country'
  | 'postal_code'
  | 'sublocality'
  | 'neighborhood'
  | 'premise'
  | 'subpremise';

/**
 * Individual address component from Google Maps API
 */
export interface AddressComponent {
  longName: string;
  shortName: string;
  types: AddressComponentType[];
}

/**
 * Structured address representation
 */
export interface StructuredAddress {
  formattedAddress: string;
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeAreaLevel1?: string;
  administrativeAreaLevel2?: string;
  country?: string;
  postalCode?: string;
  components: AddressComponent[];
}

/**
 * Geocoding result from Google Maps API
 */
export interface GeocodingResult {
  placeId: string;
  formattedAddress: string;
  coordinates: Coordinates;
  addressComponents: AddressComponent[];
  locationType: GeocodingLocationType;
  viewport?: {
    northeast: Coordinates;
    southwest: Coordinates;
  };
}

/**
 * Location type indicating the accuracy of the geocoding result
 */
export type GeocodingLocationType =
  | 'ROOFTOP'             // Precise location
  | 'RANGE_INTERPOLATED'  // Approximated between two precise points
  | 'GEOMETRIC_CENTER'    // Geometric center of a region
  | 'APPROXIMATE';        // Approximate location

/**
 * Address validation result
 */
export interface AddressValidationResult {
  isValid: boolean;
  validationGranularity: ValidationGranularity;
  address: {
    formattedAddress: string;
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  coordinates?: Coordinates;
  placeId?: string;
  issues: AddressIssue[];
  suggestions?: AddressSuggestion[];
}

/**
 * Granularity levels for address validation
 */
export type ValidationGranularity =
  | 'PREMISE'              // Validated to specific building/address
  | 'SUB_PREMISE'          // Validated to apartment/unit level
  | 'BLOCK'                // Validated to block level
  | 'ROUTE'                // Validated to street level only
  | 'OTHER';               // Other/unknown granularity

/**
 * Address issues found during validation
 */
export interface AddressIssue {
  code: AddressIssueCode;
  message: string;
  field?: string;
}

/**
 * Address issue codes
 */
export type AddressIssueCode =
  | 'MISSING_STREET_NUMBER'
  | 'MISSING_STREET_NAME'
  | 'MISSING_CITY'
  | 'MISSING_STATE'
  | 'MISSING_POSTAL_CODE'
  | 'MISSING_COUNTRY'
  | 'INVALID_POSTAL_CODE'
  | 'INVALID_STATE'
  | 'UNCONFIRMED_ADDRESS'
  | 'ADDRESS_NOT_FOUND'
  | 'MULTIPLE_MATCHES'
  | 'GEOCODING_FAILED';

/**
 * Suggested address correction
 */
export interface AddressSuggestion {
  formattedAddress: string;
  placeId: string;
  description: string;
}

/**
 * Input for geocoding an address
 */
export interface GeocodeAddressInput {
  address: string;
  region?: string;  // Country code to bias results (e.g., 'US', 'CA')
}

/**
 * Input for reverse geocoding (coordinates to address)
 */
export interface ReverseGeocodeInput {
  coordinates: Coordinates;
  resultTypes?: AddressComponentType[];
}

/**
 * Input for address validation
 */
export interface ValidateAddressInput {
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Place autocomplete prediction
 */
export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

/**
 * Input for place autocomplete
 */
export interface PlaceAutocompleteInput {
  input: string;
  sessionToken?: string;
  types?: string[];
  location?: Coordinates;
  radius?: number;
  region?: string;
}

/**
 * Distance matrix entry
 */
export interface DistanceMatrixEntry {
  originIndex: number;
  destinationIndex: number;
  distance: {
    meters: number;
    text: string;
  };
  duration: {
    seconds: number;
    text: string;
  };
  status: DistanceMatrixStatus;
}

/**
 * Distance matrix status
 */
export type DistanceMatrixStatus =
  | 'OK'
  | 'NOT_FOUND'
  | 'ZERO_RESULTS'
  | 'MAX_ROUTE_LENGTH_EXCEEDED';

/**
 * Input for distance matrix calculation
 */
export interface DistanceMatrixInput {
  origins: (Coordinates | string)[];
  destinations: (Coordinates | string)[];
  mode?: TravelMode;
  avoid?: AvoidType[];
  departureTime?: Date;
}

/**
 * Travel mode options
 */
export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

/**
 * Route avoid options
 */
export type AvoidType = 'tolls' | 'highways' | 'ferries' | 'indoor';

/**
 * Google Maps API response status codes
 */
export type GoogleMapsStatus =
  | 'OK'
  | 'ZERO_RESULTS'
  | 'OVER_DAILY_LIMIT'
  | 'OVER_QUERY_LIMIT'
  | 'REQUEST_DENIED'
  | 'INVALID_REQUEST'
  | 'UNKNOWN_ERROR';

/**
 * Raw Google Maps API geocoding response
 */
export interface RawGeocodingResponse {
  status: GoogleMapsStatus;
  error_message?: string;
  results: RawGeocodingResult[];
}

/**
 * Raw geocoding result from Google Maps API
 */
export interface RawGeocodingResult {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
    location_type: string;
    viewport: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  address_components: RawAddressComponent[];
  types: string[];
}

/**
 * Raw address component from Google Maps API
 */
export interface RawAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

/**
 * Converts a raw geocoding result to a structured GeocodingResult
 */
export function rawToGeocodingResult(raw: RawGeocodingResult): GeocodingResult {
  return {
    placeId: raw.place_id,
    formattedAddress: raw.formatted_address,
    coordinates: {
      latitude: raw.geometry.location.lat,
      longitude: raw.geometry.location.lng,
    },
    addressComponents: raw.address_components.map(comp => ({
      longName: comp.long_name,
      shortName: comp.short_name,
      types: comp.types as AddressComponentType[],
    })),
    locationType: raw.geometry.location_type as GeocodingLocationType,
    viewport: {
      northeast: {
        latitude: raw.geometry.viewport.northeast.lat,
        longitude: raw.geometry.viewport.northeast.lng,
      },
      southwest: {
        latitude: raw.geometry.viewport.southwest.lat,
        longitude: raw.geometry.viewport.southwest.lng,
      },
    },
  };
}

/**
 * Extracts a structured address from geocoding result
 */
export function extractStructuredAddress(result: GeocodingResult): StructuredAddress {
  const getComponent = (type: AddressComponentType): AddressComponent | undefined => {
    return result.addressComponents.find(comp => comp.types.includes(type));
  };

  return {
    formattedAddress: result.formattedAddress,
    streetNumber: getComponent('street_number')?.longName,
    route: getComponent('route')?.longName,
    locality: getComponent('locality')?.longName,
    administrativeAreaLevel1: getComponent('administrative_area_level_1')?.shortName,
    administrativeAreaLevel2: getComponent('administrative_area_level_2')?.longName,
    country: getComponent('country')?.shortName,
    postalCode: getComponent('postal_code')?.longName,
    components: result.addressComponents,
  };
}
