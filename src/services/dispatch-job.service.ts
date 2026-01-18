/**
 * Dispatch Job Service
 * Manages batch dispatch job scheduling with driver exclusivity enforcement
 */
import { getSupabaseClient, getAdminSupabaseClient } from './supabase.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result } from '../types/index.js';
import {
    DispatchJob,
    DispatchJobRow,
    DispatchJobStatus,
    CreateDispatchJobInput,
    DispatchJobFilters,
    rowToDispatchJob,
    dispatchJobInputToRow,
} from '../types/dispatch-job.js';

const logger = createContextLogger('DispatchJobService');
const DISPATCH_JOBS_TABLE = 'dispatch_jobs';

/**
 * Get drivers currently assigned to active dispatch jobs
 * Active means status is 'pending' or 'running'
 */
export async function getDriversInActiveJobs(): Promise<Result<string[]>> {
    logger.debug('Getting drivers in active dispatch jobs');

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

        const { data, error } = await supabase
            .from(DISPATCH_JOBS_TABLE)
            .select('driver_ids')
            .in('status', ['pending', 'running']);

        if (error) {
            logger.error('Error fetching active dispatch jobs', { error });
            return { success: false, error: new Error(error.message) };
        }

        // Flatten all driver_ids arrays and deduplicate
        const allDriverIds = new Set<string>();
        (data || []).forEach((job: { driver_ids?: string[] }) => {
            (job.driver_ids || []).forEach((id: string) => allDriverIds.add(id));
        });

        return { success: true, data: Array.from(allDriverIds) };
    } catch (error) {
        logger.error('Unexpected error getting drivers in active jobs', { error });
        return { success: false, error: error as Error };
    }
}

/**
 * Check if any of the given drivers are in active dispatch jobs
 * Returns the list of conflicting drivers and their job info
 */
export async function checkDriverConflicts(driverIds: string[]): Promise<Result<{ driverId: string; jobId: string; jobName: string }[]>> {
    logger.debug('Checking for driver conflicts', { driverIds });

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

        const { data, error } = await supabase
            .from(DISPATCH_JOBS_TABLE)
            .select('id, name, driver_ids')
            .in('status', ['pending', 'running']);

        if (error) {
            logger.error('Error checking driver conflicts', { error });
            return { success: false, error: new Error(error.message) };
        }

        const conflicts: { driverId: string; jobId: string; jobName: string }[] = [];

        (data || []).forEach((job: { id: string; name: string; driver_ids?: string[] }) => {
            const jobDriverIds = job.driver_ids || [];
            driverIds.forEach(driverId => {
                if (jobDriverIds.includes(driverId)) {
                    conflicts.push({
                        driverId,
                        jobId: job.id,
                        jobName: job.name,
                    });
                }
            });
        });

        return { success: true, data: conflicts };
    } catch (error) {
        logger.error('Unexpected error checking driver conflicts', { error });
        return { success: false, error: error as Error };
    }
}

/**
 * Create a new dispatch job
 * Validates that none of the drivers are in active jobs
 */
export async function createDispatchJob(input: CreateDispatchJobInput): Promise<Result<DispatchJob>> {
    logger.info('Creating dispatch job', { name: input.name, driverCount: input.driverIds.length });

    // Validate input
    if (!input.name || input.name.trim() === '') {
        return { success: false, error: new Error('Job name is required') };
    }
    if (!input.driverIds || input.driverIds.length === 0) {
        return { success: false, error: new Error('At least one driver is required') };
    }

    // Check for driver conflicts
    const conflictResult = await checkDriverConflicts(input.driverIds);
    if (!conflictResult.success) {
        return { success: false, error: conflictResult.error };
    }

    const conflicts = conflictResult.data || [];
    if (conflicts.length > 0) {
        const conflictMsg = conflicts
            .map(c => `Driver ${c.driverId} is already in job "${c.jobName}"`)
            .join(', ');
        return { success: false, error: new Error(`Cannot create job: ${conflictMsg}. Remove drivers from active jobs before reassigning.`) };
    }

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();
        const rowData = dispatchJobInputToRow(input);

        const { data, error } = await supabase
            .from(DISPATCH_JOBS_TABLE)
            .insert(rowData)
            .select()
            .single();

        if (error) {
            logger.error('Error creating dispatch job', { error });
            return { success: false, error: new Error(error.message) };
        }

        logger.info('Dispatch job created', { jobId: data.id });
        return { success: true, data: rowToDispatchJob(data as DispatchJobRow) };
    } catch (error) {
        logger.error('Unexpected error creating dispatch job', { error });
        return { success: false, error: error as Error };
    }
}

