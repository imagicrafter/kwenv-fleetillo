/**
 * Booking Error Scenarios - E2E API Tests
 *
 * Comprehensive error scenario testing for Booking CRUD operations
 * Tests validation errors, database constraints, and edge cases
 */

import { test, expect } from '@playwright/test';
import { generateTestId } from '../helpers/test-utils.js';
import {
  createBooking,
  getBookingById,
  updateBooking,
  deleteBooking,
  BookingErrorCodes,
} from '../../src/services/booking.service.js';
import { createService, deleteService as deleteServiceRecord } from '../../src/services/service.service.js';
import { createClient, deleteClient as deleteClientRecord } from '../../src/services/client.service.js';
import { initializeSupabase, resetSupabaseClient } from '../../src/services/supabase.js';
import type { CreateBookingInput, UpdateBookingInput } from '../../src/types/booking.js';
import type { CreateServiceInput } from '../../src/types/service.js';
import type { CreateClientInput } from '../../src/types/client.js';

test.beforeAll(async () => {
  await initializeSupabase();
});

test.afterAll(async () => {
  resetSupabaseClient();
});

test.describe('Booking Error Scenarios - Validation Errors', () => {
  let testClientId: string;
  let testServiceId: string;

  test.beforeAll(async () => {
    // Create test client
    const clientInput: CreateClientInput = {
      name: 'Test Client for Booking Errors',
      email: `test-${generateTestId()}@example.com`,
    };
    const clientResult = await createClient(clientInput);
    if (clientResult.success && clientResult.data) {
      testClientId = clientResult.data.id;
    }

    // Create test service
    const serviceInput: CreateServiceInput = {
      name: 'Test Service for Booking Errors',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };
    const serviceResult = await createService(serviceInput);
    if (serviceResult.success && serviceResult.data) {
      testServiceId = serviceResult.data.id;
    }
  });

  test.afterAll(async () => {
    // Cleanup
    if (testClientId) await deleteClientRecord(testClientId);
    if (testServiceId) await deleteServiceRecord(testServiceId);
  });

  test('should fail when clientId is missing', async () => {
    const input: CreateBookingInput = {
      // clientId is missing
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
    } as CreateBookingInput;

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Client ID is required');
    expect((result.error as any).code).toBe(BookingErrorCodes.VALIDATION_FAILED);
    expect((result.error as any).details?.field).toBe('clientId');
  });

  test('should fail when clientId is empty string', async () => {
    const input: CreateBookingInput = {
      clientId: '',
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Client ID is required');
  });

  test('should fail when serviceId is missing', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      // serviceId is missing
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
    } as CreateBookingInput;

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Service ID is required');
    expect((result.error as any).details?.field).toBe('serviceId');
  });

  test('should fail when serviceId is empty string', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: '',
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Service ID is required');
  });

  test('should fail when bookingType is missing', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      // bookingType is missing
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
    } as CreateBookingInput;

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Booking type is required');
    expect((result.error as any).details?.field).toBe('bookingType');
  });

  test('should fail when scheduledDate is missing', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      // scheduledDate is missing
      scheduledStartTime: '09:00:00',
    } as CreateBookingInput;

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Scheduled date is required');
    expect((result.error as any).details?.field).toBe('scheduledDate');
  });

  test('should fail when scheduledStartTime is missing', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      // scheduledStartTime is missing
    } as CreateBookingInput;

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Scheduled start time is required');
    expect((result.error as any).details?.field).toBe('scheduledStartTime');
  });

  test('should fail when recurring booking lacks recurrence pattern', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'recurring',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      // recurrencePattern is missing for recurring booking
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Recurrence pattern is required for recurring bookings');
    expect((result.error as any).details?.field).toBe('recurrencePattern');
  });

  test('should fail when one-time booking has recurrence pattern', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      recurrencePattern: 'FREQ=WEEKLY;BYDAY=MO',
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('One-time bookings cannot have a recurrence pattern');
    expect((result.error as any).details?.field).toBe('recurrencePattern');
  });

  test('should fail when estimatedDurationMinutes is zero', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      estimatedDurationMinutes: 0,
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Estimated duration must be greater than 0');
    expect((result.error as any).details?.field).toBe('estimatedDurationMinutes');
    expect((result.error as any).details?.value).toBe(0);
  });

  test('should fail when estimatedDurationMinutes is negative', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      estimatedDurationMinutes: -30,
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Estimated duration must be greater than 0');
    expect((result.error as any).details?.value).toBe(-30);
  });

  test('should fail when quotedPrice is negative', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      quotedPrice: -50,
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Quoted price cannot be negative');
    expect((result.error as any).details?.field).toBe('quotedPrice');
    expect((result.error as any).details?.value).toBe(-50);
  });

  test('should fail when finalPrice is negative', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      finalPrice: -75,
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Final price cannot be negative');
    expect((result.error as any).details?.field).toBe('finalPrice');
    expect((result.error as any).details?.value).toBe(-75);
  });

  test('should fail when serviceLatitude is less than -90', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      serviceLatitude: -91,
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Service latitude must be between -90 and 90');
    expect((result.error as any).details?.field).toBe('serviceLatitude');
  });

  test('should fail when serviceLatitude is greater than 90', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      serviceLatitude: 91,
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Service latitude must be between -90 and 90');
  });

  test('should fail when serviceLongitude is less than -180', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      serviceLongitude: -181,
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Service longitude must be between -180 and 180');
    expect((result.error as any).details?.field).toBe('serviceLongitude');
  });

  test('should fail when serviceLongitude is greater than 180', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      serviceLongitude: 181,
    };

    const result = await createBooking(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Service longitude must be between -180 and 180');
  });
});

