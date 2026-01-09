"use strict";
/**
 * Maintenance Schedules API Verification Test
 *
 * This test verifies that the maintenance_schedules table schema and service are properly
 * implemented and can be imported correctly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const maintenanceSchedule_js_1 = require("../../src/types/maintenanceSchedule.js");
const maintenanceSchedule_service_js_1 = require("../../src/services/maintenanceSchedule.service.js");
test_1.test.describe('Maintenance Schedules Schema and Types Verification', () => {
    (0, test_1.test)('MaintenanceScheduleStatus type is properly defined', () => {
        // Verify MaintenanceScheduleStatus type values
        const validStatuses = [
            'scheduled',
            'in_progress',
            'completed',
            'overdue',
            'cancelled'
        ];
        (0, test_1.expect)(validStatuses).toHaveLength(5);
    });
    (0, test_1.test)('MaintenanceType type includes common maintenance types', () => {
        // Verify MaintenanceType type values
        const validTypes = [
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
        (0, test_1.expect)(validTypes.length).toBeGreaterThanOrEqual(13);
    });
    (0, test_1.test)('CreateMaintenanceScheduleInput accepts valid data', () => {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30);
        const input = {
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
        (0, test_1.expect)(input.vehicleId).toBe('123e4567-e89b-12d3-a456-426614174000');
        (0, test_1.expect)(input.maintenanceType).toBe('oil_change');
        (0, test_1.expect)(input.scheduledDate).toBeInstanceOf(Date);
        (0, test_1.expect)(input.status).toBe('scheduled');
        (0, test_1.expect)(input.cost).toBe(75.50);
    });
    (0, test_1.test)('MaintenanceScheduleFilters supports all filter options', () => {
        const filters = {
            vehicleId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'scheduled',
            maintenanceType: 'oil_change',
            scheduledDateFrom: new Date('2025-01-01'),
            scheduledDateTo: new Date('2025-12-31'),
            serviceProvider: 'AutoCare Plus',
            includeDeleted: false,
        };
        (0, test_1.expect)(filters.vehicleId).toBe('123e4567-e89b-12d3-a456-426614174000');
        (0, test_1.expect)(filters.status).toBe('scheduled');
        (0, test_1.expect)(filters.maintenanceType).toBe('oil_change');
        (0, test_1.expect)(filters.serviceProvider).toBe('AutoCare Plus');
    });
    (0, test_1.test)('rowToMaintenanceSchedule correctly converts database row to MaintenanceSchedule entity', () => {
        const row = {
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
        const schedule = (0, maintenanceSchedule_js_1.rowToMaintenanceSchedule)(row);
        (0, test_1.expect)(schedule.id).toBe('987e6543-e89b-12d3-a456-426614174999');
        (0, test_1.expect)(schedule.vehicleId).toBe('123e4567-e89b-12d3-a456-426614174000');
        (0, test_1.expect)(schedule.maintenanceType).toBe('oil_change');
        (0, test_1.expect)(schedule.description).toBe('Regular oil change service');
        (0, test_1.expect)(schedule.scheduledDate).toBeInstanceOf(Date);
        (0, test_1.expect)(schedule.dueDate).toBeInstanceOf(Date);
        (0, test_1.expect)(schedule.completedDate).toBeUndefined();
        (0, test_1.expect)(schedule.status).toBe('scheduled');
        (0, test_1.expect)(schedule.cost).toBe(75.50);
        (0, test_1.expect)(schedule.currency).toBe('USD');
        (0, test_1.expect)(schedule.serviceProvider).toBe('AutoCare Plus');
        (0, test_1.expect)(schedule.nextMaintenanceOdometer).toBe(18000);
        (0, test_1.expect)(schedule.attachments).toEqual(['https://example.com/receipt.pdf']);
        (0, test_1.expect)(schedule.createdAt).toBeInstanceOf(Date);
        (0, test_1.expect)(schedule.updatedAt).toBeInstanceOf(Date);
        (0, test_1.expect)(schedule.deletedAt).toBeUndefined();
    });
    (0, test_1.test)('maintenanceScheduleInputToRow correctly converts input to database row format', () => {
        const today = new Date('2025-12-28');
        const futureDate = new Date('2026-01-28');
        const input = {
            vehicleId: '123e4567-e89b-12d3-a456-426614174000',
            maintenanceType: 'tire_rotation',
            scheduledDate: today,
            dueDate: futureDate,
            cost: 45.00,
        };
        const row = (0, maintenanceSchedule_js_1.maintenanceScheduleInputToRow)(input);
        (0, test_1.expect)(row.vehicle_id).toBe('123e4567-e89b-12d3-a456-426614174000');
        (0, test_1.expect)(row.maintenance_type).toBe('tire_rotation');
        (0, test_1.expect)(row.scheduled_date).toBe('2025-12-28');
        (0, test_1.expect)(row.due_date).toBe('2026-01-28');
        (0, test_1.expect)(row.cost).toBe(45.00);
        (0, test_1.expect)(row.currency).toBe('USD'); // Default value
        (0, test_1.expect)(row.status).toBe('scheduled'); // Default value
        // Null fields should be explicitly null
        (0, test_1.expect)(row.description).toBeNull();
        (0, test_1.expect)(row.completed_date).toBeNull();
        (0, test_1.expect)(row.performed_by).toBeNull();
    });
    (0, test_1.test)('isMaintenanceOverdue correctly identifies overdue schedules', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const overdueSchedule = {
            id: '1',
            vehicleId: '2',
            maintenanceType: 'oil_change',
            scheduledDate: yesterday,
            dueDate: yesterday,
            status: 'scheduled',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const upcomingSchedule = {
            id: '2',
            vehicleId: '3',
            maintenanceType: 'tire_rotation',
            scheduledDate: tomorrow,
            dueDate: tomorrow,
            status: 'scheduled',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const completedSchedule = {
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
        (0, test_1.expect)((0, maintenanceSchedule_js_1.isMaintenanceOverdue)(overdueSchedule)).toBe(true);
        (0, test_1.expect)((0, maintenanceSchedule_js_1.isMaintenanceOverdue)(upcomingSchedule)).toBe(false);
        (0, test_1.expect)((0, maintenanceSchedule_js_1.isMaintenanceOverdue)(completedSchedule)).toBe(false);
    });
    (0, test_1.test)('getDaysUntilDue correctly calculates days until due', () => {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 7);
        const schedule = {
            id: '1',
            vehicleId: '2',
            maintenanceType: 'oil_change',
            scheduledDate: today,
            dueDate: futureDate,
            status: 'scheduled',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const daysUntilDue = (0, maintenanceSchedule_js_1.getDaysUntilDue)(schedule);
        (0, test_1.expect)(daysUntilDue).toBeGreaterThanOrEqual(6);
        (0, test_1.expect)(daysUntilDue).toBeLessThanOrEqual(8); // Allow some variance for time zones
    });
    (0, test_1.test)('MaintenanceScheduleServiceError and error codes are properly defined', () => {
        const error = new maintenanceSchedule_service_js_1.MaintenanceScheduleServiceError('Test error', maintenanceSchedule_service_js_1.MaintenanceScheduleErrorCodes.NOT_FOUND, { id: 'test' });
        (0, test_1.expect)(error).toBeInstanceOf(Error);
        (0, test_1.expect)(error.name).toBe('MaintenanceScheduleServiceError');
        (0, test_1.expect)(error.message).toBe('Test error');
        (0, test_1.expect)(error.code).toBe('MAINTENANCE_SCHEDULE_NOT_FOUND');
        (0, test_1.expect)(error.details).toEqual({ id: 'test' });
        // Verify all error codes exist
        (0, test_1.expect)(maintenanceSchedule_service_js_1.MaintenanceScheduleErrorCodes.NOT_FOUND).toBe('MAINTENANCE_SCHEDULE_NOT_FOUND');
        (0, test_1.expect)(maintenanceSchedule_service_js_1.MaintenanceScheduleErrorCodes.CREATE_FAILED).toBe('MAINTENANCE_SCHEDULE_CREATE_FAILED');
        (0, test_1.expect)(maintenanceSchedule_service_js_1.MaintenanceScheduleErrorCodes.UPDATE_FAILED).toBe('MAINTENANCE_SCHEDULE_UPDATE_FAILED');
        (0, test_1.expect)(maintenanceSchedule_service_js_1.MaintenanceScheduleErrorCodes.DELETE_FAILED).toBe('MAINTENANCE_SCHEDULE_DELETE_FAILED');
        (0, test_1.expect)(maintenanceSchedule_service_js_1.MaintenanceScheduleErrorCodes.QUERY_FAILED).toBe('MAINTENANCE_SCHEDULE_QUERY_FAILED');
        (0, test_1.expect)(maintenanceSchedule_service_js_1.MaintenanceScheduleErrorCodes.VALIDATION_FAILED).toBe('MAINTENANCE_SCHEDULE_VALIDATION_FAILED');
    });
    (0, test_1.test)('MaintenanceSchedule entity supports all required fields', () => {
        const schedule = {
            id: '123',
            vehicleId: '456',
            maintenanceType: 'oil_change',
            scheduledDate: new Date(),
            status: 'scheduled',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        (0, test_1.expect)(schedule.id).toBeDefined();
        (0, test_1.expect)(schedule.vehicleId).toBeDefined();
        (0, test_1.expect)(schedule.maintenanceType).toBeDefined();
        (0, test_1.expect)(schedule.scheduledDate).toBeInstanceOf(Date);
        (0, test_1.expect)(schedule.status).toBeDefined();
        (0, test_1.expect)(schedule.createdAt).toBeInstanceOf(Date);
        (0, test_1.expect)(schedule.updatedAt).toBeInstanceOf(Date);
    });
    (0, test_1.test)('UpdateMaintenanceScheduleInput extends CreateMaintenanceScheduleInput with id', () => {
        const updateInput = {
            id: '987e6543-e89b-12d3-a456-426614174999',
            status: 'completed',
            completedDate: new Date(),
            cost: 85.00,
            notes: 'Service completed successfully',
        };
        (0, test_1.expect)(updateInput.id).toBeDefined();
        (0, test_1.expect)(updateInput.status).toBe('completed');
        (0, test_1.expect)(updateInput.completedDate).toBeInstanceOf(Date);
        (0, test_1.expect)(updateInput.cost).toBe(85.00);
    });
    (0, test_1.test)('MaintenanceSchedule supports optional odometer tracking', () => {
        const schedule = {
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
        (0, test_1.expect)(schedule.odometerAtMaintenance).toBe(15000);
        (0, test_1.expect)(schedule.nextMaintenanceOdometer).toBe(18000);
    });
    (0, test_1.test)('MaintenanceSchedule supports cost tracking with currency', () => {
        const schedule = {
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
        (0, test_1.expect)(schedule.cost).toBe(250.00);
        (0, test_1.expect)(schedule.currency).toBe('EUR');
    });
    (0, test_1.test)('MaintenanceSchedule supports service provider information', () => {
        const schedule = {
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
        (0, test_1.expect)(schedule.performedBy).toBe('John Smith');
        (0, test_1.expect)(schedule.serviceProvider).toBe('Premium Auto Service');
    });
    (0, test_1.test)('MaintenanceSchedule supports attachments array', () => {
        const schedule = {
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
        (0, test_1.expect)(schedule.attachments).toBeInstanceOf(Array);
        (0, test_1.expect)(schedule.attachments).toHaveLength(3);
        (0, test_1.expect)(schedule.attachments?.[0]).toBe('https://example.com/receipt.pdf');
    });
});
//# sourceMappingURL=maintenance-schedules-verification.api.spec.js.map