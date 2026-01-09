"use strict";
/**
 * Verification Test: Services Table Implementation
 *
 * This test verifies the services table schema and service functions work correctly.
 * This is a temporary verification test - delete after verification.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../../src/services/index.js");
const supabase_js_1 = require("../../../src/services/supabase.js");
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
describe('Services Table Verification', () => {
    beforeAll(async () => {
        // Initialize Supabase connection
        await (0, supabase_js_1.initializeSupabase)();
    });
    afterAll(async () => {
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
    test('should create a new service with all fields', async () => {
        const result = await (0, index_js_1.createService)(testServiceInput);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        const service = result.data;
        createdServiceId = service.id;
        expect(service.name).toBe(testServiceInput.name);
        expect(service.code).toBe(testServiceInput.code);
        expect(service.serviceType).toBe(testServiceInput.serviceType);
        expect(service.description).toBe(testServiceInput.description);
        expect(service.averageDurationMinutes).toBe(testServiceInput.averageDurationMinutes);
        expect(service.minimumDurationMinutes).toBe(testServiceInput.minimumDurationMinutes);
        expect(service.maximumDurationMinutes).toBe(testServiceInput.maximumDurationMinutes);
        expect(service.basePrice).toBe(testServiceInput.basePrice);
        expect(service.priceCurrency).toBe(testServiceInput.priceCurrency);
        expect(service.requiresAppointment).toBe(testServiceInput.requiresAppointment);
        expect(service.maxPerDay).toBe(testServiceInput.maxPerDay);
        expect(service.equipmentRequired).toEqual(testServiceInput.equipmentRequired);
        expect(service.skillsRequired).toEqual(testServiceInput.skillsRequired);
        expect(service.tags).toEqual(testServiceInput.tags);
        expect(service.status).toBe('active');
        expect(service.createdAt).toBeInstanceOf(Date);
        expect(service.updatedAt).toBeInstanceOf(Date);
    });
    test('should get service by ID', async () => {
        expect(createdServiceId).not.toBeNull();
        const result = await (0, index_js_1.getServiceById)(createdServiceId);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.id).toBe(createdServiceId);
        expect(result.data?.name).toBe(testServiceInput.name);
    });
    test('should get service by code', async () => {
        const result = await (0, index_js_1.getServiceByCode)(testServiceInput.code);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.code).toBe(testServiceInput.code);
    });
    test('should list services with filters', async () => {
        const result = await (0, index_js_1.getServices)({ status: 'active', serviceType: 'maintenance' });
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.data).toBeInstanceOf(Array);
        expect(result.data?.pagination).toBeDefined();
        // Our test service should be in the results
        const foundService = result.data?.data.find(s => s.id === createdServiceId);
        expect(foundService).toBeDefined();
    });
    test('should count services', async () => {
        const result = await (0, index_js_1.countServices)({ status: 'active' });
        expect(result.success).toBe(true);
        expect(typeof result.data).toBe('number');
        expect(result.data).toBeGreaterThan(0);
    });
    test('should update service duration', async () => {
        expect(createdServiceId).not.toBeNull();
        const result = await (0, index_js_1.updateService)({
            id: createdServiceId,
            averageDurationMinutes: 50,
            description: 'Updated description for oil change service',
        });
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.averageDurationMinutes).toBe(50);
        expect(result.data?.description).toBe('Updated description for oil change service');
    });
    test('should soft delete service', async () => {
        expect(createdServiceId).not.toBeNull();
        const deleteResult = await (0, index_js_1.deleteService)(createdServiceId);
        expect(deleteResult.success).toBe(true);
        // Should not be found with normal query
        const getResult = await (0, index_js_1.getServiceById)(createdServiceId);
        expect(getResult.success).toBe(false);
    });
    test('should restore soft-deleted service', async () => {
        expect(createdServiceId).not.toBeNull();
        const restoreResult = await (0, index_js_1.restoreService)(createdServiceId);
        expect(restoreResult.success).toBe(true);
        expect(restoreResult.data?.id).toBe(createdServiceId);
        // Should be found again
        const getResult = await (0, index_js_1.getServiceById)(createdServiceId);
        expect(getResult.success).toBe(true);
    });
    test('should validate required fields', async () => {
        const result = await (0, index_js_1.createService)({
            name: '',
            serviceType: 'maintenance',
            averageDurationMinutes: 30,
        });
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
    test('should validate duration is positive', async () => {
        const result = await (0, index_js_1.createService)({
            name: 'Test Service',
            serviceType: 'maintenance',
            averageDurationMinutes: -5,
        });
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
    test('should reject duplicate service code', async () => {
        // First, ensure our service is active
        const existingResult = await (0, index_js_1.getServiceByCode)(testServiceInput.code);
        expect(existingResult.success).toBe(true);
        // Try to create another service with the same code
        const result = await (0, index_js_1.createService)({
            ...testServiceInput,
            name: 'Different Service Name',
        });
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});
//# sourceMappingURL=service.service.test.js.map