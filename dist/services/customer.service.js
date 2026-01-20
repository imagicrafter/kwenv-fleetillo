"use strict";
/**
 * Customer Service
 *
 * Provides CRUD operations and business logic for managing customers
 * in the Fleetillo application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerErrorCodes = exports.CustomerServiceError = void 0;
exports.createCustomer = createCustomer;
exports.getCustomerById = getCustomerById;
exports.getCustomers = getCustomers;
exports.updateCustomer = updateCustomer;
exports.deleteCustomer = deleteCustomer;
exports.hardDeleteCustomer = hardDeleteCustomer;
exports.restoreCustomer = restoreCustomer;
exports.countCustomers = countCustomers;
const supabase_js_1 = require("./supabase.js");
const logger_js_1 = require("../utils/logger.js");
const customer_js_1 = require("../types/customer.js");
const location_service_js_1 = require("./location.service.js");
/**
 * Logger instance for customer operations
 */
const logger = (0, logger_js_1.createContextLogger)('CustomerService');
/**
 * Table name for customers in the fleetillo schema
 */
const CUSTOMERS_TABLE = 'customers';
/**
 * Customer service error
 */
class CustomerServiceError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'CustomerServiceError';
        this.code = code;
        this.details = details;
    }
}
exports.CustomerServiceError = CustomerServiceError;
/**
 * Error codes for customer service errors
 */
exports.CustomerErrorCodes = {
    NOT_FOUND: 'CUSTOMER_NOT_FOUND',
    CREATE_FAILED: 'CUSTOMER_CREATE_FAILED',
    UPDATE_FAILED: 'CUSTOMER_UPDATE_FAILED',
    DELETE_FAILED: 'CUSTOMER_DELETE_FAILED',
    QUERY_FAILED: 'CUSTOMER_QUERY_FAILED',
    VALIDATION_FAILED: 'CUSTOMER_VALIDATION_FAILED',
};
/**
 * Validates customer input data
 */
function validateCustomerInput(input) {
    if (!input.name || input.name.trim().length === 0) {
        return {
            success: false,
            error: new CustomerServiceError('Customer name is required', exports.CustomerErrorCodes.VALIDATION_FAILED, { field: 'name' }),
        };
    }
    if (input.email && !isValidEmail(input.email)) {
        return {
            success: false,
            error: new CustomerServiceError('Invalid email format', exports.CustomerErrorCodes.VALIDATION_FAILED, { field: 'email', value: input.email }),
        };
    }
    if (input.latitude !== undefined && (input.latitude < -90 || input.latitude > 90)) {
        return {
            success: false,
            error: new CustomerServiceError('Latitude must be between -90 and 90', exports.CustomerErrorCodes.VALIDATION_FAILED, { field: 'latitude', value: input.latitude }),
        };
    }
    if (input.longitude !== undefined && (input.longitude < -180 || input.longitude > 180)) {
        return {
            success: false,
            error: new CustomerServiceError('Longitude must be between -180 and 180', exports.CustomerErrorCodes.VALIDATION_FAILED, { field: 'longitude', value: input.longitude }),
        };
    }
    return { success: true };
}
/**
 * Simple email validation
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Helper to get the appropriate Supabase client
 * Prefers admin client for privileged operations, falls back to standard client
 */
function getClient() {
    const adminClient = (0, supabase_js_1.getAdminSupabaseClient)();
    if (adminClient) {
        logger.debug('Using Admin Supabase Client');
        return adminClient;
    }
    const msg = 'CRITICAL: Admin Supabase Client is not available. This operation requires SUPABASE_SERVICE_ROLE_KEY to be set in .env';
    logger.error(msg);
    throw new Error(msg);
}
/**
 * Creates a new customer
 */
