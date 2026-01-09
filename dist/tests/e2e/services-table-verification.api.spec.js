"use strict";
/**
 * Verification Test: Services Table Implementation
 *
 * This test verifies the services table schema and service functions work correctly.
 * This is a temporary verification test - delete after verification.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const index_js_1 = require("../../src/services/index.js");
const supabase_js_1 = require("../../src/services/supabase.js");
// Test data
const testServiceInput = {
    name: 'Oil Change Service',
    code: 'TEST-OIL-CHANGE-' + Date.now(),
    serviceType: 'maintenance',
    description: 'Standard oil change service including filter replacement',
    averageDurationMinutes: 45,
    minimumDurationMinutes: 30,
    maximumDurationMinutes: 60,
    basePrice: 49.99,
    priceCurrency: 'USD',
    requiresAppointment: true,
    maxPerDay: 10,
    equipmentRequired: ['oil filter wrench', 'drain pan', 'funnel'],
    skillsRequired: ['basic automotive'],
    tags: ['oil', 'maintenance', 'quick-service'],
};
let createdServiceId = null;
test_1.test.describe('Services Table Verification', () => {
    test_1.test.beforeAll(async () => {
        // Initialize Supabase connection
        await (0, supabase_js_1.initializeSupabase)();
    });
    test_1.test.afterAll(async () => {
        // Cleanup: Hard delete any test services created
        if (createdServiceId) {
            try {
                await (0, index_js_1.hardDeleteService)(createdServiceId);
            }
            catch {
                // Ignore cleanup errors
            }
        }
        (0, supabase_js_1.resetSupabaseClient)();
    });
    (0, test_1.test)('should create a new service with all fields', async () => {
        const result = await (0, index_js_1.createService)(testServiceInput);
        (0, test_1.expect)(result.success).toBe(true);
        (0, test_1.expect)(result.data).toBeDefined();
        const service = result.data;
        createdServiceId = service.id;
        (0, test_1.expect)(service.name).toBe(testServiceInput.name);
        (0, test_1.expect)(service.code).toBe(testServiceInput.code);
        (0, test_1.expect)(service.serviceType).toBe(testServiceInput.serviceType);
        (0, test_1.expect)(service.description).toBe(testServiceInput.description);
        (0, test_1.expect)(service.averageDurationMinutes).toBe(testServiceInput.averageDurationMinutes);
        (0, test_1.expect)(service.minimumDurationMinutes).toBe(testServiceInput.minimumDurationMinutes);
        (0, test_1.expect)(service.maximumDurationMinutes).toBe(testServiceInput.maximumDurationMinutes);
        (0, test_1.expect)(service.basePrice).toBe(testServiceInput.basePrice);
        (0, test_1.expect)(service.priceCurrency).toBe(testServiceInput.priceCurrency);
        (0, test_1.expect)(service.requiresAppointment).toBe(testServiceInput.requiresAppointment);
        (0, test_1.expect)(service.maxPerDay).toBe(testServiceInput.maxPerDay);
        (0, test_1.expect)(service.equipmentRequired).toEqual(testServiceInput.equipmentRequired);
        (0, test_1.expect)(service.skillsRequired).toEqual(testServiceInput.skillsRequired);
        (0, test_1.expect)(service.tags).toEqual(testServiceInput.tags);
        (0, test_1.expect)(service.status).toBe('active');
        (0, test_1.expect)(service.createdAt).toBeInstanceOf(Date);
        (0, test_1.expect)(service.updatedAt).toBeInstanceOf(Date);
    });
    (0, test_1.test)('should get service by ID', async () => {
        (0, test_1.expect)(createdServiceId).not.toBeNull();
        const result = await (0, index_js_1.getServiceById)(createdServiceId);
        (0, test_1.expect)(result.success).toBe(true);
        (0, test_1.expect)(result.data).toBeDefined();
        (0, test_1.expect)(result.data?.id).toBe(createdServiceId);
        (0, test_1.expect)(result.data?.name).toBe(testServiceInput.name);
    });
    (0, test_1.test)('should get service by code', async () => {
        const result = await (0, index_js_1.getServiceByCode)(testServiceInput.code);
        (0, test_1.expect)(result.success).toBe(true);
        (0, test_1.expect)(result.data).toBeDefined();
        (0, test_1.expect)(result.data?.code).toBe(testServiceInput.code);
    });
    (0, test_1.test)('should list services with filters', async () => {
        const result = await (0, index_js_1.getServices)({ status: 'active', serviceType: 'maintenance' });
        (0, test_1.expect)(result.success).toBe(true);
        (0, test_1.expect)(result.data).toBeDefined();
        (0, test_1.expect)(result.data?.data).toBeInstanceOf(Array);
        (0, test_1.expect)(result.data?.pagination).toBeDefined();
        // Our test service should be in the results
        const foundService = result.data?.data.find(s => s.id === createdServiceId);
        (0, test_1.expect)(foundService).toBeDefined();
    });
    (0, test_1.test)('should count services', async () => {
        const result = await (0, index_js_1.countServices)({ status: 'active' });
        (0, test_1.expect)(result.success).toBe(true);
        (0, test_1.expect)(typeof result.data).toBe('number');
        (0, test_1.expect)(result.data).toBeGreaterThan(0);
    });
    (0, test_1.test)('should update service duration', async () => {
        (0, test_1.expect)(createdServiceId).not.toBeNull();
        const result = await (0, index_js_1.updateService)({
            id: createdServiceId,
            averageDurationMinutes: 50,
            description: 'Updated description for oil change service',
        });
        (0, test_1.expect)(result.success).toBe(true);
        (0, test_1.expect)(result.data).toBeDefined();
        (0, test_1.expect)(result.data?.averageDurationMinutes).toBe(50);
        (0, test_1.expect)(result.data?.description).toBe('Updated description for oil change service');
    });
    (0, test_1.test)('should soft delete service', async () => {
        (0, test_1.expect)(createdServiceId).not.toBeNull();
        const deleteResult = await (0, index_js_1.deleteService)(createdServiceId);
        (0, test_1.expect)(deleteResult.success).toBe(true);
        // Should not be found with normal query
        const getResult = await (0, index_js_1.getServiceById)(createdServiceId);
        (0, test_1.expect)(getResult.success).toBe(false);
    });
    (0, test_1.test)('should restore soft-deleted service', async () => {
        (0, test_1.expect)(createdServiceId).not.toBeNull();
        const restoreResult = await (0, index_js_1.restoreService)(createdServiceId);
        (0, test_1.expect)(restoreResult.success).toBe(true);
        (0, test_1.expect)(restoreResult.data?.id).toBe(createdServiceId);
        // Should be found again
        const getResult = await (0, index_js_1.getServiceById)(createdServiceId);
        (0, test_1.expect)(getResult.success).toBe(true);
    });
    (0, test_1.test)('should validate required fields', async () => {
        const result = await (0, index_js_1.createService)({
            name: '',
            serviceType: 'maintenance',
            averageDurationMinutes: 30,
        });
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
    });
    (0, test_1.test)('should validate duration is positive', async () => {
        const result = await (0, index_js_1.createService)({
            name: 'Test Service',
            serviceType: 'maintenance',
            averageDurationMinutes: -5,
        });
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
    });
    (0, test_1.test)('should reject duplicate service code', async () => {
        // First, ensure our service is active
        const existingResult = await (0, index_js_1.getServiceByCode)(testServiceInput.code);
        (0, test_1.expect)(existingResult.success).toBe(true);
        // Try to create another service with the same code
        const result = await (0, index_js_1.createService)({
            ...testServiceInput,
            name: 'Different Service Name',
        });
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.error).toBeDefined();
    });
});
//# sourceMappingURL=services-table-verification.api.spec.js.map