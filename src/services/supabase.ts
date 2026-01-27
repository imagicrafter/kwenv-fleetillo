/**
 * Supabase Client Service
 *
 * Provides a properly configured Supabase client with authentication,
 * connection verification, and error handling for the Fleetillo application.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index';
import { createContextLogger } from '../utils/logger';
import type { Result } from '../types/index';

/**
 * Generic Supabase client type that accepts any schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericSupabaseClient = SupabaseClient<any, any, any>;

/**
 * Logger instance for Supabase operations
 */
const logger = createContextLogger('SupabaseClient');

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
export class SupabaseServiceError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'SupabaseServiceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for Supabase service errors
 */
export const SupabaseErrorCodes = {
  CONNECTION_FAILED: 'SUPABASE_CONNECTION_FAILED',
  INITIALIZATION_FAILED: 'SUPABASE_INITIALIZATION_FAILED',
  NOT_INITIALIZED: 'SUPABASE_NOT_INITIALIZED',
  QUERY_FAILED: 'SUPABASE_QUERY_FAILED',
} as const;

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
 * Creates and configures a Supabase client instance
 */
function createSupabaseClient(options: SupabaseClientOptions): GenericSupabaseClient {
  const { url, anonKey, schema } = options;

  logger.debug('Creating Supabase client', {
    url: url.replace(/\/\/(.+?)@/, '//*****@'), // Mask sensitive parts
    schema,
    anonKeyPrefix: anonKey?.substring(0, 5) + '...',
  });


  return createClient(url, anonKey, {
    db: {
      schema,
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-application-name': 'fleetillo',
      },
    },
  });
}

/**
 * Creates an admin Supabase client with service role key
 * Use this for server-side operations that bypass RLS
 */
function createAdminSupabaseClient(options: SupabaseClientOptions): GenericSupabaseClient | null {
  const { url, serviceRoleKey, schema } = options;

  if (!serviceRoleKey) {
    logger.warn('No service role key provided, admin client will not be available');
    return null;
  }

  logger.debug('Creating admin Supabase client', {
    schema,
    serviceRoleKeyPrefix: serviceRoleKey?.substring(0, 5) + '...',
  });

  return createClient(url, serviceRoleKey, {
    db: {
      schema,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'fleetillo-admin',
      },
    },
  });
}

/**
 * Singleton instance of the Supabase client
 */
let supabaseClient: GenericSupabaseClient | null = null;

/**
 * Singleton instance of the admin Supabase client
 */
let adminSupabaseClient: GenericSupabaseClient | null = null;

/**
 * Initialization state
 */
let isInitialized = false;

/**
 * Last connection status
 */
let lastConnectionStatus: ConnectionStatus | null = null;

/**
 * Initializes the Supabase client with configuration from environment
 * @returns Result indicating success or failure of initialization
 */
export function initializeSupabase(optionsOverride?: Partial<SupabaseClientOptions>): Result<void> {
  try {
    logger.info('Initializing Supabase client...');

    const options: SupabaseClientOptions = {
      url: optionsOverride?.url ?? config.supabase.url,
      anonKey: optionsOverride?.anonKey ?? config.supabase.anonKey,
      serviceRoleKey: optionsOverride?.serviceRoleKey ?? config.supabase.serviceRoleKey,
      schema: optionsOverride?.schema ?? config.supabase.schema,
    };

    // Validate URL format
    try {
      new URL(options.url);
    } catch {
      const error = new SupabaseServiceError(
        'Invalid Supabase URL format',
        SupabaseErrorCodes.INITIALIZATION_FAILED,
        { url: options.url }
      );
      logger.error('Failed to initialize Supabase: Invalid URL', error);
      return { success: false, error };
    }

    // Create the main client
    supabaseClient = createSupabaseClient(options);

    // Create admin client if service role key is available
    adminSupabaseClient = createAdminSupabaseClient(options);

    isInitialized = true;
    logger.info('Supabase client initialized successfully');

    return { success: true };
  } catch (error) {
    const serviceError = new SupabaseServiceError(
      'Failed to initialize Supabase client',
      SupabaseErrorCodes.INITIALIZATION_FAILED,
      error
    );
    logger.error('Failed to initialize Supabase client', error);
    return { success: false, error: serviceError };
  }
}

/**
 * Gets the Supabase client instance
 * @throws SupabaseServiceError if client is not initialized
 */
