# Requirements: Issue #143 - Telemetry Integration

## Introduction

Fleetillo currently plans and dispatches optimized routes, but has no mechanism to compare planned routes against actual vehicle performance data from third-party telemetry systems. This gap means route optimization improvements are based on assumptions rather than measured outcomes, and driver performance cannot be objectively assessed.

The Telemetry Integration feature introduces a generic, provider-agnostic framework for connecting Fleetillo with external fleet telemetry systems (Samsara, Geotab, Verizon Connect, and others). By pushing planned routes to telemetry providers and pulling actual execution data back, Fleetillo can compute variance metrics, adherence scores, and efficiency analytics — closing the feedback loop between route planning and real-world execution.

This feature builds on the existing metadata JSONB pattern already used by the `locations` and `vehicles` tables, ensuring minimal schema disruption and a familiar development pattern. The pluggable architecture supports multiple simultaneous providers and future extensibility without schema changes.

## Glossary

- **Telemetry Provider**: A third-party fleet tracking system (e.g., Samsara, Geotab, Verizon Connect) that provides GPS tracking, driver behavior, and vehicle diagnostics data via API.
- **Route Adherence**: A score (0-100) measuring how closely a driver followed the planned route, considering stop order, timing, and path.
- **Efficiency Score**: A composite score (0-100) measuring overall route execution quality, factoring distance variance, time variance, idle time, and fuel usage.
- **External ID**: The identifier used by a telemetry provider to reference a Fleetillo entity (vehicle, driver, or route) in their system.
- **Metadata JSONB**: A flexible JSON column in PostgreSQL used to store provider-specific and custom data without requiring schema changes per provider.
- **Provider Registry**: The service-layer pattern that manages multiple telemetry provider instances, routing operations to the correct provider based on configuration.
- **Sync**: The process of exchanging data between Fleetillo and a telemetry provider — either pushing planned data out or pulling actual data in.
- **GPS Track**: An ordered sequence of geographic coordinates with timestamps representing a vehicle's actual path during route execution.

## Requirements

### Requirement 1: Provider Registry and Configuration

**User Story:** As an administrator, I want to configure one or more telemetry providers in the Settings UI, so that Fleetillo can communicate with our fleet tracking system(s).

#### Acceptance Criteria

1. WHEN an admin navigates to Settings → Integrations, THE system SHALL display a list of supported telemetry providers (Samsara, Geotab, Verizon Connect, Custom).
2. WHEN an admin selects a provider and enters API credentials (API token, organization ID), THE system SHALL validate the credentials by calling the provider's health check endpoint.
3. IF the health check succeeds, THEN THE system SHALL store the provider configuration in the settings table and display a "Connected" status.
4. IF the health check fails, THEN THE system SHALL display a clear error message without storing invalid credentials.
5. WHEN an admin enables or disables a provider, THE system SHALL update the provider status without affecting other configured providers.
6. WHEN the system starts, THE system SHALL initialize the provider registry by loading all enabled provider configurations from the settings table.
7. THE system SHALL support multiple providers being active simultaneously (e.g., Samsara for one fleet, Geotab for another).
8. THE system SHALL NOT store API tokens in plaintext in the database; credentials MUST be stored as environment variables or encrypted settings.

### Requirement 2: Vehicle-Provider Mapping

**User Story:** As an administrator, I want to map Fleetillo vehicles to their corresponding telemetry provider identities, so that the system can track actual vehicle performance.

#### Acceptance Criteria

1. WHEN an admin opens a vehicle's detail view, THE system SHALL display a "Telemetry" section showing current provider mapping status.
2. WHEN an admin configures telemetry for a vehicle, THE system SHALL allow selecting a provider and entering/selecting the external vehicle ID.
3. WHEN a vehicle is mapped to a provider, THE system SHALL store the mapping in the vehicle's `metadata` JSONB column under the `telemetry` key.
4. WHEN a sync operation is triggered, THE system SHALL fetch the provider's vehicle list and suggest matches based on VIN or license plate.
5. IF a vehicle is mapped to a provider, THEN the system SHALL display the provider name, external ID, and last sync timestamp on the vehicle detail view.
6. WHEN a vehicle's telemetry mapping is removed, THE system SHALL clear the telemetry metadata without affecting other metadata fields (custom fields, etc.).
7. THE system SHALL validate that the external ID exists in the provider's system before saving the mapping.

