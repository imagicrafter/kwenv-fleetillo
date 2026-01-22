/**
 * Common type definitions for RouteIQ application
 */
export * from './logger.js';
export * from './errors.js';
export * from './customer.js';
export * from './service.js';
export * from './vehicle.js';
export * from './driver.js';
export * from './booking.js';
export * from './maintenanceSchedule.js';
export * from './route.js';
export * from './googlemaps.js';
export * from './address-validation.js';
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
//# sourceMappingURL=index.d.ts.map