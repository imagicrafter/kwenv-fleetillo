---
description: 
---

# Context Priming Command

Read these files to understand the OptiRoute system:

## Essential Context

1. **README.md** - Project overview (START HERE!)
   - What this project is and why it exists
   - Setup and installation
   - Available scripts and commands

2. **dispatch-service/API.md - Dispatch service API endpoints

## After Reading

You should understand:

### Core System
- **Purpose**: Route planning and management system for service-based businesses
- **Architecture**: Multi-component system
  - Express.js REST API (TypeScript)
  - Supabase (PostgreSQL) for database
  - Google Maps API for geocoding
  - Google Routes API for route optimization
  - Web launcher for browser-based UI
  - Dispatch service for driver management (new)

### Data Model
- **Tables**: clients, services, locations, vehicles, bookings, routes, drivers
- **Patterns**: Soft delete via `deleted_at`, snake_case DB / camelCase TypeScript
- **Schema**: `optiroute` schema in Supabase

### Key Components
- **src/services/**: Business logic services
  - `client.service.ts` - Customer CRUD operations
  - `service.service.ts` - Service type definitions
  - `booking.service.ts` - Appointment scheduling
  - `vehicle.service.ts` - Fleet management
  - `driver.service.ts` - Driver management
  - `route.service.ts` - Route CRUD operations
  - `route-planning.service.ts` - Route optimization logic
  - `googlemaps.service.ts` - Geocoding integration
  - `google-routes.service.ts` - Routes API integration
- **src/types/**: TypeScript type definitions with row converters
- **src/controllers/**: Express route handlers
- **src/routes/**: API route definitions
- **web-launcher/**: Browser-based UI with Express server
- **dispatch-service/**: Standalone dispatch management service
- **supabase/migrations/**: Database migration files

### Design Patterns
- `Result<T>` pattern for consistent error handling
- Row conversion: `rowToEntity()` / `entityInputToRow()`
- Soft delete: filter by `deleted_at IS NULL`
- Service layer encapsulates all business logic

### How to Run
- Build: `npm run build`
- Web App: `cd web-launcher && npm start` (port 8080)
- Backend API: `npm run dev` (port 3000)
- Tests: `npm test` (unit), `npm run test:e2e` (Playwright)
- DB Check: `npm run db:check`

### How to Extend
- Add services: `src/services/` + `src/types/` + update `src/services/index.ts`
- Add API routes: `src/routes/` + `src/controllers/`
- Add migrations: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- Modify UI: `web-launcher/public/` (HTML/CSS/JS)

### Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `SUPABASE_SCHEMA` - Schema name (optiroute)
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
