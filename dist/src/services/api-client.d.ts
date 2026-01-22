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
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Result, PaginationParams, PaginatedResponse } from '../types/index';
/**
 * Options for API client configuration
 */
export interface ApiClientOptions {
    /** Use admin client (bypasses RLS) */
    useAdmin?: boolean;
    /** Enable query logging */
    enableLogging?: boolean;
    /** Enable performance tracking */
    trackPerformance?: boolean;
    /** Default timeout in milliseconds */
    defaultTimeout?: number;
}
/**
 * Query options for database operations
 */
export interface QueryOptions {
    /** Select specific columns */
    select?: string;
    /** Order by column */
    orderBy?: string;
    /** Order direction */
    orderDirection?: 'asc' | 'desc';
    /** Limit number of results */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
    /** Enable single row mode (returns single object instead of array) */
    single?: boolean;
    /** Enable maybe single mode (returns null instead of error if not found) */
    maybeSingle?: boolean;
}
/**
 * Filter operators for query building
 */
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
/**
 * Filter condition for queries
 */
export interface FilterCondition {
    column: string;
    operator: FilterOperator;
    value: unknown;
}
/**
 * Query filter - can be a simple object or an array of conditions
 */
export type QueryFilter = Record<string, unknown> | FilterCondition[];
/**
 * Query performance metrics
 */
export interface QueryMetrics {
    /** Query duration in milliseconds */
    durationMs: number;
    /** Number of rows affected/returned */
    rowCount: number;
    /** Table name */
    table: string;
    /** Operation type */
    operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
    /** Timestamp of the query */
    timestamp: Date;
}
/**
 * API Client class for database operations
 */
export declare class ApiClient {
    private readonly options;
    private readonly metrics;
    constructor(options?: ApiClientOptions);
    /**
     * Gets the appropriate Supabase client based on options
     */
    private getClient;
    /**
     * Logs query performance and details
     */
    private logQuery;
    /**
     * Applies filters to a query builder
     * Using 'any' for query type due to complex Supabase generics
     */
    private applyFilters;
    /**
     * Applies query options to a query builder
     * Using 'any' for query type due to complex Supabase generics
     */
    private applyOptions;
    /**
     * Find multiple records
     *
     * @param table - Table name
     * @param filters - Query filters
     * @param options - Query options
     * @returns Result with array of records
     */
    findMany<T = Record<string, unknown>>(table: string, filters?: QueryFilter, options?: QueryOptions): Promise<Result<T[]>>;
    /**
     * Find a single record
     *
     * @param table - Table name
     * @param filters - Query filters
     * @param options - Query options
     * @returns Result with single record or null
     */
    findOne<T = Record<string, unknown>>(table: string, filters: QueryFilter, options?: QueryOptions): Promise<Result<T | null>>;
    /**
     * Find a single record by ID
     *
     * @param table - Table name
     * @param id - Record ID
     * @param options - Query options
     * @returns Result with single record or null
     */
    findById<T = Record<string, unknown>>(table: string, id: string, options?: QueryOptions): Promise<Result<T | null>>;
    /**
     * Find a single record or throw if not found
     *
     * @param table - Table name
     * @param filters - Query filters
     * @param options - Query options
     * @returns Result with single record
     */
    findOneOrFail<T = Record<string, unknown>>(table: string, filters: QueryFilter, options?: QueryOptions): Promise<Result<T>>;
    /**
     * Insert a new record
     *
     * @param table - Table name
     * @param data - Record data to insert
     * @param options - Query options
     * @returns Result with inserted record
     */
    insert<T = Record<string, unknown>>(table: string, data: Partial<T>, options?: QueryOptions): Promise<Result<T>>;
    /**
     * Insert multiple records
     *
     * @param table - Table name
     * @param data - Array of record data to insert
     * @param options - Query options
     * @returns Result with inserted records
     */
    insertMany<T = Record<string, unknown>>(table: string, data: Partial<T>[], options?: QueryOptions): Promise<Result<T[]>>;
    /**
     * Update records matching filters
     *
     * @param table - Table name
     * @param filters - Query filters to match records
     * @param data - Data to update
     * @param options - Query options
     * @returns Result with updated records
     */
    update<T = Record<string, unknown>>(table: string, filters: QueryFilter, data: Partial<T>, options?: QueryOptions): Promise<Result<T[]>>;
    /**
     * Update a single record by ID
     *
     * @param table - Table name
     * @param id - Record ID
     * @param data - Data to update
     * @param options - Query options
     * @returns Result with updated record
     */
    updateById<T = Record<string, unknown>>(table: string, id: string, data: Partial<T>, options?: QueryOptions): Promise<Result<T | null>>;
    /**
     * Upsert a record (insert or update)
     *
     * @param table - Table name
     * @param data - Record data
     * @param options - Query options with onConflict columns
     * @returns Result with upserted record
     */
    upsert<T = Record<string, unknown>>(table: string, data: Partial<T>, options?: QueryOptions & {
        onConflict?: string;
    }): Promise<Result<T>>;
    /**
     * Delete records matching filters
     *
     * @param table - Table name
     * @param filters - Query filters to match records
     * @returns Result with deleted records
     */
    delete<T = Record<string, unknown>>(table: string, filters: QueryFilter): Promise<Result<T[]>>;
    /**
     * Delete a single record by ID
     *
     * @param table - Table name
     * @param id - Record ID
     * @returns Result with deleted record
     */
    deleteById<T = Record<string, unknown>>(table: string, id: string): Promise<Result<T | null>>;
    /**
     * Count records matching filters
     *
     * @param table - Table name
     * @param filters - Query filters
     * @returns Result with count
     */
    count(table: string, filters?: QueryFilter): Promise<Result<number>>;
    /**
     * Check if any records exist matching filters
     *
     * @param table - Table name
     * @param filters - Query filters
     * @returns Result with boolean
     */
    exists(table: string, filters: QueryFilter): Promise<Result<boolean>>;
    /**
     * Find records with pagination
     *
     * @param table - Table name
     * @param filters - Query filters
     * @param pagination - Pagination parameters
     * @param options - Additional query options
     * @returns Result with paginated response
     */
    findPaginated<T = Record<string, unknown>>(table: string, filters: QueryFilter | undefined, pagination: PaginationParams, options?: QueryOptions): Promise<Result<PaginatedResponse<T>>>;
    /**
     * Execute a raw SQL query using RPC
     *
     * @param functionName - RPC function name
     * @param params - Function parameters
     * @returns Result with function return value
     */
    rpc<T = unknown>(functionName: string, params?: Record<string, unknown>): Promise<Result<T>>;
    /**
     * Execute an operation with retry logic
     *
     * @param operation - Async operation to execute
     * @param options - Retry options
     * @returns Result from the operation
     */
    withRetry<T>(operation: () => Promise<Result<T>>, options?: {
        maxRetries?: number;
        baseDelay?: number;
        shouldRetry?: (error: unknown) => boolean;
    }): Promise<Result<T>>;
    /**
     * Get collected query metrics
     */
    getMetrics(): QueryMetrics[];
    /**
     * Clear collected metrics
     */
    clearMetrics(): void;
    /**
     * Get the underlying Supabase client
     * Use with caution - prefer using the wrapper methods
     */
    getUnderlyingClient(): SupabaseClient;
}
/**
 * Get the default API client singleton
 */
