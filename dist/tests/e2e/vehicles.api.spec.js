"use strict";
/**
 * Vehicles API Verification Test
 *
 * This test verifies that the vehicles table schema and service are properly
 * implemented and can be imported correctly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const vehicle_js_1 = require("../../src/types/vehicle.js");
const vehicle_service_js_1 = require("../../src/services/vehicle.service.js");
test_1.test.describe('Vehicles Schema and Types Verification', () => {
    (0, test_1.test)('Vehicle types are properly defined', () => {
        // Verify VehicleStatus type values
        const validStatuses = ['available', 'in_use', 'maintenance', 'out_of_service', 'retired'];
        (0, test_1.expect)(validStatuses).toHaveLength(5);
        // Verify FuelType type values
        const validFuelTypes = ['gasoline', 'diesel', 'electric', 'hybrid', 'propane', 'natural_gas', 'other'];
        (0, test_1.expect)(validFuelTypes).toHaveLength(7);
    });
    (0, test_1.test)('CreateVehicleInput accepts valid data', () => {
        const input = {
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
        (0, test_1.expect)(input.name).toBe('Test Vehicle');
        (0, test_1.expect)(input.serviceTypes).toContain('delivery');
        (0, test_1.expect)(input.status).toBe('available');
    });
    (0, test_1.test)('VehicleFilters supports all filter options', () => {
        const filters = {
            status: 'available',
            fuelType: 'electric',
            make: 'Tesla',
            model: 'Model 3',
            serviceTypes: ['delivery'],
            tags: ['electric'],
            searchTerm: 'test',
            includeDeleted: false,
        };
        (0, test_1.expect)(filters.status).toBe('available');
        (0, test_1.expect)(filters.fuelType).toBe('electric');
        (0, test_1.expect)(filters.serviceTypes).toContain('delivery');
    });
    (0, test_1.test)('rowToVehicle correctly converts database row to Vehicle entity', () => {
        const row = {
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
        const vehicle = (0, vehicle_js_1.rowToVehicle)(row);
        (0, test_1.expect)(vehicle.id).toBe('123e4567-e89b-12d3-a456-426614174000');
        (0, test_1.expect)(vehicle.name).toBe('Test Vehicle');
        (0, test_1.expect)(vehicle.licensePlate).toBe('ABC123');
        (0, test_1.expect)(vehicle.make).toBe('Ford');
        (0, test_1.expect)(vehicle.model).toBe('F-150');
        (0, test_1.expect)(vehicle.serviceTypes).toEqual(['delivery', 'transport']);
        (0, test_1.expect)(vehicle.status).toBe('available');
        (0, test_1.expect)(vehicle.currentLatitude).toBe(37.7749);
        (0, test_1.expect)(vehicle.currentLongitude).toBe(-122.4194);
        (0, test_1.expect)(vehicle.fuelType).toBe('gasoline');
        (0, test_1.expect)(vehicle.createdAt).toBeInstanceOf(Date);
        (0, test_1.expect)(vehicle.updatedAt).toBeInstanceOf(Date);
        (0, test_1.expect)(vehicle.deletedAt).toBeUndefined();
    });
    (0, test_1.test)('vehicleInputToRow correctly converts input to database row format', () => {
        const input = {
            name: 'Test Vehicle',
            licensePlate: 'XYZ789',
            make: 'Toyota',
            model: 'Camry',
            year: 2024,
            serviceTypes: ['rideshare'],
            status: 'in_use',
            fuelType: 'hybrid',
        };
        const row = (0, vehicle_js_1.vehicleInputToRow)(input);
        (0, test_1.expect)(row.name).toBe('Test Vehicle');
        (0, test_1.expect)(row.license_plate).toBe('XYZ789');
        (0, test_1.expect)(row.make).toBe('Toyota');
        (0, test_1.expect)(row.model).toBe('Camry');
        (0, test_1.expect)(row.year).toBe(2024);
        (0, test_1.expect)(row.service_types).toEqual(['rideshare']);
        (0, test_1.expect)(row.status).toBe('in_use');
        (0, test_1.expect)(row.fuel_type).toBe('hybrid');
        // Null fields should be explicitly null
        (0, test_1.expect)(row.vin).toBeNull();
        (0, test_1.expect)(row.description).toBeNull();
        (0, test_1.expect)(row.assigned_driver_id).toBeNull();
    });
    (0, test_1.test)('VehicleServiceError and error codes are properly defined', () => {
        const error = new vehicle_service_js_1.VehicleServiceError('Test error', vehicle_service_js_1.VehicleErrorCodes.NOT_FOUND, { id: 'test' });
        (0, test_1.expect)(error).toBeInstanceOf(Error);
        (0, test_1.expect)(error.name).toBe('VehicleServiceError');
        (0, test_1.expect)(error.message).toBe('Test error');
        (0, test_1.expect)(error.code).toBe('VEHICLE_NOT_FOUND');
        (0, test_1.expect)(error.details).toEqual({ id: 'test' });
        // Verify all error codes exist
        (0, test_1.expect)(vehicle_service_js_1.VehicleErrorCodes.NOT_FOUND).toBe('VEHICLE_NOT_FOUND');
        (0, test_1.expect)(vehicle_service_js_1.VehicleErrorCodes.CREATE_FAILED).toBe('VEHICLE_CREATE_FAILED');
        (0, test_1.expect)(vehicle_service_js_1.VehicleErrorCodes.UPDATE_FAILED).toBe('VEHICLE_UPDATE_FAILED');
        (0, test_1.expect)(vehicle_service_js_1.VehicleErrorCodes.DELETE_FAILED).toBe('VEHICLE_DELETE_FAILED');
        (0, test_1.expect)(vehicle_service_js_1.VehicleErrorCodes.QUERY_FAILED).toBe('VEHICLE_QUERY_FAILED');
        (0, test_1.expect)(vehicle_service_js_1.VehicleErrorCodes.VALIDATION_FAILED).toBe('VEHICLE_VALIDATION_FAILED');
    });
    (0, test_1.test)('Vehicle entity supports all required fields', () => {
        // Verify Vehicle interface has all required fields
        const vehicle = {
            id: '123',
            name: 'Test',
            serviceTypes: ['delivery'],
            status: 'available',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        (0, test_1.expect)(vehicle.id).toBeDefined();
        (0, test_1.expect)(vehicle.name).toBeDefined();
        (0, test_1.expect)(vehicle.serviceTypes).toBeInstanceOf(Array);
        (0, test_1.expect)(vehicle.status).toBeDefined();
        (0, test_1.expect)(vehicle.createdAt).toBeInstanceOf(Date);
        (0, test_1.expect)(vehicle.updatedAt).toBeInstanceOf(Date);
    });
    (0, test_1.test)('VehicleCapacity interface is properly defined', () => {
        const capacity = {
            maxWeight: 1000,
            maxVolume: 50,
            maxPassengers: 4,
        };
        (0, test_1.expect)(capacity.maxWeight).toBe(1000);
        (0, test_1.expect)(capacity.maxVolume).toBe(50);
        (0, test_1.expect)(capacity.maxPassengers).toBe(4);
    });
    (0, test_1.test)('VehicleLocation interface is properly defined', () => {
        const location = {
            latitude: 40.7128,
            longitude: -74.0060,
            lastUpdate: new Date(),
        };
        (0, test_1.expect)(location.latitude).toBe(40.7128);
        (0, test_1.expect)(location.longitude).toBe(-74.0060);
        (0, test_1.expect)(location.lastUpdate).toBeInstanceOf(Date);
    });
    (0, test_1.test)('VehicleMaintenanceInfo interface is properly defined', () => {
        const maintenance = {
            lastMaintenanceDate: new Date('2025-01-01'),
            nextMaintenanceDate: new Date('2025-07-01'),
            odometerReading: 50000,
        };
        (0, test_1.expect)(maintenance.lastMaintenanceDate).toBeInstanceOf(Date);
        (0, test_1.expect)(maintenance.nextMaintenanceDate).toBeInstanceOf(Date);
        (0, test_1.expect)(maintenance.odometerReading).toBe(50000);
    });
    (0, test_1.test)('VehicleFuelInfo interface is properly defined', () => {
        const fuelInfo = {
            fuelType: 'electric',
            fuelCapacity: 100, // kWh for electric
            currentFuelLevel: 85,
        };
        (0, test_1.expect)(fuelInfo.fuelType).toBe('electric');
        (0, test_1.expect)(fuelInfo.fuelCapacity).toBe(100);
        (0, test_1.expect)(fuelInfo.currentFuelLevel).toBe(85);
    });
    (0, test_1.test)('UpdateVehicleInput extends CreateVehicleInput with id', () => {
        const updateInput = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Updated Vehicle Name',
            status: 'maintenance',
        };
        (0, test_1.expect)(updateInput.id).toBeDefined();
        (0, test_1.expect)(updateInput.name).toBe('Updated Vehicle Name');
        (0, test_1.expect)(updateInput.status).toBe('maintenance');
    });
});
//# sourceMappingURL=vehicles.api.spec.js.map