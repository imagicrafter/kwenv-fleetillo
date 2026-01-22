# Plan: Issue #14 - Rename `clients` to `customers` + New `fleetillo` Schema

## Summary

Create a fresh `fleetillo` schema with correct terminology (`customers` instead of `clients`) from the start. Since the application is still in development with no production deployments, this approach consolidates all migrations into a single clean schema creation script, eliminating migration debt.

## Approach

**Strategy: New Schema (not in-place rename)**

Instead of complex ALTER TABLE renames and migration rollbacks, we:
1. Create a new consolidated migration that builds `fleetillo` schema from scratch
2. Use `customers` table (not `clients`) with `customer_id` foreign keys
3. Update all codebase references from `client` → `customer`
4. Update `SUPABASE_SCHEMA` from `routeiq` → `fleetillo`
5. Old migrations remain for historical reference but are superseded

**Benefits:**
- Zero risk to existing data (old schema untouched until verified)
- Clean rollback: just change `SUPABASE_SCHEMA` back to `routeiq`
- No complex migration chains or down-migrations needed
- Fresh start with correct naming conventions

---

## Files Created/Modified

### Database Migration

**[NEW] `supabase/migrations/20260120000000_create_fleetillo_schema.sql`**
- Creates `fleetillo` schema from scratch
- Includes all tables with correct naming:
  - `fleetillo.customers` (was `clients`)
  - `fleetillo.services`
  - `fleetillo.drivers`
  - `fleetillo.locations` (with `customer_id` FK)
  - `fleetillo.vehicles`
  - `fleetillo.vehicle_locations`
  - `fleetillo.routes`
  - `fleetillo.bookings` (with `customer_id` FK)
  - `fleetillo.dispatches`
  - `fleetillo.channel_dispatches`
  - `fleetillo.dispatch_jobs`
  - `fleetillo.settings`
- All indexes, triggers, RLS policies, and comments included

### TypeScript Types

**[RENAME] `src/types/client.ts` → `src/types/customer.ts`**
- `Client` → `Customer`
- `ClientRow` → `CustomerRow`
- `CreateClientInput` → `CreateCustomerInput`
- `UpdateClientInput` → `UpdateCustomerInput`
- `ClientFilters` → `CustomerFilters`
- `ClientStatus` → `CustomerStatus`
- `rowToClient` → `rowToCustomer`
- `clientInputToRow` → `customerInputToRow`

**[MODIFY] `src/types/index.ts`**
- Update export from `client` to `customer`

**[MODIFY] `src/types/location.ts`**
- `clientId` → `customerId` in Location type
- `client_id` → `customer_id` in LocationRow type

**[MODIFY] `src/types/booking.ts`**
- `clientId` → `customerId` in Booking type
- `client_id` → `customer_id` in BookingRow type

### Service Layer

**[RENAME] `src/services/client.service.ts` → `src/services/customer.service.ts`**
- `CLIENTS_TABLE` → `CUSTOMERS_TABLE = 'customers'`
- Rename all functions: `createClient` → `createCustomer`, etc.
- Update error codes

**[MODIFY] `src/services/index.ts`**
- Update export

**[MODIFY] `src/services/location.service.ts`**
- `clientId` → `customerId` in function parameters and queries
- `getClientLocations` → `getCustomerLocations`

**[MODIFY] `src/services/booking.service.ts`**
- `clientId` → `customerId` in function parameters and queries

### Controller Layer

**[RENAME] `src/controllers/client.controller.ts` → `src/controllers/customer.controller.ts`**
- Rename all functions and references

**[MODIFY] `src/controllers/index.ts`**
- Update export

### Routes Layer

**[RENAME] `src/routes/client.routes.ts` → `src/routes/customer.routes.ts`**
- Route path: `/api/clients` → `/api/customers`

**[MODIFY] `src/routes/index.ts`**
- Update import and mount path

### Configuration

