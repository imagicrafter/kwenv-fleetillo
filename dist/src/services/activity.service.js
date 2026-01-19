"use strict";
/**
 * Activity Service
 *
 * Provides operations for querying activity logs in the RouteIQ application.
 * Activity logs are primarily populated by database triggers, but this service
 * provides read access and the ability to manually create entries if needed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityErrorCodes = exports.ActivityServiceError = void 0;
exports.getRecentActivities = getRecentActivities;
exports.getActivities = getActivities;
exports.getActivitiesByEntity = getActivitiesByEntity;
exports.createActivity = createActivity;
const supabase_js_1 = require("./supabase.js");
const logger_js_1 = require("../utils/logger.js");
const activity_js_1 = require("../types/activity.js");
/**
 * Logger instance for activity operations
 */
const logger = (0, logger_js_1.createContextLogger)('ActivityService');
/**
 * Table name for activity logs in the routeiq schema
 */
const ACTIVITY_LOGS_TABLE = 'activity_logs';
/**
 * Activity service error
 */
class ActivityServiceError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'ActivityServiceError';
        this.code = code;
        this.details = details;
    }
}
exports.ActivityServiceError = ActivityServiceError;
/**
 * Error codes for activity service errors
 */
exports.ActivityErrorCodes = {
    QUERY_FAILED: 'ACTIVITY_QUERY_FAILED',
    CREATE_FAILED: 'ACTIVITY_CREATE_FAILED',
};
/**
 * Helper to get the Supabase admin client
 */
function getClient() {
    const adminClient = (0, supabase_js_1.getAdminSupabaseClient)();
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
async function getRecentActivities(limit = 5) {
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
                error: new ActivityServiceError(`Failed to get recent activities: ${error.message}`, exports.ActivityErrorCodes.QUERY_FAILED, error),
            };
        }
        const activities = data.map(activity_js_1.rowToActivityLog);
        logger.debug('Retrieved recent activities', { count: activities.length });
        return { success: true, data: activities };
    }
    catch (error) {
        logger.error('Unexpected error getting recent activities', error);
        return {
            success: false,
            error: new ActivityServiceError('Unexpected error getting recent activities', exports.ActivityErrorCodes.QUERY_FAILED, error),
        };
    }
}
/**
 * Gets activities filtered by various criteria
 *
 * @param filters - Filter options
 * @returns Result with array of activity logs
 */
async function getActivities(filters) {
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
                error: new ActivityServiceError(`Failed to get activities: ${error.message}`, exports.ActivityErrorCodes.QUERY_FAILED, error),
            };
        }
        const activities = data.map(activity_js_1.rowToActivityLog);
        return { success: true, data: activities };
    }
    catch (error) {
        logger.error('Unexpected error getting activities', error);
        return {
            success: false,
            error: new ActivityServiceError('Unexpected error getting activities', exports.ActivityErrorCodes.QUERY_FAILED, error),
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
async function getActivitiesByEntity(entityType, entityId, limit = 10) {
    return getActivities({
        entityType: entityType,
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
async function createActivity(input) {
    logger.debug('Creating activity manually', { entityType: input.entityType, action: input.action });
    try {
        const supabase = getClient();
        const rowData = (0, activity_js_1.activityInputToRow)(input);
        const { data, error } = await supabase
            .from(ACTIVITY_LOGS_TABLE)
            .insert(rowData)
            .select()
            .single();
        if (error) {
            logger.error('Failed to create activity', error);
            return {
                success: false,
                error: new ActivityServiceError(`Failed to create activity: ${error.message}`, exports.ActivityErrorCodes.CREATE_FAILED, error),
            };
        }
        const activity = (0, activity_js_1.rowToActivityLog)(data);
        logger.info('Activity created', { activityId: activity.id, title: activity.title });
        return { success: true, data: activity };
    }
    catch (error) {
        logger.error('Unexpected error creating activity', error);
        return {
            success: false,
            error: new ActivityServiceError('Unexpected error creating activity', exports.ActivityErrorCodes.CREATE_FAILED, error),
        };
    }
}
//# sourceMappingURL=activity.service.js.map