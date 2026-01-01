/**
 * Route-related type definitions for RouteIQ application
 */

import type { ID, Timestamps } from './index.js';

/**
 * Route status options
 */
export type RouteStatus =
  | 'draft'
  | 'planned'
  | 'optimized'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed';

/**
 * Optimization type options
 */
export type OptimizationType =
  | 'time'
  | 'distance'
  | 'balanced'
  | 'priority'
  | 'custom';

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
  plannedStartTime?: string; // TIME format
  plannedEndTime?: string;   // TIME format
  actualStartTime?: Date;    // TIMESTAMPTZ
  actualEndTime?: Date;      // TIMESTAMPTZ
}

/**
 * Route optimization details
 */
export interface RouteOptimization {
  type: OptimizationType;
  score?: number; // 0-100
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

  // Vehicle assignment
  vehicleId?: ID;

  // Date and time
  routeDate: Date;
  plannedStartTime?: string;
  plannedEndTime?: string;
  actualStartTime?: Date;
  actualEndTime?: Date;

  // Route metrics
  totalDistanceKm?: number;
  totalDurationMinutes?: number;
  totalStops: number;

  // Optimization
  optimizationType: OptimizationType;
  optimizationScore?: number;
  algorithmVersion?: string;
  optimizationMetadata?: Record<string, any>;

  // Status
  status: RouteStatus;

  // Capacity
  plannedCapacityWeight?: number;
  plannedCapacityVolume?: number;
  actualCapacityWeight?: number;
  actualCapacityVolume?: number;

  // Financial
  estimatedCost?: number;
  actualCost?: number;
  costCurrency: string;

  // Constraints
  maxDurationMinutes?: number;
  maxDistanceKm?: number;
  requiredSkills?: string[];

  // Geographic
  geoFenceData?: Record<string, any>;

  // Route data
  stopSequence?: ID[]; // Array of booking IDs
  routeGeometry?: Record<string, any>;

  // Audit
  createdBy?: ID;
  assignedTo?: ID;

  // Metadata
  notes?: string;
  tags?: string[];

  // Soft delete
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
  route_date: string; // DATE format
  planned_start_time: string | null; // TIME format
  planned_end_time: string | null; // TIME format
  actual_start_time: string | null; // TIMESTAMPTZ
  actual_end_time: string | null; // TIMESTAMPTZ
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
  stop_sequence: string[] | null; // UUID array
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
export function rowToRoute(row: RouteRow): Route {
  return {
    id: row.id,
    routeName: row.route_name,
    routeCode: row.route_code ?? undefined,
    vehicleId: row.vehicle_id ?? undefined,
    routeDate: new Date(row.route_date),
    plannedStartTime: row.planned_start_time ?? undefined,
    plannedEndTime: row.planned_end_time ?? undefined,
    actualStartTime: row.actual_start_time ? new Date(row.actual_start_time) : undefined,
    actualEndTime: row.actual_end_time ? new Date(row.actual_end_time) : undefined,
    totalDistanceKm: row.total_distance_km ?? undefined,
    totalDurationMinutes: row.total_duration_minutes ?? undefined,
    totalStops: row.total_stops,
    optimizationType: row.optimization_type,
    optimizationScore: row.optimization_score ?? undefined,
    algorithmVersion: row.algorithm_version ?? undefined,
    optimizationMetadata: row.optimization_metadata ?? undefined,
    status: row.status,
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
export function routeInputToRow(input: CreateRouteInput): Partial<RouteRow> {
  return {
    route_name: input.routeName,
    route_code: input.routeCode ?? null,
    vehicle_id: input.vehicleId ?? null,
    route_date: input.routeDate.toISOString().split('T')[0],
    planned_start_time: input.plannedStartTime ?? null,
    planned_end_time: input.plannedEndTime ?? null,
    total_distance_km: input.totalDistanceKm ?? null,
    total_duration_minutes: input.totalDurationMinutes ?? null,
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
export function updateRouteInputToRow(input: UpdateRouteInput): Partial<RouteRow> {
  const baseRow = routeInputToRow(input as CreateRouteInput);

  return {
    ...baseRow,
    actual_start_time: input.actualStartTime?.toISOString() ?? undefined,
    actual_end_time: input.actualEndTime?.toISOString() ?? undefined,
    actual_capacity_weight: input.actualCapacityWeight ?? undefined,
    actual_capacity_volume: input.actualCapacityVolume ?? undefined,
    actual_cost: input.actualCost ?? undefined,
  };
}