### Requirement 3: Driver-Provider Mapping

**User Story:** As an administrator, I want to map Fleetillo drivers to their telemetry provider identities, so that driver-specific performance data can be tracked.

#### Acceptance Criteria

1. WHEN an admin opens a driver's detail view, THE system SHALL display a "Telemetry" section showing current provider mapping status.
2. WHEN an admin configures telemetry for a driver, THE system SHALL allow selecting a provider and entering the external driver ID.
3. WHEN a driver is mapped to a provider, THE system SHALL store the mapping in the driver's `metadata` JSONB column under the `telemetry` key.
4. WHEN a sync operation is triggered, THE system SHALL fetch the provider's driver list and suggest matches based on name or email.
5. IF a driver has no `metadata` column yet, THEN the database migration SHALL add a `metadata JSONB DEFAULT '{}'::jsonb` column to the drivers table with a GIN index.

### Requirement 4: Route Push (Planned Route → Provider)

**User Story:** As a dispatcher, I want planned routes to be automatically pushed to the telemetry provider after dispatch, so that drivers can see the route in their provider's mobile app and the provider can track execution.

#### Acceptance Criteria

1. WHEN a route status changes to 'dispatched' AND the assigned vehicle has telemetry enabled, THE system SHALL push the route to the vehicle's configured telemetry provider.
2. WHEN pushing a route, THE system SHALL convert the Fleetillo route format (stop sequence, locations, time windows) to the provider's route format.
3. IF the push succeeds, THEN THE system SHALL store the provider's external route ID in `routes.telemetry_data`.
4. IF the push fails, THEN THE system SHALL log the error, set a retry flag, and NOT block the dispatch process.
5. WHEN a route is modified after being pushed, THE system SHALL update the route in the provider's system.
6. THE system SHALL support manual push via an API endpoint for routes that need re-pushing.
7. WHEN auto-push is disabled in settings, THE system SHALL NOT push routes automatically but SHALL allow manual push.

### Requirement 5: Telemetry Pull (Provider → Fleetillo)

**User Story:** As a fleet manager, I want actual route execution data to be pulled from the telemetry provider after route completion, so that I can compare planned vs. actual performance.

#### Acceptance Criteria

1. WHEN a route status changes to 'completed', THE system SHALL automatically pull telemetry data from the provider for that route.
2. WHEN pulling telemetry data, THE system SHALL retrieve: actual start/end times, actual distance, actual duration, idle time, and fuel consumption (if available).
3. WHEN GPS track data is available, THE system SHALL store the GPS waypoints (latitude, longitude, timestamp, speed) in `routes.telemetry_data.gps_track`.
4. WHEN stop-level data is available, THE system SHALL store arrival/departure times and completion status for each stop.
5. WHEN driver behavior data is available, THE system SHALL store harsh braking, harsh acceleration, and speeding incident counts.
6. IF the pull fails, THEN THE system SHALL retry up to 3 times with exponential backoff, then log and flag the route for manual sync.
7. THE system SHALL update `routes.telemetry_synced_at` with the timestamp of the last successful sync.
8. THE system SHALL support manual sync via an API endpoint for routes that need re-syncing.
9. WHEN pulling data for a route, THE system SHALL NOT overwrite existing analytics — it SHALL merge new data with existing telemetry data.

### Requirement 6: Analytics Computation

**User Story:** As a fleet manager, I want the system to compute comparison analytics between planned and actual route data, so that I can identify optimization opportunities and measure driver efficiency.

#### Acceptance Criteria

1. WHEN telemetry data is synced for a route, THE system SHALL compute and store analytics in `routes.telemetry_data.analytics`.
2. THE system SHALL compute these metrics:
   - Distance variance (km and percentage): `actual_distance - planned_distance`
   - Duration variance (minutes and percentage): `actual_duration - planned_duration`
   - Route adherence score (0-100): based on stop order completion, timing, and path deviation
   - Time efficiency score (0-100): based on how close actual timing matched planned timing
   - Overall efficiency score (0-100): weighted composite of all scores
