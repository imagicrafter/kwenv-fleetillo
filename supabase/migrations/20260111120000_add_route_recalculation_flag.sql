-- Migration: Add needs_recalculation flag to routes
-- Description: Flag to indicate when a route's metrics are stale and need recalculation
--              (e.g., after a booking is cancelled/removed from the route)
-- Created: 2026-01-11

-- Add needs_recalculation column to routes table
ALTER TABLE routeiq.routes 
ADD COLUMN IF NOT EXISTS needs_recalculation BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN routeiq.routes.needs_recalculation IS 
'Indicates that the route metrics (duration, distance, polyline) are stale and need recalculation via Google Routes API. Set to true when a booking is removed from the route.';
