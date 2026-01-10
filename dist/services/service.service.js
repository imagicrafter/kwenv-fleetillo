"use strict";
/**
 * Service Service
 *
 * Provides CRUD operations and business logic for managing services
 * in the RouteIQ application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceErrorCodes = exports.ServiceServiceError = void 0;
exports.createService = createService;
exports.getServiceById = getServiceById;
exports.getServiceByCode = getServiceByCode;
exports.getServicesByType = getServicesByType;
exports.updateService = updateService;
exports.deleteService = deleteService;
exports.hardDeleteService = hardDeleteService;
exports.restoreService = restoreService;
exports.getServices = getServices;
exports.countServices = countServices;
const supabase_js_1 = require("./supabase.js");
const logger_js_1 = require("../utils/logger.js");
const service_js_1 = require("../types/service.js");
/**
 * Logger instance for service operations
 */
const logger = (0, logger_js_1.createContextLogger)('ServiceService');
/**
 * Table name for services in the routeiq schema
 */
const SERVICES_TABLE = 'services';
/**
 * Service service error
 */
class ServiceServiceError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'ServiceServiceError';
        this.code = code;
        this.details = details;
    }
}
exports.ServiceServiceError = ServiceServiceError;
/**
 * Error codes for service service errors
 */
exports.ServiceErrorCodes = {
    NOT_FOUND: 'SERVICE_NOT_FOUND',
    CREATE_FAILED: 'SERVICE_CREATE_FAILED',
    UPDATE_FAILED: 'SERVICE_UPDATE_FAILED',
    DELETE_FAILED: 'SERVICE_DELETE_FAILED',
    QUERY_FAILED: 'SERVICE_QUERY_FAILED',
    VALIDATION_FAILED: 'SERVICE_VALIDATION_FAILED',
    DUPLICATE_CODE: 'SERVICE_DUPLICATE_CODE',
};
/**
 * Validates service input data
 */
function validateServiceInput(input) {
    if (!input.name || input.name.trim().length === 0) {
        return {
            success: false,
            error: new ServiceServiceError('Service name is required', exports.ServiceErrorCodes.VALIDATION_FAILED, { field: 'name' }),
        };
    }
    if (!input.serviceType || input.serviceType.trim().length === 0) {
        return {
            success: false,
            error: new ServiceServiceError('Service type is required', exports.ServiceErrorCodes.VALIDATION_FAILED, { field: 'serviceType' }),
        };
    }
    if (input.averageDurationMinutes === undefined || input.averageDurationMinutes <= 0) {
        return {
            success: false,
            error: new ServiceServiceError('Average duration must be a positive number', exports.ServiceErrorCodes.VALIDATION_FAILED, { field: 'averageDurationMinutes', value: input.averageDurationMinutes }),
        };
    }
    if (input.minimumDurationMinutes !== undefined && input.minimumDurationMinutes <= 0) {
        return {
            success: false,
            error: new ServiceServiceError('Minimum duration must be a positive number', exports.ServiceErrorCodes.VALIDATION_FAILED, { field: 'minimumDurationMinutes', value: input.minimumDurationMinutes }),
        };
    }
    if (input.maximumDurationMinutes !== undefined) {
        if (input.maximumDurationMinutes <= 0) {
            return {
                success: false,
                error: new ServiceServiceError('Maximum duration must be a positive number', exports.ServiceErrorCodes.VALIDATION_FAILED, { field: 'maximumDurationMinutes', value: input.maximumDurationMinutes }),
            };
        }
        if (input.minimumDurationMinutes !== undefined && input.maximumDurationMinutes < input.minimumDurationMinutes) {
            return {
                success: false,
                error: new ServiceServiceError('Maximum duration must be greater than or equal to minimum duration', exports.ServiceErrorCodes.VALIDATION_FAILED, { field: 'maximumDurationMinutes', value: input.maximumDurationMinutes }),
            };
        }
    }
    if (input.basePrice !== undefined && input.basePrice < 0) {
        return {
            success: false,
            error: new ServiceServiceError('Base price cannot be negative', exports.ServiceErrorCodes.VALIDATION_FAILED, { field: 'basePrice', value: input.basePrice }),
        };
    }
    if (input.maxPerDay !== undefined && input.maxPerDay <= 0) {
        return {
            success: false,
            error: new ServiceServiceError('Max per day must be a positive number', exports.ServiceErrorCodes.VALIDATION_FAILED, { field: 'maxPerDay', value: input.maxPerDay }),
        };
    }
    return { success: true };
}
/**
 * Creates a new service
 */
