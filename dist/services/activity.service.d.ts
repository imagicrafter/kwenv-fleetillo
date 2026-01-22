/**
 * Activity Service
 *
 * Provides operations for querying activity logs in the RouteIQ application.
 * Activity logs are primarily populated by database triggers, but this service
 * provides read access and the ability to manually create entries if needed.
 */
import type { Result } from '../types/index';
import type { ActivityLog, CreateActivityInput, ActivityFilters } from '../types/activity';
/**
 * Activity service error
 */
export declare class ActivityServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for activity service errors
 */
export declare const ActivityErrorCodes: {
    readonly QUERY_FAILED: "ACTIVITY_QUERY_FAILED";
    readonly CREATE_FAILED: "ACTIVITY_CREATE_FAILED";
};
/**
 * Gets recent activity logs
 *
 * @param limit - Maximum number of activities to return (default: 5)
 * @returns Result with array of activity logs
 */
export declare function getRecentActivities(limit?: number): Promise<Result<ActivityLog[]>>;
/**
 * Gets activities filtered by various criteria
 *
 * @param filters - Filter options
 * @returns Result with array of activity logs
 */
export declare function getActivities(filters?: ActivityFilters): Promise<Result<ActivityLog[]>>;
/**
 * Gets activities for a specific entity
 *
 * @param entityType - Type of entity (booking, route, client, vehicle)
 * @param entityId - ID of the entity
 * @param limit - Maximum number of activities to return
 * @returns Result with array of activity logs
 */
export declare function getActivitiesByEntity(entityType: string, entityId: string, limit?: number): Promise<Result<ActivityLog[]>>;
/**
 * Creates an activity log entry manually
 * Note: Most activities are created automatically via database triggers,
 * but this function allows manual creation when needed.
 *
 * @param input - Activity data to create
 * @returns Result with created activity log
 */
export declare function createActivity(input: CreateActivityInput): Promise<Result<ActivityLog>>;
//# sourceMappingURL=activity.service.d.ts.map