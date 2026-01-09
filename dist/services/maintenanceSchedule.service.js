"use strict";
/**
 * Maintenance Schedule Service
 *
 * Provides CRUD operations and business logic for managing maintenance schedules
 * in the RouteIQ application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceScheduleErrorCodes = exports.MaintenanceScheduleServiceError = void 0;
exports.createMaintenanceSchedule = createMaintenanceSchedule;
exports.getMaintenanceScheduleById = getMaintenanceScheduleById;
exports.getMaintenanceSchedules = getMaintenanceSchedules;
exports.updateMaintenanceSchedule = updateMaintenanceSchedule;
exports.deleteMaintenanceSchedule = deleteMaintenanceSchedule;
exports.hardDeleteMaintenanceSchedule = hardDeleteMaintenanceSchedule;
exports.restoreMaintenanceSchedule = restoreMaintenanceSchedule;
exports.getMaintenanceSchedulesByVehicle = getMaintenanceSchedulesByVehicle;
exports.getOverdueMaintenanceSchedules = getOverdueMaintenanceSchedules;
exports.completeMaintenanceSchedule = completeMaintenanceSchedule;
exports.getUpcomingMaintenanceSchedules = getUpcomingMaintenanceSchedules;
const supabase_js_1 = require("./supabase.js");
const logger_js_1 = require("../utils/logger.js");
const maintenanceSchedule_js_1 = require("../types/maintenanceSchedule.js");
/**
 * Logger instance for maintenance schedule operations
 */
const logger = (0, logger_js_1.createContextLogger)('MaintenanceScheduleService');
/**
 * Table name for maintenance schedules
 */
const MAINTENANCE_SCHEDULES_TABLE = 'maintenance_schedules';
/**
 * Maintenance schedule service error
 */
class MaintenanceScheduleServiceError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'MaintenanceScheduleServiceError';
        this.code = code;
        this.details = details;
    }
}
exports.MaintenanceScheduleServiceError = MaintenanceScheduleServiceError;
/**
 * Error codes for maintenance schedule service errors
 */
exports.MaintenanceScheduleErrorCodes = {
    NOT_FOUND: 'MAINTENANCE_SCHEDULE_NOT_FOUND',
    CREATE_FAILED: 'MAINTENANCE_SCHEDULE_CREATE_FAILED',
    UPDATE_FAILED: 'MAINTENANCE_SCHEDULE_UPDATE_FAILED',
    DELETE_FAILED: 'MAINTENANCE_SCHEDULE_DELETE_FAILED',
    QUERY_FAILED: 'MAINTENANCE_SCHEDULE_QUERY_FAILED',
    VALIDATION_FAILED: 'MAINTENANCE_SCHEDULE_VALIDATION_FAILED',
};
/**
 * Validates maintenance schedule input data
 */
function validateMaintenanceScheduleInput(input) {
    if (!input.vehicleId || input.vehicleId.trim().length === 0) {
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Vehicle ID is required', exports.MaintenanceScheduleErrorCodes.VALIDATION_FAILED, { field: 'vehicleId' }),
        };
    }
    if (!input.maintenanceType || input.maintenanceType.trim().length === 0) {
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Maintenance type is required', exports.MaintenanceScheduleErrorCodes.VALIDATION_FAILED, { field: 'maintenanceType' }),
        };
    }
    if (!input.scheduledDate) {
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Scheduled date is required', exports.MaintenanceScheduleErrorCodes.VALIDATION_FAILED, { field: 'scheduledDate' }),
        };
    }
    if (input.completedDate && input.completedDate < input.scheduledDate) {
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Completed date cannot be before scheduled date', exports.MaintenanceScheduleErrorCodes.VALIDATION_FAILED, { field: 'completedDate' }),
        };
    }
    if (input.cost !== undefined && input.cost < 0) {
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Cost must be a positive number', exports.MaintenanceScheduleErrorCodes.VALIDATION_FAILED, { field: 'cost', value: input.cost }),
        };
    }
    if (input.odometerAtMaintenance !== undefined && input.odometerAtMaintenance < 0) {
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Odometer reading must be a positive number', exports.MaintenanceScheduleErrorCodes.VALIDATION_FAILED, { field: 'odometerAtMaintenance', value: input.odometerAtMaintenance }),
        };
    }
    if (input.nextMaintenanceOdometer !== undefined && input.nextMaintenanceOdometer < 0) {
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Next maintenance odometer must be a positive number', exports.MaintenanceScheduleErrorCodes.VALIDATION_FAILED, { field: 'nextMaintenanceOdometer', value: input.nextMaintenanceOdometer }),
        };
    }
    return { success: true };
}
/**
 * Creates a new maintenance schedule
 */
