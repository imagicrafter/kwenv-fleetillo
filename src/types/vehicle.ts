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

  // Vehicle identification
  licensePlate?: string;
  vin?: string;

  // Vehicle specifications
  make?: string;
  model?: string;
  year?: number;
  color?: string;

  // Capacity
  maxCapacityWeight?: number;
  maxCapacityVolume?: number;
  maxPassengers?: number;

  // Service type capabilities
  serviceTypes: string[];

  // Status
  status: VehicleStatus;

  // Current location
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: Date;

  // Fuel information
  fuelType?: FuelType;
  fuelCapacity?: number;
  currentFuelLevel?: number;
  fuelEfficiencyMpg?: number;  // Miles per gallon for cost calculation

  // Maintenance
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  odometerReading?: number;

  // Assignment
  assignedDriverId?: ID;
  homeLocationId?: ID;

  // Metadata
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;

  // Soft delete
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
  metadata: Record<string, unknown> | null;
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
  metadata?: Record<string, unknown>;
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
export function rowToVehicle(row: VehicleRow): Vehicle {
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
    metadata: row.metadata ?? undefined,
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
export function vehicleInputToRow(input: CreateVehicleInput): Partial<VehicleRow> {
  const row: Partial<VehicleRow> = {};

  // Required field
  if (input.name !== undefined) row.name = input.name;

  // Basic info
  if (input.description !== undefined) row.description = input.description ?? null;
  if (input.licensePlate !== undefined) row.license_plate = input.licensePlate ?? null;
  if (input.vin !== undefined) row.vin = input.vin ?? null;
  if (input.make !== undefined) row.make = input.make ?? null;
  if (input.model !== undefined) row.model = input.model ?? null;
  if (input.year !== undefined) row.year = input.year ?? null;
  if (input.color !== undefined) row.color = input.color ?? null;

  // Capacity
  if (input.maxCapacityWeight !== undefined) row.max_capacity_weight = input.maxCapacityWeight ?? null;
  if (input.maxCapacityVolume !== undefined) row.max_capacity_volume = input.maxCapacityVolume ?? null;
  if (input.maxPassengers !== undefined) row.max_passengers = input.maxPassengers ?? null;

  // Service types
  if (input.serviceTypes !== undefined) row.service_types = input.serviceTypes ?? [];

  // Status
  if (input.status !== undefined) row.status = input.status;

  // Current location
  if (input.currentLatitude !== undefined) row.current_latitude = input.currentLatitude ?? null;
  if (input.currentLongitude !== undefined) row.current_longitude = input.currentLongitude ?? null;

  // Fuel info
  if (input.fuelType !== undefined) row.fuel_type = input.fuelType ?? null;
  if (input.fuelCapacity !== undefined) row.fuel_capacity = input.fuelCapacity ?? null;
  if (input.currentFuelLevel !== undefined) row.current_fuel_level = input.currentFuelLevel ?? null;
  if (input.fuelEfficiencyMpg !== undefined) row.fuel_efficiency_mpg = input.fuelEfficiencyMpg ?? null;

  // Maintenance
  if (input.lastMaintenanceDate !== undefined) {
    row.last_maintenance_date = input.lastMaintenanceDate?.toISOString().split('T')[0] ?? null;
  }
  if (input.nextMaintenanceDate !== undefined) {
    row.next_maintenance_date = input.nextMaintenanceDate?.toISOString().split('T')[0] ?? null;
  }
  if (input.odometerReading !== undefined) row.odometer_reading = input.odometerReading ?? null;

  // Assignments
  if (input.assignedDriverId !== undefined) row.assigned_driver_id = input.assignedDriverId ?? null;
  if (input.homeLocationId !== undefined) row.home_location_id = input.homeLocationId ?? null;

  // Metadata
  if (input.notes !== undefined) row.notes = input.notes ?? null;
  if (input.tags !== undefined) row.tags = input.tags ?? null;
  if (input.metadata !== undefined) row.metadata = input.metadata ?? null;

  return row;
}
