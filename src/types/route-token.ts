/**
 * Route Token type definitions
 *
 * Route tokens provide time-limited, public access to view route maps
 * without requiring authentication. Used for driver dispatch links.
 */

import type { ID, Timestamps } from './index';

/**
 * Route token entity
 */
export interface RouteToken extends Timestamps {
  id: ID;
  routeId: ID;
  token: string;
  expiresAt: Date;
}

/**
 * Database row representation (snake_case as stored in Supabase)
 */
export interface RouteTokenRow {
  id: string;
  route_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new route token
 */
export interface CreateRouteTokenInput {
  routeId: ID;
  /** Token expiration in hours from now. Defaults to 24 hours. */
  expirationHours?: number;
}

/**
 * Response when creating a route token
 */
export interface RouteTokenResponse {
  token: string;
  expiresAt: Date;
  url: string;
}

/**
 * Coordinate pair for route token public data
 */
export interface RouteTokenCoordinates {
  lat: number;
  lng: number;
}

/**
 * Stop with sequence number and coordinates
 */
export interface StopCoordinate {
  sequence: number;
  lat: number;
  lng: number;
}

/**
 * Public route map data (minimal, no sensitive info)
 */
export interface PublicRouteMapData {
  polyline: string;
  stops: StopCoordinate[];
  start: RouteTokenCoordinates;
  end: RouteTokenCoordinates;
}

/**
 * Converts a database row to a RouteToken entity
 */
export function rowToRouteToken(row: RouteTokenRow): RouteToken {
  return {
    id: row.id,
    routeId: row.route_id,
    token: row.token,
    expiresAt: new Date(row.expires_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Converts CreateRouteTokenInput to database row format
 */
export function routeTokenInputToRow(
  input: CreateRouteTokenInput,
  token: string,
  expiresAt: Date
): Partial<RouteTokenRow> {
  return {
    route_id: input.routeId,
    token,
    expires_at: expiresAt.toISOString(),
  };
}
