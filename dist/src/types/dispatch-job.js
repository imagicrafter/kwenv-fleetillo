"use strict";
/**
 * Dispatch Job Types
 * Types for the batch dispatch scheduling system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToDispatchJob = rowToDispatchJob;
exports.dispatchJobInputToRow = dispatchJobInputToRow;
/**
 * Convert database row to DispatchJob entity
 */
function rowToDispatchJob(row) {
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
function dispatchJobInputToRow(input) {
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
//# sourceMappingURL=dispatch-job.js.map