/**
 * Get dispatch jobs with optional filters
 */
export async function getDispatchJobs(filters?: DispatchJobFilters): Promise<Result<DispatchJob[]>> {
    logger.debug('Getting dispatch jobs', { filters });

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

        let query = supabase.from(DISPATCH_JOBS_TABLE).select('*');

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (filters?.driverId) {
            query = query.contains('driver_ids', [filters.driverId]);
        }

        if (filters?.fromDate) {
            const fromDate = typeof filters.fromDate === 'string' ? filters.fromDate : filters.fromDate.toISOString();
            query = query.gte('scheduled_time', fromDate);
        }

        if (filters?.toDate) {
            const toDate = typeof filters.toDate === 'string' ? filters.toDate : filters.toDate.toISOString();
            query = query.lte('scheduled_time', toDate);
        }

        query = query.order('scheduled_time', { ascending: true });

        const { data, error } = await query;

        if (error) {
            logger.error('Error fetching dispatch jobs', { error });
            return { success: false, error: new Error(error.message) };
        }

        return { success: true, data: (data || []).map((row: DispatchJobRow) => rowToDispatchJob(row)) };
    } catch (error) {
        logger.error('Unexpected error fetching dispatch jobs', { error });
        return { success: false, error: error as Error };
    }
}

/**
 * Get a specific dispatch job by ID
 */
export async function getDispatchJobById(jobId: string): Promise<Result<DispatchJob>> {
    logger.debug('Getting dispatch job by ID', { jobId });

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

        const { data, error } = await supabase
            .from(DISPATCH_JOBS_TABLE)
            .select('*')
            .eq('id', jobId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { success: false, error: new Error('Dispatch job not found') };
            }
            logger.error('Error fetching dispatch job', { error });
            return { success: false, error: new Error(error.message) };
        }

        return { success: true, data: rowToDispatchJob(data as DispatchJobRow) };
    } catch (error) {
        logger.error('Unexpected error fetching dispatch job', { error });
        return { success: false, error: error as Error };
    }
}

/**
 * Execute a dispatch job - mark routes as dispatched for all drivers
 * This is called by the scheduled job processor
 */
