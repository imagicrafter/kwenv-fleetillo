/**
 * Client Service
 *
 * Provides CRUD operations and business logic for managing clients
 * in the RouteIQ application.
 */
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';
import type { Client, CreateClientInput, UpdateClientInput, ClientFilters } from '../types/client.js';
/**
 * Client service error
 */
export declare class ClientServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for client service errors
 */
export declare const ClientErrorCodes: {
    readonly NOT_FOUND: "CLIENT_NOT_FOUND";
    readonly CREATE_FAILED: "CLIENT_CREATE_FAILED";
    readonly UPDATE_FAILED: "CLIENT_UPDATE_FAILED";
    readonly DELETE_FAILED: "CLIENT_DELETE_FAILED";
    readonly QUERY_FAILED: "CLIENT_QUERY_FAILED";
    readonly VALIDATION_FAILED: "CLIENT_VALIDATION_FAILED";
};
/**
 * Creates a new client
 */
export declare function createClient(input: CreateClientInput, options?: {
    skipLocationCreation?: boolean;
}): Promise<Result<Client>>;
/**
 * Gets a client by ID
 */
export declare function getClientById(id: string): Promise<Result<Client>>;
/**
 * Gets all clients with optional filtering and pagination
 */
export declare function getClients(filters?: ClientFilters, pagination?: PaginationParams): Promise<Result<PaginatedResponse<Client>>>;
/**
 * Updates an existing client
 */
export declare function updateClient(input: UpdateClientInput): Promise<Result<Client>>;
/**
 * Soft deletes a client by setting deleted_at timestamp
 */
export declare function deleteClient(id: string): Promise<Result<void>>;
/**
 * Permanently deletes a client (hard delete)
 * Use with caution - this cannot be undone
 */
export declare function hardDeleteClient(id: string): Promise<Result<void>>;
/**
 * Restores a soft-deleted client
 */
export declare function restoreClient(id: string): Promise<Result<Client>>;
/**
 * Counts clients with optional filters
 */
export declare function countClients(filters?: ClientFilters): Promise<Result<number>>;
//# sourceMappingURL=client.service.d.ts.map