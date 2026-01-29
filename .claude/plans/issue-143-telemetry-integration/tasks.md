# Tasks: Issue #143 - Telemetry Integration

## Overview

Implementation of a provider-agnostic telemetry integration framework. The work is organized into 7 phases with checkpoints: Foundation (DB + types), Core Framework (provider registry + sync engine), Samsara Provider, Analytics Engine, API Layer, UI Integration, and Testing. The telemetry service follows the dispatch-service pattern (embedded/standalone).

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/143-telemetry-integration` from `main`

---

### Phase 1: Foundation — Database & Types

- [ ] 1.1 Create database migration
  - File: `supabase/migrations/YYYYMMDDHHMMSS_add_telemetry_support.sql`
  - Add `metadata JSONB DEFAULT '{}'::jsonb` to `fleetillo.drivers` with GIN index
  - Add `telemetry_data JSONB DEFAULT '{}'::jsonb` to `fleetillo.routes` with GIN index
  - Add `telemetry_synced_at TIMESTAMPTZ` to `fleetillo.routes` with partial index
  - Verify `fleetillo.vehicles.metadata` exists (from migration 20260127000100)
  - All statements use `IF NOT EXISTS` for idempotency
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [ ] 1.2 Create telemetry type definitions
  - File: `telemetry-service/src/types/telemetry.ts`
  - Define: `TelemetryProviderName`, `TelemetryMapping`, `RouteTelemetryData`, `ActualRouteMetrics`, `GpsWaypoint`, `DriverBehaviorData`, `StopExecution`, `RouteAnalytics`, `AggregateSummary`, `DriverPerformanceMetrics`
  - Follow camelCase conventions for TypeScript interfaces
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 6.2_

- [ ] 1.3 Update existing entity types
  - Update `src/types/route.ts`: Add `telemetryData?: RouteTelemetryData` and `telemetrySyncedAt?: Date` to `Route` interface; add `telemetry_data` and `telemetry_synced_at` to `RouteRow`; update `rowToRoute()` and `routeInputToRow()` converters
  - Update `src/types/driver.ts`: Add `metadata?: Record<string, unknown>` to `Driver` interface; add `metadata` to `DriverRow`; update `rowToDriver()` and `driverInputToRow()` converters
  - Verify `src/types/vehicle.ts` already has `metadata` field
  - _Requirements: 2.3, 3.3, 11.1, 11.2_

- [ ] 1.4 Add telemetry settings types
  - File: `src/types/settings.ts` — add `TelemetrySettings`, `SamsaraProviderConfig` interfaces
  - Add settings key constants: `TELEMETRY_SETTINGS_KEY`
  - _Requirements: 1.6, 1.7_

- [ ] 1.5 Scaffold telemetry-service directory
  - Create directory structure:
    ```
    telemetry-service/
    ├── src/
    │   ├── api/
    │   ├── core/
    │   ├── providers/samsara/
    │   ├── db/
    │   ├── types/
    │   ├── utils/
    │   ├── app.ts
    │   └── index.ts
    ├── package.json
    ├── tsconfig.json
    └── .env.example
    ```
  - Configure `package.json` with dependencies (express, cors, helmet)
  - Configure `tsconfig.json` extending root config
  - _Requirements: 10.1, 10.10_

- [ ] 2. **Checkpoint — Foundation Complete**
  - Migration runs without error on test database
  - TypeScript compiles with `npm run build`
  - Route and Driver types include new fields
  - Telemetry service directory scaffolded

---

### Phase 2: Core Framework

- [ ] 3.1 Implement abstract TelemetryProvider base class
  - File: `telemetry-service/src/core/telemetry-provider.ts`
  - Define abstract class with: `name`, `healthCheck()`, `syncVehicles()`, `syncDrivers()`, `getVehicleLocation()`, `pushRoute()`, `pullRouteTelemetry()`
  - All methods return `Result<T>` — never throw
  - _Requirements: 1.2, 2.7, 4.1, 5.1_

- [ ] 3.2 Implement Provider Registry
  - File: `telemetry-service/src/core/provider-registry.ts`
  - Methods: `register()`, `get()`, `getAll()`, `has()`
  - Immutable internal Map — register creates new Map
  - _Requirements: 1.6, 1.7_

- [ ] 3.3 Implement Sync Engine
  - File: `telemetry-service/src/core/sync-engine.ts`
  - Methods: `pushRoute()`, `pullRouteTelemetry()`, `syncProviderVehicles()`, `syncProviderDrivers()`, `retryFailedSyncs()`
  - Uses Provider Registry to resolve provider by name
  - Push: Reads vehicle metadata → resolves provider → pushes route → stores external ID
  - Pull: Reads route telemetry_data → resolves provider → pulls data → stores + computes analytics
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.6, 5.7, 5.9_

- [ ] 3.4 Implement retry utility
  - File: `telemetry-service/src/utils/retry.ts`
  - Exponential backoff with configurable max attempts (default 3)
  - Returns `Result<T>` with last error on exhaustion
  - _Requirements: 5.6_

- [ ] 3.5 Implement Telemetry Repository (DB layer)
  - File: `telemetry-service/src/db/telemetry-repository.ts`
  - Methods: `getRouteTelemetry()`, `updateRouteTelemetry()`, `getVehicleTelemetryConfig()`, `updateVehicleTelemetryConfig()`, `getDriverTelemetryConfig()`, `updateDriverTelemetryConfig()`
  - Uses `getAdminSupabaseClient()` from main app
  - All queries filter `deleted_at IS NULL`
  - _Requirements: 2.3, 3.3, 4.3, 5.7_

- [ ] 3.6 Write unit tests for core framework
  - Test Provider Registry: register, get, getAll, has
  - Test Sync Engine: push flow, pull flow, retry on failure (mock providers)
  - Test retry utility: backoff behavior, max attempts
  - _Requirements: Testing strategy_

- [ ] 4. **Checkpoint — Core Framework Complete**
  - Provider Registry works with mock providers
  - Sync Engine orchestrates push/pull correctly
  - Retry utility handles failures with backoff
  - All unit tests pass

---

### Phase 3: Samsara Provider

- [ ] 5.1 Implement Samsara API Client
  - File: `telemetry-service/src/providers/samsara/samsara-api-client.ts`
  - HTTP client using `fetch` with auth header (`Authorization: Bearer ${token}`)
  - Methods: `getVehicles()`, `getDrivers()`, `createRoute()`, `getRouteUpdates()`, `getVehicleLocations()`
  - API base URL from env: `SAMSARA_API_URL` (default: `https://api.samsara.com`)
  - Token from env: `SAMSARA_API_TOKEN`
  - All methods return `Result<T>`
  - _Requirements: 1.2, 1.3_

