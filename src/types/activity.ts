/**
 * Activity Log type definitions for RouteIQ application
 */

import type { ID } from './common';

/**
 * Entity types that can generate activities
 */
export type ActivityEntityType = 'booking' | 'route' | 'client' | 'vehicle';

/**
 * Actions that can be logged
 */
export type ActivityAction =
    | 'created'
    | 'updated'
    | 'completed'
    | 'started'
    | 'cancelled'
    | 'scheduled'
    | 'status_changed'
    | 'deleted';

/**
 * Severity levels for visual styling
 */
export type ActivitySeverity = 'success' | 'warning' | 'info' | 'error';

/**
 * Activity log entity
 */
export interface ActivityLog {
    id: ID;
    entityType: ActivityEntityType;
    entityId: ID;
    action: ActivityAction;
    title: string;
    description?: string;
    actorName?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    severity: ActivitySeverity;
    createdAt: Date;
}

/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface ActivityLogRow {
    id: string;
    entity_type: ActivityEntityType;
    entity_id: string;
    action: ActivityAction;
    title: string;
    description: string | null;
    actor_name: string | null;
    old_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
    severity: ActivitySeverity;
    created_at: string;
}

/**
 * Input for creating an activity log entry manually
 */
export interface CreateActivityInput {
    entityType: ActivityEntityType;
    entityId: ID;
    action: ActivityAction;
    title: string;
    description?: string;
    actorName?: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    severity?: ActivitySeverity;
}

/**
 * Filters for querying activity logs
 */
export interface ActivityFilters {
    entityType?: ActivityEntityType;
    entityId?: ID;
    action?: ActivityAction;
    severity?: ActivitySeverity;
    limit?: number;
}

/**
 * Converts a database row to an ActivityLog entity
 */
export function rowToActivityLog(row: ActivityLogRow): ActivityLog {
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
export function activityInputToRow(input: CreateActivityInput): Partial<ActivityLogRow> {
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
