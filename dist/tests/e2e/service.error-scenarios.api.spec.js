"use strict";
/**
 * Service Error Scenarios - E2E API Tests
 *
 * Comprehensive error scenario testing for Service CRUD operations
 * Tests validation errors, database constraints, and edge cases
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const test_utils_js_1 = require("../helpers/test-utils.js");
const service_service_js_1 = require("../../src/services/service.service.js");
const supabase_js_1 = require("../../src/services/supabase.js");
test_1.test.beforeAll(async () => {
    await (0, supabase_js_1.initializeSupabase)();
});
test_1.test.afterAll(async () => {
    (0, supabase_js_1.resetSupabaseClient)();
});
test_1.test.describe('Service Error Scenarios - Validation Errors', () => {
    (0, test_1.test)('should fail when name is missing', async () => {
        const input = {
            // name is missing
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
        (0, test_1.expect)(result.error?.message).toContain('name is required');
        (0, test_1.expect)(result.error.code).toBe(service_service_js_1.ServiceErrorCodes.VALIDATION_FAILED);
        (0, test_1.expect)(result.error.details?.field).toBe('name');
    });
    (0, test_1.test)('should fail when name is empty string', async () => {
        const input = {
            name: '',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('name is required');
        (0, test_1.expect)(result.error.code).toBe(service_service_js_1.ServiceErrorCodes.VALIDATION_FAILED);
    });
    (0, test_1.test)('should fail when name is only whitespace', async () => {
        const input = {
            name: '   ',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('name is required');
    });
    (0, test_1.test)('should fail when serviceType is missing', async () => {
        const input = {
            name: 'Test Service',
            // serviceType is missing
            averageDurationMinutes: 60,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('type is required');
        (0, test_1.expect)(result.error.details?.field).toBe('serviceType');
    });
    (0, test_1.test)('should fail when serviceType is empty string', async () => {
        const input = {
            name: 'Test Service',
            serviceType: '',
            averageDurationMinutes: 60,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('type is required');
    });
    (0, test_1.test)('should fail when averageDurationMinutes is missing', async () => {
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            // averageDurationMinutes is missing
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Average duration must be a positive number');
        (0, test_1.expect)(result.error.details?.field).toBe('averageDurationMinutes');
    });
    (0, test_1.test)('should fail when averageDurationMinutes is zero', async () => {
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 0,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Average duration must be a positive number');
        (0, test_1.expect)(result.error.details?.value).toBe(0);
    });
    (0, test_1.test)('should fail when averageDurationMinutes is negative', async () => {
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: -30,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Average duration must be a positive number');
        (0, test_1.expect)(result.error.details?.value).toBe(-30);
    });
    (0, test_1.test)('should fail when minimumDurationMinutes is zero', async () => {
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
            minimumDurationMinutes: 0,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Minimum duration must be a positive number');
        (0, test_1.expect)(result.error.details?.field).toBe('minimumDurationMinutes');
    });
    (0, test_1.test)('should fail when minimumDurationMinutes is negative', async () => {
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
            minimumDurationMinutes: -10,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Minimum duration must be a positive number');
    });
    (0, test_1.test)('should fail when maximumDurationMinutes is zero', async () => {
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
            maximumDurationMinutes: 0,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Maximum duration must be a positive number');
        (0, test_1.expect)(result.error.details?.field).toBe('maximumDurationMinutes');
    });
    (0, test_1.test)('should fail when maximumDurationMinutes is negative', async () => {
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
            maximumDurationMinutes: -20,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Maximum duration must be a positive number');
    });
    (0, test_1.test)('should fail when maximumDurationMinutes is less than minimumDurationMinutes', async () => {
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
            minimumDurationMinutes: 90,
            maximumDurationMinutes: 30,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Maximum duration must be greater than or equal to minimum duration');
        (0, test_1.expect)(result.error.details?.field).toBe('maximumDurationMinutes');
    });
    (0, test_1.test)('should fail when basePrice is negative', async () => {
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
            basePrice: -50,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Base price cannot be negative');
        (0, test_1.expect)(result.error.details?.field).toBe('basePrice');
        (0, test_1.expect)(result.error.details?.value).toBe(-50);
    });
    (0, test_1.test)('should fail when maxPerDay is zero', async () => {
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
            maxPerDay: 0,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Max per day must be a positive number');
        (0, test_1.expect)(result.error.details?.field).toBe('maxPerDay');
    });
    (0, test_1.test)('should fail when maxPerDay is negative', async () => {
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
            maxPerDay: -5,
        };
        const result = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('Max per day must be a positive number');
    });
});
test_1.test.describe('Service Error Scenarios - Database Constraints', () => {
    (0, test_1.test)('should fail when creating service with duplicate code', async () => {
        const uniqueCode = `TEST-${(0, test_utils_js_1.generateTestId)()}`;
        // Create first service
        const input1 = {
            name: 'Test Service 1',
            code: uniqueCode,
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const result1 = await (0, service_service_js_1.createService)(input1);
        (0, test_1.expect)(result1.success).toBe(true);
        // Try to create second service with same code
        const input2 = {
            name: 'Test Service 2',
            code: uniqueCode,
            serviceType: 'maintenance',
            averageDurationMinutes: 90,
        };
        const result2 = await (0, service_service_js_1.createService)(input2);
        (0, test_1.expect)(result2.success).toBe(false);
        (0, test_1.expect)(result2.error).toBeDefined();
        (0, test_1.expect)(result2.error?.message).toContain('already exists');
        (0, test_1.expect)(result2.error.code).toBe(service_service_js_1.ServiceErrorCodes.DUPLICATE_CODE);
        (0, test_1.expect)(result2.error.details?.code).toBe(uniqueCode);
        // Cleanup
        if (result1.success && result1.data) {
            await (0, service_service_js_1.deleteService)(result1.data.id);
        }
    });
    (0, test_1.test)('should fail when updating service with duplicate code', async () => {
        const code1 = `TEST-${(0, test_utils_js_1.generateTestId)()}`;
        const code2 = `TEST-${(0, test_utils_js_1.generateTestId)()}`;
        // Create two services with different codes
        const input1 = {
            name: 'Test Service 1',
            code: code1,
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const input2 = {
            name: 'Test Service 2',
            code: code2,
            serviceType: 'maintenance',
            averageDurationMinutes: 90,
        };
        const result1 = await (0, service_service_js_1.createService)(input1);
        const result2 = await (0, service_service_js_1.createService)(input2);
        (0, test_1.expect)(result1.success).toBe(true);
        (0, test_1.expect)(result2.success).toBe(true);
        // Try to update second service to use first service's code
        if (result2.success && result2.data) {
            const updateInput = {
                id: result2.data.id,
                code: code1,
            };
            const updateResult = await (0, service_service_js_1.updateService)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('already exists');
            (0, test_1.expect)(updateResult.error.code).toBe(service_service_js_1.ServiceErrorCodes.DUPLICATE_CODE);
        }
        // Cleanup
        if (result1.success && result1.data)
            await (0, service_service_js_1.deleteService)(result1.data.id);
        if (result2.success && result2.data)
            await (0, service_service_js_1.deleteService)(result2.data.id);
    });
});
test_1.test.describe('Service Error Scenarios - Not Found Errors', () => {
    (0, test_1.test)('should fail when getting non-existent service by ID', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const result = await (0, service_service_js_1.getServiceById)(nonExistentId);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
        (0, test_1.expect)(result.error?.message).toContain('not found');
        (0, test_1.expect)(result.error.code).toBe(service_service_js_1.ServiceErrorCodes.NOT_FOUND);
        (0, test_1.expect)(result.error.details?.id).toBe(nonExistentId);
    });
    (0, test_1.test)('should fail when getting non-existent service by code', async () => {
        const nonExistentCode = `NONEXISTENT-${(0, test_utils_js_1.generateTestId)()}`;
        const result = await (0, service_service_js_1.getServiceByCode)(nonExistentCode);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('not found');
        (0, test_1.expect)(result.error.code).toBe(service_service_js_1.ServiceErrorCodes.NOT_FOUND);
        (0, test_1.expect)(result.error.details?.code).toBe(nonExistentCode);
    });
    (0, test_1.test)('should fail when updating non-existent service', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const updateInput = {
            id: nonExistentId,
            name: 'Updated Name',
        };
        const result = await (0, service_service_js_1.updateService)(updateInput);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('not found');
        (0, test_1.expect)(result.error.code).toBe(service_service_js_1.ServiceErrorCodes.NOT_FOUND);
    });
    (0, test_1.test)('should fail when updating deleted service', async () => {
        // Create and delete a service
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const createResult = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const serviceId = createResult.data.id;
            // Delete the service
            const deleteResult = await (0, service_service_js_1.deleteService)(serviceId);
            (0, test_1.expect)(deleteResult.success).toBe(true);
            // Try to update the deleted service
            const updateInput = {
                id: serviceId,
                name: 'Updated Name',
            };
            const updateResult = await (0, service_service_js_1.updateService)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('not found');
            (0, test_1.expect)(updateResult.error.code).toBe(service_service_js_1.ServiceErrorCodes.NOT_FOUND);
        }
    });
    (0, test_1.test)('should fail when restoring non-deleted service', async () => {
        // Create an active service
        const input = {
            name: 'Active Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const createResult = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const serviceId = createResult.data.id;
            // Try to restore the active service (not deleted)
            const restoreResult = await (0, service_service_js_1.restoreService)(serviceId);
            (0, test_1.expect)(restoreResult.success).toBe(false);
            (0, test_1.expect)(restoreResult.error?.message).toContain('not found');
            (0, test_1.expect)(restoreResult.error.code).toBe(service_service_js_1.ServiceErrorCodes.NOT_FOUND);
            // Cleanup
            await (0, service_service_js_1.deleteService)(serviceId);
        }
    });
    (0, test_1.test)('should fail when restoring non-existent service', async () => {
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const result = await (0, service_service_js_1.restoreService)(nonExistentId);
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error?.message).toContain('not found');
        (0, test_1.expect)(result.error.code).toBe(service_service_js_1.ServiceErrorCodes.NOT_FOUND);
    });
});
test_1.test.describe('Service Error Scenarios - Update Validation', () => {
    (0, test_1.test)('should fail when updating name to empty string', async () => {
        // Create a service
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const createResult = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const serviceId = createResult.data.id;
            // Try to update name to empty
            const updateInput = {
                id: serviceId,
                name: '',
            };
            const updateResult = await (0, service_service_js_1.updateService)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('name is required');
            (0, test_1.expect)(updateResult.error.code).toBe(service_service_js_1.ServiceErrorCodes.VALIDATION_FAILED);
            // Cleanup
            await (0, service_service_js_1.deleteService)(serviceId);
        }
    });
    (0, test_1.test)('should fail when updating averageDurationMinutes to zero', async () => {
        // Create a service
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const createResult = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const serviceId = createResult.data.id;
            // Try to update duration to zero
            const updateInput = {
                id: serviceId,
                averageDurationMinutes: 0,
            };
            const updateResult = await (0, service_service_js_1.updateService)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('Average duration must be a positive number');
            (0, test_1.expect)(updateResult.error.code).toBe(service_service_js_1.ServiceErrorCodes.VALIDATION_FAILED);
            // Cleanup
            await (0, service_service_js_1.deleteService)(serviceId);
        }
    });
    (0, test_1.test)('should fail when updating averageDurationMinutes to negative value', async () => {
        // Create a service
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const createResult = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const serviceId = createResult.data.id;
            // Try to update duration to negative
            const updateInput = {
                id: serviceId,
                averageDurationMinutes: -30,
            };
            const updateResult = await (0, service_service_js_1.updateService)(updateInput);
            (0, test_1.expect)(updateResult.success).toBe(false);
            (0, test_1.expect)(updateResult.error?.message).toContain('Average duration must be a positive number');
            // Cleanup
            await (0, service_service_js_1.deleteService)(serviceId);
        }
    });
});
test_1.test.describe('Service Error Scenarios - Edge Cases', () => {
    (0, test_1.test)('should handle getting deleted service by ID', async () => {
        // Create and delete a service
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const createResult = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const serviceId = createResult.data.id;
            // Delete the service
            const deleteResult = await (0, service_service_js_1.deleteService)(serviceId);
            (0, test_1.expect)(deleteResult.success).toBe(true);
            // Try to get the deleted service
            const getResult = await (0, service_service_js_1.getServiceById)(serviceId);
            (0, test_1.expect)(getResult.success).toBe(false);
            (0, test_1.expect)(getResult.error?.message).toContain('not found');
            (0, test_1.expect)(getResult.error.code).toBe(service_service_js_1.ServiceErrorCodes.NOT_FOUND);
        }
    });
    (0, test_1.test)('should handle getting deleted service by code', async () => {
        const uniqueCode = `TEST-${(0, test_utils_js_1.generateTestId)()}`;
        // Create and delete a service
        const input = {
            name: 'Test Service',
            code: uniqueCode,
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const createResult = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const serviceId = createResult.data.id;
            // Delete the service
            const deleteResult = await (0, service_service_js_1.deleteService)(serviceId);
            (0, test_1.expect)(deleteResult.success).toBe(true);
            // Try to get the deleted service by code
            const getResult = await (0, service_service_js_1.getServiceByCode)(uniqueCode);
            (0, test_1.expect)(getResult.success).toBe(false);
            (0, test_1.expect)(getResult.error?.message).toContain('not found');
            (0, test_1.expect)(getResult.error.code).toBe(service_service_js_1.ServiceErrorCodes.NOT_FOUND);
        }
    });
    (0, test_1.test)('should handle double delete (deleting already deleted service)', async () => {
        // Create a service
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const createResult = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const serviceId = createResult.data.id;
            // First delete
            const deleteResult1 = await (0, service_service_js_1.deleteService)(serviceId);
            (0, test_1.expect)(deleteResult1.success).toBe(true);
            // Second delete (should succeed but have no effect)
            const deleteResult2 = await (0, service_service_js_1.deleteService)(serviceId);
            // This might succeed with no rows affected, or fail - both are acceptable
            // The important thing is it doesn't throw an unhandled error
            (0, test_1.expect)(deleteResult2).toBeDefined();
        }
    });
    (0, test_1.test)('should successfully restore a deleted service', async () => {
        // Create and delete a service
        const input = {
            name: 'Test Service',
            serviceType: 'cleaning',
            averageDurationMinutes: 60,
        };
        const createResult = await (0, service_service_js_1.createService)(input);
        (0, test_1.expect)(createResult.success).toBe(true);
        if (createResult.success && createResult.data) {
            const serviceId = createResult.data.id;
            // Delete the service
            const deleteResult = await (0, service_service_js_1.deleteService)(serviceId);
            (0, test_1.expect)(deleteResult.success).toBe(true);
            // Restore the service
            const restoreResult = await (0, service_service_js_1.restoreService)(serviceId);
            (0, test_1.expect)(restoreResult.success).toBe(true);
            (0, test_1.expect)(restoreResult.data?.id).toBe(serviceId);
            // Verify we can get it again
            const getResult = await (0, service_service_js_1.getServiceById)(serviceId);
            (0, test_1.expect)(getResult.success).toBe(true);
            // Final cleanup
            await (0, service_service_js_1.deleteService)(serviceId);
        }
    });
});
//# sourceMappingURL=service.error-scenarios.api.spec.js.map