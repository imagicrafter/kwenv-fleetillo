# Fleetillo Supabase Client Guide

This guide explains how to initialize and use the Supabase client in the Fleetillo application.

## Overview

Fleetillo uses Supabase as its backend, providing:
- PostgreSQL database with a custom `fleetillo` schema
- Row Level Security (RLS) support
- Real-time subscriptions (optional)

## Client Types

The application maintains two Supabase clients:

1. **Regular Client** - Uses `anon` key, respects RLS policies
2. **Admin Client** - Uses `service_role` key, bypasses RLS

## Implementation

### Complete Supabase Client Module

```typescript
// src/services/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import type { Result } from '../types/index.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type GenericSupabaseClient = SupabaseClient<any, any, any>;

export interface SupabaseClientOptions {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  schema: string;
}

// ============================================================================
// MODULE STATE
// ============================================================================

let supabaseClient: GenericSupabaseClient | null = null;
let adminSupabaseClient: GenericSupabaseClient | null = null;
let isInitialized = false;
let currentOptions: SupabaseClientOptions | null = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the Supabase clients.
 * Must be called before using any database operations.
 *
 * @param optionsOverride - Optional overrides for configuration
 * @returns Result indicating success or failure
 *
 * @example
 * // Using environment configuration
 * initializeSupabase();
 *
 * @example
 * // With custom options (useful for testing)
 * initializeSupabase({
 *   url: 'https://test.supabase.co',
 *   anonKey: 'test-key',
 *   schema: 'fleetillo'
 * });
 */
export function initializeSupabase(
  optionsOverride?: Partial<SupabaseClientOptions>
): Result<void> {
  // Build options from config and overrides
  const options: SupabaseClientOptions = {
    url: optionsOverride?.url ?? config.supabase.url,
    anonKey: optionsOverride?.anonKey ?? config.supabase.anonKey,
    serviceRoleKey: optionsOverride?.serviceRoleKey ?? config.supabase.serviceRoleKey,
    schema: optionsOverride?.schema ?? config.supabase.schema,
  };

  // Validate required options
  if (!options.url || !options.anonKey) {
    return {
      success: false,
      error: new Error('Supabase URL and anon key are required'),
    };
  }

  try {
    // Create the main client (uses anon key, respects RLS)
    supabaseClient = createClient(options.url, options.anonKey, {
      db: {
        schema: options.schema,  // Use custom schema
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

    // Create admin client if service role key is available
    // This client bypasses RLS and should be used carefully
    if (options.serviceRoleKey) {
      adminSupabaseClient = createClient(options.url, options.serviceRoleKey, {
        db: {
          schema: options.schema,
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

    isInitialized = true;
    currentOptions = options;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// ============================================================================
// CLIENT ACCESSORS
// ============================================================================

/**
 * Get the regular Supabase client.
 * This client respects Row Level Security (RLS) policies.
 *
 * @throws Error if client is not initialized
 * @returns The Supabase client instance
 *
 * @example
 * const supabase = getSupabaseClient();
 * const { data, error } = await supabase
 *   .from('clients')
 *   .select('*');
 */
export function getSupabaseClient(): GenericSupabaseClient {
  if (!supabaseClient || !isInitialized) {
    throw new Error(
      'Supabase client not initialized. Call initializeSupabase() first.'
    );
  }
  return supabaseClient;
}

/**
 * Get the admin Supabase client.
 * This client bypasses RLS and has full database access.
 * Use with caution - only for server-side operations.
 *
 * @returns The admin client if configured, null otherwise
 *
 * @example
 * const admin = getAdminSupabaseClient();
 * if (admin) {
 *   // Perform admin operations
 * }
 */
export function getAdminSupabaseClient(): GenericSupabaseClient | null {
  if (!isInitialized) {
    throw new Error(
      'Supabase client not initialized. Call initializeSupabase() first.'
    );
  }
  return adminSupabaseClient;
}

/**
 * Check if the Supabase client is initialized.
 */
export function isSupabaseInitialized(): boolean {
  return isInitialized;
}

/**
 * Get the current schema name.
 */
export function getCurrentSchema(): string {
  if (!currentOptions) {
    return config.supabase.schema;
  }
  return currentOptions.schema;
}

// ============================================================================
// CONNECTION TESTING
// ============================================================================

/**
 * Test the database connection.
 *
 * @returns Result with connection status
 *
 * @example
 * const result = await testConnection();
 * if (result.success) {
 *   console.log('Connected to database');
 * }
 */
export async function testConnection(): Promise<Result<{ connected: boolean }>> {
  try {
    const supabase = getSupabaseClient();

    // Simple query to test connection
    const { error } = await supabase
      .from('clients')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows" which is fine
      return {
        success: false,
        error: new Error(`Database connection failed: ${error.message}`),
      };
    }

    return { success: true, data: { connected: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Reset the Supabase clients.
 * Useful for testing or re-initialization.
 */
export function resetSupabaseClients(): void {
  supabaseClient = null;
  adminSupabaseClient = null;
  isInitialized = false;
  currentOptions = null;
}
```