- [ ] 5.2 Implement Samsara types
  - File: `telemetry-service/src/providers/samsara/samsara-types.ts`
  - Define Samsara API response types: `SamsaraVehicle`, `SamsaraDriver`, `SamsaraRoute`, `SamsaraRouteUpdate`, `SamsaraLocation`
  - _Requirements: 4.2_

- [ ] 5.3 Implement SamsaraProvider
  - File: `telemetry-service/src/providers/samsara/samsara-provider.ts`
  - Extends `TelemetryProvider`
  - Implements all abstract methods using `SamsaraApiClient`
  - Data transformation: Samsara formats → Fleetillo types (immutable transforms)
  - Vehicle matching: By VIN or license plate
  - _Requirements: 2.4, 3.4, 4.2, 5.2, 5.3, 5.4, 5.5_

- [ ] 5.4 Write unit tests for Samsara Provider
  - Mock HTTP responses for all Samsara API calls
  - Test data transformation correctness
  - Test error handling for API failures
  - Test vehicle/driver matching logic
  - _Requirements: Testing strategy_

- [ ] 6. **Checkpoint — Samsara Provider Complete**
  - Samsara API Client handles all required endpoints
  - Provider correctly transforms data between formats
  - All unit tests pass with mocked HTTP

---

### Phase 4: Analytics Engine

