# Plan: Issue #14 - Rename `clients` to `customers` for terminology consistency

## Summary

Align database, code, and API terminology by renaming `clients` to `customers` throughout the codebase. This is a prerequisite for the data import modernization work and ensures consistent terminology across the system.

## Files to Modify

### Database Migration

**[NEW] `supabase/migrations/2026XXXX_rename_clients_to_customers.sql`**
- Rename `routeiq.clients` table to `routeiq.customers`
- Rename all related indexes (`idx_clients_*` → `idx_customers_*`)  
- Rename FK columns: `locations.client_id` → `locations.customer_id`, `bookings.client_id` → `bookings.customer_id`
- Update FK constraint names

### TypeScript Types

**[RENAME] `src/types/client.ts` → `src/types/customer.ts`**
- Rename type `Client` → `Customer`
- Rename type `ClientRow` → `CustomerRow`  
- Rename type `CreateClientInput` → `CreateCustomerInput`
- Rename type `UpdateClientInput` → `UpdateCustomerInput`
- Rename type `ClientFilters` → `CustomerFilters`
- Rename type `ClientStatus` → `CustomerStatus`
- Update function names: `rowToClient` → `rowToCustomer`, `clientInputToRow` → `customerInputToRow`

**[MODIFY] `src/types/index.ts`**
- Update export from `client` to `customer`

### Service Layer

**[RENAME] `src/services/client.service.ts` → `src/services/customer.service.ts`**
- Update `CLIENTS_TABLE` constant to `CUSTOMERS_TABLE = 'customers'`
- Rename class/error codes: `ClientServiceError` → `CustomerServiceError`, `ClientErrorCodes` → `CustomerErrorCodes`
- Rename functions: `createClient` → `createCustomer`, `getClientById` → `getCustomerById`, etc.
- Update all internal references

**[MODIFY] `src/services/index.ts`**
- Update export from `client.service` to `customer.service`

**[MODIFY] `src/services/location.service.ts`**
- Update `clientId` references to `customerId`
- Update `getClientLocations` → `getCustomerLocations`

### Controller Layer

**[RENAME] `src/controllers/client.controller.ts` → `src/controllers/customer.controller.ts`**
- Rename all functions and references
- Update imports

**[MODIFY] `src/controllers/index.ts`**
- Update export

### Routes Layer

**[RENAME] `src/routes/client.routes.ts` → `src/routes/customer.routes.ts`**  
- Change route path from `/api/clients` to `/api/customers`
- Update controller imports

**[MODIFY] `src/routes/index.ts`**
- Update import and mount path

### UI Files

**[MODIFY] `shared/public/customers.html`**
- Already uses "Customers" labels, verify API endpoint update to `/api/customers`

**[MODIFY] `shared/public/locations.html`**  
- Update `client-id` references to `customer-id` in form
- Update API calls from `/api/clients` to `/api/customers`

## Implementation Tasks

- [ ] 0. Create feature branch `issue/14-clients-to-customers`
- [ ] 1. Create database migration script
- [ ] 2. Rename and update TypeScript types
- [ ] 3. Rename and update service layer
- [ ] 4. Rename and update controller
- [ ] 5. Rename and update routes  
- [ ] 6. Update all imports across codebase
- [ ] 7. Update UI JavaScript API calls
- [ ] 8. Run `npm run build` - verify no TypeScript errors
- [ ] 9. Run database migration against Supabase
- [ ] 10. Test API endpoints work with new paths
- [ ] 11. Verify UI functionality in browser

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
- `DELETE /api/customers/:id` - should delete customer

### UI Testing
1. Navigate to Customers page - verify list loads
2. Create new customer - verify saves correctly
3. Edit customer - verify updates
4. Navigate to Locations page - verify customer dropdown works

## Estimated Effort

2-3 hours (mostly mechanical find-and-replace with careful testing)

## Dependencies

**Blocker**: This issue must complete before any data import work (#15-#19) begins.
