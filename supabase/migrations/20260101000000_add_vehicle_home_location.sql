-- Migration: Add home_location_id to vehicles table
-- This allows each vehicle to have an assigned home/depot location
-- which is used as the default start/end point for route planning

ALTER TABLE routeiq.vehicles 
ADD COLUMN home_location_id uuid REFERENCES routeiq.locations(id);

-- Add index for faster lookups
CREATE INDEX idx_vehicles_home_location_id ON routeiq.vehicles(home_location_id);

-- Add comment for documentation
COMMENT ON COLUMN routeiq.vehicles.home_location_id IS 'Reference to the vehicle home/depot location used as default start/end for routes';
