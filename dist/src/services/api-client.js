"use strict";
/**
 * API Client Service
 *
 * A wrapper service around Supabase client for consistent database operations
 * with comprehensive error handling, logging, and performance tracking.
 *
 * Features:
 * - Type-safe CRUD operations
 * - Consistent error handling with AppError integration
 * - Query logging with performance metrics
 * - Retry logic for transient failures
 * - Support for both regular and admin clients
 *
 * @example
 * ```typescript
 * import { apiClient, createApiClient } from '@/services/api-client';
 *
 * // Using the singleton
 * const result = await apiClient.findOne('users', { id: '123' });
 * if (result.success) {
 *   console.log(result.data);
 * }
 *
 * // Using a custom client
 * const client = createApiClient({ useAdmin: true });
 * await client.insert('users', { name: 'John' });
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = exports.ApiClient = void 0;
exports.getApiClient = getApiClient;
exports.createApiClient = createApiClient;
exports.resetApiClient = resetApiClient;
const supabase_1 = require("./supabase");
const logger_1 = require("../utils/logger");
const index_1 = require("../errors/index");
const codes_1 = require("../errors/codes");
/**
 * Logger instance for API client operations
 */
const logger = (0, logger_1.createContextLogger)('ApiClient');
/**
 * Default API client options
 */
const DEFAULT_OPTIONS = {
    useAdmin: false,
    enableLogging: true,
    trackPerformance: true,
    defaultTimeout: 30000,
};
/**
 * Maps Supabase/Postgres error codes to appropriate error types
 */
function mapPostgresError(error, table, operation) {
    const { code, message, details } = error;
    // Log the original error for debugging
    logger.debug('Postgres error received', {
        code,
        message,
        details,
        table,
        operation,
    });
    // Handle specific Postgres error codes
    switch (code) {
        // Unique violation
        case '23505':
            return index_1.ResourceError.alreadyExists(table, details || undefined);
        // Foreign key violation
        case '23503':
            return new index_1.ValidationError(`Foreign key constraint violated: ${message}`, [
                { field: 'reference', message: details || 'Referenced record does not exist' },
            ]);
        // Not null violation
        case '23502':
            return new index_1.ValidationError(`Required field is missing: ${message}`, [
                { field: details || 'unknown', message: 'This field is required' },
            ]);
        // Check constraint violation
        case '23514':
            return new index_1.ValidationError(`Constraint violation: ${message}`, [
                { field: 'constraint', message: details || 'Check constraint failed' },
            ]);
        // Invalid text representation (bad input)
        case '22P02':
            return new index_1.ValidationError(`Invalid input format: ${message}`);
        // Relation does not exist
        case '42P01':
            return index_1.ResourceError.notFound('Table', table);
        // Column does not exist
        case '42703':
            return new index_1.ValidationError(`Invalid column: ${message}`);
        // Insufficient privilege
        case '42501':
            return index_1.DatabaseError.queryError(`Insufficient privileges for ${operation} on ${table}`, new Error(message));
        // Connection errors
        case '08000':
        case '08003':
        case '08006':
            return index_1.DatabaseError.connectionError(new Error(message));
        // PGRST codes (PostgREST specific)
        case 'PGRST116': // Not found (single row expected)
            return index_1.ResourceError.notFound(table);
        // Default database error
        default:
            return new index_1.DatabaseError(`Database operation failed: ${message}`, codes_1.ErrorCodes.DATABASE_QUERY_ERROR, new Error(message), { table, operation, code });
    }
}
/**
 * API Client class for database operations
 */
