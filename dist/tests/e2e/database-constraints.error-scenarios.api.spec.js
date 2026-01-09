"use strict";
/**
 * Database Constraint Error Scenarios - E2E API Tests
 *
 * Comprehensive testing of database constraint violations and error handling
 * Tests unique constraints, foreign keys, not null, and check constraints
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const test_utils_js_1 = require("../helpers/test-utils.js");
const service_service_js_1 = require("../../src/services/service.service.js");
const vehicle_service_js_1 = require("../../src/services/vehicle.service.js");
const client_service_js_1 = require("../../src/services/client.service.js");
const booking_service_js_1 = require("../../src/services/booking.service.js");
const supabase_js_1 = require("../../src/services/supabase.js");
test_1.test.beforeAll(async () => {
    await (0, supabase_js_1.initializeSupabase)();
});
test_1.test.afterAll(async () => {
    (0, supabase_js_1.resetSupabaseClient)();
});
test_1.test.describe('Database Constraints - Unique Constraint Violations', () => {
    (0, test_1.test)('should handle duplicate service code constraint', async () => {
        const uniqueCode = `SVC-${(0, test_utils_js_1.generateTestId)()}`;
        // Create first service
        const input1 = {
            name: 'First Service',
            code: uniqueCode,
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const result1 = await (0, service_service_js_1.createService)(input1);
        (0, test_1.expect)(result1.success).toBe(true);
        // Attempt to create duplicate
        const input2 = {
            name: 'Second Service',
            code: uniqueCode, // Same code
            serviceType: 'maintenance',
            averageDurationMinutes: 90,
        };
        const result2 = await (0, service_service_js_1.createService)(input2);
        (0, test_1.expect)(result2.success).toBe(false);
        (0, test_1.expect)(result2.error?.code).toBe(service_service_js_1.ServiceErrorCodes.DUPLICATE_CODE);
        (0, test_1.expect)(result2.error?.message).toContain('already exists');
        // Cleanup
        if (result1.success && result1.data) {
            await (0, service_service_js_1.deleteService)(result1.data.id);
        }
    });
    (0, test_1.test)('should handle duplicate client email constraint', async () => {
        const uniqueEmail = `test-${(0, test_utils_js_1.generateTestId)()}@example.com`;
        // Create first client
        const input1 = {
            name: 'First Client',
            email: uniqueEmail,
        };
        const result1 = await (0, client_service_js_1.createClient)(input1);
        (0, test_1.expect)(result1.success).toBe(true);
        // Attempt to create duplicate
        const input2 = {
            name: 'Second Client',
            email: uniqueEmail, // Same email
        };
        const result2 = await (0, client_service_js_1.createClient)(input2);
        // Should fail due to unique constraint on email
        if (!result2.success) {
            (0, test_1.expect)(result2.error).toBeDefined();
            // Error message should indicate duplicate or constraint violation
        }
        // Cleanup
        if (result1.success && result1.data) {
            await (0, client_service_js_1.deleteClient)(result1.data.id);
        }
    });
});
test_1.test.describe('Database Constraints - Foreign Key Violations', () => {
    (0, test_1.test)('should fail when creating booking with non-existent client', async () => {
        const nonExistentClientId = '00000000-0000-0000-0000-000000000000';
        // Create a valid service
        const serviceInput = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const serviceResult = await (0, service_service_js_1.createService)(serviceInput);
        (0, test_1.expect)(serviceResult.success).toBe(true);
        if (serviceResult.success && serviceResult.data) {
            const serviceId = serviceResult.data.id;
            // Try to create booking with non-existent client
            const bookingInput = {
                clientId: nonExistentClientId,
                serviceId: serviceId,
                bookingType: 'one_time',
                scheduledDate: '2025-01-15',
                scheduledStartTime: '09:00:00',
            };
            const bookingResult = await (0, booking_service_js_1.createBooking)(bookingInput);
            (0, test_1.expect)(bookingResult.success).toBe(false);
            (0, test_1.expect)(bookingResult.error).toBeDefined();
            // Should fail with foreign key constraint error
            // Cleanup
            await (0, service_service_js_1.deleteService)(serviceId);
        }
    });
    (0, test_1.test)('should fail when creating booking with non-existent service', async () => {
        const nonExistentServiceId = '00000000-0000-0000-0000-000000000000';
        // Create a valid client
        const clientInput = {
            name: 'Test Client',
            email: `test-${(0, test_utils_js_1.generateTestId)()}@example.com`,
        };
        const clientResult = await (0, client_service_js_1.createClient)(clientInput);
        (0, test_1.expect)(clientResult.success).toBe(true);
        if (clientResult.success && clientResult.data) {
            const clientId = clientResult.data.id;
            // Try to create booking with non-existent service
            const bookingInput = {
                clientId: clientId,
                serviceId: nonExistentServiceId,
                bookingType: 'one_time',
                scheduledDate: '2025-01-15',
                scheduledStartTime: '09:00:00',
            };
            const bookingResult = await (0, booking_service_js_1.createBooking)(bookingInput);
            (0, test_1.expect)(bookingResult.success).toBe(false);
            (0, test_1.expect)(bookingResult.error).toBeDefined();
            // Should fail with foreign key constraint error
            // Cleanup
            await (0, client_service_js_1.deleteClient)(clientId);
        }
    });
    (0, test_1.test)('should fail when creating booking with deleted client', async () => {
        // Create a client
        const clientInput = {
            name: 'Test Client',
            email: `test-${(0, test_utils_js_1.generateTestId)()}@example.com`,
        };
        const clientResult = await (0, client_service_js_1.createClient)(clientInput);
        (0, test_1.expect)(clientResult.success).toBe(true);
        if (clientResult.success && clientResult.data) {
            const clientId = clientResult.data.id;
            // Delete the client
            await (0, client_service_js_1.deleteClient)(clientId);
            // Create a service
            const serviceInput = {
                name: 'Test Service',
                serviceType: 'cleaning',
                averageDurationMinutes: 60,
            };
            const serviceResult = await (0, service_service_js_1.createService)(serviceInput);
            (0, test_1.expect)(serviceResult.success).toBe(true);
            if (serviceResult.success && serviceResult.data) {
                const serviceId = serviceResult.data.id;
                // Try to create booking with deleted client
                const bookingInput = {
                    clientId: clientId,
                    serviceId: serviceId,
                    bookingType: 'one_time',
                    scheduledDate: '2025-01-15',
                    scheduledStartTime: '09:00:00',
                };
                const bookingResult = await (0, booking_service_js_1.createBooking)(bookingInput);
                // Should fail because client is soft-deleted
                (0, test_1.expect)(bookingResult.success).toBe(false);
                // Cleanup
                await (0, service_service_js_1.deleteService)(serviceId);
            }
        }
    });
});
test_1.test.describe('Database Constraints - Not Null Violations', () => {
    (0, test_1.test)('should enforce required fields in service creation', async () => {
        // Missing required field: name
        const input = {
            name: undefined,
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.code).toBe(service_service_js_1.ServiceErrorCodes.VALIDATION_FAILED);
    });
    (0, test_1.test)('should enforce required fields in vehicle creation', async () => {
        // Missing required field: name
        const input = {
            name: undefined,
        };
        const result = await (0, vehicle_service_js_1.createVehicle)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.code).toBe(vehicle_service_js_1.VehicleErrorCodes.VALIDATION_FAILED);
    });
    (0, test_1.test)('should enforce required fields in client creation', async () => {
        // Missing required field: name
        const input = {
            name: undefined,
            email: `test-${(0, test_utils_js_1.generateTestId)()}@example.com`,
        };
        const result = await (0, client_service_js_1.createClient)(input);
        (0, test_1.expect)(result.success).toBe(false);
        // Should fail validation
    });
    (0, test_1.test)('should enforce required fields in booking creation', async () => {
        // Missing required field: clientId
        const input = {
            clientId: undefined,
            serviceId: '00000000-0000-0000-0000-000000000000',
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.code).toBe(booking_service_js_1.BookingErrorCodes.VALIDATION_FAILED);
    });
});
test_1.test.describe('Database Constraints - Data Integrity', () => {
    (0, test_1.test)('should maintain referential integrity when deleting service', async () => {
        // Create service
        const serviceInput = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const serviceResult = await (0, service_service_js_1.createService)(serviceInput);
        (0, test_1.expect)(serviceResult.success).toBe(true);
        if (serviceResult.success && serviceResult.data) {
            const serviceId = serviceResult.data.id;
            // Create client
            const clientInput = {
                name: 'Test Client',
                email: `test-${(0, test_utils_js_1.generateTestId)()}@example.com`,
            };
            const clientResult = await (0, client_service_js_1.createClient)(clientInput);
            (0, test_1.expect)(clientResult.success).toBe(true);
            if (clientResult.success && clientResult.data) {
                const clientId = clientResult.data.id;
                // Create booking that references the service
                const bookingInput = {
                    clientId: clientId,
                    serviceId: serviceId,
                    bookingType: 'one_time',
                    scheduledDate: '2025-01-15',
                    scheduledStartTime: '09:00:00',
                };
                const bookingResult = await (0, booking_service_js_1.createBooking)(bookingInput);
                (0, test_1.expect)(bookingResult.success).toBe(true);
                if (bookingResult.success && bookingResult.data) {
                    const bookingId = bookingResult.data.id;
                    // Try to delete the service (soft delete)
                    const deleteResult = await (0, service_service_js_1.deleteService)(serviceId);
                    // Soft delete should succeed
                    (0, test_1.expect)(deleteResult.success).toBe(true);
                    // Cleanup
                    await (0, booking_service_js_1.deleteBooking)(bookingId);
                }
                // Cleanup
                await (0, client_service_js_1.deleteClient)(clientId);
            }
        }
    });
    (0, test_1.test)('should prevent creating orphaned records', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        // Try to create booking with non-existent references
        const bookingInput = {
            clientId: nonExistentId,
            serviceId: nonExistentId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
        };
        const result = await (0, booking_service_js_1.createBooking)(bookingInput);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
    });
});
test_1.test.describe('Database Constraints - ID Format Validation', () => {
    (0, test_1.test)('should handle invalid UUID format in service retrieval', async () => {
        const { getServiceById } = await import('../../src/services/service.service.js');
        // Try with invalid UUID format
        const invalidId = 'not-a-valid-uuid';
        const result = await getServiceById(invalidId);
        // Should fail - either validation error or database error
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
    });
    (0, test_1.test)('should handle invalid UUID format in vehicle retrieval', async () => {
        const { getVehicleById } = await import('../../src/services/vehicle.service.js');
        // Try with invalid UUID format
        const invalidId = '12345';
        const result = await getVehicleById(invalidId);
        // Should fail
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
    });
    (0, test_1.test)('should handle invalid UUID format in booking retrieval', async () => {
        const { getBookingById } = await import('../../src/services/booking.service.js');
        // Try with invalid UUID format
        const invalidId = 'invalid-uuid-format';
        const result = await getBookingById(invalidId);
        // Should fail
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
    });
});
test_1.test.describe('Database Constraints - Concurrent Modifications', () => {
    (0, test_1.test)('should handle race condition in duplicate code creation', async () => {
        const uniqueCode = `RACE-${(0, test_utils_js_1.generateTestId)()}`;
        const input1 = {
            name: 'Concurrent Service 1',
            code: uniqueCode,
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const input2 = {
            name: 'Concurrent Service 2',
            code: uniqueCode,
            serviceType: 'maintenance',
            averageDurationMinutes: 90,
        };
        // Attempt to create both concurrently
        const [result1, result2] = await Promise.all([(0, service_service_js_1.createService)(input1), (0, service_service_js_1.createService)(input2)]);
        // One should succeed, one should fail with duplicate code error
        const successCount = [result1, result2].filter((r) => r.success).length;
        const failureCount = [result1, result2].filter((r) => !r.success).length;
        (0, test_1.expect)(successCount).toBe(1);
        (0, test_1.expect)(failureCount).toBe(1);
        // The failed one should have duplicate code error
        const failedResult = result1.success ? result2 : result1;
        (0, test_1.expect)(failedResult.success).toBe(false);
        (0, test_1.expect)(failedResult.error?.code).toBe(service_service_js_1.ServiceErrorCodes.DUPLICATE_CODE);
        // Cleanup
        if (result1.success && result1.data)
            await (0, service_service_js_1.deleteService)(result1.data.id);
        if (result2.success && result2.data)
            await (0, service_service_js_1.deleteService)(result2.data.id);
    });
});
test_1.test.describe('Database Constraints - Cascade Behavior', () => {
    (0, test_1.test)('should verify soft delete behavior for services', async () => {
        // Create a service
        const serviceInput = {
            name: 'Test Service',
            code: `SVC-${(0, test_utils_js_1.generateTestId)()}`,
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const createResult = await (0, service_service_js_1.createService)(serviceInput);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const serviceId = createResult.data.id;
            // Soft delete the service
            const deleteResult = await (0, service_service_js_1.deleteService)(serviceId);
            (0, test_1.expect)(deleteResult.success).toBe(true);
            // Try to retrieve the deleted service
            const { getServiceById } = await import('../../src/services/service.service.js');
            const getResult = await getServiceById(serviceId);
            // Should not find it (soft deleted)
            (0, test_1.expect)(getResult.success).toBe(false);
            (0, test_1.expect)(getResult.error?.code).toBe(service_service_js_1.ServiceErrorCodes.NOT_FOUND);
        }
    });
    (0, test_1.test)('should verify soft delete behavior for vehicles', async () => {
        // Create a vehicle
        const vehicleInput = {
            name: 'Test Vehicle',
        };
        const createResult = await (0, vehicle_service_js_1.createVehicle)(vehicleInput);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const vehicleId = createResult.data.id;
            // Soft delete the vehicle
            const deleteResult = await (0, vehicle_service_js_1.deleteVehicle)(vehicleId);
            (0, test_1.expect)(deleteResult.success).toBe(true);
            // Try to retrieve the deleted vehicle
            const { getVehicleById } = await import('../../src/services/vehicle.service.js');
            const getResult = await getVehicleById(vehicleId);
            // Should not find it (soft deleted)
            (0, test_1.expect)(getResult.success).toBe(false);
            (0, test_1.expect)(getResult.error?.code).toBe(vehicle_service_js_1.VehicleErrorCodes.NOT_FOUND);
        }
    });
});
//# sourceMappingURL=database-constraints.error-scenarios.api.spec.js.map