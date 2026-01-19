/**
 * Google Routes API Type Definitions
 *
 * Provides type-safe interfaces for the Google Routes API (v2).
 * Based on the official Google Routes API REST reference.
 */
/**
 * Geographic coordinates (latitude and longitude)
 */
export interface LatLng {
    latitude: number;
    longitude: number;
}
/**
 * A location defined by latitude/longitude or a place ID
 */
export interface Location {
    latLng?: LatLng;
    placeId?: string;
    address?: string;
}
/**
 * Waypoint for route computation
 */
export interface Waypoint {
    location?: Location;
    placeId?: string;
    via?: boolean;
    sideOfRoad?: boolean;
    vehicleStopover?: boolean;
}
/**
 * Travel mode for route computation
 */
export declare enum TravelMode {
    TRAVEL_MODE_UNSPECIFIED = "TRAVEL_MODE_UNSPECIFIED",
    DRIVE = "DRIVE",
    BICYCLE = "BICYCLE",
    WALK = "WALK",
    TWO_WHEELER = "TWO_WHEELER",
    TRANSIT = "TRANSIT"
}
/**
 * Routing preference
 */
export declare enum RoutingPreference {
    ROUTING_PREFERENCE_UNSPECIFIED = "ROUTING_PREFERENCE_UNSPECIFIED",
    TRAFFIC_UNAWARE = "TRAFFIC_UNAWARE",
    TRAFFIC_AWARE = "TRAFFIC_AWARE",
    TRAFFIC_AWARE_OPTIMAL = "TRAFFIC_AWARE_OPTIMAL"
}
/**
 * Route modifiers for avoiding specific features
 */
export interface RouteModifiers {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
    avoidIndoor?: boolean;
}
/**
 * Polyline encoding quality
 */
export declare enum PolylineQuality {
    POLYLINE_QUALITY_UNSPECIFIED = "POLYLINE_QUALITY_UNSPECIFIED",
    HIGH_QUALITY = "HIGH_QUALITY",
    OVERVIEW = "OVERVIEW"
}
/**
 * Polyline encoding type
 */
export declare enum PolylineEncoding {
    POLYLINE_ENCODING_UNSPECIFIED = "POLYLINE_ENCODING_UNSPECIFIED",
    ENCODED_POLYLINE = "ENCODED_POLYLINE",
    GEO_JSON_LINESTRING = "GEO_JSON_LINESTRING"
}
/**
 * Units for distance and duration display
 */
export declare enum Units {
    UNITS_UNSPECIFIED = "UNITS_UNSPECIFIED",
    METRIC = "METRIC",
    IMPERIAL = "IMPERIAL"
}
/**
 * Polyline representation of a route path
 */
export interface Polyline {
    encodedPolyline?: string;
    geoJsonLinestring?: {
        type: 'LineString';
        coordinates: number[][];
    };
}
/**
 * Viewport bounds
 */
export interface Viewport {
    low: LatLng;
    high: LatLng;
}
/**
 * A navigation instruction step
 */
export interface NavigationInstruction {
    maneuver: string;
    instructions: string;
}
/**
 * Route leg information
 */
export interface RouteLeg {
    distanceMeters: number;
    duration: string;
    staticDuration: string;
    polyline?: Polyline;
    startLocation: Location;
    endLocation: Location;
    steps?: RouteLegStep[];
    localizedValues?: RouteLegLocalizedValues;
}
/**
 * Localized values for route leg
 */
export interface RouteLegLocalizedValues {
    distance?: {
        text: string;
    };
    duration?: {
        text: string;
    };
    staticDuration?: {
        text: string;
    };
}
/**
 * A step within a route leg
 */
export interface RouteLegStep {
    distanceMeters: number;
    duration: string;
    staticDuration: string;
    polyline?: Polyline;
    startLocation: Location;
    endLocation: Location;
    navigationInstruction?: NavigationInstruction;
    localizedValues?: {
        distance?: {
            text: string;
        };
        staticDuration?: {
            text: string;
        };
    };
    travelMode?: TravelMode;
}
/**
 * Route travel advisory (warnings, restrictions, etc.)
 */
export interface RouteTravelAdvisory {
    tollInfo?: {
        estimatedPrice?: Array<{
            currencyCode: string;
            units: string;
            nanos: number;
        }>;
    };
    speedReadingIntervals?: Array<{
        startPolylinePointIndex: number;
        endPolylinePointIndex: number;
        speed: string;
    }>;
    fuelConsumptionMicroliters?: string;
    routeRestrictionsPartiallyIgnored?: boolean;
    transitFare?: {
        currencyCode: string;
        units: string;
        nanos: number;
    };
}
/**
 * Computed route response
 */
