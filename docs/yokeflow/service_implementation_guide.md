# OptiRoute Service Implementation Guide

This guide explains how to implement services in the OptiRoute application following established patterns.

## Service Architecture

Services are the core business logic layer. They:
- Encapsulate all database operations
- Handle data validation
- Return consistent `Result<T>` types
- Support pagination and filtering
- Implement soft delete patterns

## File Structure

Each entity has a corresponding service file:

```
src/services/
├── supabase.ts              # Database client
├── client.service.ts        # Client operations
├── service.service.ts       # Service type operations
├── booking.service.ts       # Booking operations
├── location.service.ts      # Location operations
├── vehicle.service.ts       # Vehicle operations
├── vehicle-location.service.ts  # Junction operations
├── route.service.ts         # Route operations
├── route-planning.service.ts    # Route optimization
├── googlemaps.service.ts    # Geocoding
└── google-routes.service.ts # Route API
```

## Complete Service Implementation Example

Here's a complete implementation pattern for the Client service:

```typescript
// src/services/client.service.ts
import { getSupabaseClient, getAdminSupabaseClient } from './supabase.js';
import type { Result, PaginationParams, PaginatedResponse } from '../types/index.js';
import { createContextLogger } from '../utils/logger.js';

// ============================================================================
// CONSTANTS
// ============================================================================
const CLIENTS_TABLE = 'clients';
const logger = createContextLogger('ClientService');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Client entity (camelCase for TypeScript)
 */
export interface Client {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  serviceAddressLine1?: string;
  serviceAddressLine2?: string;
  serviceCity?: string;
  serviceState?: string;
  servicePostalCode?: string;
  serviceCountry?: string;
  latitude?: number;
  longitude?: number;
  status: 'active' | 'inactive' | 'suspended' | 'archived';
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Database row (snake_case from PostgreSQL)
 */
export interface ClientRow {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  service_address_line1: string | null;
  service_address_line2: string | null;
  service_city: string | null;
  service_state: string | null;
  service_postal_code: string | null;
  service_country: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Input for creating a client
 */
export interface CreateClientInput {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  serviceAddressLine1?: string;
  serviceAddressLine2?: string;
  serviceCity?: string;
  serviceState?: string;
  servicePostalCode?: string;
  serviceCountry?: string;
  latitude?: number;
  longitude?: number;
  status?: Client['status'];
  notes?: string;
  tags?: string[];
}

/**
 * Input for updating a client (all fields optional)
 */
export type UpdateClientInput = Partial<CreateClientInput>;

/**
 * Filters for querying clients
 */
export interface ClientFilters {
  status?: string;
  city?: string;
  state?: string;
  searchTerm?: string;
  includeDeleted?: boolean;
}

// ============================================================================
// ROW CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert database row to Client entity
 */
function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    companyName: row.company_name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    mobilePhone: row.mobile_phone ?? undefined,
    addressLine1: row.address_line1 ?? undefined,
    addressLine2: row.address_line2 ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    postalCode: row.postal_code ?? undefined,
    country: row.country ?? undefined,
    serviceAddressLine1: row.service_address_line1 ?? undefined,
    serviceAddressLine2: row.service_address_line2 ?? undefined,
    serviceCity: row.service_city ?? undefined,
    serviceState: row.service_state ?? undefined,
    servicePostalCode: row.service_postal_code ?? undefined,
    serviceCountry: row.service_country ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    status: row.status as Client['status'],
    notes: row.notes ?? undefined,
    tags: row.tags ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

/**
 * Convert CreateClientInput to database row format
 */
function createInputToRow(input: CreateClientInput): Partial<ClientRow> {
  return {
    name: input.name,
    company_name: input.companyName ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    mobile_phone: input.mobilePhone ?? null,
    address_line1: input.addressLine1 ?? null,
    address_line2: input.addressLine2 ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    postal_code: input.postalCode ?? null,
    country: input.country ?? null,
    service_address_line1: input.serviceAddressLine1 ?? null,
    service_address_line2: input.serviceAddressLine2 ?? null,
    service_city: input.serviceCity ?? null,
    service_state: input.serviceState ?? null,
    service_postal_code: input.servicePostalCode ?? null,
    service_country: input.serviceCountry ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    status: input.status ?? 'active',
    notes: input.notes ?? null,
    tags: input.tags ?? null,
  };
}

/**
 * Convert UpdateClientInput to database row format
 * Only includes fields that are explicitly provided
 */
function updateInputToRow(input: UpdateClientInput): Partial<ClientRow> {
  const row: Partial<ClientRow> = {};

  if (input.name !== undefined) row.name = input.name;
  if (input.companyName !== undefined) row.company_name = input.companyName ?? null;
  if (input.email !== undefined) row.email = input.email ?? null;
  if (input.phone !== undefined) row.phone = input.phone ?? null;
  if (input.city !== undefined) row.city = input.city ?? null;
  if (input.state !== undefined) row.state = input.state ?? null;
  if (input.status !== undefined) row.status = input.status;
  // ... add all other fields

  return row;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate create input
 */
function validateCreateInput(input: CreateClientInput): Result<void> {
  if (!input.name || input.name.trim().length === 0) {
    return {
      success: false,
      error: new Error('Client name is required'),
    };
  }

  if (input.email && !isValidEmail(input.email)) {
    return {
      success: false,
      error: new Error('Invalid email format'),
    };
  }

  if (input.latitude !== undefined && (input.latitude < -90 || input.latitude > 90)) {
    return {
      success: false,
      error: new Error('Latitude must be between -90 and 90'),
    };
  }

  if (input.longitude !== undefined && (input.longitude < -180 || input.longitude > 180)) {
    return {
      success: false,
      error: new Error('Longitude must be between -180 and 180'),
    };
  }

  return { success: true };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get database connection (prefer admin client for bypassing RLS)
 */
function getConnection() {
  const admin = getAdminSupabaseClient();
  if (admin) return admin;
  return getSupabaseClient();
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new client
 */
export async function createClient(input: CreateClientInput): Promise<Result<Client>> {
  logger.info('Creating client', { name: input.name });

  // Validate input
  const validation = validateCreateInput(input);
  if (!validation.success) {
    return validation as Result<Client>;
  }

  try {
    const supabase = getConnection();
    const rowData = createInputToRow(input);

    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .insert(rowData)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create client', error);
      return {
        success: false,
        error: new Error(`Failed to create client: ${error.message}`),
      };
    }

    const client = rowToClient(data as ClientRow);
    logger.info('Client created', { id: client.id });

    return { success: true, data: client };
  } catch (error) {
    logger.error('Unexpected error creating client', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get all clients with filtering and pagination
 */
export async function getClients(
  filters?: ClientFilters,
  pagination?: PaginationParams
): Promise<Result<PaginatedResponse<Client>>> {
  logger.debug('Getting clients', { filters, pagination });

  try {
    const supabase = getConnection();
    let query = supabase.from(CLIENTS_TABLE).select('*', { count: 'exact' });

    // Apply soft delete filter (default: exclude deleted)
    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    if (filters?.state) {
      query = query.eq('state', filters.state);
    }

    if (filters?.searchTerm) {
      const term = `%${filters.searchTerm}%`;
      query = query.or(`name.ilike.${term},company_name.ilike.${term},email.ilike.${term}`);
    }

    // Apply pagination
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Apply sorting
    const sortBy = pagination?.sortBy ?? 'created_at';
    const sortOrder = pagination?.sortOrder ?? 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to get clients', error);
      return {
        success: false,
        error: new Error(`Failed to get clients: ${error.message}`),
      };
    }

    const clients = (data as ClientRow[]).map(rowToClient);
    const total = count ?? 0;

    return {
      success: true,
      data: {
        data: clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    logger.error('Unexpected error getting clients', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get a single client by ID
 */
export async function getClientById(id: string): Promise<Result<Client>> {
  logger.debug('Getting client by ID', { id });

  try {
    const supabase = getConnection();

    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new Error(`Client not found: ${id}`),
        };
      }
      logger.error('Failed to get client', error);
      return {
        success: false,
        error: new Error(`Failed to get client: ${error.message}`),
      };
    }

    return { success: true, data: rowToClient(data as ClientRow) };
  } catch (error) {
    logger.error('Unexpected error getting client', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Update an existing client
 */
export async function updateClient(
  id: string,
  input: UpdateClientInput
): Promise<Result<Client>> {
  logger.info('Updating client', { id });

  try {
    const supabase = getConnection();
    const rowData = updateInputToRow(input);

    // Ensure we're only updating non-deleted records
    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .update(rowData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: new Error(`Client not found: ${id}`),
        };
      }
      logger.error('Failed to update client', error);
      return {
        success: false,
        error: new Error(`Failed to update client: ${error.message}`),
      };
    }

    const client = rowToClient(data as ClientRow);
    logger.info('Client updated', { id: client.id });

    return { success: true, data: client };
  } catch (error) {
    logger.error('Unexpected error updating client', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Soft delete a client
 */
export async function deleteClient(id: string): Promise<Result<void>> {
  logger.info('Deleting client', { id });

  try {
    const supabase = getConnection();

    const { error, count } = await supabase
      .from(CLIENTS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      logger.error('Failed to delete client', error);
      return {
        success: false,
        error: new Error(`Failed to delete client: ${error.message}`),
      };
    }

    if (count === 0) {
      return {
        success: false,
        error: new Error(`Client not found: ${id}`),
      };
    }

    logger.info('Client deleted', { id });
    return { success: true };
  } catch (error) {
    logger.error('Unexpected error deleting client', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Hard delete a client (permanent, use with caution)
 */
export async function hardDeleteClient(id: string): Promise<Result<void>> {
  logger.warn('Hard deleting client', { id });

  try {
    const supabase = getConnection();

    const { error } = await supabase
      .from(CLIENTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to hard delete client', error);
      return {
        success: false,
        error: new Error(`Failed to hard delete client: ${error.message}`),
      };
    }

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error hard deleting client', error);
    return { success: false, error: error as Error };
  }
}

// ============================================================================
// ADDITIONAL QUERY OPERATIONS
// ============================================================================

/**
 * Check if a client exists by ID
 */
export async function clientExists(id: string): Promise<Result<boolean>> {
  try {
    const supabase = getConnection();

    const { count, error } = await supabase
      .from(CLIENTS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      return {
        success: false,
        error: new Error(`Failed to check client existence: ${error.message}`),
      };
    }

    return { success: true, data: (count ?? 0) > 0 };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Get clients by IDs (batch fetch)
 */
export async function getClientsByIds(ids: string[]): Promise<Result<Client[]>> {
  if (ids.length === 0) {
    return { success: true, data: [] };
  }

  try {
    const supabase = getConnection();

    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .select('*')
      .in('id', ids)
      .is('deleted_at', null);

    if (error) {
      return {
        success: false,
        error: new Error(`Failed to get clients: ${error.message}`),
      };
    }

    return {
      success: true,
      data: (data as ClientRow[]).map(rowToClient),
    };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## Key Patterns Summary

### 1. Result Type

Always return `Result<T>` for consistent error handling:

```typescript
interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}
```

### 2. Row Conversion

Maintain separate functions for converting between database and TypeScript formats:

```typescript
function rowToEntity(row: EntityRow): Entity { ... }
function createInputToRow(input: CreateInput): Partial<EntityRow> { ... }
function updateInputToRow(input: UpdateInput): Partial<EntityRow> { ... }
```

### 3. Soft Delete

All delete operations set `deleted_at` rather than removing records:

```typescript
.update({ deleted_at: new Date().toISOString() })
.eq('id', id)
.is('deleted_at', null)
```

### 4. Query Filtering

Always filter by `deleted_at IS NULL` unless explicitly including deleted:

```typescript
if (!filters?.includeDeleted) {
  query = query.is('deleted_at', null);
}
```

### 5. Pagination

Support consistent pagination across all list operations:

```typescript
const page = pagination?.page ?? 1;
const limit = pagination?.limit ?? 20;
const offset = (page - 1) * limit;
query = query.range(offset, offset + limit - 1);
```

### 6. Error Handling

Wrap operations in try-catch and log errors:

```typescript
try {
  // operation
} catch (error) {
  logger.error('Descriptive message', error);
  return { success: false, error: error as Error };
}
```

### 7. Logging

Use the context logger for consistent log prefixes:

```typescript
const logger = createContextLogger('ServiceName');
logger.info('Operation description', { relevant: 'data' });
```