async function createCustomer(input, options) {
    logger.debug('Creating customer', { name: input.name });
    // Validate input
    const validationResult = validateCustomerInput(input);
    if (!validationResult.success) {
        return validationResult;
    }
    try {
        const supabase = getClient();
        const rowData = (0, customer_js_1.customerInputToRow)(input);
        const { data, error } = await supabase
            .from(CUSTOMERS_TABLE)
            .insert(rowData)
            .select()
            .single();
        if (error) {
            logger.error('Failed to create customer', error);
            return {
                success: false,
                error: new CustomerServiceError(`Failed to create customer: ${error.message}`, exports.CustomerErrorCodes.CREATE_FAILED, error),
            };
        }
        const customer = (0, customer_js_1.rowToCustomer)(data);
        logger.info('Customer created successfully', { customerId: customer.id, name: customer.name });
        // Create a primary location for the customer if address details are present AND not skipped
        if (!options?.skipLocationCreation && input.addressLine1 && input.city && input.state && input.postalCode) {
            try {
                const locationInput = {
                    customerId: customer.id,
                    name: 'Primary Address', // Default name
                    locationType: 'client',
                    isPrimary: true,
                    addressLine1: input.addressLine1,
                    addressLine2: input.addressLine2,
                    city: input.city,
                    state: input.state,
                    postalCode: input.postalCode,
                    country: input.country || 'USA',
                    latitude: input.latitude,
                    longitude: input.longitude
                };
                await (0, location_service_js_1.createLocation)(locationInput);
                logger.info('Created default primary location for customer', { customerId: customer.id });
            }
            catch (locError) {
                // Log but don't fail the customer creation, as the customer itself is valid
                logger.warn('Failed to create default location for new customer', { error: locError, customerId: customer.id });
            }
        }
        return { success: true, data: customer };
    }
    catch (error) {
        logger.error('Unexpected error creating customer', error);
        return {
            success: false,
            error: new CustomerServiceError('Unexpected error creating customer', exports.CustomerErrorCodes.CREATE_FAILED, error),
        };
    }
}
/**
 * Gets a customer by ID
 */
