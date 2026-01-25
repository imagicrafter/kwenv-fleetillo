"use strict";
/**
 * Service-related type definitions for RouteIQ application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToService = rowToService;
exports.serviceInputToRow = serviceInputToRow;
/**
 * Converts a database row to a Service entity
 */
function rowToService(row) {
    return {
        id: row.id,
        name: row.name,
        code: row.code ?? undefined,
        serviceType: row.service_type,
        description: row.description ?? undefined,
        averageDurationMinutes: row.average_duration_minutes,
        minimumDurationMinutes: row.minimum_duration_minutes ?? undefined,
        maximumDurationMinutes: row.maximum_duration_minutes ?? undefined,
        basePrice: row.base_price ?? undefined,
        materialsCost: row.materials_cost ?? undefined,
        priceCurrency: row.price_currency ?? undefined,
        requiresAppointment: row.requires_appointment,
        maxPerDay: row.max_per_day ?? undefined,
        equipmentRequired: row.equipment_required ?? undefined,
        skillsRequired: row.skills_required ?? undefined,
        status: row.status,
        notes: row.notes ?? undefined,
        tags: row.tags ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
}
/**
 * Converts a CreateServiceInput to a database row format
 *
 * Important: Only includes fields that are explicitly defined in the input.
 * This prevents undefined fields from overwriting existing values during updates.
 */
function serviceInputToRow(input) {
    const row = {};
    // Required fields
    if (input.name !== undefined)
        row.name = input.name;
    if (input.serviceType !== undefined)
        row.service_type = input.serviceType;
    if (input.averageDurationMinutes !== undefined)
        row.average_duration_minutes = input.averageDurationMinutes;
    // Optional identification
    if (input.code !== undefined)
        row.code = input.code ?? null;
    if (input.description !== undefined)
        row.description = input.description ?? null;
    // Duration constraints
    if (input.minimumDurationMinutes !== undefined)
        row.minimum_duration_minutes = input.minimumDurationMinutes ?? null;
    if (input.maximumDurationMinutes !== undefined)
        row.maximum_duration_minutes = input.maximumDurationMinutes ?? null;
    // Pricing
    if (input.basePrice !== undefined)
        row.base_price = input.basePrice ?? null;
    if (input.materialsCost !== undefined)
        row.materials_cost = input.materialsCost ?? null;
    if (input.priceCurrency !== undefined)
        row.price_currency = input.priceCurrency ?? null;
    // Scheduling
    if (input.requiresAppointment !== undefined)
        row.requires_appointment = input.requiresAppointment;
    if (input.maxPerDay !== undefined)
        row.max_per_day = input.maxPerDay ?? null;
    // Requirements
    if (input.equipmentRequired !== undefined)
        row.equipment_required = input.equipmentRequired ?? null;
    if (input.skillsRequired !== undefined)
        row.skills_required = input.skillsRequired ?? null;
    // Status and metadata
    if (input.status !== undefined)
        row.status = input.status;
    if (input.notes !== undefined)
        row.notes = input.notes ?? null;
    if (input.tags !== undefined)
        row.tags = input.tags ?? null;
    return row;
}
//# sourceMappingURL=service.js.map