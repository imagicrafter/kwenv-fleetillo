# Tasks: Issue #76 - Implement two-key Google Maps API configuration for server and browser

## Overview

This implementation follows a phased deployment approach to ensure zero-downtime migration:
1. **Phase 1**: Update code with backward compatibility (single-key fallback)
2. **Phase 2**: Create and configure browser-side API key
3. **Phase 3**: Apply API restrictions to both keys
4. **Phase 4**: Verification and documentation

Each phase includes checkpoints to verify functionality before proceeding.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/76-two-key-google-maps-config`

### Phase 1: Backend Configuration (Backward Compatible)

- [ ] 1. Update Backend Configuration
  - [ ] 1.1 Update `src/config/index.ts`
    - Add `browserApiKey?: string` to `GoogleMapsConfig` interface
    - Load `GOOGLE_MAPS_BROWSER_KEY` from environment in `createConfig()`
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 1.2 Create configuration validation function
    - Create `validateGoogleMapsConfig()` function
    - Detect two-key vs single-key mode
    - Log appropriate info/warning messages
    - _Requirements: 2.4, 2.5_
  - [ ] 1.3 Add validation to startup sequence
    - Call `validateGoogleMapsConfig()` on server startup
    - Log configuration mode to console
    - _Requirements: 2.5_

- [ ] 2. Implement RPC Endpoint for Browser Key
  - [ ] 2.1 Locate RPC handler implementation
    - Find where `config.getGoogleMapsApiKey` is currently implemented
    - Likely in `web-launcher/server.js` or separate RPC routes file
    - _Requirements: 3.1_
  - [ ] 2.2 Add `getGoogleMapsBrowserKey` handler
    - Return `config.googleMaps.browserApiKey` if configured
    - Fall back to `config.googleMaps.apiKey` if browser key missing
    - Log warning when using fallback
    - _Requirements: 3.2, 3.4, 3.5_
  - [ ] 2.3 Test RPC endpoint manually
    - Start server with only `GOOGLE_MAPS_API_KEY` (fallback mode)
    - Call endpoint, verify it returns server key with warning
    - Add `GOOGLE_MAPS_BROWSER_KEY`, restart, verify it returns browser key
    - _Requirements: 3.3, 3.4_

- [ ] 3. Checkpoint - Backend Configuration Complete
  - Configuration loads both keys (if present)
  - Validation detects two-key vs single-key mode
  - RPC endpoint returns browser key (or falls back to server key)
  - Logs show appropriate mode and warnings

### Phase 2: Frontend Integration

- [ ] 4. Update API Client
  - [ ] 4.1 Update `web-launcher/public/js/api-client.js`
    - Add `getGoogleMapsBrowserKey: () => ApiClient.callRpc('config', 'getGoogleMapsBrowserKey', [])` to config namespace
    - Keep existing `getGoogleMapsApiKey` for backward compatibility
    - _Requirements: 3.1, 3.5_
  - [ ] 4.2 Test API client in browser console
    - Load any page
    - Call `await window.apiClient.config.getGoogleMapsBrowserKey()`
    - Verify it returns a key (currently server key in fallback mode)
    - _Requirements: 3.2_

- [ ] 5. Update Routes Page
  - [ ] 5.1 Update `web-launcher/public/routes.html`
    - Locate `loadGoogleMaps()` function (around line 954-975)
    - Change `apiClient.config.getGoogleMapsApiKey()` to `apiClient.config.getGoogleMapsBrowserKey()`
    - Add fallback logic if browser key is empty
    - Add console logging for successful load
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  - [ ] 5.2 Test routes page locally
    - Open http://localhost:3000/routes.html
    - Verify maps load correctly
    - Check browser console for errors
    - _Requirements: 4.5_

- [ ] 6. Update Other Pages with Google Maps
  - [ ] 6.1 Find all pages that use Google Maps
    - Search for `maps.googleapis.com` in `web-launcher/public/`
    - Likely: `locations.html`, `drivers.html`, `vehicles.html`, `customers.html`
    - _Requirements: 4.4_
  - [ ] 6.2 Update each page to use browser key
    - Apply same change as routes.html
    - Change API client call to `getGoogleMapsBrowserKey()`
    - Add fallback and logging
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ] 6.3 Test each updated page
    - Verify maps load correctly
    - Check browser console for errors
    - _Requirements: 4.5_

- [ ] 7. Checkpoint - Frontend Integration Complete
  - All pages load Google Maps with browser key endpoint
  - Fallback to server key works if browser key not configured
  - No console errors in any page
  - Maps display correctly everywhere

### Phase 3: Environment Configuration

- [ ] 8. Update Environment Files
  - [ ] 8.1 Update `.env.example`
    - Add `GOOGLE_MAPS_BROWSER_KEY=your_browser_side_key_here`
    - Add comments explaining two-key architecture
    - _Requirements: 5.1_
  - [ ] 8.2 Update `deploy/do-app-spec.embedded.yaml`
    - Add `GOOGLE_MAPS_BROWSER_KEY` environment variable with `type: SECRET`
    - Add comments explaining purpose and restrictions
    - _Requirements: 5.2_
  - [ ] 8.3 Update `deploy/do-app-spec.standalone.yaml`
    - Add same `GOOGLE_MAPS_BROWSER_KEY` configuration
    - _Requirements: 5.2_
  - [ ] 8.4 Check if primco-demo uses Google Maps
    - Search primco-demo repository for Google Maps usage
    - If yes, update its configuration files
    - _Requirements: 5.4_

- [ ] 9. Create Google Cloud API Keys
  - [ ] 9.1 Create server-side API key
    - Name: "Fleetillo Server-Side"
    - DO NOT apply restrictions yet (will do in Phase 4)
    - Save key value securely
    - _Requirements: 1.1_
  - [ ] 9.2 Create browser-side API key
    - Name: "Fleetillo Browser"
    - DO NOT apply restrictions yet (will do in Phase 4)
    - Save key value securely
    - _Requirements: 1.1_
  - [ ] 9.3 Document key creation
    - Record which key is for which purpose
    - Store keys in secure location (password manager)
    - _Requirements: 1.5_

- [ ] 10. Checkpoint - Environment Files Updated
  - `.env.example` includes both keys
  - App spec files include `GOOGLE_MAPS_BROWSER_KEY`
  - API keys created in Google Cloud Console
  - Keys documented and stored securely

### Phase 4: Deployment and Verification

- [ ] 11. Deploy to Local Development
  - [ ] 11.1 Update local `.env` file
    - Set `GOOGLE_MAPS_BROWSER_KEY` to browser-side key value
    - Keep `GOOGLE_MAPS_API_KEY` as server-side key
    - _Requirements: 5.4_
  - [ ] 11.2 Test locally
    - Restart web-launcher server
    - Check logs for "Two-key mode active" message
    - Open each page with maps, verify they work
    - Open browser DevTools → Network tab, verify browser key is used
    - _Requirements: 7.1_

- [ ] 12. Deploy to Production
  - [ ] 12.1 Update DigitalOcean environment variables
    - Go to App Platform dashboard → fleetillo-web → Settings → Environment Variables
    - Update `GOOGLE_MAPS_API_KEY` to server-side key value (if rotating)
    - Add `GOOGLE_MAPS_BROWSER_KEY` with browser-side key value
    - Mark both as "Encrypt" (SECRET type)
    - _Requirements: 5.3, 5.5_
  - [ ] 12.2 Deploy application
    - Trigger deployment (automatic or manual)
    - Monitor deployment logs for errors
    - Wait for deployment to complete
    - _Requirements: 5.5_
  - [ ] 12.3 Verify production deployment
    - Check application logs for "Two-key mode active" message
    - Open https://fleetillo.com/routes.html
    - Verify maps load correctly
    - Check browser console for errors
    - _Requirements: 7.2_

- [ ] 13. Apply API Key Restrictions
  - [ ] 13.1 Apply restrictions to server-side key
    - Go to Google Cloud Console → APIs & Services → Credentials
    - Edit "Fleetillo Server-Side" key
    - API restrictions: Select "Restrict key" → Choose: Geocoding API, Places API, Distance Matrix API
    - Application restrictions: None (or IP-based if available)
    - Save
    - _Requirements: 1.1, 1.4_
  - [ ] 13.2 Apply restrictions to browser-side key
    - Edit "Fleetillo Browser" key
    - API restrictions: Select "Restrict key" → Choose: Maps JavaScript API
    - Application restrictions: HTTP referrers → Add allowed domains:
      - `https://fleetillo.com/*`
      - `https://*.fleetillo.com/*`
      - `https://optiroute-web-tulrl.ondigitalocean.app/*`
      - `http://localhost/*`
      - `http://127.0.0.1/*`
    - Save
    - _Requirements: 1.2, 1.3_
  - [ ] 13.3 Wait for restrictions to propagate
    - Wait 1-5 minutes for Google to apply restrictions
    - _Requirements: 1.3_