async function createMaintenanceSchedule(input) {
    logger.debug('Creating maintenance schedule', {
        vehicleId: input.vehicleId,
        maintenanceType: input.maintenanceType,
    });
    // Validate input
    const validationResult = validateMaintenanceScheduleInput(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: validationResult.error,
        };
    }
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        const rowData = (0, maintenanceSchedule_js_1.maintenanceScheduleInputToRow)(input);
        const { data, error } = await supabase
            .from(MAINTENANCE_SCHEDULES_TABLE)
            .insert(rowData)
            .select()
            .single();
        if (error) {
            logger.error('Failed to create maintenance schedule', error);
            return {
                success: false,
                error: new MaintenanceScheduleServiceError(`Failed to create maintenance schedule: ${error.message}`, exports.MaintenanceScheduleErrorCodes.CREATE_FAILED, error),
            };
        }
        const maintenanceSchedule = (0, maintenanceSchedule_js_1.rowToMaintenanceSchedule)(data);
        logger.info('Maintenance schedule created successfully', {
            scheduleId: maintenanceSchedule.id,
            vehicleId: maintenanceSchedule.vehicleId,
        });
        return { success: true, data: maintenanceSchedule };
    }
    catch (error) {
        logger.error('Unexpected error creating maintenance schedule', error);
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Unexpected error creating maintenance schedule', exports.MaintenanceScheduleErrorCodes.CREATE_FAILED, error),
        };
    }
}
/**
 * Gets a maintenance schedule by ID
 */
