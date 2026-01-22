/**
 * Customer Service
 *
 * Provides CRUD operations and business logic for managing customers
 * in the Fleetillo application.
 */
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';
import type { Customer, CreateCustomerInput, UpdateCustomerInput, CustomerFilters } from '../types/customer.js';
/**
 * Customer service error
 */
export declare class CustomerServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for customer service errors
 */
export declare const CustomerErrorCodes: {
    readonly NOT_FOUND: "CUSTOMER_NOT_FOUND";
    readonly CREATE_FAILED: "CUSTOMER_CREATE_FAILED";
    readonly UPDATE_FAILED: "CUSTOMER_UPDATE_FAILED";
    readonly DELETE_FAILED: "CUSTOMER_DELETE_FAILED";
    readonly QUERY_FAILED: "CUSTOMER_QUERY_FAILED";
    readonly VALIDATION_FAILED: "CUSTOMER_VALIDATION_FAILED";
};
/**
 * Creates a new customer
 */
export declare function createCustomer(input: CreateCustomerInput, options?: {
    skipLocationCreation?: boolean;
}): Promise<Result<Customer>>;
/**
 * Gets a customer by ID
 */
export declare function getCustomerById(id: string): Promise<Result<Customer>>;
/**
 * Gets all customers with optional filtering and pagination
 */
export declare function getCustomers(filters?: CustomerFilters, pagination?: PaginationParams): Promise<Result<PaginatedResponse<Customer>>>;
/**
 * Updates an existing customer
 */
export declare function updateCustomer(input: UpdateCustomerInput): Promise<Result<Customer>>;
/**
 * Soft deletes a customer by setting deleted_at timestamp
 */
export declare function deleteCustomer(id: string): Promise<Result<void>>;
/**
 * Permanently deletes a customer (hard delete)
 * Use with caution - this cannot be undone
 */
export declare function hardDeleteCustomer(id: string): Promise<Result<void>>;
/**
 * Restores a soft-deleted customer
 */
export declare function restoreCustomer(id: string): Promise<Result<Customer>>;
/**
 * Counts customers with optional filters
 */
export declare function countCustomers(filters?: CustomerFilters): Promise<Result<number>>;
//# sourceMappingURL=customer.service.d.ts.map