- [ ] 7.1 Implement Analytics Engine
  - File: `telemetry-service/src/core/analytics-engine.ts`
  - `computeRouteAnalytics()`: Compute distance/duration variance, adherence score, efficiency scores
  - Adherence score: Based on stop completion order and timing
  - Efficiency score: Weighted composite of time, distance, and idle metrics
  - Guard against division by zero (missing planned metrics)
  - Pure function — takes route + telemetry, returns analytics (no side effects)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7.2 Implement Analytics Repository
  - File: `telemetry-service/src/db/analytics-repository.ts`
  - `getRouteSummary()`: Aggregate analytics across routes for date range
  - `getDriverPerformance()`: Aggregate by driver for date range
  - Use JSONB path queries: `telemetry_data->'analytics'->>'routeAdherenceScore'`
  - _Requirements: 7.3, 7.4_

- [ ] 7.3 Write unit tests for Analytics Engine
  - Test with known inputs: verify exact scores
  - Test edge cases: missing planned data, zero values, partial telemetry
  - Test score ranges always 0-100
  - _Requirements: Testing strategy_

- [ ] 8. **Checkpoint — Analytics Complete**
  - Analytics compute correctly with known test data
  - Aggregate queries return expected summaries
  - All unit tests pass

---

### Phase 5: API Layer

- [ ] 9.1 Implement Telemetry Controller
  - File: `telemetry-service/src/api/telemetry-controller.ts`
  - Thin handlers: parse request → call sync engine/repository → return Result
  - Handlers: `getProviderStatus`, `syncVehicles`, `syncDrivers`, `configureVehicleTelemetry`, `configureDriverTelemetry`, `getRouteTelemetry`, `pushRouteToProvider`, `pullRouteTelemetry`
  - _Requirements: 1.2, 2.1, 2.2, 3.1, 3.2, 4.6, 5.8, 7.1_

- [ ] 9.2 Implement Analytics Controller
  - File: `telemetry-service/src/api/analytics-controller.ts`
  - Handlers: `getRouteAnalytics`, `getAggregateSummary`, `getDriverPerformance`
  - Support `startDate`/`endDate` query params
  - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 9.3 Implement Webhook Controller
  - File: `telemetry-service/src/api/webhook-controller.ts`
  - Validate webhook signatures (HMAC-SHA256)
  - Handle route updates and location updates
  - Respond within timeout, process async
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 9.4 Implement route definitions
  - File: `telemetry-service/src/api/telemetry-routes.ts` — Telemetry + webhook routes
  - File: `telemetry-service/src/api/analytics-routes.ts` — Analytics routes
  - Use `validateIdParam` and `validateRequired` middleware
  - _Requirements: 7.7_

- [ ] 9.5 Implement app setup (standalone mode)
  - File: `telemetry-service/src/app.ts`
  - Express app with helmet, CORS (hardened), rate limiting
  - Mount telemetry and analytics routers
  - Health check endpoint
  - _Requirements: 10.3_

- [ ] 9.6 Implement embedded mount exports
  - File: `telemetry-service/src/index.ts`
  - Export `createTelemetryRouter()` for web-launcher embedding
  - Export `startStandaloneServer()` for standalone mode
  - _Requirements: 10.1, 10.2_

- [ ] 9.7 Integrate with web-launcher (embedded mode)
  - File: `web-launcher/server.js`
  - Mount telemetry routes at `/api/v1/telemetry` and `/api/v1/analytics`
  - Conditional: only mount if `TELEMETRY_MODE !== 'standalone'`
  - Follow dispatch-service embedding pattern
  - _Requirements: 10.2, 10.5, 10.8, 10.9_

