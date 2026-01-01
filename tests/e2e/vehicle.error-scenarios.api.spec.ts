/**
 * Vehicle Error Scenarios - E2E API Tests
 *
 * Comprehensive error scenario testing for Vehicle CRUD operations
 * Tests validation errors, database constraints, and edge cases
 */

import { test, expect } from '@playwright/test';
import { generateTestId } from '../helpers/test-utils.js';
import {
  createVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  VehicleErrorCodes,
} from '../../src/services/vehicle.service.js';
import { initializeSupabase, resetSupabaseClient } from '../../src/services/supabase.js';
import type { CreateVehicleInput, UpdateVehicleInput } from '../../src/types/vehicle.js';

test.beforeAll(async () => {
  await initializeSupabase();
});

test.afterAll(async () => {
  resetSupabaseClient();
});

test.describe('Vehicle Error Scenarios - Validation Errors', () => {
  test('should fail when name is missing', async () => {
    const input: CreateVehicleInput = {
      // name is missing
    } as CreateVehicleInput;

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('name is required');
    expect((result.error as any).code).toBe(VehicleErrorCodes.VALIDATION_FAILED);
    expect((result.error as any).details?.field).toBe('name');
  });

  test('should fail when name is empty string', async () => {
    const input: CreateVehicleInput = {
      name: '',
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('name is required');
    expect((result.error as any).code).toBe(VehicleErrorCodes.VALIDATION_FAILED);
  });

  test('should fail when name is only whitespace', async () => {
    const input: CreateVehicleInput = {
      name: '   ',
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('name is required');
  });

  test('should fail when latitude is less than -90', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLatitude: -91,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Latitude must be between -90 and 90');
    expect((result.error as any).code).toBe(VehicleErrorCodes.VALIDATION_FAILED);
    expect((result.error as any).details?.field).toBe('currentLatitude');
    expect((result.error as any).details?.value).toBe(-91);
  });

  test('should fail when latitude is greater than 90', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLatitude: 91,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Latitude must be between -90 and 90');
    expect((result.error as any).details?.value).toBe(91);
  });

  test('should fail when latitude is -90.001', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLatitude: -90.001,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Latitude must be between -90 and 90');
  });

  test('should fail when latitude is 90.001', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLatitude: 90.001,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Latitude must be between -90 and 90');
  });

  test('should fail when longitude is less than -180', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLongitude: -181,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Longitude must be between -180 and 180');
    expect((result.error as any).code).toBe(VehicleErrorCodes.VALIDATION_FAILED);
    expect((result.error as any).details?.field).toBe('currentLongitude');
    expect((result.error as any).details?.value).toBe(-181);
  });

  test('should fail when longitude is greater than 180', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLongitude: 181,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Longitude must be between -180 and 180');
    expect((result.error as any).details?.value).toBe(181);
  });

  test('should fail when longitude is -180.001', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLongitude: -180.001,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Longitude must be between -180 and 180');
  });

  test('should fail when longitude is 180.001', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLongitude: 180.001,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Longitude must be between -180 and 180');
  });

  test('should fail when fuel level is negative', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentFuelLevel: -1,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Fuel level must be between 0 and 100');
    expect((result.error as any).code).toBe(VehicleErrorCodes.VALIDATION_FAILED);
    expect((result.error as any).details?.field).toBe('currentFuelLevel');
    expect((result.error as any).details?.value).toBe(-1);
  });

  test('should fail when fuel level is greater than 100', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentFuelLevel: 101,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Fuel level must be between 0 and 100');
    expect((result.error as any).details?.value).toBe(101);
  });

  test('should fail when fuel level is -0.1', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentFuelLevel: -0.1,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Fuel level must be between 0 and 100');
  });

  test('should fail when fuel level is 100.1', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentFuelLevel: 100.1,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Fuel level must be between 0 and 100');
  });

  test('should fail when year is before 1900', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      year: 1899,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Year must be a valid vehicle year');
    expect((result.error as any).code).toBe(VehicleErrorCodes.VALIDATION_FAILED);
    expect((result.error as any).details?.field).toBe('year');
    expect((result.error as any).details?.value).toBe(1899);
  });

  test('should fail when year is too far in future', async () => {
    const futureYear = new Date().getFullYear() + 3;
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      year: futureYear,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Year must be a valid vehicle year');
    expect((result.error as any).details?.value).toBe(futureYear);
  });

  test('should succeed when year is current year plus 1', async () => {
    const nextYear = new Date().getFullYear() + 1;
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      year: nextYear,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteVehicle(result.data.id);
    }
  });

  test('should succeed when year is current year plus 2', async () => {
    const nextYear = new Date().getFullYear() + 2;
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      year: nextYear,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteVehicle(result.data.id);
    }
  });
});

test.describe('Vehicle Error Scenarios - Boundary Value Testing', () => {
  test('should accept latitude at exactly -90', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLatitude: -90,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteVehicle(result.data.id);
    }
  });

  test('should accept latitude at exactly 90', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLatitude: 90,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteVehicle(result.data.id);
    }
  });

  test('should accept longitude at exactly -180', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLongitude: -180,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteVehicle(result.data.id);
    }
  });

  test('should accept longitude at exactly 180', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentLongitude: 180,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteVehicle(result.data.id);
    }
  });

  test('should accept fuel level at exactly 0', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentFuelLevel: 0,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteVehicle(result.data.id);
    }
  });

  test('should accept fuel level at exactly 100', async () => {
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
      currentFuelLevel: 100,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteVehicle(result.data.id);
    }
  });

  test('should accept year at exactly 1900', async () => {
    const input: CreateVehicleInput = {
      name: 'Antique Vehicle',
      year: 1900,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(true);

    // Cleanup
    if (result.success && result.data) {
      await deleteVehicle(result.data.id);
    }
  });
});

