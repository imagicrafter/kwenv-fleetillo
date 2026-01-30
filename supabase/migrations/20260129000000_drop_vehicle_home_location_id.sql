-- ============================================================================
-- Migration: 20260129000000_drop_vehicle_home_location_id
-- Description: Drop the deprecated home_location_id column from vehicles table.
--              Vehicle home locations are now managed exclusively via the
--              vehicle_locations junction table with is_primary = true
--              (since PR #150/#156).
-- Issue: #157
-- Created: 2026-01-29
-- ============================================================================

DROP INDEX IF EXISTS fleetillo.idx_vehicles_home_location;
ALTER TABLE fleetillo.vehicles DROP COLUMN IF EXISTS home_location_id;
