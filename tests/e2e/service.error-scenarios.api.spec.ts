/**
 * Service Error Scenarios - E2E API Tests
 *
 * Comprehensive error scenario testing for Service CRUD operations
 * Tests validation errors, database constraints, and edge cases
 */

import { test, expect } from '@playwright/test';
import { generateTestId } from '../helpers/test-utils';
import {
  createService,
  getServiceById,
  getServiceByCode,
  updateService,
  deleteService,
  restoreService,
  ServiceErrorCodes,
} from '../../src/services/service.service';
import { initializeSupabase, resetSupabaseClient } from '../../src/services/supabase';
import type { CreateServiceInput, UpdateServiceInput } from '../../src/types/service';

test.beforeAll(async () => {
  await initializeSupabase();
});

test.afterAll(async () => {
  resetSupabaseClient();
});

test.describe('Service Error Scenarios - Validation Errors', () => {
  test('should fail when name is missing', async () => {
    const input: CreateServiceInput = {
      // name is missing
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    } as CreateServiceInput;

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('name is required');
    expect((result.error as any).code).toBe(ServiceErrorCodes.VALIDATION_FAILED);
    expect((result.error as any).details?.field).toBe('name');
  });

  test('should fail when name is empty string', async () => {
    const input: CreateServiceInput = {
      name: '',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('name is required');
    expect((result.error as any).code).toBe(ServiceErrorCodes.VALIDATION_FAILED);
  });

  test('should fail when name is only whitespace', async () => {
    const input: CreateServiceInput = {
      name: '   ',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('name is required');
  });

  test('should fail when serviceType is missing', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      // serviceType is missing
      averageDurationMinutes: 60,
    } as CreateServiceInput;

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('type is required');
    expect((result.error as any).details?.field).toBe('serviceType');
  });

  test('should fail when serviceType is empty string', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: '',
      averageDurationMinutes: 60,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('type is required');
  });

  test('should fail when averageDurationMinutes is missing', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      // averageDurationMinutes is missing
    } as CreateServiceInput;

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Average duration must be a positive number');
    expect((result.error as any).details?.field).toBe('averageDurationMinutes');
  });

  test('should fail when averageDurationMinutes is zero', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 0,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Average duration must be a positive number');
    expect((result.error as any).details?.value).toBe(0);
  });

  test('should fail when averageDurationMinutes is negative', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: -30,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Average duration must be a positive number');
    expect((result.error as any).details?.value).toBe(-30);
  });

  test('should fail when minimumDurationMinutes is zero', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
      minimumDurationMinutes: 0,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Minimum duration must be a positive number');
    expect((result.error as any).details?.field).toBe('minimumDurationMinutes');
  });

  test('should fail when minimumDurationMinutes is negative', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
      minimumDurationMinutes: -10,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Minimum duration must be a positive number');
  });

  test('should fail when maximumDurationMinutes is zero', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
      maximumDurationMinutes: 0,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Maximum duration must be a positive number');
    expect((result.error as any).details?.field).toBe('maximumDurationMinutes');
  });

  test('should fail when maximumDurationMinutes is negative', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
      maximumDurationMinutes: -20,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Maximum duration must be a positive number');
  });

  test('should fail when maximumDurationMinutes is less than minimumDurationMinutes', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
      minimumDurationMinutes: 90,
      maximumDurationMinutes: 30,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Maximum duration must be greater than or equal to minimum duration');
    expect((result.error as any).details?.field).toBe('maximumDurationMinutes');
  });

  test('should fail when basePrice is negative', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
      basePrice: -50,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Base price cannot be negative');
    expect((result.error as any).details?.field).toBe('basePrice');
    expect((result.error as any).details?.value).toBe(-50);
  });

  test('should fail when maxPerDay is zero', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
      maxPerDay: 0,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Max per day must be a positive number');
    expect((result.error as any).details?.field).toBe('maxPerDay');
  });

  test('should fail when maxPerDay is negative', async () => {
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
      maxPerDay: -5,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Max per day must be a positive number');
  });
});

