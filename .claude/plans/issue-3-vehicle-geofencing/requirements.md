# Requirements: Issue #3 - Vehicle Geofencing

## Introduction
The system currently tracks vehicle locations via coordinates, but lacks spatial context. Fleet managers need to define geographic boundaries (geofences) and monitor when vehicles enter or exit these areas to improve operational oversight, security, and compliance. This feature introduces geofence management, vehicle assignment, and event logging.

## Glossary
- **Geofence**: A virtual geographic boundary, defined by a circle (center + radius) or a polygon (set of vertices).
- **Geofence Event**: A record of a vehicle entering or exiting a geofence.
- **Geofence Assignment**: The link between a vehicle and a geofence it should be monitored against.

## Requirements

### Requirement 1: Geofence Management

**User Story:** As a fleet manager, I want to create, update, and delete geofences, so that I can define important areas like depots, client sites, or restricted zones.

#### Acceptance Criteria
1. WHEN the admin submits a valid geofence definition (Name, Type: Circle|Polygon, Coordinates), THE system SHALL create a new geofence record.
2. IF the type is 'Circle', THEN a center latitude, longitude, and radius (in meters) MUST be provided.
3. IF the type is 'Polygon', THEN a list of at least 3 vertices (lat/long) MUST be provided.
4. THE system SHALL prevent creation of invalid polygons (e.g., self-intersections, if feasible, otherwise basic vertex count check).
5. THE admin SHALL be able to retrieve a list of all defined geofences.
6. THE admin SHALL be able to update or delete an existing geofence.

### Requirement 2: Vehicle-Geofence Assignment

**User Story:** As a fleet manager, I want to assign specific geofences to specific vehicles, so that I only monitor relevant areas for each vehicle.

#### Acceptance Criteria
1. WHEN the admin selects a vehicle and a set of geofences, THE system SHALL store these associations.
2. THE system SHALL support Many-to-Many relationships (One vehicle can have multiple geofences; One geofence can be assigned to multiple vehicles).
3. THE admin SHALL be able to view which geofences are assigned to a specific vehicle.

### Requirement 3: Geofence Event Detection

**User Story:** As a system, I want to detect when a vehicle crosses a geofence boundary, so that I can log the event.

#### Acceptance Criteria
1. WHEN a vehicle's location is updated, THE system SHALL check all assigned geofences for that vehicle.
2. IF a vehicle transitions from "outside" to "inside" a geofence, THE system SHALL create an 'ENTER' event.
3. IF a vehicle transitions from "inside" to "outside" a geofence, THE system SHALL create an 'EXIT' event.
4. THE system SHALL store the event with timestamp, vehicle_id, geofence_id, and event_type.
5. THE system SHALL handle location updates efficiently to minimize latency.

### Requirement 4: Geofence History & Reporting

**User Story:** As a fleet manager, I want to view a history of geofence events, so that I can analyze vehicle movements.

#### Acceptance Criteria
1. THE admin SHALL be able to query geofence events for a specific vehicle over a time range.
2. THE admin SHALL be able to query geofence events for a specific geofence over a time range.
3. THE response SHALL include timestamp, vehicle name, geofence name, and event type.
