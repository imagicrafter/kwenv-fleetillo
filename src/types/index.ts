/**
 * Common type definitions for RouteIQ application
 */

// Re-export common base types (must be first to avoid circular deps)
export * from './common';

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

// Re-export route token types
export * from './route-token';

// Re-export Google Maps types
export * from './googlemaps';

// Re-export Address Validation types
export * from './address-validation';

// Note: Google Routes types are available via direct import from './google-routes'
// to avoid naming conflicts with existing Route and TravelMode types