export function getSupabaseClient(): GenericSupabaseClient {
  if (!supabaseClient || !isInitialized) {
    throw new SupabaseServiceError(
      'Supabase client is not initialized. Call initializeSupabase() first.',
      SupabaseErrorCodes.NOT_INITIALIZED
    );
  }
  return supabaseClient;
}

/**
 * Gets the admin Supabase client instance
 * @returns The admin client or null if not configured
 * @throws SupabaseServiceError if client is not initialized
 */
export function getAdminSupabaseClient(): GenericSupabaseClient | null {
  if (!isInitialized) {
    throw new SupabaseServiceError(
      'Supabase client is not initialized. Call initializeSupabase() first.',
      SupabaseErrorCodes.NOT_INITIALIZED
    );
  }
  return adminSupabaseClient;
}

/**
 * Verifies connection to the Supabase instance
 * @returns Result with connection status
 */
export async function verifyConnection(): Promise<Result<ConnectionStatus>> {
  const startTime = Date.now();

  try {
    if (!supabaseClient || !isInitialized) {
      const error = new SupabaseServiceError(
        'Cannot verify connection: Supabase client is not initialized',
        SupabaseErrorCodes.NOT_INITIALIZED
      );
      return { success: false, error };
    }

    logger.debug('Verifying Supabase connection...');

    // Perform a simple query to verify connection
    // We use a health check approach by querying the auth API
    const { error: authError } = await supabaseClient.auth.getSession();

    const latencyMs = Date.now() - startTime;

    if (authError) {
      // Auth error doesn't necessarily mean connection failed
      // It could just mean no session exists, which is expected
      logger.debug('Auth session check completed (no active session)', { latencyMs });
    }

    // Try to access the database to fully verify connection
    // Using a simple query that should work even on empty databases
    const { error: dbError } = await supabaseClient.from('_health_check_').select('*').limit(0);

    // 42P01 is "relation does not exist" which is expected if table doesn't exist
    // This is fine - it means we successfully connected to the database
    const isConnectionError = dbError && dbError.code !== '42P01' && dbError.code !== 'PGRST116';

    if (isConnectionError) {
      const error = new SupabaseServiceError(
        `Database connection verification failed: ${dbError.message}`,
        SupabaseErrorCodes.CONNECTION_FAILED,
        dbError
      );
      lastConnectionStatus = {
        connected: false,
        timestamp: new Date(),
        latencyMs,
        error: dbError.message,
      };
      logger.error('Connection verification failed', error);
      return { success: false, error, data: lastConnectionStatus };
    }

    lastConnectionStatus = {
      connected: true,
      timestamp: new Date(),
      latencyMs,
    };

    logger.info('Supabase connection verified successfully', {
      latencyMs,
    });

    return { success: true, data: lastConnectionStatus };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const serviceError = new SupabaseServiceError(
      'Unexpected error during connection verification',
      SupabaseErrorCodes.CONNECTION_FAILED,
      error
    );

    lastConnectionStatus = {
      connected: false,
      timestamp: new Date(),
      latencyMs,
      error: error instanceof Error ? error.message : String(error),
    };

    logger.error('Unexpected error during connection verification', error);
    return { success: false, error: serviceError, data: lastConnectionStatus };
  }
}

/**
 * Gets the last known connection status
 */
export function getConnectionStatus(): ConnectionStatus | null {
  return lastConnectionStatus;
}

/**
 * Checks if the Supabase client is initialized
 */
export function isSupabaseInitialized(): boolean {
  return isInitialized;
}

/**
 * Resets the Supabase client (useful for testing)
 * WARNING: This will invalidate any existing client references
 */
export function resetSupabaseClient(): void {
  logger.warn('Resetting Supabase client');
  supabaseClient = null;
  adminSupabaseClient = null;
  isInitialized = false;
  lastConnectionStatus = null;
}

/**
 * Convenience function to initialize and verify Supabase connection
 * @returns Result with connection status
 */
export async function initializeAndVerifySupabase(): Promise<Result<ConnectionStatus>> {
  const initResult = initializeSupabase();

  if (!initResult.success) {
    return {
      success: false,
      error: initResult.error,
      data: {
        connected: false,
        timestamp: new Date(),
        error: initResult.error?.message,
      },
    };
  }

  return verifyConnection();
}

// Export types
export type { SupabaseClient, GenericSupabaseClient };
