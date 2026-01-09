"use strict";
/**
 * Google Routes API Type Definitions
 *
 * Provides type-safe interfaces for the Google Routes API (v2).
 * Based on the official Google Routes API REST reference.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleRoutesStatus = exports.Units = exports.PolylineEncoding = exports.PolylineQuality = exports.RoutingPreference = exports.TravelMode = void 0;
exports.parseDuration = parseDuration;
exports.parseDurationMinutes = parseDurationMinutes;
exports.formatDuration = formatDuration;
exports.metersToKilometers = metersToKilometers;
exports.metersToMiles = metersToMiles;
/**
 * Travel mode for route computation
 */
var TravelMode;
(function (TravelMode) {
    TravelMode["TRAVEL_MODE_UNSPECIFIED"] = "TRAVEL_MODE_UNSPECIFIED";
    TravelMode["DRIVE"] = "DRIVE";
    TravelMode["BICYCLE"] = "BICYCLE";
    TravelMode["WALK"] = "WALK";
    TravelMode["TWO_WHEELER"] = "TWO_WHEELER";
    TravelMode["TRANSIT"] = "TRANSIT";
})(TravelMode || (exports.TravelMode = TravelMode = {}));
/**
 * Routing preference
 */
var RoutingPreference;
(function (RoutingPreference) {
    RoutingPreference["ROUTING_PREFERENCE_UNSPECIFIED"] = "ROUTING_PREFERENCE_UNSPECIFIED";
    RoutingPreference["TRAFFIC_UNAWARE"] = "TRAFFIC_UNAWARE";
    RoutingPreference["TRAFFIC_AWARE"] = "TRAFFIC_AWARE";
    RoutingPreference["TRAFFIC_AWARE_OPTIMAL"] = "TRAFFIC_AWARE_OPTIMAL";
})(RoutingPreference || (exports.RoutingPreference = RoutingPreference = {}));
/**
 * Polyline encoding quality
 */
var PolylineQuality;
(function (PolylineQuality) {
    PolylineQuality["POLYLINE_QUALITY_UNSPECIFIED"] = "POLYLINE_QUALITY_UNSPECIFIED";
    PolylineQuality["HIGH_QUALITY"] = "HIGH_QUALITY";
    PolylineQuality["OVERVIEW"] = "OVERVIEW";
})(PolylineQuality || (exports.PolylineQuality = PolylineQuality = {}));
/**
 * Polyline encoding type
 */
var PolylineEncoding;
(function (PolylineEncoding) {
    PolylineEncoding["POLYLINE_ENCODING_UNSPECIFIED"] = "POLYLINE_ENCODING_UNSPECIFIED";
    PolylineEncoding["ENCODED_POLYLINE"] = "ENCODED_POLYLINE";
    PolylineEncoding["GEO_JSON_LINESTRING"] = "GEO_JSON_LINESTRING";
})(PolylineEncoding || (exports.PolylineEncoding = PolylineEncoding = {}));
/**
 * Units for distance and duration display
 */
var Units;
(function (Units) {
    Units["UNITS_UNSPECIFIED"] = "UNITS_UNSPECIFIED";
    Units["METRIC"] = "METRIC";
    Units["IMPERIAL"] = "IMPERIAL";
})(Units || (exports.Units = Units = {}));
/**
 * API status codes from Google Routes API
 */
var GoogleRoutesStatus;
(function (GoogleRoutesStatus) {
    GoogleRoutesStatus["OK"] = "OK";
    GoogleRoutesStatus["NOT_FOUND"] = "NOT_FOUND";
    GoogleRoutesStatus["ZERO_RESULTS"] = "ZERO_RESULTS";
    GoogleRoutesStatus["MAX_WAYPOINTS_EXCEEDED"] = "MAX_WAYPOINTS_EXCEEDED";
    GoogleRoutesStatus["MAX_ROUTE_LENGTH_EXCEEDED"] = "MAX_ROUTE_LENGTH_EXCEEDED";
    GoogleRoutesStatus["INVALID_REQUEST"] = "INVALID_REQUEST";
    GoogleRoutesStatus["INVALID_ARGUMENT"] = "INVALID_ARGUMENT";
    GoogleRoutesStatus["OVER_DAILY_LIMIT"] = "OVER_DAILY_LIMIT";
    GoogleRoutesStatus["OVER_QUERY_LIMIT"] = "OVER_QUERY_LIMIT";
    GoogleRoutesStatus["REQUEST_DENIED"] = "REQUEST_DENIED";
    GoogleRoutesStatus["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(GoogleRoutesStatus || (exports.GoogleRoutesStatus = GoogleRoutesStatus = {}));
/**
 * Converts duration string (e.g., "120s") to seconds
 */
function parseDuration(duration) {
    if (!duration)
        return 0;
    const match = duration.match(/^(\d+)s$/);
    return match && match[1] ? parseInt(match[1], 10) : 0;
}
/**
 * Converts duration string to minutes
 */
function parseDurationMinutes(duration) {
    return Math.round(parseDuration(duration) / 60);
}
/**
 * Formats duration in seconds to string format (e.g., "120s")
 */
function formatDuration(seconds) {
    return `${seconds}s`;
}
/**
 * Converts meters to kilometers
 */
function metersToKilometers(meters) {
    return meters / 1000;
}
/**
 * Converts meters to miles
 */
function metersToMiles(meters) {
    return meters * 0.000621371;
}
//# sourceMappingURL=google-routes.js.map