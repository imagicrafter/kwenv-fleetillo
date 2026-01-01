-- Migration: Create vehicle_locations junction table
-- Enables many-to-many relationship between vehicles and locations
-- for flexible route start/end location selection

CREATE TABLE routeiq.vehicle_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id uuid NOT NULL REFERENCES routeiq.vehicles(id) ON DELETE CASCADE,
    location_id uuid NOT NULL REFERENCES routeiq.locations(id) ON DELETE CASCADE,
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(vehicle_id, location_id)
);

-- Index for efficient lookups by vehicle
CREATE INDEX idx_vehicle_locations_vehicle ON routeiq.vehicle_locations(vehicle_id);

-- Index for efficient lookups by location
CREATE INDEX idx_vehicle_locations_location ON routeiq.vehicle_locations(location_id);

-- Ensure only one primary location per vehicle
CREATE UNIQUE INDEX idx_vehicle_locations_primary 
    ON routeiq.vehicle_locations(vehicle_id) 
    WHERE is_primary = true;

-- Enable RLS
ALTER TABLE routeiq.vehicle_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies (match vehicles table policies)
CREATE POLICY "Allow authenticated read access"
    ON routeiq.vehicle_locations FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert"
    ON routeiq.vehicle_locations FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
    ON routeiq.vehicle_locations FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated delete"
    ON routeiq.vehicle_locations FOR DELETE
    TO authenticated
    USING (true);

-- Comment for documentation
COMMENT ON TABLE routeiq.vehicle_locations IS 'Junction table linking vehicles to their associated locations for route planning';
COMMENT ON COLUMN routeiq.vehicle_locations.is_primary IS 'If true, this is the vehicle default home location';

-- Migrate existing home_location_id data to junction table
INSERT INTO routeiq.vehicle_locations (vehicle_id, location_id, is_primary)
SELECT id, home_location_id, true
FROM routeiq.vehicles
WHERE home_location_id IS NOT NULL;
