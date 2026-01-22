# Tasks: Issue #21 - Refactor Frontend to Remove Electron Dependency

## Overview
Replace `window.electronAPI` with `window.apiClient` in all web-launcher HTML files. Create new `config.js` and `api-client.js` modules with configurable API base URL for future scalability.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/21-remove-electron-dependency`
  - Base from current working branch

---

### Phase 1: Foundation

- [ ] 1. Create New JavaScript Modules
  - [ ] 1.1 Create directory `web-launcher/public/js/`
  - [ ] 1.2 Create `config.js` with `AppConfig` global
    - API_BASE_URL: '/api' (default)
    - DEBUG: false
    - VERSION: '1.0.0'
  - [ ] 1.3 Create `api-client.js` with:
    - `ApiError` class for error handling
    - `callRpc()` function with credentials:include
    - 401 handling → redirect to login
    - All namespaces: bookings, customers, clients, services, locations, vehicles, drivers, vehicleLocations, routes, geocoding, activities, settings, dispatchJobs, config
  - [ ] 1.4 Test in isolation (load in blank HTML, call one method)
  - _Requirements: 1.1-1.5_

- [ ] 2. Checkpoint - Foundation Complete
  - [ ] Verify `config.js` loads without errors
  - [ ] Verify `api-client.js` loads without errors
  - [ ] Verify `window.apiClient` is defined in console

---

### Phase 2: Page Migration (Simple → Complex)

For each page: Replace script tag, find/replace electronAPI, test

- [ ] 3. Migrate services.html
  - [ ] Replace `<script src="preload.js">` with config.js + api-client.js
  - [ ] Replace `window.electronAPI` → `window.apiClient`
  - [ ] Test: Add/edit/delete service
  - _Requirements: 2.1-2.4_

- [ ] 4. Migrate customers.html
  - [ ] Replace script tags and API references
  - [ ] Test: Add/edit/delete customer
  - _Requirements: 2.1-2.4_

- [ ] 5. Migrate settings.html
  - [ ] Replace script tags and API references
  - [ ] Test: Change settings, reload, verify persistence
  - _Requirements: 2.1-2.4_

- [ ] 6. Checkpoint - Simple Pages Complete
  - [ ] All 3 pages load without console errors
  - [ ] CRUD operations work

- [ ] 7. Migrate vehicles.html
  - [ ] Replace script tags and API references
  - [ ] Test: Add vehicle, assign locations, verify persistence
  - _Requirements: 2.1-2.4_

- [ ] 8. Migrate locations.html
  - [ ] Replace script tags and API references
  - [ ] Test: Add location with geocoding autocomplete
  - _Requirements: 2.1-2.4, 4.1-4.2_

- [ ] 9. Migrate drivers.html
  - [ ] Replace script tags and API references
  - [ ] Note: Avatar upload uses REST, not RPC (no change needed)
  - [ ] Test: Add driver, assign vehicle, upload avatar
  - _Requirements: 2.1-2.4_

- [ ] 10. Checkpoint - Medium Pages Complete
  - [ ] All 6 pages load without console errors

- [ ] 11. Migrate bookings.html
  - [ ] Replace script tags and API references
  - [ ] Note: CSV upload uses REST endpoint (no change needed)
  - [ ] Test: Create booking with services, delete booking
  - _Requirements: 2.1-2.4_

- [ ] 12. Migrate calendar.html
  - [ ] Replace script tags and API references
  - [ ] Test: View calendar, navigate dates
  - _Requirements: 2.1-2.4_

- [ ] 13. Migrate index.html (Dashboard)
  - [ ] Replace script tags and API references
  - [ ] Test: Dashboard stats load correctly
  - _Requirements: 2.1-2.4_

- [ ] 14. Migrate routes.html
  - [ ] Replace script tags and API references
  - [ ] Verify `config.getGoogleMapsApiKey()` works
  - [ ] Test: View routes, plan new route, verify map displays
  - _Requirements: 2.1-2.4, 4.1-4.2_

- [ ] 15. Migrate dispatch.html
  - [ ] Replace script tags and API references
  - [ ] Note: `dispatch-client.js` unchanged (talks to dispatch service)
  - [ ] Test: Create dispatch job, view driver list
  - _Requirements: 2.1-2.4_

- [ ] 16. Checkpoint - All Pages Migrated
  - [ ] All 11 pages load without console errors
  - [ ] No references to `window.electronAPI` remain

---

### Phase 3: Cleanup

- [ ] 17. Delete preload.js
  - [ ] Delete `web-launcher/public/preload.js`
  - [ ] Verify no pages reference it

- [ ] 18. Final Verification
  - [ ] Run Playwright tests: `npx playwright test --config=playwright.web-launcher.config.ts`
  - [ ] Manual smoke test all pages
  - [ ] Check console for any errors

- [ ] 19. Add plan ready label
  - [ ] `gh issue edit 21 --add-label "plan ready"`
  - [ ] Post completion comment to issue

---

## Verification Plan

### Automated Tests
```bash
# Run existing Playwright web-launcher tests
npx playwright test --config=playwright.web-launcher.config.ts
```

### Manual Testing Checklist
1. Start server: `cd web-launcher && npm run dev`
2. Open http://localhost:3000
3. Login with demo password
4. For each page:
   - Open browser DevTools Console
   - Navigate to page
   - Verify no errors
   - Perform one CRUD operation

### Console Error Check
After migration, verify NO console errors containing:
- `electronAPI`
- `undefined`
- `CORS`
- `401` (unless intended)

## Notes
- Keep `dispatch-client.js` unchanged (Decision from design review)
- `/shared/public/` excluded from scope (tracked in #27)
- Structure code for future bundling (tracked in #28)
