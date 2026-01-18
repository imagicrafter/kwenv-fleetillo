import type { Result } from '../types/index.js';
import { DispatchJob, CreateDispatchJobInput, DispatchJobFilters } from '../types/dispatch-job.js';
/**
 * Get drivers currently assigned to active dispatch jobs
 * Active means status is 'pending' or 'running'
 */
export declare function getDriversInActiveJobs(): Promise<Result<string[]>>;
/**
 * Check if any of the given drivers are in active dispatch jobs
 * Returns the list of conflicting drivers and their job info
 */
export declare function checkDriverConflicts(driverIds: string[]): Promise<Result<{
    driverId: string;
    jobId: string;
    jobName: string;
}[]>>;
/**
 * Create a new dispatch job
 * Validates that none of the drivers are in active jobs
 */
export declare function createDispatchJob(input: CreateDispatchJobInput): Promise<Result<DispatchJob>>;
/**
 * Get dispatch jobs with optional filters
 */
export declare function getDispatchJobs(filters?: DispatchJobFilters): Promise<Result<DispatchJob[]>>;
/**
 * Get a specific dispatch job by ID
 */
export declare function getDispatchJobById(jobId: string): Promise<Result<DispatchJob>>;
/**
 * Execute a dispatch job - mark routes as dispatched for all drivers
 * This is called by the scheduled job processor
 */
export declare function executeDispatchJob(jobId: string): Promise<Result<{
    dispatchedCount: number;
    failedCount: number;
}>>;
/**
 * Cancel a dispatch job
 */
export declare function cancelDispatchJob(jobId: string): Promise<Result<DispatchJob>>;
/**
 * Remove a driver from an active dispatch job
 */
export declare function removeDriverFromJob(jobId: string, driverId: string): Promise<Result<DispatchJob>>;
/**
 * Get pending jobs that are due for execution
 */
export declare function getPendingJobsDue(): Promise<Result<DispatchJob[]>>;
export declare const dispatchJobService: {
    getDriversInActiveJobs: typeof getDriversInActiveJobs;
    checkDriverConflicts: typeof checkDriverConflicts;
    createDispatchJob: typeof createDispatchJob;
    getDispatchJobs: typeof getDispatchJobs;
    getDispatchJobById: typeof getDispatchJobById;
    executeDispatchJob: typeof executeDispatchJob;
    cancelDispatchJob: typeof cancelDispatchJob;
    removeDriverFromJob: typeof removeDriverFromJob;
    getPendingJobsDue: typeof getPendingJobsDue;
};
//# sourceMappingURL=dispatch-job.service.d.ts.map