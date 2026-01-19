# Plan: Issue #5 - Cannot add a Dispatch job

## Problem Statement

When clicking the "+ Dispatch" button on the Dispatch Management page, nothing opens. The expected behavior is to open a modal allowing users to:
1. Assign one or more drivers to a dispatch job
2. Schedule the dispatch time with 15-minute granularity

## Root Cause Analysis

The `shared/public/dispatch.html` (production version) has the button redirecting to `routes.html`:
```html
<button class="btn-primary" onclick="window.location.href='routes.html'">📤 New Dispatch</button>
```

Meanwhile, `web-launcher/public/dispatch.html` has a working implementation with:
- A proper "+ Dispatch" button with `id="schedule-dispatch-btn"`
- A Schedule Dispatch Modal with driver selection, timing options, and route preview
- JavaScript functions to handle the modal flow

The web-launcher version has all the required UI functionality, but it relies on `window.electronAPI` which isn't available in the web context.

## Scope

### Files to Modify

1. **shared/public/dispatch.html** - Port the modal and JavaScript from web-launcher version
2. **shared/public/dispatch-client.js** (if exists) or create new methods - Add methods for dispatch job creation

### Backend Requirements

The backend already has the necessary components:
- `src/services/dispatch-job.service.ts` - Complete service with:
  - `createDispatchJob()` - Creates dispatch jobs with driver list and scheduled time
  - `getDriversInActiveJobs()` - Checks driver availability
  - `checkDriverConflicts()` - Validates driver exclusivity
- `src/types/dispatch-job.ts` - Type definitions
- `src/jobs/dispatch-scheduler.ts` - Background job processor

**Missing:** API routes to expose dispatch job service to frontend.

### Required Changes

#### 1. Add Dispatch Job API Routes
Create `src/routes/dispatch-job.routes.ts`:
- `POST /api/dispatch-jobs` - Create a new dispatch job
- `GET /api/dispatch-jobs` - List dispatch jobs
- `GET /api/dispatch-jobs/:id` - Get dispatch job by ID
- `POST /api/dispatch-jobs/:id/cancel` - Cancel a dispatch job
- `GET /api/dispatch-jobs/active-drivers` - Get drivers in active jobs

#### 2. Update shared/public/dispatch.html
- Port the Schedule Dispatch Modal from web-launcher version
- Replace `window.electronAPI` calls with `dispatch-client.js` methods
- Add driver checklist for multi-select
- Add immediate/scheduled dispatch timing options
- Add route preview for selected drivers

#### 3. Update dispatch-client.js
Add methods:
- `createDispatchJob({ driverIds, scheduledTime, name })` - Create dispatch job
- `getActiveDriverIds()` - Get drivers currently in active jobs
- `getDriverRoutes(driverId)` - Get next planned route for a driver

## Verification Plan

### Automated Tests
1. Run existing backend tests: `npm test`
2. Verify API routes respond correctly

### Manual Verification
1. Navigate to `/dispatch.html`
2. Click "+ Dispatch" button
3. Verify modal opens
4. Select one or more drivers
5. Toggle between "Send Immediately" and "Schedule for Later"
6. Verify route preview populates
7. Click "Schedule Dispatch" and verify success

## Risk Assessment

- **Low Risk**: Changes are additive - no modification to existing working code
- **Medium Risk**: API route integration needs testing with frontend
- **Mitigation**: The web-launcher version already proves the UI flow works

## Estimated Effort

- API Routes: 1 hour
- Frontend Modal Port: 1 hour  
- dispatch-client.js Updates: 30 minutes
- Testing: 30 minutes

**Total: ~3 hours**