async function getMaintenanceScheduleById(id) {
    logger.debug('Getting maintenance schedule by ID', { id });
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(MAINTENANCE_SCHEDULES_TABLE)
            .select()
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new MaintenanceScheduleServiceError(`Maintenance schedule not found: ${id}`, exports.MaintenanceScheduleErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to get maintenance schedule', error);
            return {
                success: false,
                error: new MaintenanceScheduleServiceError(`Failed to get maintenance schedule: ${error.message}`, exports.MaintenanceScheduleErrorCodes.QUERY_FAILED, error),
            };
        }
        const maintenanceSchedule = (0, maintenanceSchedule_js_1.rowToMaintenanceSchedule)(data);
        return { success: true, data: maintenanceSchedule };
    }
    catch (error) {
        logger.error('Unexpected error getting maintenance schedule', error);
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Unexpected error getting maintenance schedule', exports.MaintenanceScheduleErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets all maintenance schedules with optional filtering and pagination
 */
async function getMaintenanceSchedules(filters, pagination) {
    logger.debug('Getting maintenance schedules', { filters, pagination });
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        let query = supabase.from(MAINTENANCE_SCHEDULES_TABLE).select('*', { count: 'exact' });
        // Apply filters
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.vehicleId) {
            query = query.eq('vehicle_id', filters.vehicleId);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.maintenanceType) {
            query = query.ilike('maintenance_type', `%${filters.maintenanceType}%`);
        }
        if (filters?.serviceProvider) {
            query = query.ilike('service_provider', `%${filters.serviceProvider}%`);
        }
        if (filters?.scheduledDateFrom) {
            query = query.gte('scheduled_date', filters.scheduledDateFrom.toISOString().split('T')[0]);
        }
        if (filters?.scheduledDateTo) {
            query = query.lte('scheduled_date', filters.scheduledDateTo.toISOString().split('T')[0]);
        }
        if (filters?.dueDateFrom) {
            query = query.gte('due_date', filters.dueDateFrom.toISOString().split('T')[0]);
        }
        if (filters?.dueDateTo) {
            query = query.lte('due_date', filters.dueDateTo.toISOString().split('T')[0]);
        }
        if (filters?.completedDateFrom) {
            query = query.gte('completed_date', filters.completedDateFrom.toISOString().split('T')[0]);
        }
        if (filters?.completedDateTo) {
            query = query.lte('completed_date', filters.completedDateTo.toISOString().split('T')[0]);
        }
        // Apply pagination
        const page = pagination?.page ?? 1;
        const limit = pagination?.limit ?? 20;
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);
        // Apply sorting
        const sortBy = pagination?.sortBy ?? 'scheduled_date';
        const sortOrder = pagination?.sortOrder ?? 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        const { data, error, count } = await query;
        if (error) {
            logger.error('Failed to get maintenance schedules', error);
            return {
                success: false,
                error: new MaintenanceScheduleServiceError(`Failed to get maintenance schedules: ${error.message}`, exports.MaintenanceScheduleErrorCodes.QUERY_FAILED, error),
            };
        }
        const maintenanceSchedules = data.map(maintenanceSchedule_js_1.rowToMaintenanceSchedule);
        const total = count ?? 0;
        return {
            success: true,
            data: {
                data: maintenanceSchedules,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        };
    }
    catch (error) {
        logger.error('Unexpected error getting maintenance schedules', error);
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Unexpected error getting maintenance schedules', exports.MaintenanceScheduleErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Updates an existing maintenance schedule
 */
async function updateMaintenanceSchedule(input) {
    logger.debug('Updating maintenance schedule', { id: input.id });
    // Validate input if required fields are being updated
    if (input.vehicleId || input.maintenanceType || input.scheduledDate) {
        const validationInput = {
            vehicleId: input.vehicleId ?? '',
            maintenanceType: input.maintenanceType ?? '',
            scheduledDate: input.scheduledDate ?? new Date(),
            ...input,
        };
        const validationResult = validateMaintenanceScheduleInput(validationInput);
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error,
            };
        }
    }
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        // Build update object, excluding id
        const { id, ...updateData } = input;
        const rowData = (0, maintenanceSchedule_js_1.maintenanceScheduleInputToRow)(updateData);
        const { data, error } = await supabase
            .from(MAINTENANCE_SCHEDULES_TABLE)
            .update(rowData)
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new MaintenanceScheduleServiceError(`Maintenance schedule not found: ${id}`, exports.MaintenanceScheduleErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to update maintenance schedule', error);
            return {
                success: false,
                error: new MaintenanceScheduleServiceError(`Failed to update maintenance schedule: ${error.message}`, exports.MaintenanceScheduleErrorCodes.UPDATE_FAILED, error),
            };
        }
        const maintenanceSchedule = (0, maintenanceSchedule_js_1.rowToMaintenanceSchedule)(data);
        logger.info('Maintenance schedule updated successfully', { scheduleId: maintenanceSchedule.id });
        return { success: true, data: maintenanceSchedule };
    }
    catch (error) {
        logger.error('Unexpected error updating maintenance schedule', error);
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Unexpected error updating maintenance schedule', exports.MaintenanceScheduleErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Soft deletes a maintenance schedule by setting deleted_at timestamp
 */
async function deleteMaintenanceSchedule(id) {
    logger.debug('Deleting maintenance schedule', { id });
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        const { error } = await supabase
            .from(MAINTENANCE_SCHEDULES_TABLE)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .is('deleted_at', null);
        if (error) {
            logger.error('Failed to delete maintenance schedule', error);
            return {
                success: false,
                error: new MaintenanceScheduleServiceError(`Failed to delete maintenance schedule: ${error.message}`, exports.MaintenanceScheduleErrorCodes.DELETE_FAILED, error),
            };
        }
        logger.info('Maintenance schedule deleted successfully', { scheduleId: id });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error deleting maintenance schedule', error);
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Unexpected error deleting maintenance schedule', exports.MaintenanceScheduleErrorCodes.DELETE_FAILED, error),
        };
    }
}
/**
 * Permanently deletes a maintenance schedule (hard delete)
 * Use with caution - this cannot be undone
 */