class ApiClient {
    options;
    metrics = [];
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Gets the appropriate Supabase client based on options
     */
    getClient() {
        if (!(0, supabase_1.isSupabaseInitialized)()) {
            throw new index_1.DatabaseError('Supabase client is not initialized. Call initializeSupabase() first.', codes_1.ErrorCodes.DATABASE_CONNECTION_ERROR);
        }
        if (this.options.useAdmin) {
            const adminClient = (0, supabase_1.getAdminSupabaseClient)();
            if (!adminClient) {
                throw new index_1.DatabaseError('Admin client is not available. Service role key may be missing.', codes_1.ErrorCodes.DATABASE_CONNECTION_ERROR);
            }
            return adminClient;
        }
        return (0, supabase_1.getSupabaseClient)();
    }
    /**
     * Logs query performance and details
     */
    logQuery(operation, table, durationMs, rowCount, error) {
        if (!this.options.enableLogging)
            return;
        const metrics = {
            durationMs,
            rowCount,
            table,
            operation,
            timestamp: new Date(),
        };
        if (this.options.trackPerformance) {
            this.metrics.push(metrics);
            // Keep only last 100 metrics
            if (this.metrics.length > 100) {
                this.metrics.shift();
            }
        }
        if (error) {
            logger.error(`${operation.toUpperCase()} ${table} failed`, error, {
                durationMs,
                rowCount,
            });
        }
        else {
            logger.debug(`${operation.toUpperCase()} ${table}`, {
                durationMs,
                rowCount,
            });
        }
    }
    /**
     * Applies filters to a query builder
     * Using 'any' for query type due to complex Supabase generics
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyFilters(query, filters) {
        if (Array.isArray(filters)) {
            // Filter conditions array
            for (const condition of filters) {
                const { column, operator, value } = condition;
                switch (operator) {
                    case 'eq':
                        query = query.eq(column, value);
                        break;
                    case 'neq':
                        query = query.neq(column, value);
                        break;
                    case 'gt':
                        query = query.gt(column, value);
                        break;
                    case 'gte':
                        query = query.gte(column, value);
                        break;
                    case 'lt':
                        query = query.lt(column, value);
                        break;
                    case 'lte':
                        query = query.lte(column, value);
                        break;
                    case 'like':
                        query = query.like(column, value);
                        break;
                    case 'ilike':
                        query = query.ilike(column, value);
                        break;
                    case 'in':
                        query = query.in(column, value);
                        break;
                    case 'is':
                        query = query.is(column, value);
                        break;
                }
            }
        }
        else {
            // Simple equality filters
            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined) {
                    query = query.eq(key, value);
                }
            }
        }
        return query;
    }
    /**
     * Applies query options to a query builder
     * Using 'any' for query type due to complex Supabase generics
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyOptions(query, options) {
        if (options.orderBy) {
            query = query.order(options.orderBy, {
                ascending: options.orderDirection !== 'desc',
            });
        }
        if (options.limit !== undefined) {
            query = query.limit(options.limit);
        }
        if (options.offset !== undefined) {
            query = query.range(options.offset, options.offset + (options.limit ?? 10) - 1);
        }
        return query;
    }
    /**
     * Find multiple records
     *
     * @param table - Table name
     * @param filters - Query filters
     * @param options - Query options
     * @returns Result with array of records
     */
    async findMany(table, filters = {}, options = {}) {
        const startTime = Date.now();
        let rowCount = 0;
        try {
            const client = this.getClient();
            let query = client.from(table).select(options.select || '*');
            query = this.applyFilters(query, filters);
            query = this.applyOptions(query, options);
            const { data, error } = await query;
            const durationMs = Date.now() - startTime;
            rowCount = data?.length ?? 0;
            if (error) {
                const mappedError = mapPostgresError(error, table, 'select');
                this.logQuery('select', table, durationMs, 0, mappedError);
                return { success: false, error: (0, index_1.normalizeError)(mappedError) };
            }
            this.logQuery('select', table, durationMs, rowCount);
            return { success: true, data: data ?? [] };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const normalizedError = (0, index_1.normalizeError)(error);
            this.logQuery('select', table, durationMs, 0, normalizedError);
            return { success: false, error: normalizedError };
        }
    }
    /**
     * Find a single record
     *
     * @param table - Table name
     * @param filters - Query filters
     * @param options - Query options
     * @returns Result with single record or null
     */
    async findOne(table, filters, options = {}) {
        const startTime = Date.now();
        try {
            const client = this.getClient();
            let query = client.from(table).select(options.select || '*');
            query = this.applyFilters(query, filters);
            query = query.limit(1);
            // Use maybeSingle to return null instead of error when not found
            const { data, error } = await query.maybeSingle();
            const durationMs = Date.now() - startTime;
            if (error) {
                const mappedError = mapPostgresError(error, table, 'select');
                this.logQuery('select', table, durationMs, 0, mappedError);
                return { success: false, error: (0, index_1.normalizeError)(mappedError) };
            }
            this.logQuery('select', table, durationMs, data ? 1 : 0);
            return { success: true, data: data ?? null };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const normalizedError = (0, index_1.normalizeError)(error);
            this.logQuery('select', table, durationMs, 0, normalizedError);
            return { success: false, error: normalizedError };
        }
    }
    /**
     * Find a single record by ID
     *
     * @param table - Table name
     * @param id - Record ID
     * @param options - Query options
     * @returns Result with single record or null
     */
    async findById(table, id, options = {}) {
        return this.findOne(table, { id }, options);
    }
    /**
     * Find a single record or throw if not found
     *
     * @param table - Table name
     * @param filters - Query filters
     * @param options - Query options
     * @returns Result with single record
     */
    async findOneOrFail(table, filters, options = {}) {
        const result = await this.findOne(table, filters, options);
        if (!result.success) {
            return result;
        }
        if (result.data === null) {
            return {
                success: false,
                error: index_1.ResourceError.notFound(table),
            };
        }
        return { success: true, data: result.data };
    }
    /**
     * Insert a new record
     *
     * @param table - Table name
     * @param data - Record data to insert
     * @param options - Query options
     * @returns Result with inserted record
     */
    async insert(table, data, options = {}) {
        const startTime = Date.now();
        try {
            const client = this.getClient();
            const query = client
                .from(table)
                .insert(data)
                .select(options.select || '*')
                .single();
            const { data: result, error } = await query;
            const durationMs = Date.now() - startTime;
            if (error) {
                const mappedError = mapPostgresError(error, table, 'insert');
                this.logQuery('insert', table, durationMs, 0, mappedError);
                return { success: false, error: (0, index_1.normalizeError)(mappedError) };
            }
            this.logQuery('insert', table, durationMs, 1);
            return { success: true, data: result };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const normalizedError = (0, index_1.normalizeError)(error);
            this.logQuery('insert', table, durationMs, 0, normalizedError);
            return { success: false, error: normalizedError };
        }
    }
    /**
     * Insert multiple records
     *
     * @param table - Table name
     * @param data - Array of record data to insert
     * @param options - Query options
     * @returns Result with inserted records
     */
    async insertMany(table, data, options = {}) {
        const startTime = Date.now();
        try {
            if (data.length === 0) {
                return { success: true, data: [] };
            }
            const client = this.getClient();
            const query = client
                .from(table)
                .insert(data)
                .select(options.select || '*');
            const { data: result, error } = await query;
            const durationMs = Date.now() - startTime;
            if (error) {
                const mappedError = mapPostgresError(error, table, 'insert');
                this.logQuery('insert', table, durationMs, 0, mappedError);
                return { success: false, error: (0, index_1.normalizeError)(mappedError) };
            }
            this.logQuery('insert', table, durationMs, result?.length ?? 0);
            return { success: true, data: result ?? [] };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const normalizedError = (0, index_1.normalizeError)(error);
            this.logQuery('insert', table, durationMs, 0, normalizedError);
            return { success: false, error: normalizedError };
        }
    }
    /**
     * Update records matching filters
     *
     * @param table - Table name
     * @param filters - Query filters to match records
     * @param data - Data to update
     * @param options - Query options
     * @returns Result with updated records
     */
    async update(table, filters, data, options = {}) {
        const startTime = Date.now();
        try {
            const client = this.getClient();
            let query = client
                .from(table)
                .update(data)
                .select(options.select || '*');
            query = this.applyFilters(query, filters);
            const { data: result, error } = await query;
            const durationMs = Date.now() - startTime;
            if (error) {
                const mappedError = mapPostgresError(error, table, 'update');
                this.logQuery('update', table, durationMs, 0, mappedError);
                return { success: false, error: (0, index_1.normalizeError)(mappedError) };
            }
            this.logQuery('update', table, durationMs, result?.length ?? 0);
            return { success: true, data: result ?? [] };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const normalizedError = (0, index_1.normalizeError)(error);
            this.logQuery('update', table, durationMs, 0, normalizedError);
            return { success: false, error: normalizedError };
        }
    }
    /**
     * Update a single record by ID
     *
     * @param table - Table name
     * @param id - Record ID
     * @param data - Data to update
     * @param options - Query options
     * @returns Result with updated record
     */
    async updateById(table, id, data, options = {}) {
        const result = await this.update(table, { id }, data, options);
        if (!result.success) {
            return result;
        }
        return {
            success: true,
            data: result.data?.[0] ?? null,
        };
    }
    /**
     * Upsert a record (insert or update)
     *
     * @param table - Table name
     * @param data - Record data
     * @param options - Query options with onConflict columns
     * @returns Result with upserted record
     */
    async upsert(table, data, options = {}) {
        const startTime = Date.now();
        try {
            const client = this.getClient();
            const query = client
                .from(table)
                .upsert(data, {
                onConflict: options.onConflict,
            })
                .select(options.select || '*')
                .single();
            const { data: result, error } = await query;
            const durationMs = Date.now() - startTime;
            if (error) {
                const mappedError = mapPostgresError(error, table, 'upsert');
                this.logQuery('upsert', table, durationMs, 0, mappedError);
                return { success: false, error: (0, index_1.normalizeError)(mappedError) };
            }
            this.logQuery('upsert', table, durationMs, 1);
            return { success: true, data: result };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const normalizedError = (0, index_1.normalizeError)(error);
            this.logQuery('upsert', table, durationMs, 0, normalizedError);
            return { success: false, error: normalizedError };
        }
    }
    /**
     * Delete records matching filters
     *
     * @param table - Table name
     * @param filters - Query filters to match records
     * @returns Result with deleted records
     */
    async delete(table, filters) {
        const startTime = Date.now();
        try {
            const client = this.getClient();
            let query = client.from(table).delete().select('*');
            query = this.applyFilters(query, filters);
            const { data: result, error } = await query;
            const durationMs = Date.now() - startTime;
            if (error) {
                const mappedError = mapPostgresError(error, table, 'delete');
                this.logQuery('delete', table, durationMs, 0, mappedError);
                return { success: false, error: (0, index_1.normalizeError)(mappedError) };
            }
            this.logQuery('delete', table, durationMs, result?.length ?? 0);
            return { success: true, data: result ?? [] };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const normalizedError = (0, index_1.normalizeError)(error);
            this.logQuery('delete', table, durationMs, 0, normalizedError);
            return { success: false, error: normalizedError };
        }
    }
    /**
     * Delete a single record by ID
     *
     * @param table - Table name
     * @param id - Record ID
     * @returns Result with deleted record
     */
    async deleteById(table, id) {
        const result = await this.delete(table, { id });
        if (!result.success) {
            return result;
        }
        return {
            success: true,
            data: result.data?.[0] ?? null,
        };
    }
    /**
     * Count records matching filters
     *
     * @param table - Table name
     * @param filters - Query filters
     * @returns Result with count
     */
    async count(table, filters = {}) {
        const startTime = Date.now();
        try {
            const client = this.getClient();
            let query = client.from(table).select('*', { count: 'exact', head: true });
            query = this.applyFilters(query, filters);
            const { count, error } = await query;
            const durationMs = Date.now() - startTime;
            if (error) {
                const mappedError = mapPostgresError(error, table, 'select');
                this.logQuery('select', table, durationMs, 0, mappedError);
                return { success: false, error: (0, index_1.normalizeError)(mappedError) };
            }
            this.logQuery('select', table, durationMs, count ?? 0);
            return { success: true, data: count ?? 0 };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const normalizedError = (0, index_1.normalizeError)(error);
            this.logQuery('select', table, durationMs, 0, normalizedError);
            return { success: false, error: normalizedError };
        }
    }
    /**
     * Check if any records exist matching filters
     *
     * @param table - Table name
     * @param filters - Query filters
     * @returns Result with boolean
     */
    async exists(table, filters) {
        const result = await this.count(table, filters);
        if (!result.success) {
            return { success: false, error: result.error };
        }
        return { success: true, data: (result.data ?? 0) > 0 };
    }
    /**
     * Find records with pagination
     *
     * @param table - Table name
     * @param filters - Query filters
     * @param pagination - Pagination parameters
     * @param options - Additional query options
     * @returns Result with paginated response
     */
    async findPaginated(table, filters = {}, pagination, options = {}) {
        const startTime = Date.now();
        try {
            const client = this.getClient();
            // Get total count
            const countResult = await this.count(table, filters);
            if (!countResult.success) {
                return { success: false, error: countResult.error };
            }
            const total = countResult.data ?? 0;
            // Get paginated data
            const offset = (pagination.page - 1) * pagination.limit;
            let query = client.from(table).select(options.select || '*');
            query = this.applyFilters(query, filters);
            if (pagination.sortBy) {
                query = query.order(pagination.sortBy, {
                    ascending: pagination.sortOrder !== 'desc',
                });
            }
            query = query.range(offset, offset + pagination.limit - 1);
            const { data, error } = await query;
            const durationMs = Date.now() - startTime;
            if (error) {
                const mappedError = mapPostgresError(error, table, 'select');
                this.logQuery('select', table, durationMs, 0, mappedError);
                return { success: false, error: (0, index_1.normalizeError)(mappedError) };
            }
            const totalPages = Math.ceil(total / pagination.limit);
            const result = {
                data: data ?? [],
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total,
                    totalPages,
                },
            };
            this.logQuery('select', table, durationMs, data?.length ?? 0);
            return { success: true, data: result };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const normalizedError = (0, index_1.normalizeError)(error);
            this.logQuery('select', table, durationMs, 0, normalizedError);
            return { success: false, error: normalizedError };
        }
    }
    /**
     * Execute a raw SQL query using RPC
     *
     * @param functionName - RPC function name
     * @param params - Function parameters
     * @returns Result with function return value
     */
    async rpc(functionName, params = {}) {
        const startTime = Date.now();
        try {
            const client = this.getClient();
            const { data, error } = await client.rpc(functionName, params);
            const durationMs = Date.now() - startTime;
            if (error) {
                const mappedError = mapPostgresError(error, functionName, 'rpc');
                logger.error(`RPC ${functionName} failed`, mappedError, { durationMs });
                return { success: false, error: (0, index_1.normalizeError)(mappedError) };
            }
            logger.debug(`RPC ${functionName}`, { durationMs });
            return { success: true, data: data };
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const normalizedError = (0, index_1.normalizeError)(error);
            logger.error(`RPC ${functionName} failed`, normalizedError, { durationMs });
            return { success: false, error: normalizedError };
        }
    }
    /**
     * Execute an operation with retry logic
     *
     * @param operation - Async operation to execute
     * @param options - Retry options
     * @returns Result from the operation
     */
    async withRetry(operation, options = {}) {
        const { maxRetries = 3, baseDelay = 1000, shouldRetry } = options;
        try {
            const result = await (0, index_1.retryWithBackoff)(async () => {
                const opResult = await operation();
                if (!opResult.success) {
                    throw opResult.error;
                }
                return opResult.data;
            }, {
                maxRetries,
                baseDelay,
                shouldRetry: shouldRetry ?? ((error) => {
                    // Retry on connection errors
                    if (error instanceof index_1.DatabaseError) {
                        return error.code === codes_1.ErrorCodes.DATABASE_CONNECTION_ERROR.code;
                    }
                    return false;
                }),
                onRetry: (_error, attempt, delay) => {
                    logger.warn(`Retrying operation (attempt ${attempt})`, { delay });
                },
            });
            return { success: true, data: result };
        }
        catch (error) {
            return { success: false, error: (0, index_1.normalizeError)(error) };
        }
    }
    /**
     * Get collected query metrics
     */
    getMetrics() {
        return [...this.metrics];
    }
    /**
     * Clear collected metrics
     */
    clearMetrics() {
        this.metrics.length = 0;
    }
    /**
     * Get the underlying Supabase client
     * Use with caution - prefer using the wrapper methods
     */
    getUnderlyingClient() {
        return this.getClient();
    }
}
exports.ApiClient = ApiClient;
/**
 * Singleton API client instance with default options
 */
