"use strict";
/**
 * Vehicle Error Scenarios - E2E API Tests
 *
 * Comprehensive error scenario testing for Vehicle CRUD operations
 * Tests validation errors, database constraints, and edge cases
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const vehicle_service_js_1 = require("../../src/services/vehicle.service.js");
const supabase_js_1 = require("../../src/services/supabase.js");
test_1.test.beforeAll(async () => {
    await (0, supabase_js_1.initializeSupabase)();
});
test_1.test.afterAll(async () => {
    (0, supabase_js_1.resetSupabaseClient)();
});
test_1.test.describe('Vehicle Error Scenarios - Validation Errors', () => {
    (0, test_1.test)('should fail when name is missing', async () => {
        const input = {
        // name is missing
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
        (0, test_1.expect)(result.error?.message).toContain('name is required');
        (0, test_1.expect)(result.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.VALIDATION_FAILED);
        (0, test_1.expect)(result.error.details?.field).toBe('name');
    });
    (0, test_1.test)('should fail when name is empty string', async () => {
        const input = {
            name: '',
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('name is required');
        (0, test_1.expect)(result.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.VALIDATION_FAILED);
    });
    (0, test_1.test)('should fail when name is only whitespace', async () => {
        const input = {
            name: '   ',
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('name is required');
    });
    (0, test_1.test)('should fail when latitude is less than -90', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLatitude: -91,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Latitude must be between -90 and 90');
        (0, test_1.expect)(result.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.VALIDATION_FAILED);
        (0, test_1.expect)(result.error.details?.field).toBe('currentLatitude');
        (0, test_1.expect)(result.error.details?.value).toBe(-91);
    });
    (0, test_1.test)('should fail when latitude is greater than 90', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLatitude: 91,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Latitude must be between -90 and 90');
        (0, test_1.expect)(result.error.details?.value).toBe(91);
    });
    (0, test_1.test)('should fail when latitude is -90.001', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLatitude: -90.001,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Latitude must be between -90 and 90');
    });
    (0, test_1.test)('should fail when latitude is 90.001', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLatitude: 90.001,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Latitude must be between -90 and 90');
    });
    (0, test_1.test)('should fail when longitude is less than -180', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLongitude: -181,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Longitude must be between -180 and 180');
        (0, test_1.expect)(result.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.VALIDATION_FAILED);
        (0, test_1.expect)(result.error.details?.field).toBe('currentLongitude');
        (0, test_1.expect)(result.error.details?.value).toBe(-181);
    });
    (0, test_1.test)('should fail when longitude is greater than 180', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLongitude: 181,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Longitude must be between -180 and 180');
        (0, test_1.expect)(result.error.details?.value).toBe(181);
    });
    (0, test_1.test)('should fail when longitude is -180.001', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLongitude: -180.001,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Longitude must be between -180 and 180');
    });
    (0, test_1.test)('should fail when longitude is 180.001', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLongitude: 180.001,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Longitude must be between -180 and 180');
    });
    (0, test_1.test)('should fail when fuel level is negative', async () => {
        const input = {
            name: 'Test Vehicle',
            currentFuelLevel: -1,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Fuel level must be between 0 and 100');
        (0, test_1.expect)(result.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.VALIDATION_FAILED);
        (0, test_1.expect)(result.error.details?.field).toBe('currentFuelLevel');
        (0, test_1.expect)(result.error.details?.value).toBe(-1);
    });
    (0, test_1.test)('should fail when fuel level is greater than 100', async () => {
        const input = {
            name: 'Test Vehicle',
            currentFuelLevel: 101,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Fuel level must be between 0 and 100');
        (0, test_1.expect)(result.error.details?.value).toBe(101);
    });
    (0, test_1.test)('should fail when fuel level is -0.1', async () => {
        const input = {
            name: 'Test Vehicle',
            currentFuelLevel: -0.1,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Fuel level must be between 0 and 100');
    });
    (0, test_1.test)('should fail when fuel level is 100.1', async () => {
        const input = {
            name: 'Test Vehicle',
            currentFuelLevel: 100.1,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Fuel level must be between 0 and 100');
    });
    (0, test_1.test)('should fail when year is before 1900', async () => {
        const input = {
            name: 'Test Vehicle',
            year: 1899,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Year must be a valid vehicle year');
        (0, test_1.expect)(result.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.VALIDATION_FAILED);
        (0, test_1.expect)(result.error.details?.field).toBe('year');
        (0, test_1.expect)(result.error.details?.value).toBe(1899);
    });
    (0, test_1.test)('should fail when year is too far in future', async () => {
        const futureYear = new Date().getFullYear() + 3;
        const input = {
            name: 'Test Vehicle',
            year: futureYear,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Year must be a valid vehicle year');
        (0, test_1.expect)(result.error.details?.value).toBe(futureYear);
    });
    (0, test_1.test)('should succeed when year is current year plus 1', async () => {
        const nextYear = new Date().getFullYear() + 1;
        const input = {
            name: 'Test Vehicle',
            year: nextYear,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, vehicle_service_js_1.deleteVehicle)(result.data.id);
        }
    });
    (0, test_1.test)('should succeed when year is current year plus 2', async () => {
        const nextYear = new Date().getFullYear() + 2;
        const input = {
            name: 'Test Vehicle',
            year: nextYear,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, vehicle_service_js_1.deleteVehicle)(result.data.id);
        }
    });
});
test_1.test.describe('Vehicle Error Scenarios - Boundary Value Testing', () => {
    (0, test_1.test)('should accept latitude at exactly -90', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLatitude: -90,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, vehicle_service_js_1.deleteVehicle)(result.data.id);
        }
    });
    (0, test_1.test)('should accept latitude at exactly 90', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLatitude: 90,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, vehicle_service_js_1.deleteVehicle)(result.data.id);
        }
    });
    (0, test_1.test)('should accept longitude at exactly -180', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLongitude: -180,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, vehicle_service_js_1.deleteVehicle)(result.data.id);
        }
    });
    (0, test_1.test)('should accept longitude at exactly 180', async () => {
        const input = {
            name: 'Test Vehicle',
            currentLongitude: 180,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, vehicle_service_js_1.deleteVehicle)(result.data.id);
        }
    });
    (0, test_1.test)('should accept fuel level at exactly 0', async () => {
        const input = {
            name: 'Test Vehicle',
            currentFuelLevel: 0,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, vehicle_service_js_1.deleteVehicle)(result.data.id);
        }
    });
    (0, test_1.test)('should accept fuel level at exactly 100', async () => {
        const input = {
            name: 'Test Vehicle',
            currentFuelLevel: 100,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, vehicle_service_js_1.deleteVehicle)(result.data.id);
        }
    });
    (0, test_1.test)('should accept year at exactly 1900', async () => {
        const input = {
            name: 'Antique Vehicle',
            year: 1900,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, vehicle_service_js_1.deleteVehicle)(result.data.id);
        }
    });
});
test_1.test.describe('Vehicle Error Scenarios - Not Found Errors', () => {
    (0, test_1.test)('should fail when getting non-existent vehicle by ID', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const result = await (0, vehicle_service_js_1.getVehicleById)(nonExistentId);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
        (0, test_1.expect)(result.error?.message).toContain('not found');
        (0, test_1.expect)(result.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.NOT_FOUND);
        (0, test_1.expect)(result.error.details?.id).toBe(nonExistentId);
    });
    (0, test_1.test)('should fail when updating non-existent vehicle', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const updateInput = {
            id: nonExistentId,
            name: 'Updated Name',
        };
        const result = await (0, vehicle_service_js_1.updateVehicle)(updateInput);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('not found');
        (0, test_1.expect)(result.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.NOT_FOUND);
    });
    (0, test_1.test)('should fail when updating deleted vehicle', async () => {
        // Create and delete a vehicle
        const input = {
            name: 'Test Vehicle',
        };
        const createResult = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const vehicleId = createResult.data.id;
            // Delete the vehicle
            const deleteResult = await (0, vehicle_service_js_1.deleteVehicle)(vehicleId);
            (0, test_1.expect)(deleteResult.success).toBe(true);
            // Try to update the deleted vehicle
            const updateInput = {
                id: vehicleId,
                name: 'Updated Name',
            };
            const updateResult = await (0, vehicle_service_js_1.updateVehicle)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('not found');
            (0, test_1.expect)(updateResult.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.NOT_FOUND);
        }
    });
});
test_1.test.describe('Vehicle Error Scenarios - Update Validation', () => {
    (0, test_1.test)('should fail when updating name to empty string', async () => {
        // Create a vehicle
        const input = {
            name: 'Test Vehicle',
        };
        const createResult = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const vehicleId = createResult.data.id;
            // Try to update name to empty
            const updateInput = {
                id: vehicleId,
                name: '',
            };
            const updateResult = await (0, vehicle_service_js_1.updateVehicle)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('name is required');
            (0, test_1.expect)(updateResult.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.VALIDATION_FAILED);
            // Cleanup
            await (0, vehicle_service_js_1.deleteVehicle)(vehicleId);
        }
    });
    (0, test_1.test)('should fail when updating latitude to invalid value', async () => {
        // Create a vehicle
        const input = {
            name: 'Test Vehicle',
        };
        const createResult = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const vehicleId = createResult.data.id;
            // Try to update latitude to invalid value
            const updateInput = {
                id: vehicleId,
                currentLatitude: 100,
            };
            const updateResult = await (0, vehicle_service_js_1.updateVehicle)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('Latitude must be between -90 and 90');
            // Cleanup
            await (0, vehicle_service_js_1.deleteVehicle)(vehicleId);
        }
    });
    (0, test_1.test)('should fail when updating longitude to invalid value', async () => {
        // Create a vehicle
        const input = {
            name: 'Test Vehicle',
        };
        const createResult = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const vehicleId = createResult.data.id;
            // Try to update longitude to invalid value
            const updateInput = {
                id: vehicleId,
                currentLongitude: -200,
            };
            const updateResult = await (0, vehicle_service_js_1.updateVehicle)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('Longitude must be between -180 and 180');
            // Cleanup
            await (0, vehicle_service_js_1.deleteVehicle)(vehicleId);
        }
    });
    (0, test_1.test)('should fail when updating fuel level to negative value', async () => {
        // Create a vehicle
        const input = {
            name: 'Test Vehicle',
        };
        const createResult = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const vehicleId = createResult.data.id;
            // Try to update fuel level to negative
            const updateInput = {
                id: vehicleId,
                currentFuelLevel: -5,
            };
            const updateResult = await (0, vehicle_service_js_1.updateVehicle)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('Fuel level must be between 0 and 100');
            // Cleanup
            await (0, vehicle_service_js_1.deleteVehicle)(vehicleId);
        }
    });
    (0, test_1.test)('should fail when updating fuel level to value over 100', async () => {
        // Create a vehicle
        const input = {
            name: 'Test Vehicle',
        };
        const createResult = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const vehicleId = createResult.data.id;
            // Try to update fuel level to over 100
            const updateInput = {
                id: vehicleId,
                currentFuelLevel: 150,
            };
            const updateResult = await (0, vehicle_service_js_1.updateVehicle)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('Fuel level must be between 0 and 100');
            // Cleanup
            await (0, vehicle_service_js_1.deleteVehicle)(vehicleId);
        }
    });
    (0, test_1.test)('should fail when updating year to invalid value', async () => {
        // Create a vehicle
        const input = {
            name: 'Test Vehicle',
        };
        const createResult = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const vehicleId = createResult.data.id;
            // Try to update year to before 1900
            const updateInput = {
                id: vehicleId,
                year: 1850,
            };
            const updateResult = await (0, vehicle_service_js_1.updateVehicle)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('Year must be a valid vehicle year');
            // Cleanup
            await (0, vehicle_service_js_1.deleteVehicle)(vehicleId);
        }
    });
});
test_1.test.describe('Vehicle Error Scenarios - Edge Cases', () => {
    (0, test_1.test)('should handle getting deleted vehicle by ID', async () => {
        // Create and delete a vehicle
        const input = {
            name: 'Test Vehicle',
        };
        const createResult = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const vehicleId = createResult.data.id;
            // Delete the vehicle
            const deleteResult = await (0, vehicle_service_js_1.deleteVehicle)(vehicleId);
            (0, test_1.expect)(deleteResult.success).toBe(true);
            // Try to get the deleted vehicle
            const getResult = await (0, vehicle_service_js_1.getVehicleById)(vehicleId);
            (0, test_1.expect)(getResult.success).toBe(false);
            (0, test_1.expect)(getResult.error?.message).toContain('not found');
            (0, test_1.expect)(getResult.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.NOT_FOUND);
        }
    });
    (0, test_1.test)('should handle multiple validation errors', async () => {
        const input = {
            name: '',
            currentLatitude: 100,
            currentLongitude: -200,
            currentFuelLevel: 150,
            year: 1800,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
        // Should catch the first validation error (name)
        (0, test_1.expect)(result.error.code).toBe(vehicle_service_js_1.VehicleErrorCodes.VALIDATION_FAILED);
    });
});
//# sourceMappingURL=vehicle.error-scenarios.api.spec.js.map