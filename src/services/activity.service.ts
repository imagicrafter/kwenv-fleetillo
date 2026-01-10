/**
 * Activity Service
 *
 * Provides operations for querying activity logs in the RouteIQ application.
 * Activity logs are primarily populated by database triggers, but this service
 * provides read access and the ability to manually create entries if needed.
 */

import { getAdminSupabaseClient } from './supabase.js';
import { createContextLogger } from '../utils/logger.js';
import type { Result } from '../types/index.js';
import type {
    ActivityLog,
    ActivityLogRow,
    CreateActivityInput,
    ActivityFilters,
} from '../types/activity.js';
import { rowToActivityLog, activityInputToRow } from '../types/activity.js';

/**
 * Logger instance for activity operations
 */
const logger = createContextLogger('ActivityService');

/**
 * Table name for activity logs in the routeiq schema
 */
const ACTIVITY_LOGS_TABLE = 'activity_logs';

/**
 * Activity service error
 */
export class ActivityServiceError extends Error {
    public readonly code: string;
    public readonly details?: unknown;

    constructor(message: string, code: string, details?: unknown) {
        super(message);
        this.name = 'ActivityServiceError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Error codes for activity service errors
 */
export const ActivityErrorCodes = {
    QUERY_FAILED: 'ACTIVITY_QUERY_FAILED',
    CREATE_FAILED: 'ACTIVITY_CREATE_FAILED',
} as const;

/**
 * Helper to get the Supabase admin client
 */
function getClient() {
    const adminClient = getAdminSupabaseClient();
    if (adminClient) {
        return adminClient;
    }
    const msg = 'CRITICAL: Admin Supabase Client is not available for activity service';
    logger.error(msg);
    throw new Error(msg);
}

/**
 * Gets recent activity logs
 * 
 * @param limit - Maximum number of activities to return (default: 5)
 * @returns Result with array of activity logs
 */
export async function getRecentActivities(limit: number = 5): Promise<Result<ActivityLog[]>> {
    logger.debug('Getting recent activities', { limit });

    try {
        const supabase = getClient();

        const { data, error } = await supabase
            .from(ACTIVITY_LOGS_TABLE)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            logger.error('Failed to get recent activities', error);
            return {
                success: false,
                error: new ActivityServiceError(
                    `Failed to get recent activities: ${error.message}`,
                    ActivityErrorCodes.QUERY_FAILED,
                    error
                ),
            };
        }

        const activities = (data as ActivityLogRow[]).map(rowToActivityLog);
        logger.debug('Retrieved recent activities', { count: activities.length });

        return { success: true, data: activities };
    } catch (error) {
        logger.error('Unexpected error getting recent activities', error);
        return {
            success: false,
            error: new ActivityServiceError(
                'Unexpected error getting recent activities',
                ActivityErrorCodes.QUERY_FAILED,
                error
            ),
        };
    }
}

/**
 * Gets activities filtered by various criteria
 * 
 * @param filters - Filter options
 * @returns Result with array of activity logs
 */
export async function getActivities(filters?: ActivityFilters): Promise<Result<ActivityLog[]>> {
    logger.debug('Getting activities with filters', { filters });

    try {
        const supabase = getClient();

        let query = supabase
            .from(ACTIVITY_LOGS_TABLE)
            .select('*')
            .order('created_at', { ascending: false });

        if (filters?.entityType) {
            query = query.eq('entity_type', filters.entityType);
        }

        if (filters?.entityId) {
            query = query.eq('entity_id', filters.entityId);
        }

        if (filters?.action) {
            query = query.eq('action', filters.action);
        }

        if (filters?.severity) {
            query = query.eq('severity', filters.severity);
        }

        const limit = filters?.limit ?? 20;
        query = query.limit(limit);

        const { data, error } = await query;

        if (error) {
            logger.error('Failed to get activities', error);
            return {
                success: false,
                error: new ActivityServiceError(
                    `Failed to get activities: ${error.message}`,
                    ActivityErrorCodes.QUERY_FAILED,
                    error
                ),
            };
        }

        const activities = (data as ActivityLogRow[]).map(rowToActivityLog);
        return { success: true, data: activities };
    } catch (error) {
        logger.error('Unexpected error getting activities', error);
        return {
            success: false,
            error: new ActivityServiceError(
                'Unexpected error getting activities',
                ActivityErrorCodes.QUERY_FAILED,
                error
            ),
        };
    }
}

/**
 * Gets activities for a specific entity
 * 
 * @param entityType - Type of entity (booking, route, client, vehicle)
 * @param entityId - ID of the entity
 * @param limit - Maximum number of activities to return
 * @returns Result with array of activity logs
 */
export async function getActivitiesByEntity(
    entityType: string,
    entityId: string,
    limit: number = 10
): Promise<Result<ActivityLog[]>> {
    return getActivities({
        entityType: entityType as ActivityFilters['entityType'],
        entityId,
        limit,
    });
}

/**
 * Creates an activity log entry manually
 * Note: Most activities are created automatically via database triggers,
 * but this function allows manual creation when needed.
 * 
 * @param input - Activity data to create
 * @returns Result with created activity log
 */
export async function createActivity(input: CreateActivityInput): Promise<Result<ActivityLog>> {
    logger.debug('Creating activity manually', { entityType: input.entityType, action: input.action });

    try {
        const supabase = getClient();
        const rowData = activityInputToRow(input);

        const { data, error } = await supabase
            .from(ACTIVITY_LOGS_TABLE)
            .insert(rowData)
            .select()
            .single();

        if (error) {
            logger.error('Failed to create activity', error);
            return {
                success: false,
                error: new ActivityServiceError(
                    `Failed to create activity: ${error.message}`,
                    ActivityErrorCodes.CREATE_FAILED,
                    error
                ),
            };
        }

        const activity = rowToActivityLog(data as ActivityLogRow);
        logger.info('Activity created', { activityId: activity.id, title: activity.title });

        return { success: true, data: activity };
    } catch (error) {
        logger.error('Unexpected error creating activity', error);
        return {
            success: false,
            error: new ActivityServiceError(
                'Unexpected error creating activity',
                ActivityErrorCodes.CREATE_FAILED,
                error
            ),
        };
    }
}