## Usage in Services

### Getting the Appropriate Client

Services should prefer the admin client when available:

```typescript
// Pattern used in all services
function getConnection() {
  const admin = getAdminSupabaseClient();
  if (admin) return admin;
  return getSupabaseClient();
}

// Usage
export async function getClients(): Promise<Result<Client[]>> {
  const supabase = getConnection();

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .is('deleted_at', null);

  // ...
}
```

### Query Examples

#### Select with Pagination

```typescript
const supabase = getConnection();

const { data, error, count } = await supabase
  .from('clients')
  .select('*', { count: 'exact' })
  .is('deleted_at', null)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .range(0, 19);  // First 20 records
```

#### Insert

```typescript
const { data, error } = await supabase
  .from('clients')
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active',
  })
  .select()
  .single();
```

#### Update

```typescript
const { data, error } = await supabase
  .from('clients')
  .update({ status: 'inactive' })
  .eq('id', clientId)
  .is('deleted_at', null)
  .select()
  .single();
```

#### Soft Delete

```typescript
const { error } = await supabase
  .from('clients')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', clientId)
  .is('deleted_at', null);
```

#### Search/Filter

```typescript
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .is('deleted_at', null)
  .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
```

#### Join/Relations

```typescript
const { data, error } = await supabase
  .from('bookings')
  .select(`
    *,
    client:clients(*),
    service:services(*)
  `)
  .eq('scheduled_date', date)
  .is('deleted_at', null);
```

## Schema Configuration

The `fleetillo` schema is specified in the client options:

```typescript
supabaseClient = createClient(url, key, {
  db: {
    schema: 'fleetillo',  // All queries use this schema
  },
});
```

This means all `.from('tablename')` calls automatically use `fleetillo.tablename`.

## Error Handling

Always handle Supabase errors:

```typescript
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .single();

if (error) {
  // Common error codes:
  // PGRST116 - No rows returned (single() with no match)
  // 23505 - Unique constraint violation
  // 23503 - Foreign key constraint violation

  if (error.code === 'PGRST116') {
    return { success: false, error: new Error('Not found') };
  }

  return {
    success: false,
    error: new Error(`Database error: ${error.message}`),
  };
}
```

## Initialization in Application

### Express Server

```typescript
// src/app.ts
import { initializeSupabase } from './services/supabase.js';

// Initialize before setting up routes
const result = initializeSupabase();
if (!result.success) {
  console.error('Failed to initialize Supabase:', result.error);
  process.exit(1);
}

// Continue with app setup...
```

### Testing

```typescript
// In test setup
import { initializeSupabase, resetSupabaseClients } from '../services/supabase';

beforeAll(() => {
  initializeSupabase({
    url: process.env.TEST_SUPABASE_URL,
    anonKey: process.env.TEST_SUPABASE_KEY,
    schema: 'fleetillo_test',
  });
});

afterAll(() => {
  resetSupabaseClients();
});
```

## Best Practices

1. **Always use `getConnection()`** in services to automatically use admin client when available
2. **Always filter by `deleted_at IS NULL`** unless explicitly including deleted records
3. **Use `.select()` after mutations** to get the updated/created record
4. **Handle errors explicitly** - don't let Supabase errors propagate unhandled
5. **Use transactions** for multi-step operations (via RPC functions)
6. **Log database errors** for debugging
