/**
 * Supabase Client for Dispatch Service
 *
 * Provides a configured Supabase client for database operations.
 * Uses the same Supabase instance as the main OptiRoute application.
 *
 * @module db/supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

/**
 * Generic Supabase client type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericSupabaseClient = SupabaseClient<any, any, any>;

/**
 * Singleton instance of the Supabase client
 */
let supabaseClient: GenericSupabaseClient | null = null;

/**
 * Configuration for Supabase client
 */
interface SupabaseConfig {
  url: string;
  anonKey: string;
  schema: string;
}

/**
 * Gets the Supabase configuration from environment variables
 */
function getConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  const schema = process.env.SUPABASE_SCHEMA || 'optiroute';

  if (!url) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY or SUPABASE_KEY environment variable is required');
  }

  return { url, anonKey, schema };
}

/**
 * Initializes and returns the Supabase client
 * Creates a singleton instance on first call
 */
export function getSupabaseClient(): GenericSupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const config = getConfig();

  logger.debug('Creating Supabase client', {
    url: config.url.replace(/\/\/(.+?)@/, '//*****@'),
    schema: config.schema,
  });

  supabaseClient = createClient(config.url, config.anonKey, {
    db: {
      schema: config.schema,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'dispatch-service',
      },
    },
  });

  logger.info('Supabase client initialized');

  return supabaseClient;
}

/**
 * Resets the Supabase client (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseClient = null;
  logger.debug('Supabase client reset');
}

/**
 * Verifies database connectivity
 * @returns Promise resolving to true if connected, false otherwise
 */
export async function verifyConnection(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
  const startTime = Date.now();

  try {
    const client = getSupabaseClient();

    // Try a simple query to verify connection
    const { error } = await client.from('dispatches').select('id').limit(0);

    const latencyMs = Date.now() - startTime;

    // PGRST116 means no rows found, which is fine
    // 42P01 means table doesn't exist, which might happen before migrations
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      logger.warn('Database connection check failed', { error: error.message });
      return { connected: false, latencyMs, error: error.message };
    }

    return { connected: true, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Database connection verification failed', {}, err instanceof Error ? err : undefined);
    return { connected: false, latencyMs, error: errorMessage };
  }
}

export type { GenericSupabaseClient };
