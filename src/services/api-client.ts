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
import { getSupabaseClient, getAdminSupabaseClient, isSupabaseInitialized } from './supabase';
import { createContextLogger } from '../utils/logger';
import {
  DatabaseError,
  ResourceError,
  ValidationError,
  retryWithBackoff,
  normalizeError,
} from '../errors/index';
import { ErrorCodes } from '../errors/codes';
import type { Result, PaginationParams, PaginatedResponse } from '../types/index';

/**
 * Logger instance for API client operations
 */
const logger = createContextLogger('ApiClient');

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
 * Default API client options
 */
const DEFAULT_OPTIONS: Required<ApiClientOptions> = {
  useAdmin: false,
  enableLogging: true,
  trackPerformance: true,
  defaultTimeout: 30000,
};

/**
 * Maps Supabase/Postgres error codes to appropriate error types
 */
function mapPostgresError(error: PostgrestError, table: string, operation: string): Error {
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
      return ResourceError.alreadyExists(table, details || undefined);

    // Foreign key violation
    case '23503':
      return new ValidationError(`Foreign key constraint violated: ${message}`, [
        { field: 'reference', message: details || 'Referenced record does not exist' },
      ]);

    // Not null violation
    case '23502':
      return new ValidationError(`Required field is missing: ${message}`, [
        { field: details || 'unknown', message: 'This field is required' },
      ]);

    // Check constraint violation
    case '23514':
      return new ValidationError(`Constraint violation: ${message}`, [
        { field: 'constraint', message: details || 'Check constraint failed' },
      ]);

    // Invalid text representation (bad input)
    case '22P02':
      return new ValidationError(`Invalid input format: ${message}`);

    // Relation does not exist
    case '42P01':
      return ResourceError.notFound('Table', table);

    // Column does not exist
    case '42703':
      return new ValidationError(`Invalid column: ${message}`);

    // Insufficient privilege
    case '42501':
      return DatabaseError.queryError(
        `Insufficient privileges for ${operation} on ${table}`,
        new Error(message)
      );

    // Connection errors
    case '08000':
    case '08003':
    case '08006':
      return DatabaseError.connectionError(new Error(message));

    // PGRST codes (PostgREST specific)
    case 'PGRST116': // Not found (single row expected)
      return ResourceError.notFound(table);

    // Default database error
    default:
      return new DatabaseError(
        `Database operation failed: ${message}`,
        ErrorCodes.DATABASE_QUERY_ERROR,
        new Error(message),
        { table, operation, code }
      );
  }
}

/**
 * API Client class for database operations
 */
export class ApiClient {
  private readonly options: Required<ApiClientOptions>;
  private readonly metrics: QueryMetrics[] = [];