export declare function getApiClient(): ApiClient;
/**
 * Create a new API client with custom options
 *
 * @param options - Client configuration options
 * @returns New ApiClient instance
 */
export declare function createApiClient(options?: ApiClientOptions): ApiClient;
/**
 * Reset the default API client (useful for testing)
 */
export declare function resetApiClient(): void;
/**
 * Convenience export for the default client
 */
export declare const apiClient: {
    readonly instance: ApiClient;
    findMany: <T = Record<string, unknown>>(table: string, filters?: QueryFilter, options?: QueryOptions) => Promise<Result<T[], Error>>;
    findOne: <T = Record<string, unknown>>(table: string, filters: QueryFilter, options?: QueryOptions) => Promise<Result<T | null, Error>>;
    findById: <T = Record<string, unknown>>(table: string, id: string, options?: QueryOptions) => Promise<Result<T | null, Error>>;
    findOneOrFail: <T = Record<string, unknown>>(table: string, filters: QueryFilter, options?: QueryOptions) => Promise<Result<T, Error>>;
    insert: <T = Record<string, unknown>>(table: string, data: Partial<T>, options?: QueryOptions) => Promise<Result<T, Error>>;
    insertMany: <T = Record<string, unknown>>(table: string, data: Partial<T>[], options?: QueryOptions) => Promise<Result<T[], Error>>;
    update: <T = Record<string, unknown>>(table: string, filters: QueryFilter, data: Partial<T>, options?: QueryOptions) => Promise<Result<T[], Error>>;
    updateById: <T = Record<string, unknown>>(table: string, id: string, data: Partial<T>, options?: QueryOptions) => Promise<Result<T | null, Error>>;
    upsert: <T = Record<string, unknown>>(table: string, data: Partial<T>, options?: QueryOptions & {
        onConflict?: string;
    }) => Promise<Result<T, Error>>;
    delete: <T = Record<string, unknown>>(table: string, filters: QueryFilter) => Promise<Result<T[], Error>>;
    deleteById: <T = Record<string, unknown>>(table: string, id: string) => Promise<Result<T | null, Error>>;
    count: (table: string, filters?: QueryFilter) => Promise<Result<number, Error>>;
    exists: (table: string, filters: QueryFilter) => Promise<Result<boolean, Error>>;
    findPaginated: <T = Record<string, unknown>>(table: string, filters: QueryFilter, pagination: PaginationParams, options?: QueryOptions) => Promise<Result<PaginatedResponse<T>, Error>>;
    rpc: <T = unknown>(functionName: string, params?: Record<string, unknown>) => Promise<Result<T, Error>>;
    getMetrics: () => QueryMetrics[];
    clearMetrics: () => void;
};
export type { PostgrestError };
//# sourceMappingURL=api-client.d.ts.map