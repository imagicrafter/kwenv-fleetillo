# Implementation Plan: OptiRoute Dispatch Service

## Overview

This implementation plan creates a standalone dispatch service that sends route assignments to drivers via Telegram and Email channels. The service will be deployed as a second component in the existing DigitalOcean App Platform app, sharing the Supabase database with OptiRoute.

## Tasks

- [x] 0. Create Feature Branch
  - Create and checkout new branch `feature/dispatch-service` from main
  - All subsequent work must be done in this branch
  - _Prerequisites: None_

- [x] 1. Project Setup and Core Infrastructure
  - [x] 1.1 Initialize dispatch-service project structure
    - Create `/dispatch-service` folder with TypeScript/Node.js setup
    - Configure package.json with dependencies (express, @supabase/supabase-js, handlebars, node-fetch)
    - Set up tsconfig.json matching main app configuration
    - Create .env.example with required environment variables
    - _Requirements: 8.1, 10.1_

  - [x] 1.2 Set up Express server with middleware
    - Create src/index.ts with Express app initialization
    - Configure JSON body parsing, CORS, and request logging
    - Add correlation ID middleware for request tracing
    - Set up structured JSON logging utility
    - _Requirements: 12.2, 12.4_

  - [x] 1.3 Implement API key authentication middleware
    - Create src/middleware/auth.ts with X-API-Key validation
    - Support multiple API keys from DISPATCH_API_KEYS env var
    - Return 401 for missing or invalid keys
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 1.4 Write property test for API key authentication
    - **Property 17: API Key Authentication**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [x] 2. Database Schema and Data Access Layer
  - [x] 2.1 Create Supabase migration for dispatch tables
    - Create dispatches table with id, route_id, driver_id, status, requested_channels, metadata, timestamps
    - Create channel_dispatches table with id, dispatch_id, channel, status, provider_message_id, error_message, timestamps
    - Add indexes for efficient querying
    - _Requirements: 8.1, 8.2_

  - [x] 2.2 Create migration for driver preference columns
    - Add preferred_channel column to drivers table (default: 'telegram')
    - Add fallback_enabled column to drivers table (default: true)
    - Note: telegram_chat_id and email already exist
    - _Requirements: 11.1_

  - [x] 2.3 Implement dispatch repository
    - Create src/db/dispatch.repository.ts
    - Implement createDispatch, getDispatch, updateDispatchStatus functions
    - Implement createChannelDispatch, updateChannelDispatch functions
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 2.4 Implement data fetching for routes, drivers, vehicles, bookings
    - Create src/db/entities.repository.ts
    - Implement getRouteWithDetails, getDriver, getVehicle, getBookingsForRoute
    - Use existing table schemas from main OptiRoute app
    - _Requirements: 1.1, 11.1_

  - [x] 2.5 Write property test for dispatch persistence
    - **Property 1: Dispatch Creation Persistence**
    - **Validates: Requirements 1.1, 8.1**

- [x] 3. Checkpoint - Database Layer Complete
  - Ensure migrations run successfully
  - Verify repository functions work with test data
  - Ask the user if questions arise

- [x] 4. Template Engine Implementation
  - [x] 4.1 Implement template engine with Handlebars
    - Create src/core/templates.ts with TemplateEngine class
    - Support {{variable}} syntax for substitution
    - Handle missing/null values gracefully (empty string)
    - Load channel-specific templates from /templates folder
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 4.2 Create Telegram message template
    - Create templates/telegram.md with Markdown formatting
    - Include route date, start time, total stops
    - Include booking summaries with client names and addresses
    - _Requirements: 4.5, 4.6_

  - [x] 4.3 Create Email HTML template
    - Create templates/email.html with professional styling
    - Include complete route details and vehicle info
    - Include full booking list with addresses and times
    - _Requirements: 5.5, 5.6_

  - [x] 4.4 Write property test for template rendering
    - **Property 15: Template Variable Substitution**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

  - [x] 4.5 Write property test for channel-specific templates
    - **Property 16: Channel-Specific Templates**
    - **Validates: Requirements 7.4**

