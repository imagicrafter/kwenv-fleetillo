"use strict";
/**
 * Activity Log type definitions for RouteIQ application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToActivityLog = rowToActivityLog;
exports.activityInputToRow = activityInputToRow;
/**
 * Converts a database row to an ActivityLog entity
 */
function rowToActivityLog(row) {
    return {
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        title: row.title,
        description: row.description ?? undefined,
        actorName: row.actor_name ?? undefined,
        oldValue: row.old_value ?? undefined,
        newValue: row.new_value ?? undefined,
        severity: row.severity,
        createdAt: new Date(row.created_at),
    };
}
/**
 * Converts a CreateActivityInput to a database row format
 */
function activityInputToRow(input) {
    return {
        entity_type: input.entityType,
        entity_id: input.entityId,
        action: input.action,
        title: input.title,
        description: input.description ?? null,
        actor_name: input.actorName ?? null,
        old_value: input.oldValue ?? null,
        new_value: input.newValue ?? null,
        severity: input.severity ?? 'info',
    };
}
//# sourceMappingURL=activity.js.map