-- ============================================================================
-- Migration: 20260121000000_add_tags_to_locations_and_drivers
-- Description: Add tags TEXT[] column to locations and drivers tables
--              for consistent tagging across all entities
-- Created: 2026-01-21
-- GitHub Issue: #39 - Add tags column to locations and drivers tables
-- ============================================================================

-- ============================================================================
-- ADD TAGS TO LOCATIONS TABLE
-- ============================================================================

-- Add tags column to fleetillo.locations
ALTER TABLE fleetillo.locations
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add GIN index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_locations_tags
ON fleetillo.locations USING GIN(tags);

-- Add comment for documentation
COMMENT ON COLUMN fleetillo.locations.tags IS 'Array of tags for categorizing locations';

-- ============================================================================
-- ADD TAGS TO DRIVERS TABLE
-- ============================================================================

-- Add tags column to fleetillo.drivers
ALTER TABLE fleetillo.drivers
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add GIN index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_drivers_tags
ON fleetillo.drivers USING GIN(tags);

-- Add comment for documentation
COMMENT ON COLUMN fleetillo.drivers.tags IS 'Array of tags for categorizing drivers';
