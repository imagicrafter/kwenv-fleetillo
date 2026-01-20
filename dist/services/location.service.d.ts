/**
 * Location Service
 *
 * Provides CRUD operations and business logic for managing locations
 * in the Fleetillo application.
 */
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';
export interface Location {
    id: string;
    customerId?: string | null;
    customerName?: string;
    name: string;
    locationType: 'client' | 'depot' | 'disposal' | 'maintenance' | 'home' | 'other';
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude?: number | null;
    longitude?: number | null;
    isPrimary: boolean;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}
export type CreateLocationInput = Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type UpdateLocationInput = Partial<CreateLocationInput> & {
    id: string;
};
/**
 * Creates a new location
 */
export declare function createLocation(input: CreateLocationInput): Promise<Result<Location>>;
/**
 * Gets a location by ID
 */
export declare function getLocationById(id: string): Promise<Result<Location>>;
/**
 * Gets all locations with optional filters
 */
export declare function getAllLocations(filters?: {
    type?: string;
    customerId?: string;
    searchTerm?: string;
}, pagination?: PaginationParams): Promise<Result<PaginatedResponse<Location>>>;
/**
 * Gets all locations for a customer
 */
export declare function getCustomerLocations(customerId: string): Promise<Result<Location[]>>;
/**
 * Updates a location
 */
export declare function updateLocation(input: UpdateLocationInput): Promise<Result<Location>>;
/**
 * Soft deletes a location
 */
export declare function deleteLocation(id: string): Promise<Result<void>>;
//# sourceMappingURL=location.service.d.ts.map