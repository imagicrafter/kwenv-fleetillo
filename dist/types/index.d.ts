/**
 * Common type definitions for RouteIQ application
 */
export * from './logger';
export * from './errors';
export * from './customer';
export * from './service';
export * from './vehicle';
export * from './driver';
export * from './booking';
export * from './maintenanceSchedule';
export * from './route';
export * from './googlemaps';
export * from './address-validation';
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