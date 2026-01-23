# Tasks: Issue #3 - Vehicle Geofencing

## Overview

Implement vehicle geofencing to constrain route assignments.

## Tasks

- [ ] 0. Create Feature Branch
  - Create `issue/3-vehicle-geofencing`

---

### Phase 1: Database & Backend

- [ ] 1. Database Schema
  - [ ] 1.1 Create migration to add `geofence` (JSONB) to `optiroute.vehicles`
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 Update Types (Vehicle interface)
    - _Requirements: 1.2_

- [ ] 2. Update Route Logic
  - [ ] 2.1 Update Route Service to fetch vehicle geofences
  - [ ] 2.2 Implement `isRouteAllowed` check using Turf.js
    - Check if all stops in route are inside polygon
    - _Requirements: 3.1, 3.2_
  - [ ] 2.3 Update vehicle selection algorithm
    - Filter out incompatible vehicles
    - Prefer constrained vehicles (optional heuristic)
    - _Requirements: 3.3, 3.4_

---

### Phase 2: Frontend UI

- [ ] 3. Vehicle Editor Map
  - [ ] 3.1 Integrte Map library (Leaflet/Mapbox) into Vehicle Modal
    - _Requirements: 2.1_
  - [ ] 3.2 Add Drawing controls (Draw Polygon, Edit, Delete)
    - _Requirements: 2.2, 2.3, 2.4_
  - [ ] 3.3 Serialize drawn shape to GeoJSON for save
    - _Requirements: 2.5_

- [ ] 4. Visualization & Listing
  - [ ] 4.1 Show `[Geofenced]` indicator in vehicles list
  - [ ] 4.2 (Optional) Show geofence on vehicle preview map
    - _Requirements: 4.1_

---

### Phase 3: Validation & Testing

- [ ] 5. Test Geofence Constraints
  - [ ] 5.1 Create test vehicle with small geofence
  - [ ] 5.2 Create route with stops outside geofence
  - [ ] 5.3 Verify route generation DOES NOT assign this vehicle
  - [ ] 5.4 Create route with stops INSIDE
  - [ ] 5.5 Verify route generation CAN assign this vehicle

- [ ] 6. Final Checkpoint
  - Verify UI saving
  - Verify route logic

## Dependencies

- Turf.js (npm install @turf/turf)
- Leaflet Draw (or similar)