async function hardDeleteMaintenanceSchedule(id) {
    logger.warn('Hard deleting maintenance schedule', { id });
    try {
        const adminClient = (0, supabase_js_1.getAdminSupabaseClient)();
        if (!adminClient) {
            return {
                success: false,
                error: new MaintenanceScheduleServiceError('Admin client not available for hard delete operation', exports.MaintenanceScheduleErrorCodes.DELETE_FAILED),
            };
        }
        const { error } = await adminClient
            .from(MAINTENANCE_SCHEDULES_TABLE)
            .delete()
            .eq('id', id);
        if (error) {
            logger.error('Failed to hard delete maintenance schedule', error);
            return {
                success: false,
                error: new MaintenanceScheduleServiceError(`Failed to hard delete maintenance schedule: ${error.message}`, exports.MaintenanceScheduleErrorCodes.DELETE_FAILED, error),
            };
        }
        logger.info('Maintenance schedule hard deleted successfully', { scheduleId: id });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error hard deleting maintenance schedule', error);
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Unexpected error hard deleting maintenance schedule', exports.MaintenanceScheduleErrorCodes.DELETE_FAILED, error),
        };
    }
}
/**
 * Restores a soft-deleted maintenance schedule
 */
async function restoreMaintenanceSchedule(id) {
    logger.debug('Restoring maintenance schedule', { id });
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(MAINTENANCE_SCHEDULES_TABLE)
            .update({ deleted_at: null })
            .eq('id', id)
            .not('deleted_at', 'is', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new MaintenanceScheduleServiceError(`Deleted maintenance schedule not found: ${id}`, exports.MaintenanceScheduleErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to restore maintenance schedule', error);
            return {
                success: false,
                error: new MaintenanceScheduleServiceError(`Failed to restore maintenance schedule: ${error.message}`, exports.MaintenanceScheduleErrorCodes.UPDATE_FAILED, error),
            };
        }
        const maintenanceSchedule = (0, maintenanceSchedule_js_1.rowToMaintenanceSchedule)(data);
        logger.info('Maintenance schedule restored successfully', { scheduleId: maintenanceSchedule.id });
        return { success: true, data: maintenanceSchedule };
    }
    catch (error) {
        logger.error('Unexpected error restoring maintenance schedule', error);
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Unexpected error restoring maintenance schedule', exports.MaintenanceScheduleErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Gets maintenance schedules for a specific vehicle
 */
async function getMaintenanceSchedulesByVehicle(vehicleId, filters) {
    logger.debug('Getting maintenance schedules by vehicle', { vehicleId });
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        let query = supabase
            .from(MAINTENANCE_SCHEDULES_TABLE)
            .select()
            .eq('vehicle_id', vehicleId);
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        query = query.order('scheduled_date', { ascending: false });
        const { data, error } = await query;
        if (error) {
            logger.error('Failed to get maintenance schedules by vehicle', error);
            return {
                success: false,
                error: new MaintenanceScheduleServiceError(`Failed to get maintenance schedules by vehicle: ${error.message}`, exports.MaintenanceScheduleErrorCodes.QUERY_FAILED, error),
            };
        }
        const maintenanceSchedules = data.map(maintenanceSchedule_js_1.rowToMaintenanceSchedule);
        return { success: true, data: maintenanceSchedules };
    }
    catch (error) {
        logger.error('Unexpected error getting maintenance schedules by vehicle', error);
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Unexpected error getting maintenance schedules by vehicle', exports.MaintenanceScheduleErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets overdue maintenance schedules
 */
async function getOverdueMaintenanceSchedules() {
    logger.debug('Getting overdue maintenance schedules');
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from(MAINTENANCE_SCHEDULES_TABLE)
            .select()
            .is('deleted_at', null)
            .in('status', ['scheduled', 'in_progress'])
            .or(`due_date.lt.${today},and(due_date.is.null,scheduled_date.lt.${today})`)
            .order('scheduled_date', { ascending: true });
        if (error) {
            logger.error('Failed to get overdue maintenance schedules', error);
            return {
                success: false,
                error: new MaintenanceScheduleServiceError(`Failed to get overdue maintenance schedules: ${error.message}`, exports.MaintenanceScheduleErrorCodes.QUERY_FAILED, error),
            };
        }
        const maintenanceSchedules = data.map(maintenanceSchedule_js_1.rowToMaintenanceSchedule);
        return { success: true, data: maintenanceSchedules };
    }
    catch (error) {
        logger.error('Unexpected error getting overdue maintenance schedules', error);
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Unexpected error getting overdue maintenance schedules', exports.MaintenanceScheduleErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Marks a maintenance schedule as completed
 */
async function completeMaintenanceSchedule(id, completedDate, odometerReading, cost, notes) {
    logger.debug('Completing maintenance schedule', { id });
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        const updateData = {
            status: 'completed',
            completed_date: (completedDate ?? new Date()).toISOString().split('T')[0],
        };
        if (odometerReading !== undefined) {
            updateData.odometer_at_maintenance = odometerReading;
        }
        if (cost !== undefined) {
            updateData.cost = cost;
        }
        if (notes !== undefined) {
            updateData.notes = notes;
        }
        const { data, error } = await supabase
            .from(MAINTENANCE_SCHEDULES_TABLE)
            .update(updateData)
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new MaintenanceScheduleServiceError(`Maintenance schedule not found: ${id}`, exports.MaintenanceScheduleErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to complete maintenance schedule', error);
            return {
                success: false,
                error: new MaintenanceScheduleServiceError(`Failed to complete maintenance schedule: ${error.message}`, exports.MaintenanceScheduleErrorCodes.UPDATE_FAILED, error),
            };
        }
        const maintenanceSchedule = (0, maintenanceSchedule_js_1.rowToMaintenanceSchedule)(data);
        logger.info('Maintenance schedule completed successfully', { scheduleId: maintenanceSchedule.id });
        return { success: true, data: maintenanceSchedule };
    }
    catch (error) {
        logger.error('Unexpected error completing maintenance schedule', error);
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Unexpected error completing maintenance schedule', exports.MaintenanceScheduleErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Gets upcoming maintenance schedules (within next N days)
 */
async function getUpcomingMaintenanceSchedules(daysAhead = 30) {
    logger.debug('Getting upcoming maintenance schedules', { daysAhead });
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysAhead);
        const todayStr = today.toISOString().split('T')[0];
        const futureDateStr = futureDate.toISOString().split('T')[0];
        const { data, error } = await supabase
            .from(MAINTENANCE_SCHEDULES_TABLE)
            .select()
            .is('deleted_at', null)
            .in('status', ['scheduled', 'in_progress'])
            .or(`and(due_date.gte.${todayStr},due_date.lte.${futureDateStr}),and(due_date.is.null,scheduled_date.gte.${todayStr},scheduled_date.lte.${futureDateStr})`)
            .order('scheduled_date', { ascending: true });
        if (error) {
            logger.error('Failed to get upcoming maintenance schedules', error);
            return {
                success: false,
                error: new MaintenanceScheduleServiceError(`Failed to get upcoming maintenance schedules: ${error.message}`, exports.MaintenanceScheduleErrorCodes.QUERY_FAILED, error),
            };
        }
        const maintenanceSchedules = data.map(maintenanceSchedule_js_1.rowToMaintenanceSchedule);
        return { success: true, data: maintenanceSchedules };
    }
    catch (error) {
        logger.error('Unexpected error getting upcoming maintenance schedules', error);
        return {
            success: false,
            error: new MaintenanceScheduleServiceError('Unexpected error getting upcoming maintenance schedules', exports.MaintenanceScheduleErrorCodes.QUERY_FAILED, error),
        };
    }
}
//# sourceMappingURL=maintenanceSchedule.service.js.map