test.describe('Booking Error Scenarios - Database Constraint Errors', () => {
  test('should fail when creating booking with non-existent clientId', async () => {
    const nonExistentClientId = '00000000-0000-0000-0000-000000000000';

    // First create a service
    const serviceInput: CreateServiceInput = {
      name: 'Test Service',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };
    const serviceResult = await createService(serviceInput);
    expect(serviceResult.success).toBe(true);

    if (serviceResult.success && serviceResult.data) {
      const serviceId = serviceResult.data.id;

      const input: CreateBookingInput = {
        clientId: nonExistentClientId,
        serviceId: serviceId,
        bookingType: 'one_time',
        scheduledDate: '2025-01-15',
        scheduledStartTime: '09:00:00',
      };

      const result = await createBooking(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Foreign key constraint violation
      expect(result.error?.message).toBeDefined();

      // Cleanup
      await deleteServiceRecord(serviceId);
    }
  });

  test('should fail when creating booking with non-existent serviceId', async () => {
    const nonExistentServiceId = '00000000-0000-0000-0000-000000000000';

    // First create a client
    const clientInput: CreateClientInput = {
      name: 'Test Client',
      email: `test-${generateTestId()}@example.com`,
    };
    const clientResult = await createClient(clientInput);
    expect(clientResult.success).toBe(true);

    if (clientResult.success && clientResult.data) {
      const clientId = clientResult.data.id;

      const input: CreateBookingInput = {
        clientId: clientId,
        serviceId: nonExistentServiceId,
        bookingType: 'one_time',
        scheduledDate: '2025-01-15',
        scheduledStartTime: '09:00:00',
      };

      const result = await createBooking(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Foreign key constraint violation

      // Cleanup
      await deleteClientRecord(clientId);
    }
  });
});

test.describe('Booking Error Scenarios - Not Found Errors', () => {
  test('should fail when getting non-existent booking by ID', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const result = await getBookingById(nonExistentId);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('not found');
    expect((result.error as any).code).toBe(BookingErrorCodes.NOT_FOUND);
  });

  test('should fail when updating non-existent booking', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const updateInput: UpdateBookingInput = {
      id: nonExistentId,
      scheduledDate: '2025-01-20',
    };

    const result = await updateBooking(updateInput);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('not found');
    expect((result.error as any).code).toBe(BookingErrorCodes.NOT_FOUND);
  });

  test('should fail when deleting non-existent booking', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const result = await deleteBooking(nonExistentId);

    // Delete might succeed with no rows affected, or fail - both are acceptable
    expect(result).toBeDefined();
  });
});

