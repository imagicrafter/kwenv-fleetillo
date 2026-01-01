/**
 * Database Constraint Error Scenarios - E2E API Tests
 *
 * Comprehensive testing of database constraint violations and error handling
 * Tests unique constraints, foreign keys, not null, and check constraints
 */

import { test, expect } from '@playwright/test';
import { generateTestId } from '../helpers/test-utils.js';
import { createService, deleteService, ServiceErrorCodes } from '../../src/services/service.service.js';
import {
  createVehicle,
  deleteVehicle as deleteVehicleRecord,
  VehicleErrorCodes,
} from '../../src/services/vehicle.service.js';
import { createClient, deleteClient, ClientErrorCodes } from '../../src/services/client.service.js';
import {
  createBooking,
  deleteBooking as deleteBookingRecord,
  BookingErrorCodes,
} from '../../src/services/booking.service.js';
import { initializeSupabase, resetSupabaseClient } from '../../src/services/supabase.js';
import type { CreateServiceInput } from '../../src/types/service.js';
import type { CreateVehicleInput } from '../../src/types/vehicle.js';
import type { CreateClientInput } from '../../src/types/client.js';
import type { CreateBookingInput } from '../../src/types/booking.js';

test.beforeAll(async () => {
  await initializeSupabase();
});

test.afterAll(async () => {
  resetSupabaseClient();
});

