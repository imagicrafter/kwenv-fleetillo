# Tasks: Issue #46 - Route Planning City Clustering Bug

## Overview

Fix route planning to cluster locations geographically before assignment, preventing distant locations from sharing routes.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/46-route-city-clustering`

---

### Phase 1: Foundation & Safety Nets (Risk Reduction)

- [ ] 1. Implement Feature Flag Infrastructure
  - Add `ENABLE_CLUSTERING_V2` config/env var
  - _Requirements: 8.1_

- [ ] 2. Implement Unassigned Booking/Exception Workflow
  - **Crucial**: Build the bucket for "failed" bookings FIRST
  - Update DB schema for `planning_status` / `errors`
  - _Requirements: 7.1, 7.2_

---

### Phase 2: The New Algorithm (Isolated)

- [ ] 3. Implement Home-Based Clustering
  - [ ] 3.1 Fetch unique `homeLocation` coordinates for active vehicles
  - [ ] 3.2 Implement `assignBookingsToDepots`
    - Nearest neighbor to depot coordinates
    - Cutoff threshold (e.g. 50 miles)
    - _Requirements: 1.1, 1.3_

- [ ] 4. Capacity Logic & Shadow Runner
  - [ ] 4.1 Implement `CapacityCheck`
    - Compare booking count vs (Vehicles * MaxStops)
    - Flag overflow as "Unassigned"
    - _Requirements: 2.1, 2.3_
  - [ ] 4.2 Run Shadow Mode and log:
    - "Would have assigned X bookings"
    - "Would have flagged Y as overflow"

---

### Phase 3: Switchover


### Phase 4: Batch/Headless Readiness

- [ ] 8. Implement Safety Net Logic
  - [ ] 8.1 Create `PlanningResult` interface (routes[], unassigned[], errors[])
    - _Requirements: 6.3, 7.2_
  - [ ] 8.2 Update logic to catch all exceptions and bucket into "unassigned"
    - _Requirements: 6.4, 7.1, 7.4_
  - [ ] 8.3 Persist "planning error" status to missing bookings
    - _Requirements: 7.1_

- [ ] 9. UI Exception Handling
  - [ ] 9.1 Build "Unassigned/Exception" list in Route View
    - _Requirements: 7.3_
  - [ ] 9.2 Add indicator/warning for failed bookings
    - _Requirements: 7.3_

- [ ] 10. Checkpoint - Robustness
  - Test with impossible constraints (no vehicles)
  - Verify bookings end up in Exception list, not lost

---

### Phase 5: UI Integration

- [ ] 11. Route Preview Enhancements
  - [ ] 11.1 Display total distance and duration
    - _Requirements: 5.1_
  - [ ] 8.2 Flag routes with long inter-stop distances
    - _Requirements: 5.2_
  - [ ] 8.3 Show cluster map visualization
    - _Requirements: 5.3_

- [ ] 9. Final Checkpoint
  - Test with `npm run seed:demo`
  - Verify routes stay within cities
  - Verify cross-city routes flagged/rejected

---

## Notes

- Use existing Google Maps API key from project
- Consider caching distance matrix for performance
- May need to tune DBSCAN ε parameter per region
