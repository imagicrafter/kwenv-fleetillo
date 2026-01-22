/**
 * Common type definitions for RouteIQ application
 */

// Re-export logger types
export * from './logger';

// Re-export error types
export * from './errors';

// Re-export customer types
export * from './customer';

// Re-export service types
export * from './service';

// Re-export vehicle types
export * from './vehicle';

// Re-export driver types
export * from './driver';

// Re-export booking types
export * from './booking';

// Re-export maintenance schedule types
export * from './maintenanceSchedule';

// Re-export route types
export * from './route';

// Re-export Google Maps types
export * from './googlemaps';

// Re-export Address Validation types
export * from './address-validation';

// Note: Google Routes types are available via direct import from './google-routes'
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