3. IF planned metrics are zero or missing, THEN THE system SHALL NOT compute variance percentages (avoid division by zero) and SHALL flag the route as "incomplete data".
4. WHEN analytics are computed, THE system SHALL store both the raw scores and the computation timestamp.
5. THE system SHALL support re-computation of analytics when telemetry data is updated.

### Requirement 7: Analytics API Endpoints

**User Story:** As a developer/UI consumer, I want API endpoints to retrieve telemetry data and analytics for routes, drivers, and aggregate summaries.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/v1/routes/:id/telemetry`, THE system SHALL return the route's telemetry data including GPS track, metrics, and analytics.
2. WHEN a GET request is made to `/api/v1/analytics/routes/:id`, THE system SHALL return computed analytics for a specific route.
3. WHEN a GET request is made to `/api/v1/analytics/summary`, THE system SHALL return aggregate analytics across all routes for a specified date range.
4. WHEN a GET request is made to `/api/v1/analytics/drivers/:id`, THE system SHALL return driver performance metrics aggregated across their routes for a specified date range.
5. WHEN a GET request is made to `/api/v1/telemetry/status`, THE system SHALL return the status of all configured providers (connected, error, disabled) and last sync timestamps.
6. ALL analytics endpoints SHALL support date range filtering via `startDate` and `endDate` query parameters.
7. ALL endpoints SHALL follow the existing Result pattern: `{ success: true, data: ... }` or `{ success: false, error: ... }`.

### Requirement 8: Webhook Support

**User Story:** As a system architect, I want telemetry providers to push real-time updates to Fleetillo via webhooks, so that data is available without polling.

#### Acceptance Criteria

1. WHEN a provider supports webhooks, THE system SHALL expose webhook endpoints at `/api/v1/webhooks/telemetry/:provider/routes` and `/api/v1/webhooks/telemetry/:provider/locations`.
2. WHEN a webhook is received, THE system SHALL validate the payload signature using the provider's webhook secret.
3. IF the signature is invalid, THEN THE system SHALL reject the webhook with HTTP 401 and log the attempt.
4. WHEN a valid route update webhook is received, THE system SHALL update the corresponding route's telemetry data.
5. WHEN a valid location update webhook is received, THE system SHALL update the corresponding vehicle's current location.
6. THE system SHALL respond to webhooks within 5 seconds and process heavy operations asynchronously.

### Requirement 9: Settings UI for Telemetry

**User Story:** As an administrator, I want a dedicated Integrations section in the Settings UI to manage telemetry provider configurations.

#### Acceptance Criteria

1. WHEN an admin navigates to Settings, THE system SHALL display an "Integrations" tab or section.
2. THE Integrations section SHALL display each configured provider with: name, status (connected/disconnected/error), last sync timestamp, and vehicle/driver count mapped.
3. WHEN an admin clicks "Configure" on a provider, THE system SHALL display a form for entering API credentials and sync settings.
4. WHEN an admin clicks "Test Connection", THE system SHALL validate credentials against the provider's API and display the result.
5. THE system SHALL provide toggle switches to enable/disable auto-push and auto-pull for each provider.
6. THE system SHALL display a "Sync Now" button to trigger manual vehicle/driver sync from the provider.

### Requirement 10: Database Schema Changes

**User Story:** As a developer, I want the database schema to support telemetry data storage following existing patterns.

#### Acceptance Criteria

1. THE migration SHALL add `metadata JSONB DEFAULT '{}'::jsonb` to the `drivers` table with a GIN index.
2. THE migration SHALL add `telemetry_data JSONB DEFAULT '{}'::jsonb` to the `routes` table with a GIN index.
3. THE migration SHALL add `telemetry_synced_at TIMESTAMPTZ` to the `routes` table with a partial index on non-deleted rows.
4. THE migration SHALL be idempotent (using `IF NOT EXISTS` clauses).
5. THE migration SHALL NOT modify existing data in any table.
6. THE migration SHALL follow the naming convention: `YYYYMMDDHHMMSS_add_telemetry_support.sql`.
7. THE vehicles table `metadata` column SHALL already exist (from migration 20260127000100); the migration SHALL verify this and skip if present.