test.describe('Service Error Scenarios - Database Constraints', () => {
  test('should fail when creating service with duplicate code', async () => {
    const uniqueCode = `TEST-${generateTestId()}`;

    // Create first service
    const input1: CreateServiceInput = {
      name: 'Test Service 1',
      code: uniqueCode,
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const result1 = await createService(input1);
    expect(result1.success).toBe(true);

    // Try to create second service with same code
    const input2: CreateServiceInput = {
      name: 'Test Service 2',
      code: uniqueCode,
      serviceType: 'maintenance',
      averageDurationMinutes: 90,
    };

    const result2 = await createService(input2);

    expect(result2.success).toBe(false);
    expect(result2.error).toBeDefined();
    expect(result2.error?.message).toContain('already exists');
    expect((result2.error as any).code).toBe(ServiceErrorCodes.DUPLICATE_CODE);
    expect((result2.error as any).details?.code).toBe(uniqueCode);

    // Cleanup
    if (result1.success && result1.data) {
      await deleteService(result1.data.id);
    }
  });

  test('should fail when updating service with duplicate code', async () => {
    const code1 = `TEST-${generateTestId()}`;
    const code2 = `TEST-${generateTestId()}`;

    // Create two services with different codes
    const input1: CreateServiceInput = {
      name: 'Test Service 1',
      code: code1,
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const input2: CreateServiceInput = {
      name: 'Test Service 2',
      code: code2,
      serviceType: 'maintenance',
      averageDurationMinutes: 90,
    };

    const result1 = await createService(input1);
    const result2 = await createService(input2);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Try to update second service to use first service's code
    if (result2.success && result2.data) {
      const updateInput: UpdateServiceInput = {
        id: result2.data.id,
        code: code1,
      };

      const updateResult = await updateService(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('already exists');
      expect((updateResult.error as any).code).toBe(ServiceErrorCodes.DUPLICATE_CODE);
    }

    // Cleanup
    if (result1.success && result1.data) await deleteService(result1.data.id);
    if (result2.success && result2.data) await deleteService(result2.data.id);
  });
});

test.describe('Service Error Scenarios - Not Found Errors', () => {
  test('should fail when getting non-existent service by ID', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const result = await getServiceById(nonExistentId);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('not found');
    expect((result.error as any).code).toBe(ServiceErrorCodes.NOT_FOUND);
    expect((result.error as any).details?.id).toBe(nonExistentId);
  });

  test('should fail when getting non-existent service by code', async () => {
    const nonExistentCode = `NONEXISTENT-${generateTestId()}`;

    const result = await getServiceByCode(nonExistentCode);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('not found');
    expect((result.error as any).code).toBe(ServiceErrorCodes.NOT_FOUND);
    expect((result.error as any).details?.code).toBe(nonExistentCode);
  });

  test('should fail when updating non-existent service', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const updateInput: UpdateServiceInput = {
      id: nonExistentId,
      name: 'Updated Name',
    };

    const result = await updateService(updateInput);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('not found');
    expect((result.error as any).code).toBe(ServiceErrorCodes.NOT_FOUND);
  });

  test('should fail when updating deleted service', async () => {
    // Create and delete a service
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const createResult = await createService(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const serviceId = createResult.data.id;

      // Delete the service
      const deleteResult = await deleteService(serviceId);
      expect(deleteResult.success).toBe(true);

      // Try to update the deleted service
      const updateInput: UpdateServiceInput = {
        id: serviceId,
        name: 'Updated Name',
      };

      const updateResult = await updateService(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('not found');
      expect((updateResult.error as any).code).toBe(ServiceErrorCodes.NOT_FOUND);
    }
  });

  test('should fail when restoring non-deleted service', async () => {
    // Create an active service
    const input: CreateServiceInput = {
      name: 'Active Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const createResult = await createService(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const serviceId = createResult.data.id;

      // Try to restore the active service (not deleted)
      const restoreResult = await restoreService(serviceId);

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.error?.message).toContain('not found');
      expect((restoreResult.error as any).code).toBe(ServiceErrorCodes.NOT_FOUND);

      // Cleanup
      await deleteService(serviceId);
    }
  });

  test('should fail when restoring non-existent service', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const result = await restoreService(nonExistentId);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('not found');
    expect((result.error as any).code).toBe(ServiceErrorCodes.NOT_FOUND);
  });
});

