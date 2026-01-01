/**
 * Maintenance Schedules API Verification Test
 *
 * This test verifies that the maintenance_schedules table schema and service are properly
 * implemented and can be imported correctly.
 */

import { test, expect } from '@playwright/test';

// Import types and functions to verify they exist and are properly exported
import type {
  MaintenanceSchedule,
  MaintenanceScheduleRow,
  MaintenanceScheduleStatus,
  MaintenanceType,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
  MaintenanceScheduleFilters,
} from '../../src/types/maintenanceSchedule.js';

import {
  rowToMaintenanceSchedule,
  maintenanceScheduleInputToRow,
  isMaintenanceOverdue,
  getDaysUntilDue,
} from '../../src/types/maintenanceSchedule.js';

import {
  MaintenanceScheduleServiceError,
  MaintenanceScheduleErrorCodes,
} from '../../src/services/maintenanceSchedule.service.js';

test.describe('Maintenance Schedules Schema and Types Verification', () => {

  test('MaintenanceScheduleStatus type is properly defined', () => {
    // Verify MaintenanceScheduleStatus type values
    const validStatuses: MaintenanceScheduleStatus[] = [
      'scheduled',
      'in_progress',
      'completed',
      'overdue',
      'cancelled'
    ];
    expect(validStatuses).toHaveLength(5);
  });

  test('MaintenanceType type includes common maintenance types', () => {
    // Verify MaintenanceType type values
    const validTypes: MaintenanceType[] = [
      'oil_change',
      'tire_rotation',
      'brake_inspection',
      'brake_service',
      'transmission_service',
      'coolant_flush',
      'air_filter_replacement',
      'battery_replacement',
      'tune_up',
      'inspection',
      'engine_repair',
      'bodywork',
      'other'
    ];
    expect(validTypes.length).toBeGreaterThanOrEqual(13);
  });

  test('CreateMaintenanceScheduleInput accepts valid data', () => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);

    const input: CreateMaintenanceScheduleInput = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      maintenanceType: 'oil_change',
      description: 'Regular oil change service',
      scheduledDate: today,
      dueDate: futureDate,
      status: 'scheduled',
      cost: 75.50,
      currency: 'USD',
      serviceProvider: 'AutoCare Plus',
      notes: 'Use synthetic oil',
      attachments: ['https://example.com/receipt.pdf'],
    };

    expect(input.vehicleId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(input.maintenanceType).toBe('oil_change');
    expect(input.scheduledDate).toBeInstanceOf(Date);
    expect(input.status).toBe('scheduled');
    expect(input.cost).toBe(75.50);
  });

  test('MaintenanceScheduleFilters supports all filter options', () => {
    const filters: MaintenanceScheduleFilters = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'scheduled',
      maintenanceType: 'oil_change',
      scheduledDateFrom: new Date('2025-01-01'),
      scheduledDateTo: new Date('2025-12-31'),
      serviceProvider: 'AutoCare Plus',
      includeDeleted: false,
    };

    expect(filters.vehicleId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(filters.status).toBe('scheduled');
    expect(filters.maintenanceType).toBe('oil_change');
    expect(filters.serviceProvider).toBe('AutoCare Plus');
  });

  test('rowToMaintenanceSchedule correctly converts database row to MaintenanceSchedule entity', () => {
    const row: MaintenanceScheduleRow = {
      id: '987e6543-e89b-12d3-a456-426614174999',
      vehicle_id: '123e4567-e89b-12d3-a456-426614174000',
      maintenance_type: 'oil_change',
      description: 'Regular oil change service',
      scheduled_date: '2025-12-28',
      due_date: '2026-01-28',
      completed_date: null,
      status: 'scheduled',
      odometer_at_maintenance: null,
      next_maintenance_odometer: 18000,
      cost: 75.50,
      currency: 'USD',
      performed_by: null,
      service_provider: 'AutoCare Plus',
      notes: 'Use synthetic oil',
      attachments: ['https://example.com/receipt.pdf'],
      created_at: '2025-12-28T00:00:00Z',
      updated_at: '2025-12-28T00:00:00Z',
      deleted_at: null,
    };

    const schedule = rowToMaintenanceSchedule(row);

    expect(schedule.id).toBe('987e6543-e89b-12d3-a456-426614174999');
    expect(schedule.vehicleId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(schedule.maintenanceType).toBe('oil_change');
    expect(schedule.description).toBe('Regular oil change service');
    expect(schedule.scheduledDate).toBeInstanceOf(Date);
    expect(schedule.dueDate).toBeInstanceOf(Date);
    expect(schedule.completedDate).toBeUndefined();
    expect(schedule.status).toBe('scheduled');
    expect(schedule.cost).toBe(75.50);
    expect(schedule.currency).toBe('USD');
    expect(schedule.serviceProvider).toBe('AutoCare Plus');
    expect(schedule.nextMaintenanceOdometer).toBe(18000);
    expect(schedule.attachments).toEqual(['https://example.com/receipt.pdf']);
    expect(schedule.createdAt).toBeInstanceOf(Date);
    expect(schedule.updatedAt).toBeInstanceOf(Date);
    expect(schedule.deletedAt).toBeUndefined();
  });

  test('maintenanceScheduleInputToRow correctly converts input to database row format', () => {
    const today = new Date('2025-12-28');
    const futureDate = new Date('2026-01-28');

    const input: CreateMaintenanceScheduleInput = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      maintenanceType: 'tire_rotation',
      scheduledDate: today,
      dueDate: futureDate,
      cost: 45.00,
    };

    const row = maintenanceScheduleInputToRow(input);

    expect(row.vehicle_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(row.maintenance_type).toBe('tire_rotation');
    expect(row.scheduled_date).toBe('2025-12-28');
    expect(row.due_date).toBe('2026-01-28');
    expect(row.cost).toBe(45.00);
    expect(row.currency).toBe('USD'); // Default value
    expect(row.status).toBe('scheduled'); // Default value
    // Null fields should be explicitly null
    expect(row.description).toBeNull();
    expect(row.completed_date).toBeNull();
    expect(row.performed_by).toBeNull();
  });

  test('isMaintenanceOverdue correctly identifies overdue schedules', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const overdueSchedule: MaintenanceSchedule = {
      id: '1',
      vehicleId: '2',
      maintenanceType: 'oil_change',
      scheduledDate: yesterday,
      dueDate: yesterday,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const upcomingSchedule: MaintenanceSchedule = {
      id: '2',
      vehicleId: '3',
      maintenanceType: 'tire_rotation',
      scheduledDate: tomorrow,
      dueDate: tomorrow,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const completedSchedule: MaintenanceSchedule = {
      id: '3',
      vehicleId: '4',
      maintenanceType: 'inspection',
      scheduledDate: yesterday,
      dueDate: yesterday,
      completedDate: new Date(),
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(isMaintenanceOverdue(overdueSchedule)).toBe(true);
    expect(isMaintenanceOverdue(upcomingSchedule)).toBe(false);
    expect(isMaintenanceOverdue(completedSchedule)).toBe(false);
  });

  test('getDaysUntilDue correctly calculates days until due', () => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 7);

    const schedule: MaintenanceSchedule = {
      id: '1',
      vehicleId: '2',
      maintenanceType: 'oil_change',
      scheduledDate: today,
      dueDate: futureDate,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const daysUntilDue = getDaysUntilDue(schedule);
    expect(daysUntilDue).toBeGreaterThanOrEqual(6);
    expect(daysUntilDue).toBeLessThanOrEqual(8); // Allow some variance for time zones
  });

  test('MaintenanceScheduleServiceError and error codes are properly defined', () => {
    const error = new MaintenanceScheduleServiceError(
      'Test error',
      MaintenanceScheduleErrorCodes.NOT_FOUND,
      { id: 'test' }
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('MaintenanceScheduleServiceError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('MAINTENANCE_SCHEDULE_NOT_FOUND');
    expect(error.details).toEqual({ id: 'test' });

    // Verify all error codes exist
    expect(MaintenanceScheduleErrorCodes.NOT_FOUND).toBe('MAINTENANCE_SCHEDULE_NOT_FOUND');
    expect(MaintenanceScheduleErrorCodes.CREATE_FAILED).toBe('MAINTENANCE_SCHEDULE_CREATE_FAILED');
    expect(MaintenanceScheduleErrorCodes.UPDATE_FAILED).toBe('MAINTENANCE_SCHEDULE_UPDATE_FAILED');
    expect(MaintenanceScheduleErrorCodes.DELETE_FAILED).toBe('MAINTENANCE_SCHEDULE_DELETE_FAILED');
    expect(MaintenanceScheduleErrorCodes.QUERY_FAILED).toBe('MAINTENANCE_SCHEDULE_QUERY_FAILED');
    expect(MaintenanceScheduleErrorCodes.VALIDATION_FAILED).toBe('MAINTENANCE_SCHEDULE_VALIDATION_FAILED');
  });

  test('MaintenanceSchedule entity supports all required fields', () => {
    const schedule: MaintenanceSchedule = {
      id: '123',
      vehicleId: '456',
      maintenanceType: 'oil_change',
      scheduledDate: new Date(),
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(schedule.id).toBeDefined();
    expect(schedule.vehicleId).toBeDefined();
    expect(schedule.maintenanceType).toBeDefined();
    expect(schedule.scheduledDate).toBeInstanceOf(Date);
    expect(schedule.status).toBeDefined();
    expect(schedule.createdAt).toBeInstanceOf(Date);
    expect(schedule.updatedAt).toBeInstanceOf(Date);
  });

  test('UpdateMaintenanceScheduleInput extends CreateMaintenanceScheduleInput with id', () => {
    const updateInput: UpdateMaintenanceScheduleInput = {
      id: '987e6543-e89b-12d3-a456-426614174999',
      status: 'completed',
      completedDate: new Date(),
      cost: 85.00,
      notes: 'Service completed successfully',
    };

    expect(updateInput.id).toBeDefined();
    expect(updateInput.status).toBe('completed');
    expect(updateInput.completedDate).toBeInstanceOf(Date);
    expect(updateInput.cost).toBe(85.00);
  });

  test('MaintenanceSchedule supports optional odometer tracking', () => {
    const schedule: MaintenanceSchedule = {
      id: '123',
      vehicleId: '456',
      maintenanceType: 'oil_change',
      scheduledDate: new Date(),
      status: 'completed',
      odometerAtMaintenance: 15000,
      nextMaintenanceOdometer: 18000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(schedule.odometerAtMaintenance).toBe(15000);
    expect(schedule.nextMaintenanceOdometer).toBe(18000);
  });

  test('MaintenanceSchedule supports cost tracking with currency', () => {
    const schedule: MaintenanceSchedule = {
      id: '123',
      vehicleId: '456',
      maintenanceType: 'brake_service',
      scheduledDate: new Date(),
      status: 'completed',
      cost: 250.00,
      currency: 'EUR',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(schedule.cost).toBe(250.00);
    expect(schedule.currency).toBe('EUR');
  });

  test('MaintenanceSchedule supports service provider information', () => {
    const schedule: MaintenanceSchedule = {
      id: '123',
      vehicleId: '456',
      maintenanceType: 'inspection',
      scheduledDate: new Date(),
      status: 'completed',
      performedBy: 'John Smith',
      serviceProvider: 'Premium Auto Service',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(schedule.performedBy).toBe('John Smith');
    expect(schedule.serviceProvider).toBe('Premium Auto Service');
  });

  test('MaintenanceSchedule supports attachments array', () => {
    const schedule: MaintenanceSchedule = {
      id: '123',
      vehicleId: '456',
      maintenanceType: 'engine_repair',
      scheduledDate: new Date(),
      status: 'completed',
      attachments: [
        'https://example.com/receipt.pdf',
        'https://example.com/work-order.pdf',
        'https://example.com/inspection-report.pdf',
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(schedule.attachments).toBeInstanceOf(Array);
    expect(schedule.attachments).toHaveLength(3);
    expect(schedule.attachments?.[0]).toBe('https://example.com/receipt.pdf');
  });

});