- [ ] 9.8 Write integration tests for API endpoints
  - Test all telemetry endpoints (CRUD, push, pull, status)
  - Test analytics endpoints with seeded route data
  - Test webhook signature validation (valid + invalid)
  - Test error responses match expected codes/formats
  - _Requirements: Testing strategy_

- [ ] 10. **Checkpoint — API Layer Complete**
  - All endpoints respond correctly
  - Embedded mode works in web-launcher
  - Standalone mode starts independently
  - Integration tests pass

---

### Phase 6: Settings UI

- [ ] 11.1 Add Integrations tab to Settings page
  - File: `web-launcher/public/settings.html`
  - Add "Integrations" tab in settings navigation
  - Display provider list with status cards (name, connected/disconnected, last sync, mapped counts)
  - _Requirements: 9.1, 9.2_

- [ ] 11.2 Implement provider configuration form
  - Add provider config modal: API credentials, org ID, enable/disable toggles
  - "Test Connection" button calling `/api/v1/telemetry/status`
  - Auto-push and auto-pull toggle switches per provider
  - "Sync Now" button for manual vehicle/driver sync
  - _Requirements: 9.3, 9.4, 9.5, 9.6_

- [ ] 11.3 Add telemetry section to vehicle detail view
  - File: `web-launcher/public/vehicles.html`
  - Display telemetry mapping status (provider, external ID, last sync)
  - Configure/remove telemetry mapping controls
  - _Requirements: 2.1, 2.2, 2.5, 2.6_

- [ ] 11.4 Add telemetry section to driver detail view
  - File: `web-launcher/public/drivers.html`
  - Display telemetry mapping status
  - Configure/remove telemetry mapping controls
  - _Requirements: 3.1, 3.2_

- [ ] 12. **Checkpoint — UI Complete**
  - Settings Integrations tab displays provider status
  - Can configure and test provider connection
  - Vehicle and driver telemetry mapping works from UI
  - Manual sync triggers correctly

---

### Phase 7: Testing & Documentation

- [ ] 13.1 Write comprehensive unit tests
  - Analytics engine (all score computations, edge cases)
  - Provider registry and sync engine
  - Samsara data transformations
  - Retry utility
  - Target: 80%+ coverage for telemetry-service

- [ ] 13.2 Write integration tests
  - Full push/pull lifecycle against test DB
  - API endpoint response validation
  - Webhook processing
  - Analytics aggregation queries

- [ ] 13.3 Write E2E tests
  - Settings → Configure provider → Test connection
  - Vehicle → Map telemetry → Verify mapping saved
  - (Route push/pull E2E deferred to real provider access)

- [ ] 13.4 Update documentation
  - Update `CLAUDE.md` architecture section to include telemetry-service
  - Add telemetry-service to `.env.example` files
  - Update `deploy/do-app-spec.template.yaml` for standalone mode deployment option

- [ ] 14. **Final Checkpoint**
  - All unit tests pass (80%+ coverage)
  - All integration tests pass
  - E2E tests pass for UI flows
  - Build succeeds: `npm run build`
  - Lint passes: `npm run lint`
  - Documentation updated

## Notes

- **Samsara is the initial provider** — other providers (Geotab, Verizon) will be added as separate issues after the framework is proven.
- **GPS track storage** — Large GPS tracks may need pagination or compression. Monitor JSONB column size; consider external storage (S3) if tracks exceed 1MB per route.
- **Webhook secrets** — Each provider webhook requires its own secret stored as an environment variable (e.g., `SAMSARA_WEBHOOK_SECRET`).
- **Rate limiting** — Samsara API has rate limits. The API client should respect `Retry-After` headers and implement request queuing if needed.
- **Environment variables** — API tokens are NEVER stored in the database or settings table. Only non-sensitive config (org ID, enabled flags, sync interval) goes in settings.
