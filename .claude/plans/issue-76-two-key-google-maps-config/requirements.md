# Requirements: Issue #76 - Implement two-key Google Maps API configuration for server and browser

## Introduction

This feature addresses a critical security limitation in the current Google Maps API key configuration. Currently, Fleetillo uses a single API key for both server-side operations (geocoding, place autocomplete, distance matrix) and browser-side map display. This creates a security dilemma:

- **Without HTTP referrer restrictions**: The key can be stolen from the browser and used from any domain or for any Google Maps API
- **With HTTP referrer restrictions**: Server-side API calls fail with the error "API keys with referer restrictions cannot be used with this API"

The two-key architecture solves this by separating concerns:
- **Server-side key**: Used exclusively by the Node.js backend, never exposed to browsers. Restricted to specific APIs (Geocoding, Places, Distance Matrix). No referrer restrictions needed.
- **Browser-side key**: Exposed to browsers for Maps JavaScript API. Protected by HTTP referrer restrictions limiting usage to specific domains. Restricted to Maps JavaScript API only.

This approach follows Google's best practices and significantly reduces attack surface if either key is compromised.

## Glossary

- **HTTP referrer restriction**: Application restriction that limits an API key to requests coming from specific website domains (based on the HTTP Referer header sent by browsers)
- **API restriction**: Limits which Google Maps APIs a key can access (e.g., only Maps JavaScript API, not Geocoding API)
- **Server-side API**: Google Maps APIs called from Node.js backend (Geocoding, Places Autocomplete, Distance Matrix)
- **Browser-side API**: Google Maps APIs called from the browser (Maps JavaScript API)
- **SECRET type**: DigitalOcean App Platform environment variable type that encrypts values and doesn't display them in logs
- **RPC endpoint**: Remote Procedure Call endpoint used by Fleetillo's frontend to call backend services

## Requirements

### Requirement 1: Google Cloud Console API Key Configuration

**User Story:** As a system administrator, I want two separate Google Maps API keys with appropriate restrictions, so that each key has minimal permissions and reduces security risk.

#### Acceptance Criteria

1. WHEN creating the server-side API key, THE administrator SHALL:
   - Name it "Fleetillo Server-Side"
   - Set API restrictions to ONLY: Geocoding API, Places API, Distance Matrix API
   - Set application restrictions to: None (or IP-based if static IPs available)
   - Document that this key must NEVER be exposed to browsers

2. WHEN creating the browser-side API key, THE administrator SHALL:
   - Name it "Fleetillo Browser"
   - Set API restrictions to ONLY: Maps JavaScript API
   - Set application restrictions to HTTP referrers with these patterns:
     - `https://fleetillo.com/*`
     - `https://*.fleetillo.com/*`
     - `https://optiroute-web-tulrl.ondigitalocean.app/*`
     - `http://localhost/*`
     - `http://127.0.0.1/*`

3. THE browser-side key SHALL be restricted to prevent usage from unauthorized domains

4. THE server-side key SHALL NOT have referrer restrictions (to allow server-side API calls)

5. IF the current API key was previously exposed in git, THE administrator SHALL create entirely new keys and delete the old key after deployment

### Requirement 2: Backend Configuration

**User Story:** As a backend developer, I want the system to support both server-side and browser-side API keys in configuration, so that the correct key is used for each purpose.

#### Acceptance Criteria

1. THE `src/config/index.ts` file SHALL be updated to include:
   ```typescript
   googleMaps: {
     apiKey: string | undefined;        // Server-side key
     browserApiKey: string | undefined; // Browser-side key (NEW)
   }
   ```

2. WHEN the application starts, THE system SHALL load `GOOGLE_MAPS_API_KEY` from environment variables into `config.googleMaps.apiKey`

3. WHEN the application starts, THE system SHALL load `GOOGLE_MAPS_BROWSER_KEY` from environment variables into `config.googleMaps.browserApiKey`

4. THE existing server-side code in `src/services/googlemaps.service.ts` SHALL continue using `config.googleMaps.apiKey` without modification

5. IF `GOOGLE_MAPS_BROWSER_KEY` is not configured, THE system SHALL log a warning but NOT fail startup (for backward compatibility during migration)

### Requirement 3: Frontend API Endpoint

**User Story:** As a frontend developer, I want to securely retrieve the browser-side API key from the backend, so that I don't need to hardcode it in the frontend.

#### Acceptance Criteria