export async function executeDispatchJob(jobId: string): Promise<Result<{ dispatchedCount: number; failedCount: number }>> {
    logger.info('Executing dispatch job', { jobId });

    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // Get the job
    const jobResult = await getDispatchJobById(jobId);
    if (!jobResult.success || !jobResult.data) {
        return { success: false, error: jobResult.error || new Error('Job not found') };
    }

    const job = jobResult.data;

    // Validate job can be executed
    if (job.status !== 'pending') {
        return { success: false, error: new Error(`Job cannot be executed: status is ${job.status}`) };
    }

    // Update job status to running
    const { error: updateError } = await supabase
        .from(DISPATCH_JOBS_TABLE)
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', jobId);

    if (updateError) {
        logger.error('Error updating job status to running', { error: updateError });
        return { success: false, error: new Error(updateError.message) };
    }

    const dispatchedRouteIds: string[] = [];
    let failedCount = 0;
    const errors: string[] = [];

    // Process each driver
    for (const driverId of job.driverIds) {
        try {
            // Find the next planned route for this driver
            const routeResult = await findNextPlannedRoute(driverId);

            if (!routeResult.success || !routeResult.data) {
                logger.warn('No planned route found for driver', { driverId });
                failedCount++;
                errors.push(`No planned route for driver ${driverId}`);
                continue;
            }

            const route = routeResult.data;

            // Update route status to 'dispatched'
            const { error: routeUpdateError } = await supabase
                .from('routes')
                .update({ status: 'dispatched', updated_at: new Date().toISOString() })
                .eq('id', route.id);

            if (!routeUpdateError) {
                dispatchedRouteIds.push(route.id);
                logger.info('Route marked as dispatched', { routeId: route.id, driverId });
            } else {
                failedCount++;
                errors.push(`Failed to update route ${route.id}: ${routeUpdateError.message}`);
            }
        } catch (error) {
            failedCount++;
            errors.push(`Error processing driver ${driverId}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    }

    // Update job status to completed or failed
    const finalStatus: DispatchJobStatus = failedCount === job.driverIds.length ? 'failed' : 'completed';

    const { error: finalUpdateError } = await supabase
        .from(DISPATCH_JOBS_TABLE)
        .update({
            status: finalStatus,
            completed_at: new Date().toISOString(),
            dispatched_route_ids: dispatchedRouteIds,
            error_message: errors.length > 0 ? errors.join('; ') : null,
        })
        .eq('id', jobId);

    if (finalUpdateError) {
        logger.error('Error updating job final status', { error: finalUpdateError });
    }

    logger.info('Dispatch job completed', {
        jobId,
        dispatchedCount: dispatchedRouteIds.length,
        failedCount,
        finalStatus
    });

    return {
        success: true,
        data: {
            dispatchedCount: dispatchedRouteIds.length,
            failedCount,
        }
    };
}

/**
 * Cancel a dispatch job
 */
export async function cancelDispatchJob(jobId: string): Promise<Result<DispatchJob>> {
    logger.info('Cancelling dispatch job', { jobId });

    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // Get the job first
    const jobResult = await getDispatchJobById(jobId);
    if (!jobResult.success || !jobResult.data) {
        return { success: false, error: jobResult.error || new Error('Job not found') };
    }

    if (jobResult.data.status !== 'pending') {
        return { success: false, error: new Error('Only pending jobs can be cancelled') };
    }

    const { data, error } = await supabase
        .from(DISPATCH_JOBS_TABLE)
        .update({ status: 'cancelled' })
        .eq('id', jobId)
        .select()
        .single();

    if (error) {
        logger.error('Error cancelling dispatch job', { error });
        return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: rowToDispatchJob(data as DispatchJobRow) };
}

/**
 * Remove a driver from an active dispatch job
 */
export async function removeDriverFromJob(jobId: string, driverId: string): Promise<Result<DispatchJob>> {
    logger.info('Removing driver from dispatch job', { jobId, driverId });

    const supabase = getAdminSupabaseClient() || getSupabaseClient();

    // Get the job first
    const jobResult = await getDispatchJobById(jobId);
    if (!jobResult.success || !jobResult.data) {
        return { success: false, error: jobResult.error || new Error('Job not found') };
    }

    const job = jobResult.data;

    if (!['pending', 'running'].includes(job.status)) {
        return { success: false, error: new Error('Cannot modify a completed or cancelled job') };
    }

    const updatedDriverIds = job.driverIds.filter((id: string) => id !== driverId);

    if (updatedDriverIds.length === job.driverIds.length) {
        return { success: false, error: new Error('Driver not found in this job') };
    }

    // If no drivers left, cancel the job
    if (updatedDriverIds.length === 0) {
        return cancelDispatchJob(jobId);
    }

    const { data, error } = await supabase
        .from(DISPATCH_JOBS_TABLE)
        .update({ driver_ids: updatedDriverIds })
        .eq('id', jobId)
        .select()
        .single();

    if (error) {
        logger.error('Error removing driver from job', { error });
        return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: rowToDispatchJob(data as DispatchJobRow) };
}

/**
 * Get pending jobs that are due for execution
 */
export async function getPendingJobsDue(): Promise<Result<DispatchJob[]>> {
    logger.debug('Getting pending jobs due for execution');

    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();

        const { data, error } = await supabase
            .from(DISPATCH_JOBS_TABLE)
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_time', new Date().toISOString())
            .order('scheduled_time', { ascending: true });

        if (error) {
            logger.error('Error fetching pending jobs', { error });
            return { success: false, error: new Error(error.message) };
        }

        return { success: true, data: (data || []).map((row: DispatchJobRow) => rowToDispatchJob(row)) };
    } catch (error) {
        logger.error('Unexpected error fetching pending jobs', { error });
        return { success: false, error: error as Error };
    }
}

/**
 * Helper: Find the next planned route for a driver
 */
async function findNextPlannedRoute(driverId: string): Promise<Result<{ id: string; routeCode?: string } | null>> {
    try {
        const supabase = getAdminSupabaseClient() || getSupabaseClient();
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('routes')
            .select('id, route_code')
            .eq('assigned_driver_id', driverId)
            .eq('status', 'planned')
            .gte('route_date', today)
            .order('route_date', { ascending: true })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No route found
                return { success: true, data: null };
            }
            return { success: false, error: new Error(error.message) };
        }

        return { success: true, data: { id: data.id, routeCode: data.route_code } };
    } catch (error) {
        return { success: false, error: error as Error };
    }
}

// Export all functions
export const dispatchJobService = {
    getDriversInActiveJobs,
    checkDriverConflicts,
    createDispatchJob,
    getDispatchJobs,
    getDispatchJobById,
    executeDispatchJob,
    cancelDispatchJob,
    removeDriverFromJob,
    getPendingJobsDue,
};