let defaultApiClient = null;
/**
 * Get the default API client singleton
 */
function getApiClient() {
    if (!defaultApiClient) {
        defaultApiClient = new ApiClient();
    }
    return defaultApiClient;
}
/**
 * Create a new API client with custom options
 *
 * @param options - Client configuration options
 * @returns New ApiClient instance
 */
function createApiClient(options = {}) {
    return new ApiClient(options);
}
/**
 * Reset the default API client (useful for testing)
 */
function resetApiClient() {
    defaultApiClient = null;
}
/**
 * Convenience export for the default client
 */
exports.apiClient = {
    get instance() {
        return getApiClient();
    },
    findMany: (table, filters, options) => getApiClient().findMany(table, filters, options),
    findOne: (table, filters, options) => getApiClient().findOne(table, filters, options),
    findById: (table, id, options) => getApiClient().findById(table, id, options),
    findOneOrFail: (table, filters, options) => getApiClient().findOneOrFail(table, filters, options),
    insert: (table, data, options) => getApiClient().insert(table, data, options),
    insertMany: (table, data, options) => getApiClient().insertMany(table, data, options),
    update: (table, filters, data, options) => getApiClient().update(table, filters, data, options),
    updateById: (table, id, data, options) => getApiClient().updateById(table, id, data, options),
    upsert: (table, data, options) => getApiClient().upsert(table, data, options),
    delete: (table, filters) => getApiClient().delete(table, filters),
    deleteById: (table, id) => getApiClient().deleteById(table, id),
    count: (table, filters) => getApiClient().count(table, filters),
    exists: (table, filters) => getApiClient().exists(table, filters),
    findPaginated: (table, filters, pagination, options) => getApiClient().findPaginated(table, filters, pagination, options),
    rpc: (functionName, params) => getApiClient().rpc(functionName, params),
    getMetrics: () => getApiClient().getMetrics(),
    clearMetrics: () => getApiClient().clearMetrics(),
};
//# sourceMappingURL=api-client.js.map