- [ ] 14. Checkpoint - Deployment Complete
  - Application deployed with both keys
  - Logs confirm two-key mode
  - Production maps work correctly
  - API restrictions applied to both keys

### Phase 5: Testing and Security Verification

- [ ] 15. Functional Testing
  - [ ] 15.1 Test local development
    - Address search/autocomplete works
    - Map displays correctly
    - Geocoding works (create/edit locations)
    - Distance matrix calculations work (route planning)
    - _Requirements: 7.1_
  - [ ] 15.2 Test production
    - All above functionality works on https://fleetillo.com
    - No API key errors in browser console
    - No errors in application logs
    - _Requirements: 7.2_

- [ ] 16. Security Verification
  - [ ] 16.1 Verify server key is never exposed
    - Open any page in production
    - Open browser DevTools → Network tab
    - Search all requests for server key value → Should find ZERO matches
    - Check page source → Server key should NOT appear
    - Check console logs → Server key should NOT appear
    - _Requirements: 9.1_
  - [ ] 16.2 Test browser key restrictions
    - Test HTTP referrer restriction:
      - Create simple HTML page on unauthorized domain (or use https://example.com)
      - Try to load Maps JavaScript API with browser key
      - Should fail with "RefererNotAllowedMapError"
    - _Requirements: 7.4, 9.3_
  - [ ] 16.3 Test API restrictions
    - Try calling Geocoding API with browser key (via browser fetch or Postman)
    - Should fail with REQUEST_DENIED or similar error
    - Confirms browser key can't be abused for server-side APIs
    - _Requirements: 7.3, 9.3_
  - [ ] 16.4 Verify server key works for all server APIs
    - Test geocoding via backend (create location with new address)
    - Test places autocomplete (type address in location form)
    - Test distance matrix (create route with multiple stops)
    - All should work without errors
    - _Requirements: 7.3_

- [ ] 17. Performance and Monitoring
  - [ ] 17.1 Monitor Google Maps API usage
    - Go to Google Cloud Console → APIs & Services → Dashboard
    - Click "Maps JavaScript API" → View usage graphs
    - Click "Geocoding API" → View usage graphs
    - Verify usage is reasonable (no unexpected spikes)
    - _Requirements: 9.4_
  - [ ] 17.2 Set up billing alerts (optional but recommended)
    - Go to Google Cloud Console → Billing → Budgets & alerts
    - Create alert for Maps API spending
    - Set threshold appropriate for expected usage
    - _Requirements: 9.4_

- [ ] 18. Checkpoint - Testing and Security Complete
  - All functional tests pass
  - Server key confirmed never exposed to browser
  - Browser key restrictions verified (domain and API)
  - API usage monitored and reasonable
  - No errors in production for 24 hours

### Phase 6: Documentation

- [ ] 19. Update Documentation
  - [ ] 19.1 Update `deploy/SECRETS.md`
    - Add section for `GOOGLE_MAPS_API_KEY` (Server-Side)
    - Add section for `GOOGLE_MAPS_BROWSER_KEY` (Browser-Side)
    - Document restrictions for each key
    - Document where to configure (DigitalOcean dashboard, .env)
    - _Requirements: 6.1_
  - [ ] 19.2 Update `deploy/GOOGLE_MAPS_API_RESTRICTION.md`
    - Explain two-key architecture and motivation
    - Step-by-step guide for creating both keys
    - Document specific restrictions for each key
    - Troubleshooting common errors (RefererNotAllowedMapError, REQUEST_DENIED)
    - Testing instructions
    - _Requirements: 6.2, 6.3, 6.4_
  - [ ] 19.3 Document security benefits
    - Explain principle of least privilege
    - Show what happens if browser key is stolen (limited damage)
    - Show what happens if server key is stolen (requires server compromise)
    - _Requirements: 6.3_

- [ ] 20. Final Verification
  - [ ] 20.1 Code review checklist
    - No hardcoded API keys in source code
    - Both keys use SECRET type in deployment specs
    - Fallback logic works correctly
    - All console.log statements are appropriate (not logging keys)
    - _Requirements: 9.5_
  - [ ] 20.2 Update issue with completion notes
    - Document any deviations from plan
    - Note any issues encountered and how they were resolved
    - Link to relevant commits/PRs

- [ ] 21. Checkpoint - Final Documentation Complete
  - All documentation updated and reviewed
  - Security benefits clearly explained
  - Troubleshooting guide comprehensive
  - Team aware of new configuration

## Notes

### Implementation Constraints

1. **Backward Compatibility**: Must not break deployments that only have `GOOGLE_MAPS_API_KEY` configured
2. **Zero Downtime**: Code can be deployed before environment variables are updated
3. **Security**: Server-side key must NEVER be exposed to browser under any circumstances

### Risk Mitigation

1. **Fallback mechanism**: If `GOOGLE_MAPS_BROWSER_KEY` is missing, fall back to `GOOGLE_MAPS_API_KEY`
2. **Phased restrictions**: Apply API restrictions AFTER verifying functionality works
3. **Comprehensive testing**: Test both functional requirements and security restrictions
4. **Clear logging**: Log which mode (two-key vs single-key) is active for debugging

### Testing Strategy

Each phase includes a checkpoint to verify:
- Functionality works as expected
- No regressions introduced
- Security requirements met (where applicable)
- Documentation is clear

### Estimated Complexity

**Total**: 6-7 complexity points (Medium-High tier)
- Files affected: 6-8 files (config, RPC handlers, 4-6 HTML pages, app specs, docs)
- Architecture: Significant (1 pt) - new two-key configuration model
- API changes: Minor (1 pt) - new RPC endpoint, existing endpoints unchanged
- External integration: Moderate (2 pts) - Google Cloud Console configuration
- Security: High (2 pts) - critical security feature with verification requirements
- Testing: Moderate (1 pt) - comprehensive functional and security testing

### Success Metrics

- **Security**: Server-side key never exposed to browser (verified in DevTools)
- **Functionality**: All maps features work in all environments
- **Restrictions**: Both keys have appropriate API and application restrictions
- **Zero errors**: No API key-related errors in production for 7 days after deployment

### Rollback Plan

If issues arise:

1. **Immediate**: Remove `GOOGLE_MAPS_BROWSER_KEY` from DigitalOcean environment
2. **Immediate**: Remove API restrictions from Google Cloud Console
3. Application automatically falls back to single-key mode
4. Investigate and fix issues
5. Re-attempt deployment following the phases

### Optional: Rotate Current Key

If the current `GOOGLE_MAPS_API_KEY` was previously exposed in git:

- [ ] 22. Rotate Exposed Key (Optional)
  - [ ] 22.1 Delete old key from Google Cloud Console
    - Wait 7 days after successful deployment with new keys
    - Go to Google Cloud Console → Credentials
    - Delete the old exposed key
    - _Requirements: 1.5_
  - [ ] 22.2 Document key rotation
    - Update SECRETS.md with new key information
    - Note when old key was deleted
