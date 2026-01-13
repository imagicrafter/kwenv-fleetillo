"use strict";
/**
 * Route-related type definitions for RouteIQ application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToRoute = rowToRoute;
exports.routeInputToRow = routeInputToRow;
exports.updateRouteInputToRow = updateRouteInputToRow;
/**
 * Converts a database row to a Route entity
 */
function rowToRoute(row) {
    return {
        id: row.id,
        routeName: row.route_name,
        routeCode: row.route_code ?? undefined,
        vehicleId: row.vehicle_id ?? undefined,
        vehicleName: row.vehicles?.unit_number
            ? `${row.vehicles.unit_number}${row.vehicles.vehicle_type ? ' - ' + row.vehicles.vehicle_type : ''}`
            : undefined,
        routeDate: new Date(row.route_date),
        plannedStartTime: row.planned_start_time ?? undefined,
        plannedEndTime: row.planned_end_time ?? undefined,
        actualStartTime: row.actual_start_time ? new Date(row.actual_start_time) : undefined,
        actualEndTime: row.actual_end_time ? new Date(row.actual_end_time) : undefined,
        totalDistanceKm: row.total_distance_km ?? undefined,
        totalDurationMinutes: row.total_duration_minutes ?? undefined,
        totalServiceTimeMinutes: row.total_service_time_minutes ?? undefined,
        totalTravelTimeMinutes: row.total_travel_time_minutes ?? undefined,
        totalStops: row.total_stops,
        optimizationType: row.optimization_type,
        optimizationScore: row.optimization_score ?? undefined,
        algorithmVersion: row.algorithm_version ?? undefined,
        optimizationMetadata: row.optimization_metadata ?? undefined,
        status: row.status,
        needsRecalculation: row.needs_recalculation ?? false,
        plannedCapacityWeight: row.planned_capacity_weight ?? undefined,
        plannedCapacityVolume: row.planned_capacity_volume ?? undefined,
        actualCapacityWeight: row.actual_capacity_weight ?? undefined,
        actualCapacityVolume: row.actual_capacity_volume ?? undefined,
        estimatedCost: row.estimated_cost ?? undefined,
        actualCost: row.actual_cost ?? undefined,
        costCurrency: row.cost_currency,
        maxDurationMinutes: row.max_duration_minutes ?? undefined,
        maxDistanceKm: row.max_distance_km ?? undefined,
        requiredSkills: row.required_skills ?? undefined,
        geoFenceData: row.geo_fence_data ?? undefined,
        stopSequence: row.stop_sequence ?? undefined,
        routeGeometry: row.route_geometry ?? undefined,
        notes: row.notes ?? undefined,
        tags: row.tags ?? undefined,
        createdBy: row.created_by ?? undefined,
        assignedTo: row.assigned_to ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
}
/**
 * Converts a CreateRouteInput to a database row format
 */
function routeInputToRow(input) {
    return {
        route_name: input.routeName,
        route_code: input.routeCode ?? null,
        vehicle_id: input.vehicleId ?? null,
        route_date: input.routeDate.toISOString().split('T')[0],
        planned_start_time: input.plannedStartTime ?? null,
        planned_end_time: input.plannedEndTime ?? null,
        total_distance_km: input.totalDistanceKm ?? null,
        total_duration_minutes: input.totalDurationMinutes ?? null,
        // total_service_time_minutes: input.totalServiceTimeMinutes ?? null,
        // total_travel_time_minutes: input.totalTravelTimeMinutes ?? null,
        total_stops: input.totalStops ?? 0,
        optimization_type: input.optimizationType ?? 'balanced',
        optimization_score: input.optimizationScore ?? null,
        algorithm_version: input.algorithmVersion ?? null,
        status: input.status ?? 'draft',
        planned_capacity_weight: input.plannedCapacityWeight ?? null,
        planned_capacity_volume: input.plannedCapacityVolume ?? null,
        estimated_cost: input.estimatedCost ?? null,
        cost_currency: input.costCurrency ?? 'USD',
        max_duration_minutes: input.maxDurationMinutes ?? null,
        max_distance_km: input.maxDistanceKm ?? null,
        required_skills: input.requiredSkills ?? null,
        geo_fence_data: input.geoFenceData ?? null,
        stop_sequence: input.stopSequence ?? null,
        route_geometry: input.routeGeometry ?? null,
        optimization_metadata: input.optimizationMetadata ?? null,
        notes: input.notes ?? null,
        tags: input.tags ?? null,
        created_by: input.createdBy ?? null,
        assigned_to: input.assignedTo ?? null,
    };
}
/**
 * Converts an UpdateRouteInput to a database row format
 */
function updateRouteInputToRow(input) {
    const baseRow = routeInputToRow(input);
    return {
        ...baseRow,
        actual_start_time: input.actualStartTime?.toISOString() ?? undefined,
        actual_end_time: input.actualEndTime?.toISOString() ?? undefined,
        actual_capacity_weight: input.actualCapacityWeight ?? undefined,
        actual_capacity_volume: input.actualCapacityVolume ?? undefined,
        actual_cost: input.actualCost ?? undefined,
        needs_recalculation: input.needsRecalculation ?? undefined,
    };
}
//# sourceMappingURL=route.js.map