**[MODIFY] `.env.example`**
- `SUPABASE_SCHEMA=routeiq` → `SUPABASE_SCHEMA=fleetillo`

### UI Files

**[MODIFY] `shared/public/customers.html`**
- Verify API endpoint calls use `/api/customers`

**[MODIFY] `shared/public/locations.html`**
- `client-id` → `customer-id` in form fields
- API calls: `/api/clients` → `/api/customers`

**[MODIFY] `shared/public/bookings.html`**
- `client_id` → `customer_id` in form fields
- API calls: `/api/clients` → `/api/customers`

---

## Implementation Tasks

- [ ] 0. Create feature branch `issue/14-fleetillo-schema`
- [ ] 1. Apply migration to create `fleetillo` schema in Supabase
- [ ] 2. Expose `fleetillo` schema in Supabase Dashboard (Settings > API > Exposed Schemas)
- [ ] 3. Rename and update TypeScript types (`client.ts` → `customer.ts`)
- [ ] 4. Update Location and Booking types (`clientId` → `customerId`)
- [ ] 5. Rename and update service layer (`client.service.ts` → `customer.service.ts`)
- [ ] 6. Update location.service.ts and booking.service.ts
- [ ] 7. Rename and update controller (`client.controller.ts` → `customer.controller.ts`)
- [ ] 8. Rename and update routes (`client.routes.ts` → `customer.routes.ts`)
- [ ] 9. Update all imports across codebase
- [ ] 10. Update `.env.example` with `SUPABASE_SCHEMA=fleetillo`
- [ ] 11. Update UI JavaScript API calls and form fields
- [ ] 12. Update documentation (`optiroute_schema.sql`, etc.)
- [ ] 13. Run `npm run build` - verify no TypeScript errors
- [ ] 14. Update local `.env` to use `fleetillo` schema
- [ ] 15. Test all API endpoints with new paths
- [ ] 16. Verify UI functionality in browser

---

## Risk Management

### This Approach is Low Risk Because:

1. **No production deployments** - Application is still in development
2. **Old schema untouched** - `routeiq` schema remains as-is until we're confident
3. **Instant rollback** - Just change `SUPABASE_SCHEMA` back to `routeiq` and revert code
4. **No data migration needed** - Development data can be re-seeded if needed
5. **Single atomic migration** - No chain of dependent migrations to manage

### Rollback Procedure (if needed):

```bash
# 1. Revert code changes
git checkout main

# 2. Update .env to use old schema
# SUPABASE_SCHEMA=routeiq

# 3. Restart application
npm run build && npm start
```

### After Verification:

Once confident the new schema works correctly:
1. Old `routeiq` schema can be dropped via Supabase SQL editor
2. Old migrations can be archived or removed

---

## Verification

### Build Verification
```bash
npm run build
```

### API Testing
- `GET /api/customers` - should return customer list
- `POST /api/customers` - should create customer
- `GET /api/customers/:id` - should return customer
- `PUT /api/customers/:id` - should update customer
- `DELETE /api/customers/:id` - should soft-delete customer
- `GET /api/locations?customerId=X` - should filter by customer

### UI Testing
1. Navigate to Customers page - verify list loads
2. Create new customer - verify saves correctly
3. Edit customer - verify updates
4. Navigate to Locations page - verify customer dropdown works
5. Navigate to Bookings page - verify customer selection works

---

## Key Terminology Changes

| Old | New |
|-----|-----|
| `routeiq` schema | `fleetillo` schema |
| `clients` table | `customers` table |
| `client_id` column | `customer_id` column |
| `/api/clients` endpoint | `/api/customers` endpoint |
| `Client` type | `Customer` type |
| `clientId` property | `customerId` property |

---

## Dependencies

**Blocker**: This issue must complete before any data import work (#15-#19) begins.

---

## Estimated Effort

2-3 hours (mechanical find-and-replace with testing)
