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
export declare function rowToDispatchJob(row: DispatchJobRow): DispatchJob;
/**
 * Convert CreateDispatchJobInput to database row format
 */
export declare function dispatchJobInputToRow(input: CreateDispatchJobInput): Partial<DispatchJobRow>;
//# sourceMappingURL=dispatch-job.d.ts.map