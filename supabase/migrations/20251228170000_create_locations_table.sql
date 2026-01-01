-- Migration: Create locations table
-- Description: Create locations table related to clients (optional) and update bookings to reference it.
--              Supports various location types (client, depot, etc.) for routing.
-- Created: 2025-12-28

-- Create locations table
CREATE TABLE IF NOT EXISTS routeiq.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES routeiq.clients(id) ON DELETE CASCADE, -- Nullable for non-client locations
    name VARCHAR(255) NOT NULL DEFAULT 'Main',
    location_type VARCHAR(50) NOT NULL DEFAULT 'client' CHECK (location_type IN ('client', 'depot', 'disposal', 'maintenance', 'home', 'other')),
    
    -- Address fields
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'USA',
    
    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Metadata
    is_primary BOOLEAN DEFAULT false,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Add comments
COMMENT ON TABLE routeiq.locations IS 'Stores multiple locations/addresses for clients and routing points (depots, etc.)';
COMMENT ON COLUMN routeiq.locations.client_id IS 'Reference to the client who owns this location (optional)';
COMMENT ON COLUMN routeiq.locations.location_type IS 'Type of location for routing purposes';

-- Indexes
CREATE INDEX idx_locations_client_id ON routeiq.locations(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_city ON routeiq.locations(city) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_type ON routeiq.locations(location_type) WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER trigger_locations_updated_at
    BEFORE UPDATE ON routeiq.locations
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.update_updated_at_column();

-- Enable RLS
ALTER TABLE routeiq.locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY locations_select_policy ON routeiq.locations
    FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY locations_insert_policy ON routeiq.locations
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY locations_update_policy ON routeiq.locations
    FOR UPDATE TO authenticated USING (deleted_at IS NULL) WITH CHECK (deleted_at IS NULL);

CREATE POLICY locations_delete_policy ON routeiq.locations
    FOR DELETE TO authenticated USING (deleted_at IS NULL);

CREATE POLICY locations_service_role_all ON routeiq.locations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON routeiq.locations TO authenticated;
GRANT ALL ON routeiq.locations TO service_role;

-- Update bookings table to reference locations
ALTER TABLE routeiq.bookings 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES routeiq.locations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_bookings_location_id ON routeiq.bookings(location_id) WHERE deleted_at IS NULL;

COMMENT ON COLUMN routeiq.bookings.location_id IS 'Reference to the specific location where service is performed';