async function createService(input) {
    logger.debug('Creating service', { name: input.name, serviceType: input.serviceType });
    // Validate input
    const validationResult = validateServiceInput(input);
    if (!validationResult.success) {
        return { success: false, error: validationResult.error };
    }
    try {
        // Use admin client if available to bypass RLS policies
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const rowData = (0, service_js_1.serviceInputToRow)(input);
        const { data, error } = await supabase
            .from(SERVICES_TABLE)
            .insert(rowData)
            .select()
            .single();
        if (error) {
            // Check for duplicate code constraint violation
            if (error.code === '23505' && error.message.includes('code')) {
                return {
                    success: false,
                    error: new ServiceServiceError(`Service code '${input.code}' already exists`, exports.ServiceErrorCodes.DUPLICATE_CODE, { code: input.code }),
                };
            }
            logger.error('Failed to create service', error);
            return {
                success: false,
                error: new ServiceServiceError(`Failed to create service: ${error.message}`, exports.ServiceErrorCodes.CREATE_FAILED, error),
            };
        }
        const service = (0, service_js_1.rowToService)(data);
        logger.info('Service created successfully', { serviceId: service.id, name: service.name });
        return { success: true, data: service };
    }
    catch (error) {
        logger.error('Unexpected error creating service', error);
        return {
            success: false,
            error: new ServiceServiceError('Unexpected error creating service', exports.ServiceErrorCodes.CREATE_FAILED, error),
        };
    }
}
/**
 * Gets a service by ID
 */
