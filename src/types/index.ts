/**
 * Common type definitions for RouteIQ application
 */

// Re-export logger types
export * from './logger.js';

// Re-export error types
export * from './errors.js';

// Re-export client types
export * from './client.js';

// Re-export service types
export * from './service.js';

// Re-export vehicle types
export * from './vehicle.js';

// Re-export booking types
export * from './booking.js';

// Re-export maintenance schedule types
export * from './maintenanceSchedule.js';

// Re-export route types
export * from './route.js';

// Re-export Google Maps types
export * from './googlemaps.js';

// Re-export Address Validation types
export * from './address-validation.js';

// Note: Google Routes types are available via direct import from './google-routes.js'
// to avoid naming conflicts with existing Route and TravelMode types

/**
 * Generic result type for operations that can fail
 */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Generic ID type
 */
export type ID = string;

/**
 * Timestamp fields for database entities
 */
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base entity with ID and timestamps
 */
export interface BaseEntity extends Timestamps {
  id: ID;
}
