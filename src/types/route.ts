/**
 * Route-related type definitions for RouteIQ application
 */

import type { ID, Timestamps } from './common';

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
  vehicleName?: string; // Populated from join with vehicles table

  // Driver assignment (derived from vehicle's assigned_driver_id)
  driverId?: ID;
  driverName?: string;

  // Date and time
  routeDate: Date;
  plannedStartTime?: string;
  plannedEndTime?: string;
  actualStartTime?: Date;
  actualEndTime?: Date;

  // Route metrics
  totalDistanceKm?: number;
  totalDurationMinutes?: number;
  totalServiceTimeMinutes?: number;
  totalTravelTimeMinutes?: number;
  totalStops: number;

  // Optimization
  optimizationType: OptimizationType;
  optimizationScore?: number;
  algorithmVersion?: string;
  optimizationMetadata?: Record<string, any>;

  // Status
  status: RouteStatus;
  needsRecalculation: boolean; // True if route metrics are stale after booking changes

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
  total_service_time_minutes: number | null;
  total_travel_time_minutes: number | null;
  total_stops: number;
  optimization_type: OptimizationType;
  optimization_score: number | null;
  algorithm_version: string | null;
  status: RouteStatus;
  needs_recalculation: boolean;
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
  totalServiceTimeMinutes?: number;
  totalTravelTimeMinutes?: number;
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
  needsRecalculation?: boolean;
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
    vehicleName: (row as any).vehicles?.unit_number
      ? `${(row as any).vehicles.unit_number}${(row as any).vehicles.vehicle_type ? ' - ' + (row as any).vehicles.vehicle_type : ''}`
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
 *
 * Important: Only includes fields that are explicitly defined in the input.
 * This prevents undefined fields from overwriting existing values during updates.
 */
export function routeInputToRow(input: CreateRouteInput): Partial<RouteRow> {
  const row: Partial<RouteRow> = {};

  // Required fields
  if (input.routeName !== undefined) row.route_name = input.routeName;
  if (input.routeDate !== undefined) row.route_date = input.routeDate.toISOString().split('T')[0];

  // Route identification
  if (input.routeCode !== undefined) row.route_code = input.routeCode ?? null;
  if (input.vehicleId !== undefined) row.vehicle_id = input.vehicleId ?? null;

  // Timing
  if (input.plannedStartTime !== undefined) row.planned_start_time = input.plannedStartTime ?? null;
  if (input.plannedEndTime !== undefined) row.planned_end_time = input.plannedEndTime ?? null;

  // Metrics
  if (input.totalDistanceKm !== undefined) row.total_distance_km = input.totalDistanceKm ?? null;
  if (input.totalDurationMinutes !== undefined) row.total_duration_minutes = input.totalDurationMinutes ?? null;
  if (input.totalServiceTimeMinutes !== undefined) row.total_service_time_minutes = input.totalServiceTimeMinutes ?? null;
  if (input.totalTravelTimeMinutes !== undefined) row.total_travel_time_minutes = input.totalTravelTimeMinutes ?? null;
  if (input.totalStops !== undefined) row.total_stops = input.totalStops;

  // Optimization
  if (input.optimizationType !== undefined) row.optimization_type = input.optimizationType;
  if (input.optimizationScore !== undefined) row.optimization_score = input.optimizationScore ?? null;
  if (input.algorithmVersion !== undefined) row.algorithm_version = input.algorithmVersion ?? null;
  if (input.optimizationMetadata !== undefined) row.optimization_metadata = input.optimizationMetadata ?? null;

  // Status
  if (input.status !== undefined) row.status = input.status;

  // Capacity
  if (input.plannedCapacityWeight !== undefined) row.planned_capacity_weight = input.plannedCapacityWeight ?? null;
  if (input.plannedCapacityVolume !== undefined) row.planned_capacity_volume = input.plannedCapacityVolume ?? null;

  // Cost
  if (input.estimatedCost !== undefined) row.estimated_cost = input.estimatedCost ?? null;
  if (input.costCurrency !== undefined) row.cost_currency = input.costCurrency;

  // Constraints
  if (input.maxDurationMinutes !== undefined) row.max_duration_minutes = input.maxDurationMinutes ?? null;
  if (input.maxDistanceKm !== undefined) row.max_distance_km = input.maxDistanceKm ?? null;
  if (input.requiredSkills !== undefined) row.required_skills = input.requiredSkills ?? null;

  // Geographic data
  if (input.geoFenceData !== undefined) row.geo_fence_data = input.geoFenceData ?? null;
  if (input.stopSequence !== undefined) row.stop_sequence = input.stopSequence ?? null;
  if (input.routeGeometry !== undefined) row.route_geometry = input.routeGeometry ?? null;

  // Metadata
  if (input.notes !== undefined) row.notes = input.notes ?? null;
  if (input.tags !== undefined) row.tags = input.tags ?? null;
  if (input.createdBy !== undefined) row.created_by = input.createdBy ?? null;
  if (input.assignedTo !== undefined) row.assigned_to = input.assignedTo ?? null;

  return row;
}

/**
 * Converts an UpdateRouteInput to a database row format
 *
 * Important: Only includes fields that are explicitly defined in the input.
 * This prevents undefined fields from overwriting existing values during updates.
 */
export function updateRouteInputToRow(input: UpdateRouteInput): Partial<RouteRow> {
  // Start with base fields
  const row = routeInputToRow(input as CreateRouteInput);

  // Add update-specific fields (only if defined)
  if (input.actualStartTime !== undefined) {
    row.actual_start_time = input.actualStartTime?.toISOString() ?? null;
  }
  if (input.actualEndTime !== undefined) {
    row.actual_end_time = input.actualEndTime?.toISOString() ?? null;
  }
  if (input.actualCapacityWeight !== undefined) row.actual_capacity_weight = input.actualCapacityWeight ?? null;
  if (input.actualCapacityVolume !== undefined) row.actual_capacity_volume = input.actualCapacityVolume ?? null;
  if (input.actualCost !== undefined) row.actual_cost = input.actualCost ?? null;
  if (input.needsRecalculation !== undefined) row.needs_recalculation = input.needsRecalculation;

  return row;
}
