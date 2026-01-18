/**
 * Dispatch Job Types
 * Types for the batch dispatch scheduling system
 */

/**
 * Status of a dispatch job
 */
export type DispatchJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Dispatch Job entity
 */
export interface DispatchJob {
    id: string;
    name: string;
    driverIds: string[];
    scheduledTime: Date;
    status: DispatchJobStatus;
    startedAt?: Date;
    completedAt?: Date;
    dispatchedRouteIds: string[];
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface DispatchJobRow {
    id: string;
    name: string;
    driver_ids: string[];
    scheduled_time: string;
    status: DispatchJobStatus;
    started_at: string | null;
    completed_at: string | null;
    dispatched_route_ids: string[];
    error_message: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Input for creating a dispatch job
 */
export interface CreateDispatchJobInput {
    name: string;
    driverIds: string[];
    scheduledTime: Date | string;
}

/**
 * Filter options for querying dispatch jobs
 */
export interface DispatchJobFilters {
    status?: DispatchJobStatus;
    driverId?: string;
    fromDate?: Date | string;
    toDate?: Date | string;
}

/**
 * Convert database row to DispatchJob entity
 */
export function rowToDispatchJob(row: DispatchJobRow): DispatchJob {
    return {
        id: row.id,
        name: row.name,
        driverIds: row.driver_ids || [],
        scheduledTime: new Date(row.scheduled_time),
        status: row.status,
        startedAt: row.started_at ? new Date(row.started_at) : undefined,
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        dispatchedRouteIds: row.dispatched_route_ids || [],
        errorMessage: row.error_message ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * Convert CreateDispatchJobInput to database row format
 */
export function dispatchJobInputToRow(input: CreateDispatchJobInput): Partial<DispatchJobRow> {
    const scheduledTime = typeof input.scheduledTime === 'string'
        ? input.scheduledTime
        : input.scheduledTime.toISOString();

    return {
        name: input.name,
        driver_ids: input.driverIds,
        scheduled_time: scheduledTime,
        status: 'pending',
    };
}
