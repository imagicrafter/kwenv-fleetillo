# Tasks: Issue #103 - Public Driver Route View

## Overview

This implementation creates a public, token-based route map view for drivers. The work spans database schema, backend services, API endpoints, frontend page, and dispatch service integration.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/103-driver-route-view`

- [ ] 1. Database Schema
  - [ ] 1.1 Create migration for route_tokens table
    - Table: `route_tokens` with columns: id, route_id, token, expires_at, created_at
    - Foreign key to routes with CASCADE delete
    - Unique index on token column
    - Index on expires_at for cleanup queries
    - _Requirements: 1.7_
  - [ ] 1.2 Apply migration to all schemas (fleetillo, routeiq, optiroute)
    - _Requirements: 1.7_

- [ ] 2. Checkpoint - Database Ready
  - Verify migration applies cleanly
  - Verify foreign key cascade works (delete route → tokens deleted)

- [ ] 3. Route Token Service
  - [ ] 3.1 Create `src/types/route-token.ts`
    - RouteToken interface
    - CreateRouteTokenInput interface
    - _Requirements: 1.1, 1.2_
  - [ ] 3.2 Create `src/services/route-token.service.ts`
    - `createToken(input)` - generates UUID token, sets expires_at to NOW() + 24h
    - `validateToken(token)` - returns route_id if valid, throws if expired/invalid
    - `cleanupExpiredTokens()` - deletes tokens expired > 7 days ago
    - _Requirements: 1.1-1.7, 5.1_
  - [ ] 3.3 Write unit tests for RouteTokenService
    - Test token creation with 24h expiration
    - Test validation of valid token
    - Test rejection of expired token
    - Test rejection of non-existent token
    - Test cleanup of old expired tokens
    - _Requirements: 1.4, 1.5, 1.6_

- [ ] 4. Public Route Service
  - [ ] 4.1 Create `src/services/public-route.service.ts`
    - `getRouteMapData(routeId)` - returns polyline, stop coordinates, start/end points
    - Queries routes table for geometry
    - Queries bookings for stop lat/lng by stop_sequence
    - _Requirements: 2.1, 2.2_
  - [ ] 4.2 Write unit tests for PublicRouteService
    - Test returns correct polyline
    - Test returns stops in sequence order
    - Test returns start/end coordinates
    - _Requirements: 2.2_

- [ ] 5. Checkpoint - Services Complete
  - All service unit tests pass
  - Services handle edge cases (missing geometry, empty stops)

- [ ] 6. API Endpoints
  - [ ] 6.1 Create `src/routes/public.routes.ts`
    - GET `/api/v1/public/route/:token` - validates token, returns map data
    - Returns 404 for invalid token
    - Returns 410 for expired token
    - _Requirements: 2.1-2.5_
  - [ ] 6.2 Create `src/routes/route-token.routes.ts`
    - POST `/api/v1/route-tokens` - creates token (protected by API key)
    - Returns token, expires_at, and full URL
    - _Requirements: 6.5_
  - [ ] 6.3 Add API key middleware for route-tokens endpoint
    - Reuse pattern from dispatch service auth
    - _Requirements: 6.5_
  - [ ] 6.4 Register routes in `src/routes/index.ts`
  - [ ] 6.5 Write integration tests for API endpoints
    - Test public endpoint with valid token
    - Test public endpoint with expired token (410)
    - Test public endpoint with invalid token (404)
    - Test token creation with valid API key
    - Test token creation rejected without API key
    - _Requirements: 2.1-2.5, 6.3-6.5_

- [ ] 7. Checkpoint - API Complete
  - Integration tests pass
  - Manual testing with curl/Postman

- [ ] 8. Frontend Page
  - [ ] 8.1 Create `web-launcher/public/driver/route.html`
    - Standalone HTML page with embedded CSS/JS
    - Full-screen Google Map (100vw x 100vh)
    - No header, sidebar, or navigation elements
    - _Requirements: 3.1-3.6_
  - [ ] 8.2 Implement token extraction and API call
    - Read token from URL query parameter
    - Fetch `/api/v1/public/route/{token}`
    - Handle error responses (show appropriate messages)
    - _Requirements: 3.2, 3.6, 3.7_
  - [ ] 8.3 Implement map rendering
    - Render route polyline (green, matching existing style)
    - Render numbered stop markers (red with white numbers)
    - Render start marker (green circle)
    - Render end marker (red circle)
    - Auto-fit bounds to show all stops
    - _Requirements: 4.1-4.5_
  - [ ] 8.4 Apply dark theme styling
    - Match existing routes.html Mapbox-style theme
    - _Requirements: 4.6_
  - [ ] 8.5 Test on mobile devices
    - Verify pinch-to-zoom works
    - Verify pan works
    - Verify map fills screen without scrollbars
    - _Requirements: 3.3, 3.4, 3.5_

- [ ] 9. Checkpoint - Frontend Complete
  - Page renders correctly in browser
  - Error states display correctly
  - Mobile gestures work

- [ ] 10. Dispatch Service Integration
  - [ ] 10.1 Update `dispatch-service/src/core/templates.ts`
    - Add function to call token creation API
    - Replace direct route URL with tokenized URL
    - _Requirements: 6.1, 6.2_
  - [ ] 10.2 Add error handling for token creation failure
    - Fail dispatch if token cannot be created
    - Log error details
    - _Requirements: 6.4_
  - [ ] 10.3 Update dispatch service configuration
    - Add MAIN_APP_URL environment variable (or reuse existing)
    - Ensure dispatch API key is configured
    - _Requirements: 6.3_
  - [ ] 10.4 Test dispatch flow end-to-end
    - Send test dispatch
    - Verify Telegram message contains tokenized URL
    - Click link and verify map loads
    - _Requirements: 6.1-6.5_

- [ ] 11. Checkpoint - Integration Complete
  - Full dispatch → Telegram → map view flow works
  - Token expires correctly after 24 hours

- [ ] 12. Cleanup and Documentation
  - [ ] 12.1 Add scheduled cleanup for expired tokens
    - Create database function or cron job
    - Run daily to delete tokens expired > 7 days
    - _Requirements: 5.1_
  - [ ] 12.2 Update API documentation
    - Document public route endpoint
    - Document token creation endpoint
  - [ ] 12.3 Add deployment notes
    - New environment variables needed
    - Migration instructions

- [ ] 13. Final Checkpoint
  - All unit tests pass
  - All integration tests pass
  - Build succeeds
  - Manual E2E testing complete
  - Documentation updated

## Notes

- The public route endpoint intentionally exposes only coordinates, not customer information
- Token cleanup can be implemented as a Supabase scheduled function or as part of app startup
- Consider rate limiting the public endpoint in a future iteration
- The dispatch service must be deployed after the main app to ensure the token API is available
