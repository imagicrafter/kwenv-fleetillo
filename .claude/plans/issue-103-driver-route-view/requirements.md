# Requirements: Issue #103 - Public Driver Route View

## Introduction

When drivers receive dispatch notifications via Telegram, they need to view their assigned route on a map. Currently, the route link (`/routes.html?routeId={uuid}`) requires logging into the admin application, which is inappropriate for drivers who should not have admin access. Additionally, when opened on mobile devices, the route map page has poor UX with a sidebar blocking the content.

**Why not use native Google Maps links?** Google Maps URLs have an 8-waypoint limit, making them unsuitable for routes with more stops. A custom map view allows displaying unlimited stops with the full route polyline.

This feature creates a simple, public route map view designed specifically for drivers. It uses secure, time-limited tokens for access control instead of requiring authentication. The page displays only the route map - a clean, full-screen view that drivers can pinch, zoom, and pan on their mobile devices.

The Telegram dispatch message already provides the list of stops with individual navigation links, so the map view only needs to show the visual route overview with numbered markers.

## Glossary

- **Route Token**: A unique, time-limited identifier that grants read-only access to a specific route's map data
- **Driver Route View**: A public page showing the route map, accessible via token
- **Polyline**: Encoded representation of the driving path between stops

## Requirements

### Requirement 1: Token-Based Route Access

**User Story:** As a driver, I want to view my assigned route without logging in, so that I can quickly access my route map while in the field.

#### Acceptance Criteria

1. WHEN a route is dispatched, THE system SHALL generate a unique route access token
2. THE token SHALL be a cryptographically random UUID (v4 format)
3. THE token SHALL be associated with exactly one route
4. THE token SHALL expire 24 hours from creation time
5. WHEN accessing a route with an expired token, THE system SHALL return a 410 Gone error with message "This route link has expired"
6. WHEN accessing a route with an invalid/non-existent token, THE system SHALL return a 404 Not Found error
7. THE system SHALL store tokens in a `route_tokens` database table with columns: id, route_id, token (unique), expires_at, created_at
8. THE dispatch service SHALL include the tokenized URL in the Telegram message instead of the direct route URL

### Requirement 2: Public Route Data Endpoint

**User Story:** As a driver viewing my route, I want to load the route map data without authentication, so that the page works without admin credentials.

#### Acceptance Criteria

1. THE system SHALL provide a public GET endpoint at `/api/v1/public/route/{token}`
2. WHEN a valid, non-expired token is provided, THE endpoint SHALL return route map data including:
   - Route geometry (encoded polyline)
   - Stop coordinates with sequence numbers
   - Start point coordinates
   - End point coordinates
3. THE endpoint SHALL NOT require authentication headers
4. THE endpoint SHALL NOT return sensitive data (customer names, contact info, pricing, internal IDs)
5. WHEN the associated route does not exist, THE system SHALL return a 404 Not Found error

### Requirement 3: Full-Screen Mobile Map View

**User Story:** As a driver on a mobile device, I want to see a full-screen map of my route, so that I can easily view my stops and route path.

#### Acceptance Criteria

1. THE system SHALL provide a public HTML page at `/driver/route.html`
2. THE page SHALL accept a `token` query parameter to identify the route
3. THE page SHALL display a full-screen Google Map with no headers, sidebars, or navigation elements
4. THE map SHALL support touch gestures: pinch-to-zoom, pan, and double-tap zoom
5. THE page SHALL be responsive and work on screens from 320px to 2560px width
6. IF the token is missing or invalid, THE page SHALL display "Invalid route link" message
7. IF the token is expired, THE page SHALL display "This route link has expired" message

### Requirement 4: Route Visualization

**User Story:** As a driver viewing my route map, I want to see the route path and stops clearly marked, so that I understand my delivery sequence at a glance.

#### Acceptance Criteria

1. THE map SHALL display the route polyline showing the driving path (green color, matching existing style)
2. THE map SHALL display numbered markers for each stop (red markers with white numbers, matching existing style)
3. THE map SHALL display a green circle marker for the route start point
4. THE map SHALL display a red circle marker for the route end point (if different from last stop)
5. THE map SHALL automatically fit bounds to show all stops on initial load
6. THE map SHALL use the existing dark theme styling (Mapbox-style)

### Requirement 5: Token Cleanup

**User Story:** As a system administrator, I want route tokens to be automatically cleaned up, so that the database doesn't accumulate expired tokens.

#### Acceptance Criteria

1. THE system SHALL automatically delete tokens that have been expired for more than 7 days
2. IF a route is deleted, THE associated tokens SHALL be deleted via cascade

### Requirement 6: Dispatch Integration

**User Story:** As a dispatcher, when I send a route to a driver, I want the link to work without requiring login.

#### Acceptance Criteria

1. WHEN the dispatch service sends a Telegram message, THE route URL SHALL use the tokenized format
2. THE URL format SHALL be `{APP_BASE_URL}/driver/route.html?token={token}`
3. THE dispatch service SHALL call the main app API to generate the token before sending
4. IF token generation fails, THE dispatch SHALL fail with an appropriate error message
5. THE token generation endpoint SHALL be protected by the existing dispatch API key authentication
