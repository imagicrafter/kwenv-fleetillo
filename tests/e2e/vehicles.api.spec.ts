/**
 * Vehicles API Verification Test
 *
 * This test verifies that the vehicles table schema and service are properly
 * implemented and can be imported correctly.
 */

import { test, expect } from '@playwright/test';

// Import types and functions to verify they exist and are properly exported
import type {
  Vehicle,
  VehicleRow,
  VehicleStatus,
  FuelType,
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleFilters,
  VehicleCapacity,
  VehicleLocation,
  VehicleMaintenanceInfo,
  VehicleFuelInfo,
} from '../../src/types/vehicle.js';

import {
  rowToVehicle,
  vehicleInputToRow,
} from '../../src/types/vehicle.js';

import {
  VehicleServiceError,
  VehicleErrorCodes,
} from '../../src/services/vehicle.service.js';

test.describe('Vehicles Schema and Types Verification', () => {

  test('Vehicle types are properly defined', () => {
    // Verify VehicleStatus type values
    const validStatuses: VehicleStatus[] = ['available', 'in_use', 'maintenance', 'out_of_service', 'retired'];
    expect(validStatuses).toHaveLength(5);

    // Verify FuelType type values
    const validFuelTypes: FuelType[] = ['gasoline', 'diesel', 'electric', 'hybrid', 'propane', 'natural_gas', 'other'];
    expect(validFuelTypes).toHaveLength(7);
  });

  test('CreateVehicleInput accepts valid data', () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      description: 'A test vehicle',
      licensePlate: 'ABC123',
      vin: '1HGBH41JXMN109186',
      make: 'Ford',
      model: 'F-150',
      year: 2023,
      color: 'Blue',
      maxCapacityWeight: 1500,
      maxCapacityVolume: 100,
      maxPassengers: 5,
      serviceTypes: ['delivery', 'transport'],
      status: 'available',
      currentLatitude: 37.7749,
      currentLongitude: -122.4194,
      fuelType: 'gasoline',
      fuelCapacity: 26,
      currentFuelLevel: 75,
      notes: 'Test notes',
      tags: ['test', 'verification'],
    };

    expect(input.name).toBe('Test Vehicle');
    expect(input.serviceTypes).toContain('delivery');
    expect(input.status).toBe('available');
  });

  test('VehicleFilters supports all filter options', () => {
    const filters: VehicleFilters = {
      status: 'available',
      fuelType: 'electric',
      make: 'Tesla',
      model: 'Model 3',
      serviceTypes: ['delivery'],
      tags: ['electric'],
      searchTerm: 'test',
      includeDeleted: false,
    };

    expect(filters.status).toBe('available');
    expect(filters.fuelType).toBe('electric');
    expect(filters.serviceTypes).toContain('delivery');
  });

  test('rowToVehicle correctly converts database row to Vehicle entity', () => {
    const row: VehicleRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Vehicle',
      description: 'A test vehicle',
      license_plate: 'ABC123',
      vin: '1HGBH41JXMN109186',
      make: 'Ford',
      model: 'F-150',
      year: 2023,
      color: 'Blue',
      max_capacity_weight: 1500,
      max_capacity_volume: 100,
      max_passengers: 5,
      service_types: ['delivery', 'transport'],
      status: 'available',
      current_latitude: 37.7749,
      current_longitude: -122.4194,
      last_location_update: '2025-12-27T12:00:00Z',
      fuel_type: 'gasoline',
      fuel_capacity: 26,
      current_fuel_level: 75,
      last_maintenance_date: '2025-01-01',
      next_maintenance_date: '2025-07-01',
      odometer_reading: 15000,
      assigned_driver_id: null,
      notes: 'Test notes',
      tags: ['test', 'verification'],
      created_at: '2025-12-27T00:00:00Z',
      updated_at: '2025-12-27T00:00:00Z',
      deleted_at: null,
    };

    const vehicle = rowToVehicle(row);

    expect(vehicle.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(vehicle.name).toBe('Test Vehicle');
    expect(vehicle.licensePlate).toBe('ABC123');
    expect(vehicle.make).toBe('Ford');
    expect(vehicle.model).toBe('F-150');
    expect(vehicle.serviceTypes).toEqual(['delivery', 'transport']);
    expect(vehicle.status).toBe('available');
    expect(vehicle.currentLatitude).toBe(37.7749);
    expect(vehicle.currentLongitude).toBe(-122.4194);
    expect(vehicle.fuelType).toBe('gasoline');
    expect(vehicle.createdAt).toBeInstanceOf(Date);
    expect(vehicle.updatedAt).toBeInstanceOf(Date);
    expect(vehicle.deletedAt).toBeUndefined();
  });

  test('vehicleInputToRow correctly converts input to database row format', () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      licensePlate: 'XYZ789',
      make: 'Toyota',
      model: 'Camry',
      year: 2024,
      serviceTypes: ['rideshare'],
      status: 'in_use',
      fuelType: 'hybrid',
    };

    const row = vehicleInputToRow(input);

    expect(row.name).toBe('Test Vehicle');
    expect(row.license_plate).toBe('XYZ789');
    expect(row.make).toBe('Toyota');
    expect(row.model).toBe('Camry');
    expect(row.year).toBe(2024);
    expect(row.service_types).toEqual(['rideshare']);
    expect(row.status).toBe('in_use');
    expect(row.fuel_type).toBe('hybrid');
    // Null fields should be explicitly null
    expect(row.vin).toBeNull();
    expect(row.description).toBeNull();
    expect(row.assigned_driver_id).toBeNull();
  });

  test('VehicleServiceError and error codes are properly defined', () => {
    const error = new VehicleServiceError('Test error', VehicleErrorCodes.NOT_FOUND, { id: 'test' });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('VehicleServiceError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('VEHICLE_NOT_FOUND');
    expect(error.details).toEqual({ id: 'test' });

    // Verify all error codes exist
    expect(VehicleErrorCodes.NOT_FOUND).toBe('VEHICLE_NOT_FOUND');
    expect(VehicleErrorCodes.CREATE_FAILED).toBe('VEHICLE_CREATE_FAILED');
    expect(VehicleErrorCodes.UPDATE_FAILED).toBe('VEHICLE_UPDATE_FAILED');
    expect(VehicleErrorCodes.DELETE_FAILED).toBe('VEHICLE_DELETE_FAILED');
    expect(VehicleErrorCodes.QUERY_FAILED).toBe('VEHICLE_QUERY_FAILED');
    expect(VehicleErrorCodes.VALIDATION_FAILED).toBe('VEHICLE_VALIDATION_FAILED');
  });

  test('Vehicle entity supports all required fields', () => {
    // Verify Vehicle interface has all required fields
    const vehicle: Vehicle = {
      id: '123',
      name: 'Test',
      serviceTypes: ['delivery'],
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(vehicle.id).toBeDefined();
    expect(vehicle.name).toBeDefined();
    expect(vehicle.serviceTypes).toBeInstanceOf(Array);
    expect(vehicle.status).toBeDefined();
    expect(vehicle.createdAt).toBeInstanceOf(Date);
    expect(vehicle.updatedAt).toBeInstanceOf(Date);
  });

  test('VehicleCapacity interface is properly defined', () => {
    const capacity: VehicleCapacity = {
      maxWeight: 1000,
      maxVolume: 50,
      maxPassengers: 4,
    };

    expect(capacity.maxWeight).toBe(1000);
    expect(capacity.maxVolume).toBe(50);
    expect(capacity.maxPassengers).toBe(4);
  });

  test('VehicleLocation interface is properly defined', () => {
    const location: VehicleLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      lastUpdate: new Date(),
    };

    expect(location.latitude).toBe(40.7128);
    expect(location.longitude).toBe(-74.0060);
    expect(location.lastUpdate).toBeInstanceOf(Date);
  });

  test('VehicleMaintenanceInfo interface is properly defined', () => {
    const maintenance: VehicleMaintenanceInfo = {
      lastMaintenanceDate: new Date('2025-01-01'),
      nextMaintenanceDate: new Date('2025-07-01'),
      odometerReading: 50000,
    };

    expect(maintenance.lastMaintenanceDate).toBeInstanceOf(Date);
    expect(maintenance.nextMaintenanceDate).toBeInstanceOf(Date);
    expect(maintenance.odometerReading).toBe(50000);
  });

  test('VehicleFuelInfo interface is properly defined', () => {
    const fuelInfo: VehicleFuelInfo = {
      fuelType: 'electric',
      fuelCapacity: 100, // kWh for electric
      currentFuelLevel: 85,
    };

    expect(fuelInfo.fuelType).toBe('electric');
    expect(fuelInfo.fuelCapacity).toBe(100);
    expect(fuelInfo.currentFuelLevel).toBe(85);
  });

  test('UpdateVehicleInput extends CreateVehicleInput with id', () => {
    const updateInput: UpdateVehicleInput = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Updated Vehicle Name',
      status: 'maintenance',
    };

    expect(updateInput.id).toBeDefined();
    expect(updateInput.name).toBe('Updated Vehicle Name');
    expect(updateInput.status).toBe('maintenance');
  });

});