async function getServiceById(id) {
    logger.debug('Getting service by ID', { id });
    try {
        // Use admin client if available to bypass RLS permissions
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(SERVICES_TABLE)
            .select()
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new ServiceServiceError(`Service not found: ${id}`, exports.ServiceErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to get service', error);
            return {
                success: false,
                error: new ServiceServiceError(`Failed to get service: ${error.message}`, exports.ServiceErrorCodes.QUERY_FAILED, error),
            };
        }
        const service = (0, service_js_1.rowToService)(data);
        return { success: true, data: service };
    }
    catch (error) {
        logger.error('Unexpected error getting service', error);
        return {
            success: false,
            error: new ServiceServiceError('Unexpected error getting service', exports.ServiceErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets a service by code
 */
async function getServiceByCode(code) {
    logger.debug('Getting service by code', { code });
    try {
        // Use admin client if available to bypass RLS permissions
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(SERVICES_TABLE)
            .select()
            .eq('code', code)
            .is('deleted_at', null)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new ServiceServiceError(`Service not found with code: ${code}`, exports.ServiceErrorCodes.NOT_FOUND, { code }),
                };
            }
            logger.error('Failed to get service by code', error);
            return {
                success: false,
                error: new ServiceServiceError(`Failed to get service: ${error.message}`, exports.ServiceErrorCodes.QUERY_FAILED, error),
            };
        }
        const service = (0, service_js_1.rowToService)(data);
        return { success: true, data: service };
    }
    catch (error) {
        logger.error('Unexpected error getting service by code', error);
        return {
            success: false,
            error: new ServiceServiceError('Unexpected error getting service', exports.ServiceErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets all services with optional filtering and pagination
 */
/**
 * Gets services by type
 */
async function getServicesByType(serviceType, pagination) {
    return getServices({ serviceType, status: 'active' }, pagination);
}
/**
 * Updates an existing service
 */
async function updateService(input) {
    logger.debug('Updating service', { id: input.id });
    // Validate input if relevant fields are being updated
    if (input.name !== undefined || input.serviceType !== undefined || input.averageDurationMinutes !== undefined) {
        // Only validate fields that are being updated
        if (input.name !== undefined && (!input.name || input.name.trim().length === 0)) {
            return {
                success: false,
                error: new ServiceServiceError('Service name is required', exports.ServiceErrorCodes.VALIDATION_FAILED, { field: 'name' }),
            };
        }
        if (input.averageDurationMinutes !== undefined && input.averageDurationMinutes <= 0) {
            return {
                success: false,
                error: new ServiceServiceError('Average duration must be a positive number', exports.ServiceErrorCodes.VALIDATION_FAILED, { field: 'averageDurationMinutes' }),
            };
        }
    }
    try {
        // Use admin client if available to bypass RLS permissions
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        // Build update object, excluding id
        const { id, ...updateData } = input;
        const rowData = (0, service_js_1.serviceInputToRow)(updateData);
        // Remove undefined values
        const cleanRowData = Object.fromEntries(Object.entries(rowData).filter(([, value]) => value !== undefined));
        const { data, error } = await supabase
            .from(SERVICES_TABLE)
            .update(cleanRowData)
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new ServiceServiceError(`Service not found: ${id}`, exports.ServiceErrorCodes.NOT_FOUND, { id }),
                };
            }
            // Check for duplicate code constraint violation
            if (error.code === '23505' && error.message.includes('code')) {
                return {
                    success: false,
                    error: new ServiceServiceError(`Service code '${input.code}' already exists`, exports.ServiceErrorCodes.DUPLICATE_CODE, { code: input.code }),
                };
            }
            logger.error('Failed to update service', error);
            return {
                success: false,
                error: new ServiceServiceError(`Failed to update service: ${error.message}`, exports.ServiceErrorCodes.UPDATE_FAILED, error),
            };
        }
        const service = (0, service_js_1.rowToService)(data);
        logger.info('Service updated successfully', { serviceId: service.id });
        return { success: true, data: service };
    }
    catch (error) {
        logger.error('Unexpected error updating service', error);
        return {
            success: false,
            error: new ServiceServiceError('Unexpected error updating service', exports.ServiceErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Soft deletes a service by setting deleted_at timestamp
 */
async function deleteService(id) {
    logger.debug('Deleting service', { id });
    try {
        // Use admin client if available to bypass RLS permissions
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { error } = await supabase
            .from(SERVICES_TABLE)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .is('deleted_at', null);
        if (error) {
            logger.error('Failed to delete service', error);
            return {
                success: false,
                error: new ServiceServiceError(`Failed to delete service: ${error.message}`, exports.ServiceErrorCodes.DELETE_FAILED, error),
            };
        }
        logger.info('Service deleted successfully', { serviceId: id });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error deleting service', error);
        return {
            success: false,
            error: new ServiceServiceError('Unexpected error deleting service', exports.ServiceErrorCodes.DELETE_FAILED, error),
        };
    }
}
/**
 * Permanently deletes a service (hard delete)
 * Use with caution - this cannot be undone
 */
async function hardDeleteService(id) {
    logger.warn('Hard deleting service', { id });
    try {
        const adminClient = (0, supabase_js_1.getAdminSupabaseClient)();
        if (!adminClient) {
            return {
                success: false,
                error: new ServiceServiceError('Admin client not available for hard delete operation', exports.ServiceErrorCodes.DELETE_FAILED),
            };
        }
        const { error } = await adminClient
            .from(SERVICES_TABLE)
            .delete()
            .eq('id', id);
        if (error) {
            logger.error('Failed to hard delete service', error);
            return {
                success: false,
                error: new ServiceServiceError(`Failed to hard delete service: ${error.message}`, exports.ServiceErrorCodes.DELETE_FAILED, error),
            };
        }
        logger.info('Service hard deleted successfully', { serviceId: id });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error hard deleting service', error);
        return {
            success: false,
            error: new ServiceServiceError('Unexpected error hard deleting service', exports.ServiceErrorCodes.DELETE_FAILED, error),
        };
    }
}
/**
 * Restores a soft-deleted service
 */
async function restoreService(id) {
    logger.debug('Restoring service', { id });
    try {
        // Use admin client if available to bypass RLS permissions
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(SERVICES_TABLE)
            .update({ deleted_at: null })
            .eq('id', id)
            .not('deleted_at', 'is', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new ServiceServiceError(`Deleted service not found: ${id}`, exports.ServiceErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to restore service', error);
            return {
                success: false,
                error: new ServiceServiceError(`Failed to restore service: ${error.message}`, exports.ServiceErrorCodes.UPDATE_FAILED, error),
            };
        }
        const service = (0, service_js_1.rowToService)(data);
        logger.info('Service restored successfully', { serviceId: service.id });
        return { success: true, data: service };
    }
    catch (error) {
        logger.error('Unexpected error restoring service', error);
        return {
            success: false,
            error: new ServiceServiceError('Unexpected error restoring service', exports.ServiceErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Counts services with optional filters
 */
async function getServices(filters, pagination) {
    logger.debug('Getting services', { filters, pagination });
    try {
        // Use admin client if available to bypass RLS permissions
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        let query = supabase.from(SERVICES_TABLE).select('*', { count: 'exact' });
        if (filters?.searchTerm) {
            query = query.or(`name.ilike.%${filters.searchTerm}%,code.ilike.%${filters.searchTerm}%`);
        }
        if (filters?.serviceType) {
            query = query.eq('service_type', filters.serviceType);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        // Apply pagination
        const page = pagination?.page ?? 1;
        const limit = pagination?.limit ?? 20;
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);
        // Apply sorting
        const sortBy = pagination?.sortBy ?? 'created_at';
        const sortOrder = pagination?.sortOrder ?? 'desc';
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        const { data, error, count } = await query;
        if (error) {
            logger.error('Failed to get services', error);
            return {
                success: false,
                error: new ServiceServiceError(`Failed to get services: ${error.message}`, exports.ServiceErrorCodes.QUERY_FAILED, error),
            };
        }
        const services = data.map(service_js_1.rowToService);
        const total = count ?? 0;
        return {
            success: true,
            data: {
                data: services,
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
        logger.error('Unexpected error getting services', error);
        return {
            success: false,
            error: new ServiceServiceError('Unexpected error getting services', exports.ServiceErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Counts services with optional filters
 */
async function countServices(filters) {
    logger.debug('Counting services', { filters });
    try {
        // Use admin client if available to bypass RLS permissions
        const supabase = (0, supabase_js_1.getAdminSupabaseClient)() || (0, supabase_js_1.getSupabaseClient)();
        let query = supabase.from(SERVICES_TABLE).select('*', { count: 'exact', head: true });
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.serviceType) {
            query = query.eq('service_type', filters.serviceType);
        }
        const { count, error } = await query;
        if (error) {
            logger.error('Failed to count services', error);
            return {
                success: false,
                error: new ServiceServiceError(`Failed to count services: ${error.message}`, exports.ServiceErrorCodes.QUERY_FAILED, error),
            };
        }
        return { success: true, data: count ?? 0 };
    }
    catch (error) {
        logger.error('Unexpected error counting services', error);
        return {
            success: false,
            error: new ServiceServiceError('Unexpected error counting services', exports.ServiceErrorCodes.QUERY_FAILED, error),
        };
    }
}
//# sourceMappingURL=service.service.js.map