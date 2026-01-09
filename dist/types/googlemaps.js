"use strict";
/**
 * Google Maps API type definitions for RouteIQ application
 * Provides types for geocoding and address validation functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rawToGeocodingResult = rawToGeocodingResult;
exports.extractStructuredAddress = extractStructuredAddress;
/**
 * Converts a raw geocoding result to a structured GeocodingResult
 */
function rawToGeocodingResult(raw) {
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
            types: comp.types,
        })),
        locationType: raw.geometry.location_type,
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
function extractStructuredAddress(result) {
    const getComponent = (type) => {
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
//# sourceMappingURL=googlemaps.js.map