# Requirements: Issue #3 - Vehicle Geofencing

## Introduction

This document defines the requirements for implementing vehicle geofencing to constrain route assignments. Vehicles will be assigned geographic zones (polygons) where they are allowed to operate. The route optimization engine must respect these boundaries when assigning vehicles to routes.

## Glossary

- **Geofence**: A virtual geographic boundary (polygon) defined by a set of coordinates
- **Operational Zone**: The specific geofence assigned to a vehicle
- **Containment Check**: Verifying if a location (lat/lng) falls within a polygon

## Requirements

### Requirement 1: Database Schema

**User Story:** As a system, I need to store geofence data for each vehicle, so that it persists.

#### Acceptance Criteria

1. THE system SHALL add a `geofence` column to the `vehicles` table
2. The column SHALL store GeoJSON Polygon data (or null if no geofence)
3. THE system SHALL support complex polygons (multiple points)

### Requirement 2: Vehicle Management UI

**User Story:** As a fleet manager, I want to draw a geofence on a map for each vehicle, so that I can define its operating area.

#### Acceptance Criteria

1. THE Vehicle Edit Modal SHALL include a map interface
2. THE UI SHALL allow drawing a polygon on the map
3. THE UI SHALL allow editing existing polygons
4. THE UI SHALL allow clearing the geofence (unrestricted vehicle)
5. THE UI SHALL save the drawn polygon as GeoJSON to the backend

### Requirement 3: Route Assignment Logic

**User Story:** As a dispatcher, I want vehicles to only receive routes within their geofence, so that they stay in their territory.

#### Acceptance Criteria

1. WHEN assigning a route to a vehicle, THE system SHALL check if all route stops are within the vehicle's geofence
2. IF a vehicle has a geofence and a stop is outside it, THE system SHALL NOT assign that vehicle
3. IF a vehicle has no geofence, THE system SHALL treat it as unrestricted (allow any route)
4. THE system SHALL prefer vehicles with smaller geofences (more specific) over unrestricted ones when multiple matches exist

### Requirement 4: Visualization

**User Story:** As a user, I want to see vehicle geofences on the map, so that I understand their territories.

#### Acceptance Criteria

1. The Vehicles list/map view SHALL display the geofences of selected vehicles
2. The Route Planning map SHALL optionally show vehicle geofences overlays
