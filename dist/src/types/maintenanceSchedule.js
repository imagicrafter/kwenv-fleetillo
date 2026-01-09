"use strict";
/**
 * Maintenance Schedule-related type definitions for RouteIQ application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToMaintenanceSchedule = rowToMaintenanceSchedule;
exports.maintenanceScheduleInputToRow = maintenanceScheduleInputToRow;
exports.isMaintenanceOverdue = isMaintenanceOverdue;
exports.getDaysUntilDue = getDaysUntilDue;
/**
 * Converts a database row to a MaintenanceSchedule entity
 */
function rowToMaintenanceSchedule(row) {
    return {
        id: row.id,
        vehicleId: row.vehicle_id,
        maintenanceType: row.maintenance_type,
        description: row.description ?? undefined,
        scheduledDate: new Date(row.scheduled_date),
        dueDate: row.due_date ? new Date(row.due_date) : undefined,
        completedDate: row.completed_date ? new Date(row.completed_date) : undefined,
        status: row.status,
        odometerAtMaintenance: row.odometer_at_maintenance ?? undefined,
        nextMaintenanceOdometer: row.next_maintenance_odometer ?? undefined,
        cost: row.cost ?? undefined,
        currency: row.currency ?? undefined,
        performedBy: row.performed_by ?? undefined,
        serviceProvider: row.service_provider ?? undefined,
        notes: row.notes ?? undefined,
        attachments: row.attachments ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
}
/**
 * Converts a CreateMaintenanceScheduleInput to a database row format
 */
function maintenanceScheduleInputToRow(input) {
    return {
        vehicle_id: input.vehicleId,
        maintenance_type: input.maintenanceType,
        description: input.description ?? null,
        scheduled_date: input.scheduledDate.toISOString().split('T')[0],
        due_date: input.dueDate?.toISOString().split('T')[0] ?? null,
        completed_date: input.completedDate?.toISOString().split('T')[0] ?? null,
        status: input.status ?? 'scheduled',
        odometer_at_maintenance: input.odometerAtMaintenance ?? null,
        next_maintenance_odometer: input.nextMaintenanceOdometer ?? null,
        cost: input.cost ?? null,
        currency: input.currency ?? 'USD',
        performed_by: input.performedBy ?? null,
        service_provider: input.serviceProvider ?? null,
        notes: input.notes ?? null,
        attachments: input.attachments ?? null,
    };
}
/**
 * Helper function to determine if a maintenance schedule is overdue
 */
function isMaintenanceOverdue(schedule) {
    if (schedule.status === 'completed' || schedule.status === 'cancelled') {
        return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = schedule.dueDate ?? schedule.scheduledDate;
    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);
    return dueDateOnly < today;
}
/**
 * Helper function to calculate days until/overdue
 */
function getDaysUntilDue(schedule) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = schedule.dueDate ?? schedule.scheduledDate;
    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);
    const diffTime = dueDateOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}
//# sourceMappingURL=maintenanceSchedule.js.map