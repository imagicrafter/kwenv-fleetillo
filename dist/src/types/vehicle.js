"use strict";
/**
 * Vehicle-related type definitions for RouteIQ application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToVehicle = rowToVehicle;
exports.vehicleInputToRow = vehicleInputToRow;
/**
 * Converts a database row to a Vehicle entity
 */
function rowToVehicle(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        licensePlate: row.license_plate ?? undefined,
        vin: row.vin ?? undefined,
        make: row.make ?? undefined,
        model: row.model ?? undefined,
        year: row.year ?? undefined,
        color: row.color ?? undefined,
        maxCapacityWeight: row.max_capacity_weight ?? undefined,
        maxCapacityVolume: row.max_capacity_volume ?? undefined,
        maxPassengers: row.max_passengers ?? undefined,
        serviceTypes: row.service_types ?? [],
        status: row.status,
        currentLatitude: row.current_latitude ?? undefined,
        currentLongitude: row.current_longitude ?? undefined,
        lastLocationUpdate: row.last_location_update ? new Date(row.last_location_update) : undefined,
        fuelType: row.fuel_type ?? undefined,
        fuelCapacity: row.fuel_capacity ?? undefined,
        currentFuelLevel: row.current_fuel_level ?? undefined,
        lastMaintenanceDate: row.last_maintenance_date ? new Date(row.last_maintenance_date) : undefined,
        nextMaintenanceDate: row.next_maintenance_date ? new Date(row.next_maintenance_date) : undefined,
        odometerReading: row.odometer_reading ?? undefined,
        assignedDriverId: row.assigned_driver_id ?? undefined,
        homeLocationId: row.home_location_id ?? undefined,
        notes: row.notes ?? undefined,
        tags: row.tags ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
}
/**
 * Converts a CreateVehicleInput to a database row format
 */
function vehicleInputToRow(input) {
    return {
        name: input.name,
        description: input.description ?? null,
        license_plate: input.licensePlate ?? null,
        vin: input.vin ?? null,
        make: input.make ?? null,
        model: input.model ?? null,
        year: input.year ?? null,
        color: input.color ?? null,
        max_capacity_weight: input.maxCapacityWeight ?? null,
        max_capacity_volume: input.maxCapacityVolume ?? null,
        max_passengers: input.maxPassengers ?? null,
        service_types: input.serviceTypes ?? [],
        status: input.status ?? 'available',
        current_latitude: input.currentLatitude ?? null,
        current_longitude: input.currentLongitude ?? null,
        fuel_type: input.fuelType ?? null,
        fuel_capacity: input.fuelCapacity ?? null,
        current_fuel_level: input.currentFuelLevel ?? null,
        last_maintenance_date: input.lastMaintenanceDate?.toISOString().split('T')[0] ?? null,
        next_maintenance_date: input.nextMaintenanceDate?.toISOString().split('T')[0] ?? null,
        odometer_reading: input.odometerReading ?? null,
        assigned_driver_id: input.assignedDriverId ?? null,
        home_location_id: input.homeLocationId ?? null,
        notes: input.notes ?? null,
        tags: input.tags ?? null,
    };
}
//# sourceMappingURL=vehicle.js.map