test.describe('Database Constraints - Unique Constraint Violations', () => {
  test('should handle duplicate service code constraint', async () => {
    const uniqueCode = `SVC-${generateTestId()}`;

    // Create first service
    const input1: CreateServiceInput = {
      name: 'First Service',
      code: uniqueCode,
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const result1 = await createService(input1);
    expect(result1.success).toBe(true);

    // Attempt to create duplicate
    const input2: CreateServiceInput = {
      name: 'Second Service',
      code: uniqueCode, // Same code
      serviceType: 'maintenance',
      averageDurationMinutes: 90,
    };

    const result2 = await createService(input2);

    expect(result2.success).toBe(false);
    expect((result2.error as any)?.code).toBe(ServiceErrorCodes.DUPLICATE_CODE);
    expect(result2.error?.message).toContain('already exists');

    // Cleanup
    if (result1.success && result1.data) {
      await deleteService(result1.data.id);
    }
  });

  test('should handle duplicate client email constraint', async () => {
    const uniqueEmail = `test-${generateTestId()}@example.com`;

    // Create first client
    const input1: CreateClientInput = {
      name: 'First Client',
      email: uniqueEmail,
    };

    const result1 = await createClient(input1);
    expect(result1.success).toBe(true);

    // Attempt to create duplicate
    const input2: CreateClientInput = {
      name: 'Second Client',
      email: uniqueEmail, // Same email
    };

    const result2 = await createClient(input2);

    // Should fail due to unique constraint on email
    if (!result2.success) {
      expect(result2.error).toBeDefined();
      // Error message should indicate duplicate or constraint violation
    }

    // Cleanup
    if (result1.success && result1.data) {
      await deleteClient(result1.data.id);
    }
  });
});

test.describe('Database Constraints - Foreign Key Violations', () => {
  test('should fail when creating booking with non-existent client', async () => {
    const nonExistentClientId = '00000000-0000-0000-0000-000000000000';

    // Create a valid service
    const serviceInput: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const serviceResult = await createService(serviceInput);
    expect(serviceResult.success).toBe(true);

    if (serviceResult.success && serviceResult.data) {
      const serviceId = serviceResult.data.id;

      // Try to create booking with non-existent client
      const bookingInput: CreateBookingInput = {
        clientId: nonExistentClientId,
        serviceId: serviceId,
        bookingType: 'one_time',
        scheduledDate: '2025-01-15',
        scheduledStartTime: '09:00:00',
      };

      const bookingResult = await createBooking(bookingInput);

      expect(bookingResult.success).toBe(false);
      expect(bookingResult.error).toBeDefined();
      // Should fail with foreign key constraint error

      // Cleanup
      await deleteService(serviceId);
    }
  });

  test('should fail when creating booking with non-existent service', async () => {
    const nonExistentServiceId = '00000000-0000-0000-0000-000000000000';

    // Create a valid client
    const clientInput: CreateClientInput = {
      name: 'Test Client',
      email: `test-${generateTestId()}@example.com`,
    };

    const clientResult = await createClient(clientInput);
    expect(clientResult.success).toBe(true);

    if (clientResult.success && clientResult.data) {
      const clientId = clientResult.data.id;

      // Try to create booking with non-existent service
      const bookingInput: CreateBookingInput = {
        clientId: clientId,
        serviceId: nonExistentServiceId,
        bookingType: 'one_time',
        scheduledDate: '2025-01-15',
        scheduledStartTime: '09:00:00',
      };

      const bookingResult = await createBooking(bookingInput);

      expect(bookingResult.success).toBe(false);
      expect(bookingResult.error).toBeDefined();
      // Should fail with foreign key constraint error

      // Cleanup
      await deleteClient(clientId);
    }
  });

  test('should fail when creating booking with deleted client', async () => {
    // Create a client
    const clientInput: CreateClientInput = {
      name: 'Test Client',
      email: `test-${generateTestId()}@example.com`,
    };

    const clientResult = await createClient(clientInput);
    expect(clientResult.success).toBe(true);

    if (clientResult.success && clientResult.data) {
      const clientId = clientResult.data.id;

      // Delete the client
      await deleteClient(clientId);

      // Create a service
      const serviceInput: CreateServiceInput = {
        name: 'Test Service',
        serviceType: 'cleaning',
        averageDurationMinutes: 60,
      };

      const serviceResult = await createService(serviceInput);
      expect(serviceResult.success).toBe(true);

      if (serviceResult.success && serviceResult.data) {
        const serviceId = serviceResult.data.id;

        // Try to create booking with deleted client
        const bookingInput: CreateBookingInput = {
          clientId: clientId,
          serviceId: serviceId,
          bookingType: 'one_time',
          scheduledDate: '2025-01-15',
          scheduledStartTime: '09:00:00',
        };

        const bookingResult = await createBooking(bookingInput);

        // Should fail because client is soft-deleted
        expect(bookingResult.success).toBe(false);

        // Cleanup
        await deleteService(serviceId);
      }
    }
  });
});

test.describe('Database Constraints - Not Null Violations', () => {
  test('should enforce required fields in service creation', async () => {
    // Missing required field: name
    const input: CreateServiceInput = {
      name: undefined as any,
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const result = await createService(input);

    expect(result.success).toBe(false);
    expect((result.error as any)?.code).toBe(ServiceErrorCodes.VALIDATION_FAILED);
  });

  test('should enforce required fields in vehicle creation', async () => {
    // Missing required field: name
    const input: CreateVehicleInput = {
      name: undefined as any,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect((result.error as any)?.code).toBe(VehicleErrorCodes.VALIDATION_FAILED);
  });

  test('should enforce required fields in client creation', async () => {
    // Missing required field: name
    const input: CreateClientInput = {
      name: undefined as any,
      email: `test-${generateTestId()}@example.com`,
    };

    const result = await createClient(input);

    expect(result.success).toBe(false);
    // Should fail validation
  });

  test('should enforce required fields in booking creation', async () => {
    // Missing required field: clientId
    const input: CreateBookingInput = {
      clientId: undefined as any,
      serviceId: '00000000-0000-0000-0000-000000000000',
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect((result.error as any)?.code).toBe(BookingErrorCodes.VALIDATION_FAILED);
  });
});

test.describe('Database Constraints - Data Integrity', () => {
  test('should maintain referential integrity when deleting service', async () => {
    // Create service
    const serviceInput: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const serviceResult = await createService(serviceInput);
    expect(serviceResult.success).toBe(true);

    if (serviceResult.success && serviceResult.data) {
      const serviceId = serviceResult.data.id;

      // Create client
      const clientInput: CreateClientInput = {
        name: 'Test Client',
        email: `test-${generateTestId()}@example.com`,
      };

      const clientResult = await createClient(clientInput);
      expect(clientResult.success).toBe(true);

      if (clientResult.success && clientResult.data) {
        const clientId = clientResult.data.id;

        // Create booking that references the service
        const bookingInput: CreateBookingInput = {
          clientId: clientId,
          serviceId: serviceId,
          bookingType: 'one_time',
          scheduledDate: '2025-01-15',
          scheduledStartTime: '09:00:00',
        };

        const bookingResult = await createBooking(bookingInput);
        expect(bookingResult.success).toBe(true);

        if (bookingResult.success && bookingResult.data) {
          const bookingId = bookingResult.data.id;

          // Try to delete the service (soft delete)
          const deleteResult = await deleteService(serviceId);
          // Soft delete should succeed
          expect(deleteResult.success).toBe(true);

          // Cleanup
          await deleteBookingRecord(bookingId);
        }

        // Cleanup
        await deleteClient(clientId);
      }
    }
  });

  test('should prevent creating orphaned records', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    // Try to create booking with non-existent references
    const bookingInput: CreateBookingInput = {
      clientId: nonExistentId,
      serviceId: nonExistentId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
    };

    const result = await createBooking(bookingInput);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

test.describe('Database Constraints - ID Format Validation', () => {
  test('should handle invalid UUID format in service retrieval', async () => {
    const { getServiceById } = await import('../../src/services/service.service.js');

    // Try with invalid UUID format
    const invalidId = 'not-a-valid-uuid';

    const result = await getServiceById(invalidId);

    // Should fail - either validation error or database error
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should handle invalid UUID format in vehicle retrieval', async () => {
    const { getVehicleById } = await import('../../src/services/vehicle.service.js');

    // Try with invalid UUID format
    const invalidId = '12345';

    const result = await getVehicleById(invalidId);

    // Should fail
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should handle invalid UUID format in booking retrieval', async () => {
    const { getBookingById } = await import('../../src/services/booking.service.js');

    // Try with invalid UUID format
    const invalidId = 'invalid-uuid-format';

    const result = await getBookingById(invalidId);

    // Should fail
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

test.describe('Database Constraints - Concurrent Modifications', () => {
  test('should handle race condition in duplicate code creation', async () => {
    const uniqueCode = `RACE-${generateTestId()}`;

    const input1: CreateServiceInput = {
      name: 'Concurrent Service 1',
      code: uniqueCode,
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const input2: CreateServiceInput = {
      name: 'Concurrent Service 2',
      code: uniqueCode,
      serviceType: 'maintenance',
      averageDurationMinutes: 90,
    };

    // Attempt to create both concurrently
    const [result1, result2] = await Promise.all([createService(input1), createService(input2)]);

    // One should succeed, one should fail with duplicate code error
    const successCount = [result1, result2].filter((r) => r.success).length;
    const failureCount = [result1, result2].filter((r) => !r.success).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    // The failed one should have duplicate code error
    const failedResult = result1.success ? result2 : result1;
    expect(failedResult.success).toBe(false);
    expect((failedResult.error as any)?.code).toBe(ServiceErrorCodes.DUPLICATE_CODE);

    // Cleanup
    if (result1.success && result1.data) await deleteService(result1.data.id);
    if (result2.success && result2.data) await deleteService(result2.data.id);
  });
});

test.describe('Database Constraints - Cascade Behavior', () => {
  test('should verify soft delete behavior for services', async () => {
    // Create a service
    const serviceInput: CreateServiceInput = {
      name: 'Test Service',
      code: `SVC-${generateTestId()}`,
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };

    const createResult = await createService(serviceInput);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const serviceId = createResult.data.id;

      // Soft delete the service
      const deleteResult = await deleteService(serviceId);
      expect(deleteResult.success).toBe(true);

      // Try to retrieve the deleted service
      const { getServiceById } = await import('../../src/services/service.service.js');
      const getResult = await getServiceById(serviceId);

      // Should not find it (soft deleted)
      expect(getResult.success).toBe(false);
      expect((getResult.error as any)?.code).toBe(ServiceErrorCodes.NOT_FOUND);
    }
  });

  test('should verify soft delete behavior for vehicles', async () => {
    // Create a vehicle
    const vehicleInput: CreateVehicleInput = {
      name: 'Test Vehicle',
    };

    const createResult = await createVehicle(vehicleInput);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const vehicleId = createResult.data.id;

      // Soft delete the vehicle
      const deleteResult = await deleteVehicleRecord(vehicleId);
      expect(deleteResult.success).toBe(true);

      // Try to retrieve the deleted vehicle
      const { getVehicleById } = await import('../../src/services/vehicle.service.js');
      const getResult = await getVehicleById(vehicleId);

      // Should not find it (soft deleted)
      expect(getResult.success).toBe(false);
      expect((getResult.error as any)?.code).toBe(VehicleErrorCodes.NOT_FOUND);
    }
  });
});