async function getCustomerById(id) {
    logger.debug('Getting customer by ID', { id });
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(CUSTOMERS_TABLE)
            .select()
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new CustomerServiceError(`Customer not found: ${id}`, exports.CustomerErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to get customer', error);
            return {
                success: false,
                error: new CustomerServiceError(`Failed to get customer: ${error.message}`, exports.CustomerErrorCodes.QUERY_FAILED, error),
            };
        }
        const customer = (0, customer_js_1.rowToCustomer)(data);
        return { success: true, data: customer };
    }
    catch (error) {
        logger.error('Unexpected error getting customer', error);
        return {
            success: false,
            error: new CustomerServiceError('Unexpected error getting customer', exports.CustomerErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets all customers with optional filtering and pagination
 */
async function getCustomers(filters, pagination) {
    logger.debug('Getting customers', { filters, pagination });
    try {
        const supabase = getClient();
        let query = supabase.from(CUSTOMERS_TABLE).select('*', { count: 'exact' });
        // Apply filters
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.city) {
            query = query.or(`city.ilike.%${filters.city}%,service_city.ilike.%${filters.city}%`);
        }
        if (filters?.state) {
            query = query.or(`state.ilike.%${filters.state}%,service_state.ilike.%${filters.state}%`);
        }
        if (filters?.searchTerm) {
            const term = filters.searchTerm;
            query = query.or(`name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%`);
        }
        if (filters?.tags && filters.tags.length > 0) {
            query = query.contains('tags', filters.tags);
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
            logger.error('Failed to get customers', error);
            return {
                success: false,
                error: new CustomerServiceError(`Failed to get customers: ${error.message}`, exports.CustomerErrorCodes.QUERY_FAILED, error),
            };
        }
        const customers = data.map(customer_js_1.rowToCustomer);
        const total = count ?? 0;
        return {
            success: true,
            data: {
                data: customers,
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
        logger.error('Unexpected error getting customers', error);
        return {
            success: false,
            error: new CustomerServiceError('Unexpected error getting customers', exports.CustomerErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Updates an existing customer
 */
async function updateCustomer(input) {
    logger.debug('Updating customer', { id: input.id });
    // Validate input if name is being updated
    if (input.name !== undefined) {
        const validationResult = validateCustomerInput({ name: input.name, ...input });
        if (!validationResult.success) {
            return validationResult;
        }
    }
    try {
        const supabase = getClient();
        // Build update object, excluding id
        const { id, ...updateData } = input;
        const rowData = (0, customer_js_1.customerInputToRow)(updateData);
        const { data, error } = await supabase
            .from(CUSTOMERS_TABLE)
            .update(rowData)
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new CustomerServiceError(`Customer not found: ${id}`, exports.CustomerErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to update customer', error);
            return {
                success: false,
                error: new CustomerServiceError(`Failed to update customer: ${error.message}`, exports.CustomerErrorCodes.UPDATE_FAILED, error),
            };
        }
        const customer = (0, customer_js_1.rowToCustomer)(data);
        logger.info('Customer updated successfully', { customerId: customer.id });
        return { success: true, data: customer };
    }
    catch (error) {
        logger.error('Unexpected error updating customer', error);
        return {
            success: false,
            error: new CustomerServiceError('Unexpected error updating customer', exports.CustomerErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Soft deletes a customer by setting deleted_at timestamp
 */
async function deleteCustomer(id) {
    logger.debug('Deleting customer', { id });
    try {
        const supabase = getClient();
        const { error } = await supabase
            .from(CUSTOMERS_TABLE)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .is('deleted_at', null);
        if (error) {
            logger.error('Failed to delete customer', error);
            return {
                success: false,
                error: new CustomerServiceError(`Failed to delete customer: ${error.message}`, exports.CustomerErrorCodes.DELETE_FAILED, error),
            };
        }
        logger.info('Customer deleted successfully', { customerId: id });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error deleting customer', error);
        return {
            success: false,
            error: new CustomerServiceError('Unexpected error deleting customer', exports.CustomerErrorCodes.DELETE_FAILED, error),
        };
    }
}
/**
 * Permanently deletes a customer (hard delete)
 * Use with caution - this cannot be undone
 */
async function hardDeleteCustomer(id) {
    logger.warn('Hard deleting customer', { id });
    try {
        const adminClient = (0, supabase_js_1.getAdminSupabaseClient)();
        if (!adminClient) {
            return {
                success: false,
                error: new CustomerServiceError('Admin client not available for hard delete operation', exports.CustomerErrorCodes.DELETE_FAILED),
            };
        }
        const { error } = await adminClient
            .from(CUSTOMERS_TABLE)
            .delete()
            .eq('id', id);
        if (error) {
            logger.error('Failed to hard delete customer', error);
            return {
                success: false,
                error: new CustomerServiceError(`Failed to hard delete customer: ${error.message}`, exports.CustomerErrorCodes.DELETE_FAILED, error),
            };
        }
        logger.info('Customer hard deleted successfully', { customerId: id });
        return { success: true };
    }
    catch (error) {
        logger.error('Unexpected error hard deleting customer', error);
        return {
            success: false,
            error: new CustomerServiceError('Unexpected error hard deleting customer', exports.CustomerErrorCodes.DELETE_FAILED, error),
        };
    }
}
/**
 * Restores a soft-deleted customer
 */
async function restoreCustomer(id) {
    logger.debug('Restoring customer', { id });
    try {
        const supabase = (0, supabase_js_1.getSupabaseClient)();
        const { data, error } = await supabase
            .from(CUSTOMERS_TABLE)
            .update({ deleted_at: null })
            .eq('id', id)
            .not('deleted_at', 'is', null)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return {
                    success: false,
                    error: new CustomerServiceError(`Deleted customer not found: ${id}`, exports.CustomerErrorCodes.NOT_FOUND, { id }),
                };
            }
            logger.error('Failed to restore customer', error);
            return {
                success: false,
                error: new CustomerServiceError(`Failed to restore customer: ${error.message}`, exports.CustomerErrorCodes.UPDATE_FAILED, error),
            };
        }
        const customer = (0, customer_js_1.rowToCustomer)(data);
        logger.info('Customer restored successfully', { customerId: customer.id });
        return { success: true, data: customer };
    }
    catch (error) {
        logger.error('Unexpected error restoring customer', error);
        return {
            success: false,
            error: new CustomerServiceError('Unexpected error restoring customer', exports.CustomerErrorCodes.UPDATE_FAILED, error),
        };
    }
}
/**
 * Counts customers with optional filters
 */
async function countCustomers(filters) {
    logger.debug('Counting customers', { filters });
    try {
        const supabase = getClient();
        let query = supabase.from(CUSTOMERS_TABLE).select('*', { count: 'exact', head: true });
        if (!filters?.includeDeleted) {
            query = query.is('deleted_at', null);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        const { count, error } = await query;
        if (error) {
            logger.error('Failed to count customers', error);
            return {
                success: false,
                error: new CustomerServiceError(`Failed to count customers: ${error.message}`, exports.CustomerErrorCodes.QUERY_FAILED, error),
            };
        }
        return { success: true, data: count ?? 0 };
    }
    catch (error) {
        logger.error('Unexpected error counting customers', error);
        return {
            success: false,
            error: new CustomerServiceError('Unexpected error counting customers', exports.CustomerErrorCodes.QUERY_FAILED, error),
        };
    }
}
//# sourceMappingURL=customer.service.js.map