export interface Route {
    legs: RouteLeg[];
    distanceMeters: number;
    duration: string;
    staticDuration: string;
    polyline?: Polyline;
    description?: string;
    warnings?: string[];
    viewport?: Viewport;
    travelAdvisory?: RouteTravelAdvisory;
    optimizedIntermediateWaypointIndex?: number[];
    localizedValues?: {
        distance?: {
            text: string;
        };
        duration?: {
            text: string;
        };
        staticDuration?: {
            text: string;
        };
    };
}
/**
 * Input for computing routes
 */
export interface ComputeRoutesInput {
    origin: Waypoint;
    destination: Waypoint;
    intermediates?: Waypoint[];
    travelMode?: TravelMode;
    routingPreference?: RoutingPreference;
    polylineQuality?: PolylineQuality;
    polylineEncoding?: PolylineEncoding;
    departureTime?: Date;
    arrivalTime?: Date;
    computeAlternativeRoutes?: boolean;
    routeModifiers?: RouteModifiers;
    languageCode?: string;
    units?: Units;
    optimizeWaypointOrder?: boolean;
    requestedReferenceRoutes?: string[];
    extraComputations?: string[];
    regionCode?: string;
}
/**
 * Response from compute routes API
 */
export interface ComputeRoutesResponse {
    routes: Route[];
    fallbackInfo?: {
        routingMode: string;
        reason: string;
    };
    geocodingResults?: {
        origin?: {
            placeId: string;
            intermediateWaypointRequestIndex?: number;
        };
        destination?: {
            placeId: string;
        };
        intermediates?: Array<{
            placeId: string;
            intermediateWaypointRequestIndex: number;
        }>;
    };
}
/**
 * Route matrix element
 */
export interface RouteMatrixElement {
    originIndex?: number;
    destinationIndex?: number;
    status?: {
        code: number;
        message: string;
    };
    condition?: string;
    distanceMeters?: number;
    duration?: string;
    staticDuration?: string;
    travelAdvisory?: RouteTravelAdvisory;
    fallbackInfo?: {
        routingMode: string;
        reason: string;
    };
    localizedValues?: {
        distance?: {
            text: string;
        };
        duration?: {
            text: string;
        };
        staticDuration?: {
            text: string;
        };
    };
}
/**
 * Route matrix origin
 */
export interface RouteMatrixOrigin {
    waypoint: Waypoint;
    routeModifiers?: RouteModifiers;
}
/**
 * Route matrix destination
 */
export interface RouteMatrixDestination {
    waypoint: Waypoint;
}
/**
 * Input for computing route matrix
 */
export interface ComputeRouteMatrixInput {
    origins: RouteMatrixOrigin[];
    destinations: RouteMatrixDestination[];
    travelMode?: TravelMode;
    routingPreference?: RoutingPreference;
    departureTime?: Date;
    arrivalTime?: Date;
    languageCode?: string;
    units?: Units;
    regionCode?: string;
    extraComputations?: string[];
}
/**
 * Response from compute route matrix API
 */
export interface ComputeRouteMatrixResponse {
    elements: RouteMatrixElement[];
}
/**
 * Batch request item for route computation
 */
export interface BatchComputeRoutesItem {
    input: ComputeRoutesInput;
    requestId?: string;
}
/**
 * Batch request result
 */
export interface BatchComputeRoutesResult {
    input: ComputeRoutesInput;
    requestId?: string;
    result: ComputeRoutesResponse | null;
    error?: Error;
    success: boolean;
}
/**
 * API status codes from Google Routes API
 */
export declare enum GoogleRoutesStatus {
    OK = "OK",
    NOT_FOUND = "NOT_FOUND",
    ZERO_RESULTS = "ZERO_RESULTS",
    MAX_WAYPOINTS_EXCEEDED = "MAX_WAYPOINTS_EXCEEDED",
    MAX_ROUTE_LENGTH_EXCEEDED = "MAX_ROUTE_LENGTH_EXCEEDED",
    INVALID_REQUEST = "INVALID_REQUEST",
    INVALID_ARGUMENT = "INVALID_ARGUMENT",
    OVER_DAILY_LIMIT = "OVER_DAILY_LIMIT",
    OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
    REQUEST_DENIED = "REQUEST_DENIED",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
/**
 * Raw API response structure from Google Routes API
 */
export interface RawComputeRoutesResponse {
    routes: Route[];
    fallbackInfo?: {
        routingMode: string;
        reason: string;
    };
    geocodingResults?: {
        origin?: {
            placeId: string;
        };
        destination?: {
            placeId: string;
        };
    };
}
/**
 * Converts duration string (e.g., "120s") to seconds
 */
export declare function parseDuration(duration: string): number;
/**
 * Converts duration string to minutes
 */
export declare function parseDurationMinutes(duration: string): number;
/**
 * Formats duration in seconds to string format (e.g., "120s")
 */
export declare function formatDuration(seconds: number): string;
/**
 * Converts meters to kilometers
 */
export declare function metersToKilometers(meters: number): number;
/**
 * Converts meters to miles
 */
export declare function metersToMiles(meters: number): number;
//# sourceMappingURL=google-routes.d.ts.map