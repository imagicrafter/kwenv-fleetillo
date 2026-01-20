"use strict";
/**
 * Vehicle Location types - junction table for vehicle-location relationships
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToVehicleLocation = rowToVehicleLocation;
/**
 * Converts a database row to a VehicleLocation entity
 */
function rowToVehicleLocation(row) {
    return {
        id: row.id,
        vehicleId: row.vehicle_id,
        locationId: row.location_id,
        isPrimary: row.is_primary,
        createdAt: new Date(row.created_at),
    };
}
//# sourceMappingURL=vehicle-location.js.map