test.describe('Service Error Scenarios - Update Validation', () => {
  test('should fail when updating name to empty string', async () => {
    // Create a service
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const createResult = await createService(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const serviceId = createResult.data.id;

      // Try to update name to empty
      const updateInput: UpdateServiceInput = {
        id: serviceId,
        name: '',
      };

      const updateResult = await updateService(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('name is required');
      expect((updateResult.error as any).code).toBe(ServiceErrorCodes.VALIDATION_FAILED);

      // Cleanup
      await deleteService(serviceId);
    }
  });

  test('should fail when updating averageDurationMinutes to zero', async () => {
    // Create a service
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const createResult = await createService(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const serviceId = createResult.data.id;

      // Try to update duration to zero
      const updateInput: UpdateServiceInput = {
        id: serviceId,
        averageDurationMinutes: 0,
      };

      const updateResult = await updateService(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('Average duration must be a positive number');
      expect((updateResult.error as any).code).toBe(ServiceErrorCodes.VALIDATION_FAILED);

      // Cleanup
      await deleteService(serviceId);
    }
  });

  test('should fail when updating averageDurationMinutes to negative value', async () => {
    // Create a service
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const createResult = await createService(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const serviceId = createResult.data.id;

      // Try to update duration to negative
      const updateInput: UpdateServiceInput = {
        id: serviceId,
        averageDurationMinutes: -30,
      };

      const updateResult = await updateService(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('Average duration must be a positive number');

      // Cleanup
      await deleteService(serviceId);
    }
  });
});

test.describe('Service Error Scenarios - Edge Cases', () => {
  test('should handle getting deleted service by ID', async () => {
    // Create and delete a service
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const createResult = await createService(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const serviceId = createResult.data.id;

      // Delete the service
      const deleteResult = await deleteService(serviceId);
      expect(deleteResult.success).toBe(true);

      // Try to get the deleted service
      const getResult = await getServiceById(serviceId);

      expect(getResult.success).toBe(false);
      expect(getResult.error?.message).toContain('not found');
      expect((getResult.error as any).code).toBe(ServiceErrorCodes.NOT_FOUND);
    }
  });

  test('should handle getting deleted service by code', async () => {
    const uniqueCode = `TEST-${generateTestId()}`;

    // Create and delete a service
    const input: CreateServiceInput = {
      name: 'Test Service',
      code: uniqueCode,
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const createResult = await createService(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const serviceId = createResult.data.id;

      // Delete the service
      const deleteResult = await deleteService(serviceId);
      expect(deleteResult.success).toBe(true);

      // Try to get the deleted service by code
      const getResult = await getServiceByCode(uniqueCode);

      expect(getResult.success).toBe(false);
      expect(getResult.error?.message).toContain('not found');
      expect((getResult.error as any).code).toBe(ServiceErrorCodes.NOT_FOUND);
    }
  });

  test('should handle double delete (deleting already deleted service)', async () => {
    // Create a service
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const createResult = await createService(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const serviceId = createResult.data.id;

      // First delete
      const deleteResult1 = await deleteService(serviceId);
      expect(deleteResult1.success).toBe(true);

      // Second delete (should succeed but have no effect)
      const deleteResult2 = await deleteService(serviceId);
      // This might succeed with no rows affected, or fail - both are acceptable
      // The important thing is it doesn't throw an unhandled error
      expect(deleteResult2).toBeDefined();
    }
  });

  test('should successfully restore a deleted service', async () => {
    // Create and delete a service
    const input: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const createResult = await createService(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const serviceId = createResult.data.id;

      // Delete the service
      const deleteResult = await deleteService(serviceId);
      expect(deleteResult.success).toBe(true);

      // Restore the service
      const restoreResult = await restoreService(serviceId);
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.data?.id).toBe(serviceId);

      // Verify we can get it again
      const getResult = await getServiceById(serviceId);
      expect(getResult.success).toBe(true);

      // Final cleanup
      await deleteService(serviceId);
    }
  });
});