1. THE system SHALL provide an RPC endpoint `config.getGoogleMapsBrowserKey()` that returns the browser-side API key

2. WHEN a frontend application calls `apiClient.config.getGoogleMapsBrowserKey()`, THE backend SHALL return `config.googleMaps.browserApiKey`

3. THE endpoint SHALL NOT require authentication (it's a public key with domain restrictions)

4. IF `GOOGLE_MAPS_BROWSER_KEY` is not configured, THE endpoint SHALL return `config.googleMaps.apiKey` as a fallback (backward compatibility)

5. THE existing `config.getGoogleMapsApiKey()` endpoint SHALL continue working and return the server-side key for legacy compatibility

### Requirement 4: Frontend Integration

**User Story:** As a frontend developer, I want to use the browser-side API key when loading Google Maps, so that HTTP referrer restrictions protect the key from abuse.

#### Acceptance Criteria

1. WHEN `web-launcher/public/routes.html` loads the Google Maps script, THE system SHALL:
   - Call `await window.apiClient.config.getGoogleMapsBrowserKey()` to fetch the browser-side key
   - Use the returned key in the Maps JavaScript API URL
   - Load `https://maps.googleapis.com/maps/api/js?key=${browserApiKey}&libraries=geometry`

2. IF the browser-side key is not available, THE system SHALL fall back to `getGoogleMapsApiKey()` for backward compatibility

3. THE system SHALL log a console warning if using the server-side key fallback

4. WHEN other pages use Google Maps (e.g., `locations.html`, `drivers.html`), THEY SHALL be updated to use the browser-side key

5. THE system SHALL verify that map display functionality works correctly with the new key

### Requirement 5: Environment Variable Configuration

**User Story:** As a DevOps engineer, I want clear documentation and configuration for both API keys across all environments, so that deployment is straightforward and secure.

#### Acceptance Criteria

1. THE `.env.example` file SHALL be updated to include:
   ```bash
   # Google Maps API Keys (Two-Key Architecture)
   GOOGLE_MAPS_API_KEY=your_server_side_key_here
   GOOGLE_MAPS_BROWSER_KEY=your_browser_side_key_here
   ```

2. THE DigitalOcean app specifications (`deploy/do-app-spec.embedded.yaml`, `deploy/do-app-spec.standalone.yaml`) SHALL be updated to include:
   ```yaml
   - key: GOOGLE_MAPS_BROWSER_KEY
     type: SECRET
     scope: RUN_TIME
   ```

3. THE deployment documentation SHALL explain how to configure both keys in DigitalOcean App Platform dashboard

4. THE configuration SHALL be applied to all environments:
   - Local development (`.env` file)
   - Staging/preview environments (if applicable)
   - Production (fleetillo.com)
   - Primco-demo (if it uses Google Maps)

5. WHEN deploying, THE engineer SHALL verify both keys are set correctly in the environment

### Requirement 6: Documentation Updates

**User Story:** As a developer or system administrator, I want comprehensive documentation on the two-key architecture, so that I understand how to manage and troubleshoot the configuration.

#### Acceptance Criteria

1. THE `deploy/SECRETS.md` file SHALL be updated to document both keys:
   - `GOOGLE_MAPS_API_KEY` (Server-Side) - Purpose, restrictions, where to configure
   - `GOOGLE_MAPS_BROWSER_KEY` (Browser-Side) - Purpose, restrictions, where to configure
   - Examples showing proper SECRET type usage in app specs

2. THE `deploy/GOOGLE_MAPS_API_RESTRICTION.md` file SHALL be updated to:
   - Explain the two-key architecture and why it's needed
   - Provide step-by-step instructions for creating both keys in Google Cloud Console
   - Document the specific restrictions for each key
   - Include troubleshooting steps for common issues

3. THE documentation SHALL include security benefits of the two-key approach:
   - Browser key can be stolen but only works on allowed domains
   - Browser key can't access expensive APIs (geocoding, places, distance matrix)
   - Server key is never exposed to browsers

4. THE documentation SHALL provide examples of testing both keys in different environments

### Requirement 7: Testing and Validation

**User Story:** As a QA engineer, I want to verify that both API keys work correctly in all environments, so that no functionality is broken by the migration.

#### Acceptance Criteria

1. WHEN testing in local development, THE system SHALL verify:
   - Address search/autocomplete works (server-side Places API)
   - Map displays correctly (browser-side Maps JavaScript API)
   - Geocoding works (server-side Geocoding API)
   - Distance matrix calculations work (server-side Distance Matrix API)

2. WHEN testing in production (fleetillo.com), THE system SHALL verify:
   - All above functionality works without errors
   - Browser console shows no API key errors
   - Network tab shows no `REQUEST_DENIED` errors

3. WHEN testing security restrictions, THE system SHALL verify:
   - Browser key CANNOT access Geocoding/Places APIs (test by calling directly with browser key → should fail)
   - Server key works for all server-side APIs
   - Browser key is restricted to allowed domains (test from unauthorized domain → should fail)

4. THE system SHALL verify HTTP referrer restrictions are active by:
   - Attempting to use browser key from an unauthorized domain
   - Verifying the request is denied with appropriate error message

5. WHEN a page uses Google Maps, THE browser console SHALL NOT show:
   - "Google Maps JavaScript API error: RefererNotAllowedMapError"
   - "This API key is not authorized to use this service or API"
   - Any other API key-related errors

### Requirement 8: Backward Compatibility and Migration

**User Story:** As a platform operator, I want a smooth migration path that doesn't break existing deployments, so that the transition to two-key architecture is zero-downtime.

#### Acceptance Criteria

1. IF only `GOOGLE_MAPS_API_KEY` is configured (old setup), THE system SHALL:
   - Use it for both server-side and browser-side operations
   - Log a warning recommending migration to two-key architecture
   - Continue functioning normally (no breaking changes)

2. WHEN both keys are configured, THE system SHALL:
   - Use `GOOGLE_MAPS_API_KEY` for server-side operations
   - Use `GOOGLE_MAPS_BROWSER_KEY` for browser-side operations
   - Log an informational message confirming two-key mode

3. THE migration SHALL be deployable without downtime:
   - Deploy code changes first (with fallback support)
   - Add `GOOGLE_MAPS_BROWSER_KEY` to environment
   - Restart application
   - Verify functionality
   - Apply API key restrictions in Google Cloud Console

4. IF deployment fails, THE system SHALL allow rollback:
   - Remove `GOOGLE_MAPS_BROWSER_KEY` environment variable
   - Application reverts to single-key mode
   - No code rollback necessary

### Requirement 9: Security Verification

**User Story:** As a security reviewer, I want to verify that the two-key architecture properly isolates API keys and reduces attack surface, so that security posture is actually improved.

#### Acceptance Criteria

1. THE server-side key SHALL NEVER appear in:
   - Browser network requests
   - Browser console logs
   - HTML source code
   - JavaScript files served to browsers
   - Browser DevTools anywhere

2. THE browser-side key SHALL appear in browser but SHALL be restricted by:
   - HTTP referrer restrictions (domain allowlist)
   - API restrictions (Maps JavaScript API only)

3. IF an attacker steals the browser-side key, THEY SHALL NOT be able to:
   - Use it from unauthorized domains (blocked by referrer restriction)
   - Call Geocoding API (blocked by API restriction)
   - Call Places API (blocked by API restriction)
   - Call Distance Matrix API (blocked by API restriction)

4. THE system SHALL log usage warnings if:
   - Server-side key is accessed via browser endpoint (shouldn't happen in two-key mode)
   - Browser-side key is missing and fallback is used

5. WHEN reviewing code, THE security reviewer SHALL verify:
   - No hardcoded API keys in source code
   - No API keys in git history (if new keys were generated)
   - Both keys use SECRET type in deployment specs
   - Documentation explains security model clearly

## Success Criteria

1. Two separate API keys created and configured with appropriate restrictions
2. Server-side APIs (geocoding, places autocomplete, distance matrix) work without errors
3. Browser-side Maps JavaScript API works without errors
4. HTTP referrer restrictions active and tested on browser-side key
5. No `REQUEST_DENIED` errors in production for 30 days after deployment
6. Documentation complete and accurate
7. All environments updated (local, staging, production, primco-demo if applicable)
8. Security audit confirms server-side key is never exposed to browsers

## Non-Functional Requirements

1. **Performance**: No performance degradation from API key changes
2. **Security**: Server-side key must never be exposed to browsers
3. **Reliability**: Fallback mechanism ensures backward compatibility during migration
4. **Maintainability**: Configuration clearly documented for future developers
5. **Operability**: Zero-downtime deployment with easy rollback if needed