- [x] 5. Channel Adapter Implementation
  - [x] 5.1 Define channel adapter interface
    - Create src/adapters/interface.ts with ChannelAdapter interface
    - Define DispatchContext, ChannelResult, HealthStatus types
    - Define ChannelType union type
    - _Requirements: 4.1, 5.1_

  - [x] 5.2 Implement Telegram adapter
    - Create src/adapters/telegram.ts implementing ChannelAdapter
    - Implement canSend() checking for telegram_chat_id
    - Implement send() using Telegram Bot API
    - Implement healthCheck() to verify bot connectivity
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.3 Implement Email adapter
    - Create src/adapters/email.ts implementing ChannelAdapter
    - Support SendGrid or Resend based on configuration
    - Implement canSend() checking for email address
    - Implement send() using email provider API
    - Implement healthCheck() to verify provider connectivity
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.4 Write property test for adapter configuration validation
    - **Property 9: Adapter Configuration Validation**
    - **Validates: Requirements 4.3, 5.3, 6.4**

  - [x] 5.5 Write property tests for message content
    - **Property 11: Telegram Message Content**
    - **Property 12: Email Message Content**
    - **Validates: Requirements 4.5, 4.6, 5.5, 5.6**

- [x] 6. Channel Router Implementation
  - [x] 6.1 Implement channel router
    - Create src/core/router.ts with ChannelRouter class
    - Implement resolveChannels() with priority logic
    - Implement getFallbackChannel() for failure recovery
    - Filter channels based on driver configuration
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 Write property test for channel selection priority
    - **Property 2: Channel Selection Priority**
    - **Validates: Requirements 1.2, 1.3, 6.1, 11.2**

  - [x] 6.3 Write property test for multi-channel dispatch
    - **Property 13: Multi-Channel Dispatch**
    - **Validates: Requirements 6.2**

  - [x] 6.4 Write property test for fallback behavior
    - **Property 14: Fallback Channel Behavior**
    - **Validates: Requirements 6.3**

- [x] 7. Checkpoint - Core Components Complete
  - Ensure template engine renders correctly
  - Verify adapters can send test messages (with mocks)
  - Verify channel router selects correct channels
  - Ask the user if questions arise

- [x] 8. Dispatch Orchestrator Implementation
  - [x] 8.1 Implement dispatch orchestrator
    - Create src/core/orchestrator.ts with DispatchOrchestrator class
    - Implement dispatch() for single dispatch requests
    - Fetch route, driver, vehicle, bookings data
    - Create dispatch record, determine channels, send via adapters
    - Update dispatch status based on channel results
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.3, 8.4_

  - [x] 8.2 Implement batch dispatch processing
    - Add dispatchBatch() method to orchestrator
    - Process items concurrently with Promise.allSettled
    - Return results for all items including failures
    - Enforce 100 item batch limit
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 8.3 Implement error handling and resilience
    - Wrap adapter calls in try-catch
    - Record failures without crashing
    - Log errors with dispatch context
    - _Requirements: 12.1, 12.3_

  - [x] 8.4 Write property test for async response
    - **Property 3: Async Response Immediacy**
    - **Validates: Requirements 1.4**

  - [x] 8.5 Write property test for batch processing
    - **Property 6: Batch Processing Completeness**
    - **Validates: Requirements 2.1, 2.3, 2.4**

  - [x] 8.6 Write property test for batch size limit
    - **Property 7: Batch Size Limit**
    - **Validates: Requirements 2.6**

  - [x] 8.7 Write property test for delivery status tracking
    - **Property 10: Delivery Status Tracking**
    - **Validates: Requirements 4.2, 4.4, 5.2, 5.4, 8.3, 8.4**

  - [x] 8.8 Write property test for adapter failure resilience
    - **Property 19: Adapter Failure Resilience**
    - **Validates: Requirements 12.3**

