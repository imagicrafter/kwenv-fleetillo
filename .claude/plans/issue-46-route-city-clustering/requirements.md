# Requirements: Issue #46 - Route Planning City Clustering Bug

## Introduction

The route planning algorithm incorrectly assigns locations from distant cities (200+ miles apart) to the same route, making generated routes unusable for actual dispatch operations. This bug affects core route planning functionality and demo quality.

## Glossary

- **Geographic Clustering**: Grouping locations by proximity before route assignment
- **Distance Matrix**: Actual driving distances between locations
- **Vehicle Home Location**: Base location where a vehicle starts/ends routes
- **Time Window**: Scheduled booking times that constrain route sequencing

## Requirements

### Requirement 8: Phased Rollout & Risk Mitigation

**User Story:** As a stakeholder, I want to ensure the new clustering logic works correctly without disrupting current operations, so that I can switch over confidently.

#### Acceptance Criteria

1. THE system SHALL implement the new logic behind a Feature Flag (`ENABLE_CLUSTERING_V2`)
2. THE system SHALL support a "Shadow Mode" where the new algorithm runs in the background and logging results for comparison, while the old logic drives actual routing
3. The "Unassigned Booking" safety net (Req 7) MUST be operational and verified BEFORE the new logic is enabled for production traffic

### Requirement 1: Home-Based Clustering

**User Story:** As a dispatcher, I want routes to be generated based on vehicle home territories, so that vehicles stay in their designated service areas.

#### Acceptance Criteria

1. THE system SHALL group bookings based on proximity to active Vehicle Home Locations
2. THE system SHALL prioritize assigning a booking to a vehicle that "owns" that territory (has a matching Home Location)
3. IF a booking is far from ALL vehicle home locations (e.g., > 50 miles), THE system SHALL flag it as "Out of Service Area" (Unassigned)
4. THE system SHALL NOT use arbitrary density clustering (DBSCAN); it must anchor to defined depots/homes

### Requirement 2: Capacity & Overflow Handling

**User Story:** As a dispatcher, I want to know when a territory happens to have more work than vehicles, instead of forcing poor assignments.

#### Acceptance Criteria

1. IF the volume of bookings in a Home Location's cluster exceeds the capacity of vehicles based there, THE system SHALL flag the excess bookings as "Unassigned - Application Capacity Exceeded"
2. THE system SHALL NOT automatically dispatch a vehicle from a distant city (e.g., 200 miles away) to cover specific local overflow unless explicitly configured
3. THE system SHALL prioritize fulfilling as many bookings as possible within the home territory before flagging overflow

### Requirement 3: Distance Matrix Integration

**User Story:** As a route optimizer, I want actual driving distances used for routing, so that estimates are realistic.

#### Acceptance Criteria

1. THE system SHALL use actual driving distances (not straight-line) for route optimization
2. THE system SHALL integrate with a mapping service (Google Maps or similar) for distance calculations
3. IF distance service is unavailable, THE system SHALL fall back to straight-line with a 1.4x factor

### Requirement 4: Capacity and Time Constraints

**User Story:** As a dispatcher, I want routes that respect work hour limits, so that drivers can complete them.

#### Acceptance Criteria

1. THE system SHALL estimate total route duration including travel and service times
2. IF estimated duration exceeds shift hours, THE system SHALL split into multiple routes
3. THE system SHALL respect scheduled booking time windows when sequencing stops
4. THE system SHALL warn when routes appear infeasible

### Requirement 6: Headless & Batch Operation

**User Story:** As a system, I want to initiate route planning programmatically without user intervention, so that I can schedule batch runs nightly.

#### Acceptance Criteria

1. THE system SHALL provide an API endpoint/function to trigger planning for a date/region without UI interaction
2. THE process SHALL run to completion without blocking on any user prompts or manual Confirmations
3. THE system SHALL return a structured result object containing success status, created routes, and any processing artifacts
4. ALL errors (geocoding failures, timeouts) MUST be caught and logged internally, allowing the broader batch process to proceed

### Requirement 7: Unassigned Booking Workflow (Safety Net)

**User Story:** As a dispatcher, I MUST be alerted to any booking that could not be assigned, so that no customer is missed due to software errors.

#### Acceptance Criteria

1. THE system SHALL place any booking that cannot be validly routed into an "Unassigned" or "Exceptions" queue
2. The route planning execution SHALL return a list of these "blocked" bookings with specific reasons (e.g., "No compatible vehicle", "Outside all clusters", "Geocode failed")
3. THE UI SHALL prominently display a "X Unassigned Boardings" warning if the exception queue is non-empty for the target date
4. The system MUST NOT implicitly drop any booking; every input booking must end up as either "Assigned" or "Flagged Unassigned"
