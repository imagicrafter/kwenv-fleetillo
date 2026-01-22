# Tasks: Issue #26 - API Layer Scalability: Separate Backend for Horizontal Scaling

## Overview

Implement flexible deployment architecture supporting both embedded mode (dev/demos) and separated mode (production scaling) with proper CORS, API key authentication, and health endpoints.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/26-api-scalability`
  - Branch from main

---

### Phase 1: Core Infrastructure

- [ ] 1. Create CORS Configuration Module
  - [ ] 1.1 Create `src/config/cors.config.ts`
    - Implement `getCorsConfig()` with environment-based origin detection
    - Implement `getCorsMiddlewareOptions()` for Express middleware
    - Handle development localhost origins fallback
    - _Requirements: 1, 2_
  - [ ] 1.2 Write unit tests for configuration parsing

- [ ] 2. Create API Key Middleware
  - [ ] 2.1 Create `src/middleware/api-key.middleware.ts`
    - Implement `validateApiKey()` middleware
    - Use timing-safe comparison for key validation
    - Exempt `/health` and `/health/ready` endpoints
    - Skip validation when `API_KEY` not set (embedded mode)
    - _Requirements: Security best practice_
  - [ ] 2.2 Write unit tests for middleware

- [ ] 3. Create Health Check Routes
  - [ ] 3.1 Create `src/routes/health.routes.ts`
    - Implement `GET /health` (basic liveness)
    - Implement `GET /health/ready` (database connectivity check)
    - _Requirements: 4_
  - [ ] 3.2 Write tests for health endpoints

- [ ] 4. Checkpoint - Core Modules Complete
  - All new modules compile
  - Unit tests pass

---

### Phase 2: Web-Launcher Integration

- [ ] 5. Update web-launcher/server.js
  - [ ] 5.1 Import and apply shared CORS config
  - [ ] 5.2 Apply API key middleware after CORS
  - [ ] 5.3 Mount health check routes
  - [ ] 5.4 Update session cookie configuration
    - Set `SameSite=none` when `CORS_ALLOWED_ORIGINS` set
    - Set `Secure=true` in production
    - _Requirements: 3_
  - [ ] 5.5 Add `X-API-Key` to CORS allowed headers

- [ ] 6. Checkpoint - Web-Launcher Updated
  - Server starts in embedded mode (no env vars)
  - Server starts in separated mode (with env vars)
  - Health endpoints respond correctly

---

### Phase 3: Dispatch Service Integration

- [ ] 7. Update dispatch-service/src/index.ts
  - [ ] 7.1 Import and apply shared CORS config
  - [ ] 7.2 Apply API key middleware
  - [ ] 7.3 Mount health check routes
  - [ ] 7.4 Add WebSocket origin verification
    - Verify origin before accepting upgrade
    - Close connection if origin not allowed
    - _Requirements: 5_

- [ ] 8. Checkpoint - Dispatch Service Updated
  - Service starts in both modes
  - WebSocket connections work from allowed origins
  - WebSocket connections rejected from disallowed origins

---

### Phase 4: Frontend Integration

- [ ] 9. Update api-client.js
  - [ ] 9.1 Add `X-API-Key` header when `window.__FLEETILLO_API_KEY__` set
  - [ ] 9.2 Ensure `credentials: 'include'` for cross-origin cookies
  - [ ] 9.3 Add error handling for 401/403 API key errors

- [ ] 10. Update dispatch-client.js
  - [ ] 10.1 Include API key in WebSocket connection params if set
  - [ ] 10.2 Handle origin rejection gracefully

- [ ] 11. Checkpoint - Frontend Updated
  - API calls work in embedded mode (no config)
  - API calls work in separated mode (with config)

---

### Phase 5: Deployment Configuration

- [ ] 12. Create DigitalOcean App Specs
  - [ ] 12.1 Create `.do/app-spec-api.yaml` for API-only deployment
    - Configure health check path
    - Configure environment variables
    - Set instance count for horizontal scaling
  - [ ] 12.2 Create `.do/app-spec-frontend.yaml` for static site (optional)
    - Configure CDN/static hosting
    - Document `API_BASE_URL` and `API_KEY` injection
    - _Requirements: 6_

- [ ] 13. Update Documentation
  - [ ] 13.1 Document deployment modes in README
  - [ ] 13.2 Document environment variables
  - [ ] 13.3 Add deployment architecture diagram

- [ ] 14. Checkpoint - Deployment Config Complete
  - App specs are valid YAML
  - Documentation is complete

---

### Phase 6: Testing

- [ ] 15. Integration Testing
  - [ ] 15.1 Test embedded mode end-to-end
    - Start server without CORS/API_KEY env vars
    - Verify same-origin requests work
    - Verify health endpoints work
  - [ ] 15.2 Test separated mode simulation
    - Start server with CORS_ALLOWED_ORIGINS and API_KEY
    - Test cross-origin requests with valid API key
    - Test cross-origin requests with invalid/missing API key (should fail)
    - Verify preflight OPTIONS requests handled
  - [ ] 15.3 Test session cookies cross-origin

- [ ] 16. Final Checkpoint
  - All tests pass
  - Build succeeds
  - Documentation complete
  - Ready for staging deployment

## Notes

- Embedded mode: Default for development and single-server production
- Separated mode: Enabled by setting `CORS_ALLOWED_ORIGINS` and `API_KEY`
- Issue #21 provides foundation work (configurable API_BASE_URL in api-client.js)
- Consider adding rate limiting in future iteration for additional security
