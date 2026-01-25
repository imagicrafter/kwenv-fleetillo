/**
 * Vehicle-related type definitions for RouteIQ application
 */
import type { ID, Timestamps } from './common';
/**
 * Vehicle status options
 */
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service' | 'retired';
/**
 * Fuel type options
 */
export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'propane' | 'natural_gas' | 'other';
/**
 * Vehicle capacity information
 */
export interface VehicleCapacity {
    maxWeight?: number;
    maxVolume?: number;
    maxPassengers?: number;
}
/**
 * Vehicle location information
 */
export interface VehicleLocation {
    latitude: number;
    longitude: number;
    lastUpdate?: Date;
}
/**
 * Vehicle maintenance information
 */
export interface VehicleMaintenanceInfo {
    lastMaintenanceDate?: Date;
    nextMaintenanceDate?: Date;
    odometerReading?: number;
}
/**
 * Vehicle fuel information
 */
export interface VehicleFuelInfo {
    fuelType?: FuelType;
    fuelCapacity?: number;
    currentFuelLevel?: number;
}
/**
 * Vehicle entity representing a vehicle in the system
 */
export interface Vehicle extends Timestamps {
    id: ID;
    name: string;
    description?: string;
    licensePlate?: string;
    vin?: string;
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    maxCapacityWeight?: number;
    maxCapacityVolume?: number;
    maxPassengers?: number;
    serviceTypes: string[];
    status: VehicleStatus;
    currentLatitude?: number;
    currentLongitude?: number;
    lastLocationUpdate?: Date;
    fuelType?: FuelType;
    fuelCapacity?: number;
    currentFuelLevel?: number;
    fuelEfficiencyMpg?: number;
    lastMaintenanceDate?: Date;
    nextMaintenanceDate?: Date;
    odometerReading?: number;
    assignedDriverId?: ID;
    homeLocationId?: ID;
    notes?: string;
    tags?: string[];
    deletedAt?: Date;
}
/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface VehicleRow {
    id: string;
    name: string;
    description: string | null;
    license_plate: string | null;
    vin: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    max_capacity_weight: number | null;
    max_capacity_volume: number | null;
    max_passengers: number | null;
    service_types: string[];
    status: VehicleStatus;
    current_latitude: number | null;
    current_longitude: number | null;
    last_location_update: string | null;
    fuel_type: FuelType | null;
    fuel_capacity: number | null;
    current_fuel_level: number | null;
    fuel_efficiency_mpg: number | null;
    last_maintenance_date: string | null;
    next_maintenance_date: string | null;
    odometer_reading: number | null;
    assigned_driver_id: string | null;
    home_location_id: string | null;
    notes: string | null;
    tags: string[] | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}
/**
 * Input for creating a new vehicle
 */
export interface CreateVehicleInput {
    name: string;
    description?: string;
    licensePlate?: string;
    vin?: string;
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    maxCapacityWeight?: number;
    maxCapacityVolume?: number;
    maxPassengers?: number;
    serviceTypes?: string[];
    status?: VehicleStatus;
    currentLatitude?: number;
    currentLongitude?: number;
    fuelType?: FuelType;
    fuelCapacity?: number;
    currentFuelLevel?: number;
    fuelEfficiencyMpg?: number;
    lastMaintenanceDate?: Date;
    nextMaintenanceDate?: Date;
    odometerReading?: number;
    assignedDriverId?: ID;
    homeLocationId?: ID;
    notes?: string;
    tags?: string[];
}
/**
 * Input for updating an existing vehicle
 */
export interface UpdateVehicleInput extends Partial<CreateVehicleInput> {
    id: ID;
}
/**
 * Vehicle filter options for queries
 */
export interface VehicleFilters {
    status?: VehicleStatus;
    fuelType?: FuelType;
    make?: string;
    model?: string;
    serviceTypes?: string[];
    assignedDriverId?: ID;
    tags?: string[];
    searchTerm?: string;
    includeDeleted?: boolean;
}
/**
 * Converts a database row to a Vehicle entity
 */
export declare function rowToVehicle(row: VehicleRow): Vehicle;
/**
 * Converts a CreateVehicleInput to a database row format
 *
 * Important: Only includes fields that are explicitly defined in the input.
 * This prevents undefined fields from overwriting existing values during updates.
 */
export declare function vehicleInputToRow(input: CreateVehicleInput): Partial<VehicleRow>;
//# sourceMappingURL=vehicle.d.ts.map