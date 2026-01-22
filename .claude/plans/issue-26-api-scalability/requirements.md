# Requirements: Issue #26 - API Layer Scalability: Separate Backend for Horizontal Scaling

## Introduction
Enable the API layer to be deployed and scaled independently from frontend static assets. This architectural change allows the frontend to be served from a CDN for global performance while the API backend scales horizontally on DigitalOcean App Platform.

This builds on Issue #21's foundation work (configurable API base URL in `api-client.js`, proper fetch patterns) and implements the infrastructure and backend changes needed for true separation.

The separation benefits production deployments by enabling:
- Frontend: CDN/static hosting (fast, globally distributed)
- API: Horizontally scalable backend (auto-scaling based on load)

## Glossary
- **CORS**: Cross-Origin Resource Sharing - HTTP headers that allow browsers to make requests across different origins
- **Origin**: Combination of protocol, host, and port (e.g., `https://app.fleetillo.com`)
- **Horizontal Scaling**: Adding more server instances to handle increased load
- **SameSite Cookie**: Cookie attribute controlling cross-site request behavior

## Requirements

### Requirement 1: Cross-Origin API Access

**User Story:** As a frontend application served from a CDN, I want to make API requests to a separate backend origin, so that the API can scale independently.

#### Acceptance Criteria
1. WHEN frontend makes an API request from a different origin, THE system SHALL include proper Access-Control-Allow-Origin headers
2. WHEN the request includes credentials (cookies), THE system SHALL respond with Access-Control-Allow-Credentials: true
3. WHEN the request uses non-simple methods (PUT, DELETE, PATCH), THE system SHALL handle preflight OPTIONS requests correctly
4. IF the origin is not in the allowed list, THEN THE system SHALL reject the request with appropriate CORS error

### Requirement 2: Environment-Based CORS Configuration

**User Story:** As a DevOps engineer, I want to configure allowed origins per environment, so that development and production can have different CORS policies.

#### Acceptance Criteria
1. WHEN `CORS_ALLOWED_ORIGINS` environment variable is set, THE system SHALL use only those origins
2. WHEN in development mode (NODE_ENV=development), THE system SHALL allow localhost origins for developer convenience
3. WHEN a new frontend domain is added, THE system SHALL require only an environment variable change (no code deployment)
4. IF multiple origins are needed, THEN THE system SHALL support comma-separated origin values

### Requirement 3: Cross-Origin Authentication

**User Story:** As an authenticated user, I want my session to work correctly when frontend and API are on different origins, so that I remain logged in while using the application.

#### Acceptance Criteria
1. WHEN using cookie-based sessions, THE system SHALL set appropriate SameSite and Secure attributes
2. WHEN frontend makes authenticated requests, THE system SHALL accept credentials (cookies or Authorization headers) cross-origin
3. IF using SameSite=None, THEN THE system SHALL require Secure=true (HTTPS only)
4. WHEN session expires, THE system SHALL return 401 with clear error message

### Requirement 4: Health Check and Load Balancing

**User Story:** As the DigitalOcean App Platform load balancer, I want health check endpoints, so that I can route traffic only to healthy instances.

#### Acceptance Criteria
1. WHEN GET /health is called, THE system SHALL return 200 OK if the instance is healthy
2. WHEN GET /health/ready is called, THE system SHALL verify database connectivity before returning 200
3. IF database connection fails, THEN /health/ready SHALL return 503 Service Unavailable
4. WHEN an instance becomes unhealthy, THE system SHALL allow load balancer to drain connections gracefully

### Requirement 5: Dispatch Service CORS Alignment

**User Story:** As a dispatcher using WebSocket connections, I want dispatch service to work correctly from a CDN-served frontend, so that real-time dispatch features function correctly.

#### Acceptance Criteria
1. WHEN dispatch-service receives cross-origin requests, THE system SHALL apply same CORS policy as main API
2. WHEN WebSocket upgrade is requested, THE system SHALL verify origin before accepting
3. IF dispatch-client.js connects from CDN origin, THEN WebSocket connection SHALL be established successfully
4. WHEN CORS_ALLOWED_ORIGINS changes, THE dispatch service SHALL use the new settings

### Requirement 6: Infrastructure Configuration

**User Story:** As a deployment system, I want a documented app spec configuration, so that the separate API service can be deployed correctly.

#### Acceptance Criteria
1. WHEN deploying to DigitalOcean, THE system SHALL have documented app-spec.yaml for API-only service
2. WHEN frontend deployment is configured, THE system SHALL have documented CDN/static site configuration
3. IF API_BASE_URL is not set, THEN frontend SHALL default to relative URLs (same-origin deployment)
4. WHEN deployment scripts run, THE system SHALL validate required environment variables
