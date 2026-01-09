/**
 * Route-related type definitions for RouteIQ application
 */
import type { ID, Timestamps } from './index.js';
/**
 * Route status options
 */
export type RouteStatus = 'draft' | 'planned' | 'optimized' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
/**
 * Optimization type options
 */
export type OptimizationType = 'time' | 'distance' | 'balanced' | 'priority' | 'custom';
/**
 * Route capacity information
 */
export interface RouteCapacity {
    plannedWeight?: number;
    plannedVolume?: number;
    actualWeight?: number;
    actualVolume?: number;
}
/**
 * Route timing information
 */
export interface RouteTiming {
    plannedStartTime?: string;
    plannedEndTime?: string;
    actualStartTime?: Date;
    actualEndTime?: Date;
}
/**
 * Route optimization details
 */
export interface RouteOptimization {
    type: OptimizationType;
    score?: number;
    algorithmVersion?: string;
    metadata?: Record<string, any>;
}
/**
 * Route cost information
 */
export interface RouteCost {
    estimated?: number;
    actual?: number;
    currency: string;
}
/**
 * Route entity representing a route plan in the system
 */
export interface Route extends Timestamps {
    id: ID;
    routeName: string;
    routeCode?: string;
    vehicleId?: ID;
    vehicleName?: string;
    routeDate: Date;
    plannedStartTime?: string;
    plannedEndTime?: string;
    actualStartTime?: Date;
    actualEndTime?: Date;
    totalDistanceKm?: number;
    totalDurationMinutes?: number;
    totalStops: number;
    optimizationType: OptimizationType;
    optimizationScore?: number;
    algorithmVersion?: string;
    optimizationMetadata?: Record<string, any>;
    status: RouteStatus;
    plannedCapacityWeight?: number;
    plannedCapacityVolume?: number;
    actualCapacityWeight?: number;
    actualCapacityVolume?: number;
    estimatedCost?: number;
    actualCost?: number;
    costCurrency: string;
    maxDurationMinutes?: number;
    maxDistanceKm?: number;
    requiredSkills?: string[];
    geoFenceData?: Record<string, any>;
    stopSequence?: ID[];
    routeGeometry?: Record<string, any>;
    createdBy?: ID;
    assignedTo?: ID;
    notes?: string;
    tags?: string[];
    deletedAt?: Date;
}
/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface RouteRow {
    id: string;
    route_name: string;
    route_code: string | null;
    vehicle_id: string | null;
    route_date: string;
    planned_start_time: string | null;
    planned_end_time: string | null;
    actual_start_time: string | null;
    actual_end_time: string | null;
    total_distance_km: number | null;
    total_duration_minutes: number | null;
    total_stops: number;
    optimization_type: OptimizationType;
    optimization_score: number | null;
    algorithm_version: string | null;
    status: RouteStatus;
    planned_capacity_weight: number | null;
    planned_capacity_volume: number | null;
    actual_capacity_weight: number | null;
    actual_capacity_volume: number | null;
    estimated_cost: number | null;
    actual_cost: number | null;
    cost_currency: string;
    max_duration_minutes: number | null;
    max_distance_km: number | null;
    required_skills: string[] | null;
    geo_fence_data: Record<string, any> | null;
    stop_sequence: string[] | null;
    route_geometry: Record<string, any> | null;
    optimization_metadata: Record<string, any> | null;
    notes: string | null;
    tags: string[] | null;
    created_by: string | null;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}
/**
 * Input for creating a new route
 */
export interface CreateRouteInput {
    routeName: string;
    routeCode?: string;
    vehicleId?: ID;
    routeDate: Date;
    plannedStartTime?: string;
    plannedEndTime?: string;
    totalDistanceKm?: number;
    totalDurationMinutes?: number;
    totalStops?: number;
    optimizationType?: OptimizationType;
    optimizationScore?: number;
    algorithmVersion?: string;
    status?: RouteStatus;
    plannedCapacityWeight?: number;
    plannedCapacityVolume?: number;
    estimatedCost?: number;
    costCurrency?: string;
    maxDurationMinutes?: number;
    maxDistanceKm?: number;
    requiredSkills?: string[];
    geoFenceData?: Record<string, any>;
    stopSequence?: ID[];
    routeGeometry?: Record<string, any>;
    optimizationMetadata?: Record<string, any>;
    notes?: string;
    tags?: string[];
    createdBy?: ID;
    assignedTo?: ID;
}
/**
 * Input for updating an existing route
 */
export interface UpdateRouteInput extends Partial<CreateRouteInput> {
    id: ID;
    actualStartTime?: Date;
    actualEndTime?: Date;
    actualCapacityWeight?: number;
    actualCapacityVolume?: number;
    actualCost?: number;
}
/**
 * Route filter options for queries
 */
export interface RouteFilters {
    status?: RouteStatus;
    vehicleId?: ID;
    routeDate?: Date;
    routeDateFrom?: Date;
    routeDateTo?: Date;
    optimizationType?: OptimizationType;
    createdBy?: ID;
    assignedTo?: ID;
    tags?: string[];
    searchTerm?: string;
    includeDeleted?: boolean;
}
/**
 * Pagination options for route queries
 */
export interface RoutePaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: keyof Route;
    sortOrder?: 'asc' | 'desc';
}
/**
 * Converts a database row to a Route entity
 */
export declare function rowToRoute(row: RouteRow): Route;
/**
 * Converts a CreateRouteInput to a database row format
 */
export declare function routeInputToRow(input: CreateRouteInput): Partial<RouteRow>;
/**
 * Converts an UpdateRouteInput to a database row format
 */
export declare function updateRouteInputToRow(input: UpdateRouteInput): Partial<RouteRow>;
//# sourceMappingURL=route.d.ts.map