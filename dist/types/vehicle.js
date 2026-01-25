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
        fuelEfficiencyMpg: row.fuel_efficiency_mpg ?? undefined,
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
 *
 * Important: Only includes fields that are explicitly defined in the input.
 * This prevents undefined fields from overwriting existing values during updates.
 */
function vehicleInputToRow(input) {
    const row = {};
    // Required field
    if (input.name !== undefined)
        row.name = input.name;
    // Basic info
    if (input.description !== undefined)
        row.description = input.description ?? null;
    if (input.licensePlate !== undefined)
        row.license_plate = input.licensePlate ?? null;
    if (input.vin !== undefined)
        row.vin = input.vin ?? null;
    if (input.make !== undefined)
        row.make = input.make ?? null;
    if (input.model !== undefined)
        row.model = input.model ?? null;
    if (input.year !== undefined)
        row.year = input.year ?? null;
    if (input.color !== undefined)
        row.color = input.color ?? null;
    // Capacity
    if (input.maxCapacityWeight !== undefined)
        row.max_capacity_weight = input.maxCapacityWeight ?? null;
    if (input.maxCapacityVolume !== undefined)
        row.max_capacity_volume = input.maxCapacityVolume ?? null;
    if (input.maxPassengers !== undefined)
        row.max_passengers = input.maxPassengers ?? null;
    // Service types
    if (input.serviceTypes !== undefined)
        row.service_types = input.serviceTypes ?? [];
    // Status
    if (input.status !== undefined)
        row.status = input.status;
    // Current location
    if (input.currentLatitude !== undefined)
        row.current_latitude = input.currentLatitude ?? null;
    if (input.currentLongitude !== undefined)
        row.current_longitude = input.currentLongitude ?? null;
    // Fuel info
    if (input.fuelType !== undefined)
        row.fuel_type = input.fuelType ?? null;
    if (input.fuelCapacity !== undefined)
        row.fuel_capacity = input.fuelCapacity ?? null;
    if (input.currentFuelLevel !== undefined)
        row.current_fuel_level = input.currentFuelLevel ?? null;
    if (input.fuelEfficiencyMpg !== undefined)
        row.fuel_efficiency_mpg = input.fuelEfficiencyMpg ?? null;
    // Maintenance
    if (input.lastMaintenanceDate !== undefined) {
        row.last_maintenance_date = input.lastMaintenanceDate?.toISOString().split('T')[0] ?? null;
    }
    if (input.nextMaintenanceDate !== undefined) {
        row.next_maintenance_date = input.nextMaintenanceDate?.toISOString().split('T')[0] ?? null;
    }
    if (input.odometerReading !== undefined)
        row.odometer_reading = input.odometerReading ?? null;
    // Assignments
    if (input.assignedDriverId !== undefined)
        row.assigned_driver_id = input.assignedDriverId ?? null;
    if (input.homeLocationId !== undefined)
        row.home_location_id = input.homeLocationId ?? null;
    // Metadata
    if (input.notes !== undefined)
        row.notes = input.notes ?? null;
    if (input.tags !== undefined)
        row.tags = input.tags ?? null;
    return row;
}
//# sourceMappingURL=vehicle.js.map