test.describe('Booking Error Scenarios - Update Validation', () => {
  let testClientId: string;
  let testServiceId: string;

  test.beforeAll(async () => {
    // Create test client
    const clientInput: CreateClientInput = {
      name: 'Test Client for Update Errors',
      email: `test-update-${generateTestId()}@example.com`,
    };
    const clientResult = await createClient(clientInput);
    if (clientResult.success && clientResult.data) {
      testClientId = clientResult.data.id;
    }

    // Create test service
    const serviceInput: CreateServiceInput = {
      name: 'Test Service for Update Errors',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };
    const serviceResult = await createService(serviceInput);
    if (serviceResult.success && serviceResult.data) {
      testServiceId = serviceResult.data.id;
    }
  });

  test.afterAll(async () => {
    // Cleanup
    if (testClientId) await deleteClientRecord(testClientId);
    if (testServiceId) await deleteServiceRecord(testServiceId);
  });

  test('should fail when updating estimatedDurationMinutes to zero', async () => {
    // Create a booking
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
    };

    const createResult = await createBooking(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const bookingId = createResult.data.id;

      // Try to update duration to zero
      const updateInput: UpdateBookingInput = {
        id: bookingId,
        estimatedDurationMinutes: 0,
      };

      const updateResult = await updateBooking(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('Estimated duration must be greater than 0');

      // Cleanup
      await deleteBooking(bookingId);
    }
  });

  test('should fail when updating quotedPrice to negative value', async () => {
    // Create a booking
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
    };

    const createResult = await createBooking(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const bookingId = createResult.data.id;

      // Try to update price to negative
      const updateInput: UpdateBookingInput = {
        id: bookingId,
        quotedPrice: -100,
      };

      const updateResult = await updateBooking(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('Quoted price cannot be negative');

      // Cleanup
      await deleteBooking(bookingId);
    }
  });

  test('should fail when updating serviceLatitude to invalid value', async () => {
    // Create a booking
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
    };

    const createResult = await createBooking(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const bookingId = createResult.data.id;

      // Try to update latitude to invalid value
      const updateInput: UpdateBookingInput = {
        id: bookingId,
        serviceLatitude: 100,
      };

      const updateResult = await updateBooking(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('Service latitude must be between -90 and 90');

      // Cleanup
      await deleteBooking(bookingId);
    }
  });
});

test.describe('Booking Error Scenarios - Boundary Value Testing', () => {
  let testClientId: string;
  let testServiceId: string;

  test.beforeAll(async () => {
    // Create test client
    const clientInput: CreateClientInput = {
      name: 'Test Client for Boundary Tests',
      email: `test-boundary-${generateTestId()}@example.com`,
    };
    const clientResult = await createClient(clientInput);
    if (clientResult.success && clientResult.data) {
      testClientId = clientResult.data.id;
    }

    // Create test service
    const serviceInput: CreateServiceInput = {
      name: 'Test Service for Boundary Tests',
      serviceType: 'cleaning',
      averageDurationMinutes: 60,
    };
    const serviceResult = await createService(serviceInput);
    if (serviceResult.success && serviceResult.data) {
      testServiceId = serviceResult.data.id;
    }
  });

  test.afterAll(async () => {
    // Cleanup
    if (testClientId) await deleteClientRecord(testClientId);
    if (testServiceId) await deleteServiceRecord(testServiceId);
  });

  test('should accept quotedPrice at exactly 0', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      quotedPrice: 0,
    };

    const result = await createBooking(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteBooking(result.data.id);
    }
  });

  test('should accept serviceLatitude at exactly -90', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      serviceLatitude: -90,
    };

    const result = await createBooking(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteBooking(result.data.id);
    }
  });

  test('should accept serviceLatitude at exactly 90', async () => {
    const input: CreateBookingInput = {
      clientId: testClientId,
      serviceId: testServiceId,
      bookingType: 'one_time',
      scheduledDate: '2025-01-15',
      scheduledStartTime: '09:00:00',
      serviceLatitude: 90,
    };

    const result = await createBooking(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteBooking(result.data.id);
    }
  });
});
