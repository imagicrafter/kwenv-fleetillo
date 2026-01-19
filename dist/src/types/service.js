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
 */
function serviceInputToRow(input) {
    return {
        name: input.name,
        code: input.code ?? null,
        service_type: input.serviceType,
        description: input.description ?? null,
        average_duration_minutes: input.averageDurationMinutes,
        minimum_duration_minutes: input.minimumDurationMinutes ?? null,
        maximum_duration_minutes: input.maximumDurationMinutes ?? null,
        base_price: input.basePrice ?? null,
        materials_cost: input.materialsCost ?? null,
        price_currency: input.priceCurrency ?? null,
        requires_appointment: input.requiresAppointment ?? true,
        max_per_day: input.maxPerDay ?? null,
        equipment_required: input.equipmentRequired ?? null,
        skills_required: input.skillsRequired ?? null,
        status: input.status ?? 'active',
        notes: input.notes ?? null,
        tags: input.tags ?? null,
    };
}
//# sourceMappingURL=service.js.map