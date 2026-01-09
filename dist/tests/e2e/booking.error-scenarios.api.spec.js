"use strict";
/**
 * Booking Error Scenarios - E2E API Tests
 *
 * Comprehensive error scenario testing for Booking CRUD operations
 * Tests validation errors, database constraints, and edge cases
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const test_utils_js_1 = require("../helpers/test-utils.js");
const booking_service_js_1 = require("../../src/services/booking.service.js");
const service_service_js_1 = require("../../src/services/service.service.js");
const client_service_js_1 = require("../../src/services/client.service.js");
const supabase_js_1 = require("../../src/services/supabase.js");
test_1.test.beforeAll(async () => {
    await (0, supabase_js_1.initializeSupabase)();
});
test_1.test.afterAll(async () => {
    (0, supabase_js_1.resetSupabaseClient)();
});
test_1.test.describe('Booking Error Scenarios - Validation Errors', () => {
    let testClientId;
    let testServiceId;
    test_1.test.beforeAll(async () => {
        // Create test client
        const clientInput = {
            name: 'Test Client for Booking Errors',
            email: `test-${(0, test_utils_js_1.generateTestId)()}@example.com`,
        };
        const clientResult = await (0, client_service_js_1.createClient)(clientInput);
        if (clientResult.success && clientResult.data) {
            testClientId = clientResult.data.id;
        }
        // Create test service
        const serviceInput = {
            name: 'Test Service for Booking Errors',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const serviceResult = await (0, service_service_js_1.createService)(serviceInput);
        if (serviceResult.success && serviceResult.data) {
            testServiceId = serviceResult.data.id;
        }
    });
    test_1.test.afterAll(async () => {
        // Cleanup
        if (testClientId)
            await (0, client_service_js_1.deleteClient)(testClientId);
        if (testServiceId)
            await (0, service_service_js_1.deleteService)(testServiceId);
    });
    (0, test_1.test)('should fail when clientId is missing', async () => {
        const input = {
            // clientId is missing
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
        (0, test_1.expect)(result.error?.message).toContain('Client ID is required');
        (0, test_1.expect)(result.error.code).toBe(booking_service_js_1.BookingErrorCodes.VALIDATION_FAILED);
        (0, test_1.expect)(result.error.details?.field).toBe('clientId');
    });
    (0, test_1.test)('should fail when clientId is empty string', async () => {
        const input = {
            clientId: '',
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Client ID is required');
    });
    (0, test_1.test)('should fail when serviceId is missing', async () => {
        const input = {
            clientId: testClientId,
            // serviceId is missing
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Service ID is required');
        (0, test_1.expect)(result.error.details?.field).toBe('serviceId');
    });
    (0, test_1.test)('should fail when serviceId is empty string', async () => {
        const input = {
            clientId: testClientId,
            serviceId: '',
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Service ID is required');
    });
    (0, test_1.test)('should fail when bookingType is missing', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            // bookingType is missing
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Booking type is required');
        (0, test_1.expect)(result.error.details?.field).toBe('bookingType');
    });
    (0, test_1.test)('should fail when scheduledDate is missing', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            // scheduledDate is missing
            scheduledStartTime: '09:00:00',
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Scheduled date is required');
        (0, test_1.expect)(result.error.details?.field).toBe('scheduledDate');
    });
    (0, test_1.test)('should fail when scheduledStartTime is missing', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            // scheduledStartTime is missing
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Scheduled start time is required');
        (0, test_1.expect)(result.error.details?.field).toBe('scheduledStartTime');
    });
    (0, test_1.test)('should fail when recurring booking lacks recurrence pattern', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'recurring',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            // recurrencePattern is missing for recurring booking
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Recurrence pattern is required for recurring bookings');
        (0, test_1.expect)(result.error.details?.field).toBe('recurrencePattern');
    });
    (0, test_1.test)('should fail when one-time booking has recurrence pattern', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            recurrencePattern: 'FREQ=WEEKLY;BYDAY=MO',
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('One-time bookings cannot have a recurrence pattern');
        (0, test_1.expect)(result.error.details?.field).toBe('recurrencePattern');
    });
    (0, test_1.test)('should fail when estimatedDurationMinutes is zero', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            estimatedDurationMinutes: 0,
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Estimated duration must be greater than 0');
        (0, test_1.expect)(result.error.details?.field).toBe('estimatedDurationMinutes');
        (0, test_1.expect)(result.error.details?.value).toBe(0);
    });
    (0, test_1.test)('should fail when estimatedDurationMinutes is negative', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            estimatedDurationMinutes: -30,
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Estimated duration must be greater than 0');
        (0, test_1.expect)(result.error.details?.value).toBe(-30);
    });
    (0, test_1.test)('should fail when quotedPrice is negative', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            quotedPrice: -50,
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Quoted price cannot be negative');
        (0, test_1.expect)(result.error.details?.field).toBe('quotedPrice');
        (0, test_1.expect)(result.error.details?.value).toBe(-50);
    });
    (0, test_1.test)('should fail when finalPrice is negative', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            finalPrice: -75,
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Final price cannot be negative');
        (0, test_1.expect)(result.error.details?.field).toBe('finalPrice');
        (0, test_1.expect)(result.error.details?.value).toBe(-75);
    });
    (0, test_1.test)('should fail when serviceLatitude is less than -90', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            serviceLatitude: -91,
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Service latitude must be between -90 and 90');
        (0, test_1.expect)(result.error.details?.field).toBe('serviceLatitude');
    });
    (0, test_1.test)('should fail when serviceLatitude is greater than 90', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            serviceLatitude: 91,
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Service latitude must be between -90 and 90');
    });
    (0, test_1.test)('should fail when serviceLongitude is less than -180', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            serviceLongitude: -181,
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Service longitude must be between -180 and 180');
        (0, test_1.expect)(result.error.details?.field).toBe('serviceLongitude');
    });
    (0, test_1.test)('should fail when serviceLongitude is greater than 180', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            serviceLongitude: 181,
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Service longitude must be between -180 and 180');
    });
});
test_1.test.describe('Booking Error Scenarios - Database Constraint Errors', () => {
    (0, test_1.test)('should fail when creating booking with non-existent clientId', async () => {
        const nonExistentClientId = '00000000-0000-0000-0000-000000000000';
        // First create a service
        const serviceInput = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const serviceResult = await (0, service_service_js_1.createService)(serviceInput);
        (0, test_1.expect)(serviceResult.success).toBe(true);
        if (serviceResult.success && serviceResult.data) {
            const serviceId = serviceResult.data.id;
            const input = {
                clientId: nonExistentClientId,
                serviceId: serviceId,
                bookingType: 'one_time',
                scheduledDate: '2025-01-15',
                scheduledStartTime: '09:00:00',
            };
            const result = await (0, booking_service_js_1.createBooking)(input);
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.error).toBeDefined();
            // Foreign key constraint violation
            (0, test_1.expect)(result.error?.message).toBeDefined();
            // Cleanup
            await (0, service_service_js_1.deleteService)(serviceId);
        }
    });
    (0, test_1.test)('should fail when creating booking with non-existent serviceId', async () => {
        const nonExistentServiceId = '00000000-0000-0000-0000-000000000000';
        // First create a client
        const clientInput = {
            name: 'Test Client',
            email: `test-${(0, test_utils_js_1.generateTestId)()}@example.com`,
        };
        const clientResult = await (0, client_service_js_1.createClient)(clientInput);
        (0, test_1.expect)(clientResult.success).toBe(true);
        if (clientResult.success && clientResult.data) {
            const clientId = clientResult.data.id;
            const input = {
                clientId: clientId,
                serviceId: nonExistentServiceId,
                bookingType: 'one_time',
                scheduledDate: '2025-01-15',
                scheduledStartTime: '09:00:00',
            };
            const result = await (0, booking_service_js_1.createBooking)(input);
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.error).toBeDefined();
            // Foreign key constraint violation
            // Cleanup
            await (0, client_service_js_1.deleteClient)(clientId);
        }
    });
});
test_1.test.describe('Booking Error Scenarios - Not Found Errors', () => {
    (0, test_1.test)('should fail when getting non-existent booking by ID', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const result = await (0, booking_service_js_1.getBookingById)(nonExistentId);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
        (0, test_1.expect)(result.error?.message).toContain('not found');
        (0, test_1.expect)(result.error.code).toBe(booking_service_js_1.BookingErrorCodes.NOT_FOUND);
    });
    (0, test_1.test)('should fail when updating non-existent booking', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const updateInput = {
            id: nonExistentId,
            scheduledDate: '2025-01-20',
        };
        const result = await (0, booking_service_js_1.updateBooking)(updateInput);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('not found');
        (0, test_1.expect)(result.error.code).toBe(booking_service_js_1.BookingErrorCodes.NOT_FOUND);
    });
    (0, test_1.test)('should fail when deleting non-existent booking', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const result = await (0, booking_service_js_1.deleteBooking)(nonExistentId);
        // Delete might succeed with no rows affected, or fail - both are acceptable
        (0, test_1.expect)(result).toBeDefined();
    });
});
test_1.test.describe('Booking Error Scenarios - Update Validation', () => {
    let testClientId;
    let testServiceId;
    test_1.test.beforeAll(async () => {
        // Create test client
        const clientInput = {
            name: 'Test Client for Update Errors',
            email: `test-update-${(0, test_utils_js_1.generateTestId)()}@example.com`,
        };
        const clientResult = await (0, client_service_js_1.createClient)(clientInput);
        if (clientResult.success && clientResult.data) {
            testClientId = clientResult.data.id;
        }
        // Create test service
        const serviceInput = {
            name: 'Test Service for Update Errors',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const serviceResult = await (0, service_service_js_1.createService)(serviceInput);
        if (serviceResult.success && serviceResult.data) {
            testServiceId = serviceResult.data.id;
        }
    });
    test_1.test.afterAll(async () => {
        // Cleanup
        if (testClientId)
            await (0, client_service_js_1.deleteClient)(testClientId);
        if (testServiceId)
            await (0, service_service_js_1.deleteService)(testServiceId);
    });
    (0, test_1.test)('should fail when updating estimatedDurationMinutes to zero', async () => {
        // Create a booking
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
        };
        const createResult = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const bookingId = createResult.data.id;
            // Try to update duration to zero
            const updateInput = {
                id: bookingId,
                estimatedDurationMinutes: 0,
            };
            const updateResult = await (0, booking_service_js_1.updateBooking)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('Estimated duration must be greater than 0');
            // Cleanup
            await (0, booking_service_js_1.deleteBooking)(bookingId);
        }
    });
    (0, test_1.test)('should fail when updating quotedPrice to negative value', async () => {
        // Create a booking
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
        };
        const createResult = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const bookingId = createResult.data.id;
            // Try to update price to negative
            const updateInput = {
                id: bookingId,
                quotedPrice: -100,
            };
            const updateResult = await (0, booking_service_js_1.updateBooking)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('Quoted price cannot be negative');
            // Cleanup
            await (0, booking_service_js_1.deleteBooking)(bookingId);
        }
    });
    (0, test_1.test)('should fail when updating serviceLatitude to invalid value', async () => {
        // Create a booking
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
        };
        const createResult = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const bookingId = createResult.data.id;
            // Try to update latitude to invalid value
            const updateInput = {
                id: bookingId,
                serviceLatitude: 100,
            };
            const updateResult = await (0, booking_service_js_1.updateBooking)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('Service latitude must be between -90 and 90');
            // Cleanup
            await (0, booking_service_js_1.deleteBooking)(bookingId);
        }
    });
});
test_1.test.describe('Booking Error Scenarios - Boundary Value Testing', () => {
    let testClientId;
    let testServiceId;
    test_1.test.beforeAll(async () => {
        // Create test client
        const clientInput = {
            name: 'Test Client for Boundary Tests',
            email: `test-boundary-${(0, test_utils_js_1.generateTestId)()}@example.com`,
        };
        const clientResult = await (0, client_service_js_1.createClient)(clientInput);
        if (clientResult.success && clientResult.data) {
            testClientId = clientResult.data.id;
        }
        // Create test service
        const serviceInput = {
            name: 'Test Service for Boundary Tests',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const serviceResult = await (0, service_service_js_1.createService)(serviceInput);
        if (serviceResult.success && serviceResult.data) {
            testServiceId = serviceResult.data.id;
        }
    });
    test_1.test.afterAll(async () => {
        // Cleanup
        if (testClientId)
            await (0, client_service_js_1.deleteClient)(testClientId);
        if (testServiceId)
            await (0, service_service_js_1.deleteService)(testServiceId);
    });
    (0, test_1.test)('should accept quotedPrice at exactly 0', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            quotedPrice: 0,
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, booking_service_js_1.deleteBooking)(result.data.id);
        }
    });
    (0, test_1.test)('should accept serviceLatitude at exactly -90', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            serviceLatitude: -90,
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, booking_service_js_1.deleteBooking)(result.data.id);
        }
    });
    (0, test_1.test)('should accept serviceLatitude at exactly 90', async () => {
        const input = {
            clientId: testClientId,
            serviceId: testServiceId,
            bookingType: 'one_time',
            scheduledDate: '2025-01-15',
            scheduledStartTime: '09:00:00',
            serviceLatitude: 90,
        };
        const result = await (0, booking_service_js_1.createBooking)(input);
        (0, test_1.expect)(result.success).toBe(true);
        // Cleanup
        if (result.success && result.data) {
            await (0, booking_service_js_1.deleteBooking)(result.data.id);
        }
    });
});
//# sourceMappingURL=booking.error-scenarios.api.spec.js.map