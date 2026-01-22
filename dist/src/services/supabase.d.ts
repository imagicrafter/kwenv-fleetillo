/**
 * Supabase Client Service
 *
 * Provides a properly configured Supabase client with authentication,
 * connection verification, and error handling for the RouteIQ application.
 */
import { type SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '../types/index';
/**
 * Generic Supabase client type that accepts any schema
 */
type GenericSupabaseClient = SupabaseClient<any, any, any>;
/**
 * Connection status information
 */
export interface ConnectionStatus {
    connected: boolean;
    timestamp: Date;
    latencyMs?: number;
    error?: string;
}
/**
 * Supabase service error
 */
export declare class SupabaseServiceError extends Error {
    readonly code: string;
    readonly details?: unknown;
    constructor(message: string, code: string, details?: unknown);
}
/**
 * Error codes for Supabase service errors
 */
export declare const SupabaseErrorCodes: {
    readonly CONNECTION_FAILED: "SUPABASE_CONNECTION_FAILED";
    readonly INITIALIZATION_FAILED: "SUPABASE_INITIALIZATION_FAILED";
    readonly NOT_INITIALIZED: "SUPABASE_NOT_INITIALIZED";
    readonly QUERY_FAILED: "SUPABASE_QUERY_FAILED";
};
/**
 * Supabase client options interface
 */
export interface SupabaseClientOptions {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
    schema: string;
}
/**
 * Initializes the Supabase client with configuration from environment
 * @returns Result indicating success or failure of initialization
 */
export declare function initializeSupabase(optionsOverride?: Partial<SupabaseClientOptions>): Result<void>;
/**
 * Gets the Supabase client instance
 * @throws SupabaseServiceError if client is not initialized
 */
export declare function getSupabaseClient(): GenericSupabaseClient;
/**
 * Gets the admin Supabase client instance
 * @returns The admin client or null if not configured
 * @throws SupabaseServiceError if client is not initialized
 */
export declare function getAdminSupabaseClient(): GenericSupabaseClient | null;
/**
 * Verifies connection to the Supabase instance
 * @returns Result with connection status
 */
export declare function verifyConnection(): Promise<Result<ConnectionStatus>>;
/**
 * Gets the last known connection status
 */
export declare function getConnectionStatus(): ConnectionStatus | null;
/**
 * Checks if the Supabase client is initialized
 */
export declare function isSupabaseInitialized(): boolean;
/**
 * Resets the Supabase client (useful for testing)
 * WARNING: This will invalidate any existing client references
 */
export declare function resetSupabaseClient(): void;
/**
 * Convenience function to initialize and verify Supabase connection
 * @returns Result with connection status
 */
export declare function initializeAndVerifySupabase(): Promise<Result<ConnectionStatus>>;
export type { SupabaseClient, GenericSupabaseClient };
//# sourceMappingURL=supabase.d.ts.map