- [x] 9. API Endpoints Implementation
  - [x] 9.1 Implement POST /api/v1/dispatch endpoint
    - Create src/api/handlers/dispatch.ts
    - Validate request body (route_id, driver_id required)
    - Call orchestrator.dispatch()
    - Return dispatch_id and status
    - _Requirements: 1.1, 1.4, 1.5, 1.6_

  - [x] 9.2 Implement POST /api/v1/dispatch/batch endpoint
    - Validate batch array (non-empty, max 100 items)
    - Call orchestrator.dispatchBatch()
    - Return results array with summary
    - _Requirements: 2.1, 2.4, 2.5, 2.6_

  - [x] 9.3 Implement GET /api/v1/dispatch/:id endpoint
    - Fetch dispatch with channel_dispatches
    - Return 404 if not found
    - Return full dispatch details
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 9.4 Implement GET /api/v1/health endpoint
    - Check database connectivity
    - Check channel adapter health
    - Return appropriate status and HTTP code
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 9.5 Wire up routes with authentication
    - Create src/api/routes.ts
    - Apply auth middleware to dispatch endpoints
    - Health endpoint should be public (no auth)
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 9.6 Write property test for invalid entity errors
    - **Property 4: Invalid Entity Error Handling**
    - **Validates: Requirements 1.5, 3.3**

  - [x] 9.7 Write property test for request validation
    - **Property 5: Request Validation**
    - **Validates: Requirements 1.6, 2.5**

  - [x] 9.8 Write property test for dispatch retrieval
    - **Property 8: Dispatch Retrieval Consistency**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 9.9 Write property test for health check response
    - **Property 18: Health Check Response Structure**
    - **Validates: Requirements 10.1, 10.2**

- [x] 10. Checkpoint - API Complete
  - Test all endpoints manually with curl/Postman
  - Verify authentication works correctly
  - Verify error responses are consistent
  - Ask the user if questions arise

- [x] 11. Deployment Configuration
  - [x] 11.1 Update DigitalOcean App Platform spec
    - Add dispatch service to do-app-spec.yaml
    - Configure source_dir, build_command, run_command
    - Set up environment variables (shared Supabase, secrets)
    - Configure internal routing and health check
    - _Requirements: 10.1_

  - [x] 11.2 Create dispatch service start script
    - Verified: No start.sh needed - `npm start` (node dist/index.js) is sufficient
    - The service initializes cleanly via src/index.ts with all middleware and error handling
    - do-app-spec.yaml already configured with `run_command: npm start`
    - _Requirements: 10.1_

  - [x] 11.3 Update main start.sh to handle both services locally
    - Root start.sh updated with START_DISPATCH_SERVICE environment variable
    - Supports running dispatch service on port 3001 alongside main app
    - Includes graceful shutdown handling for both services
    - _Requirements: 10.1_

- [x] 12. Integration Testing
  - [x] 12.1 Write integration tests for dispatch flow
    - Create dispatch-service/tests/integration/dispatch-flow.test.ts
    - Test complete dispatch flow with mocked adapters
    - Verify database state after dispatch
    - Test batch dispatch with mixed success/failure
    - _Requirements: 1.1, 2.1, 8.1, 8.2_

  - [x] 12.2 Write integration tests for health endpoint
    - Create dispatch-service/tests/integration/health.test.ts
    - Test healthy state with all deps up
    - Test degraded/unhealthy states
    - _Requirements: 10.3, 10.4_

- [x] 13. Final Checkpoint - Service Complete
  - Run all tests (unit, property, integration)
  - Verify deployment configuration is correct
  - Document any manual setup steps (Telegram bot token, email API key)
  - Ask the user if questions arise

## Notes

- **IMPORTANT: All implementation must be done in a new feature branch, not main**
- All tasks including property-based tests are required for comprehensive coverage
- Each property test references a specific property from the design document
- The service uses the same Supabase instance as OptiRoute - no separate database setup needed
- External service credentials (Telegram bot token, email API key) must be configured before deployment
- Local development can use mock adapters for testing without real credentials
