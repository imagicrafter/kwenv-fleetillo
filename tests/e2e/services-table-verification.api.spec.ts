/**
 * Verification Test: Services Table Implementation
 *
 * This test verifies the services table schema and service functions work correctly.
 * This is a temporary verification test - delete after verification.
 */

import { test, expect } from '@playwright/test';
import {
  createService,
  getServiceById,
  getServiceByCode,
  getServices,
  updateService,
  deleteService,
  restoreService,
  countServices,
  hardDeleteService,
  ServiceErrorCodes,
} from '../../src/services/index.js';
import {
  initializeSupabase,
  resetSupabaseClient,
} from '../../src/services/supabase.js';
import type { CreateServiceInput, Service } from '../../src/types/service.js';

// Test data
const testServiceInput: CreateServiceInput = {
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

let createdServiceId: string | null = null;

test.describe('Services Table Verification', () => {
  test.beforeAll(async () => {
    // Initialize Supabase connection
    await initializeSupabase();
  });

  test.afterAll(async () => {
    // Cleanup: Hard delete any test services created
    if (createdServiceId) {
      try {
        await hardDeleteService(createdServiceId);
      } catch {
        // Ignore cleanup errors
      }
    }
    resetSupabaseClient();
  });

  test('should create a new service with all fields', async () => {
    const result = await createService(testServiceInput);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const service = result.data as Service;
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

    const result = await getServiceById(createdServiceId!);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe(createdServiceId);
    expect(result.data?.name).toBe(testServiceInput.name);
  });

  test('should get service by code', async () => {
    const result = await getServiceByCode(testServiceInput.code!);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.code).toBe(testServiceInput.code);
  });

  test('should list services with filters', async () => {
    const result = await getServices({ status: 'active', serviceType: 'maintenance' });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.data).toBeInstanceOf(Array);
    expect(result.data?.pagination).toBeDefined();

    // Our test service should be in the results
    const foundService = result.data?.data.find(s => s.id === createdServiceId);
    expect(foundService).toBeDefined();
  });

  test('should count services', async () => {
    const result = await countServices({ status: 'active' });

    expect(result.success).toBe(true);
    expect(typeof result.data).toBe('number');
    expect(result.data).toBeGreaterThan(0);
  });

  test('should update service duration', async () => {
    expect(createdServiceId).not.toBeNull();

    const result = await updateService({
      id: createdServiceId!,
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

    const deleteResult = await deleteService(createdServiceId!);
    expect(deleteResult.success).toBe(true);

    // Should not be found with normal query
    const getResult = await getServiceById(createdServiceId!);
    expect(getResult.success).toBe(false);
  });

  test('should restore soft-deleted service', async () => {
    expect(createdServiceId).not.toBeNull();

    const restoreResult = await restoreService(createdServiceId!);
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.data?.id).toBe(createdServiceId);

    // Should be found again
    const getResult = await getServiceById(createdServiceId!);
    expect(getResult.success).toBe(true);
  });

  test('should validate required fields', async () => {
    const result = await createService({
      name: '',
      serviceType: 'maintenance',
      averageDurationMinutes: 30,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should validate duration is positive', async () => {
    const result = await createService({
      name: 'Test Service',
      serviceType: 'maintenance',
      averageDurationMinutes: -5,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should reject duplicate service code', async () => {
    // First, ensure our service is active
    const existingResult = await getServiceByCode(testServiceInput.code!);
    expect(existingResult.success).toBe(true);

    // Try to create another service with the same code
    const result = await createService({
      ...testServiceInput,
      name: 'Different Service Name',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