test.describe('Vehicle Error Scenarios - Not Found Errors', () => {
  test('should fail when getting non-existent vehicle by ID', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const result = await getVehicleById(nonExistentId);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('not found');
    expect((result.error as any).code).toBe(VehicleErrorCodes.NOT_FOUND);
    expect((result.error as any).details?.id).toBe(nonExistentId);
  });

  test('should fail when updating non-existent vehicle', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const updateInput: UpdateVehicleInput = {
      id: nonExistentId,
      name: 'Updated Name',
    };

    const result = await updateVehicle(updateInput);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('not found');
    expect((result.error as any).code).toBe(VehicleErrorCodes.NOT_FOUND);
  });

  test('should fail when updating deleted vehicle', async () => {
    // Create and delete a vehicle
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
    };

    const createResult = await createVehicle(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const vehicleId = createResult.data.id;

      // Delete the vehicle
      const deleteResult = await deleteVehicle(vehicleId);
      expect(deleteResult.success).toBe(true);

      // Try to update the deleted vehicle
      const updateInput: UpdateVehicleInput = {
        id: vehicleId,
        name: 'Updated Name',
      };

      const updateResult = await updateVehicle(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('not found');
      expect((updateResult.error as any).code).toBe(VehicleErrorCodes.NOT_FOUND);
    }
  });
});

test.describe('Vehicle Error Scenarios - Update Validation', () => {
  test('should fail when updating name to empty string', async () => {
    // Create a vehicle
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
    };

    const createResult = await createVehicle(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const vehicleId = createResult.data.id;

      // Try to update name to empty
      const updateInput: UpdateVehicleInput = {
        id: vehicleId,
        name: '',
      };

      const updateResult = await updateVehicle(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('name is required');
      expect((updateResult.error as any).code).toBe(VehicleErrorCodes.VALIDATION_FAILED);

      // Cleanup
      await deleteVehicle(vehicleId);
    }
  });

  test('should fail when updating latitude to invalid value', async () => {
    // Create a vehicle
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
    };

    const createResult = await createVehicle(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const vehicleId = createResult.data.id;

      // Try to update latitude to invalid value
      const updateInput: UpdateVehicleInput = {
        id: vehicleId,
        currentLatitude: 100,
      };

      const updateResult = await updateVehicle(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('Latitude must be between -90 and 90');

      // Cleanup
      await deleteVehicle(vehicleId);
    }
  });

  test('should fail when updating longitude to invalid value', async () => {
    // Create a vehicle
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
    };

    const createResult = await createVehicle(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const vehicleId = createResult.data.id;

      // Try to update longitude to invalid value
      const updateInput: UpdateVehicleInput = {
        id: vehicleId,
        currentLongitude: -200,
      };

      const updateResult = await updateVehicle(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('Longitude must be between -180 and 180');

      // Cleanup
      await deleteVehicle(vehicleId);
    }
  });

  test('should fail when updating fuel level to negative value', async () => {
    // Create a vehicle
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
    };

    const createResult = await createVehicle(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const vehicleId = createResult.data.id;

      // Try to update fuel level to negative
      const updateInput: UpdateVehicleInput = {
        id: vehicleId,
        currentFuelLevel: -5,
      };

      const updateResult = await updateVehicle(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('Fuel level must be between 0 and 100');

      // Cleanup
      await deleteVehicle(vehicleId);
    }
  });

  test('should fail when updating fuel level to value over 100', async () => {
    // Create a vehicle
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
    };

    const createResult = await createVehicle(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const vehicleId = createResult.data.id;

      // Try to update fuel level to over 100
      const updateInput: UpdateVehicleInput = {
        id: vehicleId,
        currentFuelLevel: 150,
      };

      const updateResult = await updateVehicle(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('Fuel level must be between 0 and 100');

      // Cleanup
      await deleteVehicle(vehicleId);
    }
  });

  test('should fail when updating year to invalid value', async () => {
    // Create a vehicle
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
    };

    const createResult = await createVehicle(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const vehicleId = createResult.data.id;

      // Try to update year to before 1900
      const updateInput: UpdateVehicleInput = {
        id: vehicleId,
        year: 1850,
      };

      const updateResult = await updateVehicle(updateInput);

      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.message).toContain('Year must be a valid vehicle year');

      // Cleanup
      await deleteVehicle(vehicleId);
    }
  });
});

test.describe('Vehicle Error Scenarios - Edge Cases', () => {
  test('should handle getting deleted vehicle by ID', async () => {
    // Create and delete a vehicle
    const input: CreateVehicleInput = {
      name: 'Test Vehicle',
    };

    const createResult = await createVehicle(input);
    expect(createResult.success).toBe(true);

    if (createResult.success && createResult.data) {
      const vehicleId = createResult.data.id;

      // Delete the vehicle
      const deleteResult = await deleteVehicle(vehicleId);
      expect(deleteResult.success).toBe(true);

      // Try to get the deleted vehicle
      const getResult = await getVehicleById(vehicleId);

      expect(getResult.success).toBe(false);
      expect(getResult.error?.message).toContain('not found');
      expect((getResult.error as any).code).toBe(VehicleErrorCodes.NOT_FOUND);
    }
  });

  test('should handle multiple validation errors', async () => {
    const input: CreateVehicleInput = {
      name: '',
      currentLatitude: 100,
      currentLongitude: -200,
      currentFuelLevel: 150,
      year: 1800,
    };

    const result = await createVehicle(input);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    // Should catch the first validation error (name)
    expect((result.error as any).code).toBe(VehicleErrorCodes.VALIDATION_FAILED);
  });
});