  constructor(options: ApiClientOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Gets the appropriate Supabase client based on options
   */
  private getClient(): SupabaseClient {
    if (!isSupabaseInitialized()) {
      throw new DatabaseError(
        'Supabase client is not initialized. Call initializeSupabase() first.',
        ErrorCodes.DATABASE_CONNECTION_ERROR
      );
    }

    if (this.options.useAdmin) {
      const adminClient = getAdminSupabaseClient();
      if (!adminClient) {
        throw new DatabaseError(
          'Admin client is not available. Service role key may be missing.',
          ErrorCodes.DATABASE_CONNECTION_ERROR
        );
      }
      return adminClient;
    }

    return getSupabaseClient();
  }

  /**
   * Logs query performance and details
   */
  private logQuery(
    operation: QueryMetrics['operation'],
    table: string,
    durationMs: number,
    rowCount: number,
    error?: Error
  ): void {
    if (!this.options.enableLogging) return;

    const metrics: QueryMetrics = {
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
    } else {
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
  private applyFilters(query: any, filters: QueryFilter): any {
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
            query = query.gt(column, value as string | number);
            break;
          case 'gte':
            query = query.gte(column, value as string | number);
            break;
          case 'lt':
            query = query.lt(column, value as string | number);
            break;
          case 'lte':
            query = query.lte(column, value as string | number);
            break;
          case 'like':
            query = query.like(column, value as string);
            break;
          case 'ilike':
            query = query.ilike(column, value as string);
            break;
          case 'in':
            query = query.in(column, value as unknown[]);
            break;
          case 'is':
            query = query.is(column, value as boolean | null);
            break;
        }
      }
    } else {
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
  private applyOptions(query: any, options: QueryOptions): any {
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
  async findMany<T = Record<string, unknown>>(
    table: string,
    filters: QueryFilter = {},
    options: QueryOptions = {}
  ): Promise<Result<T[]>> {
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
        return { success: false, error: normalizeError(mappedError) };
      }

      this.logQuery('select', table, durationMs, rowCount);
      return { success: true, data: (data as T[]) ?? [] };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const normalizedError = normalizeError(error);
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
  async findOne<T = Record<string, unknown>>(
    table: string,
    filters: QueryFilter,
    options: QueryOptions = {}
  ): Promise<Result<T | null>> {
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
        return { success: false, error: normalizeError(mappedError) };
      }

      this.logQuery('select', table, durationMs, data ? 1 : 0);
      return { success: true, data: (data as T) ?? null };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const normalizedError = normalizeError(error);
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
  async findById<T = Record<string, unknown>>(
    table: string,
    id: string,
    options: QueryOptions = {}
  ): Promise<Result<T | null>> {
    return this.findOne<T>(table, { id }, options);
  }

  /**
   * Find a single record or throw if not found
   *
   * @param table - Table name
   * @param filters - Query filters
   * @param options - Query options
   * @returns Result with single record
   */
  async findOneOrFail<T = Record<string, unknown>>(
    table: string,
    filters: QueryFilter,
    options: QueryOptions = {}
  ): Promise<Result<T>> {
    const result = await this.findOne<T>(table, filters, options);

    if (!result.success) {
      return result as Result<T>;
    }

    if (result.data === null) {
      return {
        success: false,
        error: ResourceError.notFound(table),
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
  async insert<T = Record<string, unknown>>(
    table: string,
    data: Partial<T>,
    options: QueryOptions = {}
  ): Promise<Result<T>> {
    const startTime = Date.now();

    try {
      const client = this.getClient();
      const query = client
        .from(table)
        .insert(data as Record<string, unknown>)
        .select(options.select || '*')
        .single();

      const { data: result, error } = await query;

      const durationMs = Date.now() - startTime;

      if (error) {
        const mappedError = mapPostgresError(error, table, 'insert');
        this.logQuery('insert', table, durationMs, 0, mappedError);
        return { success: false, error: normalizeError(mappedError) };
      }

      this.logQuery('insert', table, durationMs, 1);
      return { success: true, data: result as T };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const normalizedError = normalizeError(error);
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
  async insertMany<T = Record<string, unknown>>(
    table: string,
    data: Partial<T>[],
    options: QueryOptions = {}
  ): Promise<Result<T[]>> {
    const startTime = Date.now();

    try {
      if (data.length === 0) {
        return { success: true, data: [] };
      }

      const client = this.getClient();
      const query = client
        .from(table)
        .insert(data as Record<string, unknown>[])
        .select(options.select || '*');

      const { data: result, error } = await query;

      const durationMs = Date.now() - startTime;

      if (error) {
        const mappedError = mapPostgresError(error, table, 'insert');
        this.logQuery('insert', table, durationMs, 0, mappedError);
        return { success: false, error: normalizeError(mappedError) };
      }

      this.logQuery('insert', table, durationMs, result?.length ?? 0);
      return { success: true, data: (result as T[]) ?? [] };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const normalizedError = normalizeError(error);
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
  async update<T = Record<string, unknown>>(
    table: string,
    filters: QueryFilter,
    data: Partial<T>,
    options: QueryOptions = {}
  ): Promise<Result<T[]>> {
    const startTime = Date.now();

    try {
      const client = this.getClient();
      let query = client
        .from(table)
        .update(data as Record<string, unknown>)
        .select(options.select || '*');

      query = this.applyFilters(query, filters);

      const { data: result, error } = await query;

      const durationMs = Date.now() - startTime;

      if (error) {
        const mappedError = mapPostgresError(error, table, 'update');
        this.logQuery('update', table, durationMs, 0, mappedError);
        return { success: false, error: normalizeError(mappedError) };
      }

      this.logQuery('update', table, durationMs, result?.length ?? 0);
      return { success: true, data: (result as T[]) ?? [] };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const normalizedError = normalizeError(error);
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
  async updateById<T = Record<string, unknown>>(
    table: string,
    id: string,
    data: Partial<T>,
    options: QueryOptions = {}
  ): Promise<Result<T | null>> {
    const result = await this.update<T>(table, { id }, data, options);

    if (!result.success) {
      return result as Result<T | null>;
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
  async upsert<T = Record<string, unknown>>(
    table: string,
    data: Partial<T>,
    options: QueryOptions & { onConflict?: string } = {}
  ): Promise<Result<T>> {
    const startTime = Date.now();

    try {
      const client = this.getClient();
      const query = client
        .from(table)
        .upsert(data as Record<string, unknown>, {
          onConflict: options.onConflict,
        })
        .select(options.select || '*')
        .single();

      const { data: result, error } = await query;

      const durationMs = Date.now() - startTime;

      if (error) {
        const mappedError = mapPostgresError(error, table, 'upsert');
        this.logQuery('upsert', table, durationMs, 0, mappedError);
        return { success: false, error: normalizeError(mappedError) };
      }

      this.logQuery('upsert', table, durationMs, 1);
      return { success: true, data: result as T };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const normalizedError = normalizeError(error);
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
  async delete<T = Record<string, unknown>>(
    table: string,
    filters: QueryFilter
  ): Promise<Result<T[]>> {
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
        return { success: false, error: normalizeError(mappedError) };
      }

      this.logQuery('delete', table, durationMs, result?.length ?? 0);
      return { success: true, data: (result as T[]) ?? [] };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const normalizedError = normalizeError(error);
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
  async deleteById<T = Record<string, unknown>>(
    table: string,
    id: string
  ): Promise<Result<T | null>> {
    const result = await this.delete<T>(table, { id });

    if (!result.success) {
      return result as Result<T | null>;
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
  async count(
    table: string,
    filters: QueryFilter = {}
  ): Promise<Result<number>> {
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
        return { success: false, error: normalizeError(mappedError) };
      }

      this.logQuery('select', table, durationMs, count ?? 0);
      return { success: true, data: count ?? 0 };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const normalizedError = normalizeError(error);
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
  async exists(
    table: string,
    filters: QueryFilter
  ): Promise<Result<boolean>> {
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
  async findPaginated<T = Record<string, unknown>>(
    table: string,
    filters: QueryFilter = {},
    pagination: PaginationParams,
    options: QueryOptions = {}
  ): Promise<Result<PaginatedResponse<T>>> {
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
        return { success: false, error: normalizeError(mappedError) };
      }

      const totalPages = Math.ceil(total / pagination.limit);
      const result: PaginatedResponse<T> = {
        data: (data as T[]) ?? [],
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
        },
      };

      this.logQuery('select', table, durationMs, data?.length ?? 0);
      return { success: true, data: result };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const normalizedError = normalizeError(error);
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
  async rpc<T = unknown>(
    functionName: string,
    params: Record<string, unknown> = {}
  ): Promise<Result<T>> {
    const startTime = Date.now();

    try {
      const client = this.getClient();
      const { data, error } = await client.rpc(functionName, params);

      const durationMs = Date.now() - startTime;

      if (error) {
        const mappedError = mapPostgresError(error, functionName, 'rpc');
        logger.error(`RPC ${functionName} failed`, mappedError, { durationMs });
        return { success: false, error: normalizeError(mappedError) };
      }

      logger.debug(`RPC ${functionName}`, { durationMs });
      return { success: true, data: data as T };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const normalizedError = normalizeError(error);
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
  async withRetry<T>(
    operation: () => Promise<Result<T>>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      shouldRetry?: (error: unknown) => boolean;
    } = {}
  ): Promise<Result<T>> {
    const { maxRetries = 3, baseDelay = 1000, shouldRetry } = options;

    try {
      const result = await retryWithBackoff(
        async () => {
          const opResult = await operation();
          if (!opResult.success) {
            throw opResult.error;
          }
          return opResult.data;
        },
        {
          maxRetries,
          baseDelay,
          shouldRetry: shouldRetry ?? ((error) => {
            // Retry on connection errors
            if (error instanceof DatabaseError) {
              return error.code === ErrorCodes.DATABASE_CONNECTION_ERROR.code;
            }
            return false;
          }),
          onRetry: (_error, attempt, delay) => {
            logger.warn(`Retrying operation (attempt ${attempt})`, { delay });
          },
        }
      );

      return { success: true, data: result as T };
    } catch (error) {
      return { success: false, error: normalizeError(error) };
    }
  }

  /**
   * Get collected query metrics
   */
  getMetrics(): QueryMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear collected metrics
   */
  clearMetrics(): void {
    this.metrics.length = 0;
  }

  /**
   * Get the underlying Supabase client
   * Use with caution - prefer using the wrapper methods
   */
  getUnderlyingClient(): SupabaseClient {
    return this.getClient();
  }
}

/**
 * Singleton API client instance with default options
 */
let defaultApiClient: ApiClient | null = null;

/**
 * Get the default API client singleton
 */
export function getApiClient(): ApiClient {
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
export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  return new ApiClient(options);
}

/**
 * Reset the default API client (useful for testing)
 */
export function resetApiClient(): void {
  defaultApiClient = null;
}

/**
 * Convenience export for the default client
 */
export const apiClient = {
  get instance(): ApiClient {
    return getApiClient();
  },

  findMany: <T = Record<string, unknown>>(
    table: string,
    filters?: QueryFilter,
    options?: QueryOptions
  ) => getApiClient().findMany<T>(table, filters, options),

  findOne: <T = Record<string, unknown>>(
    table: string,
    filters: QueryFilter,
    options?: QueryOptions
  ) => getApiClient().findOne<T>(table, filters, options),

  findById: <T = Record<string, unknown>>(
    table: string,
    id: string,
    options?: QueryOptions
  ) => getApiClient().findById<T>(table, id, options),

  findOneOrFail: <T = Record<string, unknown>>(
    table: string,
    filters: QueryFilter,
    options?: QueryOptions
  ) => getApiClient().findOneOrFail<T>(table, filters, options),

  insert: <T = Record<string, unknown>>(
    table: string,
    data: Partial<T>,
    options?: QueryOptions
  ) => getApiClient().insert<T>(table, data, options),

  insertMany: <T = Record<string, unknown>>(
    table: string,
    data: Partial<T>[],
    options?: QueryOptions
  ) => getApiClient().insertMany<T>(table, data, options),

  update: <T = Record<string, unknown>>(
    table: string,
    filters: QueryFilter,
    data: Partial<T>,
    options?: QueryOptions
  ) => getApiClient().update<T>(table, filters, data, options),

  updateById: <T = Record<string, unknown>>(
    table: string,
    id: string,
    data: Partial<T>,
    options?: QueryOptions
  ) => getApiClient().updateById<T>(table, id, data, options),

  upsert: <T = Record<string, unknown>>(
    table: string,
    data: Partial<T>,
    options?: QueryOptions & { onConflict?: string }
  ) => getApiClient().upsert<T>(table, data, options),

  delete: <T = Record<string, unknown>>(table: string, filters: QueryFilter) =>
    getApiClient().delete<T>(table, filters),

  deleteById: <T = Record<string, unknown>>(table: string, id: string) =>
    getApiClient().deleteById<T>(table, id),

  count: (table: string, filters?: QueryFilter) =>
    getApiClient().count(table, filters),

  exists: (table: string, filters: QueryFilter) =>
    getApiClient().exists(table, filters),

  findPaginated: <T = Record<string, unknown>>(
    table: string,
    filters: QueryFilter,
    pagination: PaginationParams,
    options?: QueryOptions
  ) => getApiClient().findPaginated<T>(table, filters, pagination, options),

  rpc: <T = unknown>(functionName: string, params?: Record<string, unknown>) =>
    getApiClient().rpc<T>(functionName, params),

  getMetrics: () => getApiClient().getMetrics(),

  clearMetrics: () => getApiClient().clearMetrics(),
};

// Export types
export type { PostgrestError };
