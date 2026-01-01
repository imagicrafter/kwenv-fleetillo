-- Migration: 003_create_vehicles_table
-- Description: Create the vehicles table for RouteIQ application
-- Created: 2025-12-27
--
-- Note: This creates the table in the 'routeiq' schema since Supabase's
-- API configuration restricts accessible schemas. If a separate 'routeiq'
-- schema is desired, it must be exposed via Supabase Dashboard:
-- Settings > API > Exposed Schemas > Add 'routeiq'

-- Create the vehicles table
CREATE TABLE IF NOT EXISTS routeiq.vehicles (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic vehicle information
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Vehicle identification
    license_plate VARCHAR(50),
    vin VARCHAR(50), -- Vehicle Identification Number

    -- Vehicle specifications
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),

    -- Capacity and constraints
    max_capacity_weight DECIMAL(10, 2), -- in pounds or kg
    max_capacity_volume DECIMAL(10, 2), -- in cubic feet or meters
    max_passengers INTEGER,

    -- Service type capabilities (what types of services this vehicle can perform)
    service_types TEXT[] NOT NULL DEFAULT '{}', -- Array of service type identifiers

    -- Vehicle status
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'out_of_service', 'retired')),

    -- Current location (for tracking)
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMPTZ,

    -- Fuel/energy information
    fuel_type VARCHAR(50) CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid', 'propane', 'natural_gas', 'other')),
    fuel_capacity DECIMAL(10, 2), -- in gallons or kWh for electric
    current_fuel_level DECIMAL(5, 2), -- percentage 0-100

    -- Maintenance tracking
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    odometer_reading DECIMAL(12, 2), -- in miles or km

    -- Assignment (optional - can be assigned to a driver/team)
    assigned_driver_id UUID, -- Reference to a future drivers table

    -- Metadata
    notes TEXT,
    tags TEXT[], -- Array of tags for categorization

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vehicles_name ON routeiq.vehicles(name);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON routeiq.vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON routeiq.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_service_types ON routeiq.vehicles USING GIN(service_types);
CREATE INDEX IF NOT EXISTS idx_vehicles_fuel_type ON routeiq.vehicles(fuel_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_driver ON routeiq.vehicles(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON routeiq.vehicles(created_at);
CREATE INDEX IF NOT EXISTS idx_vehicles_deleted_at ON routeiq.vehicles(deleted_at);

-- Create trigger to automatically update updated_at (reuse function from clients table)
DROP TRIGGER IF EXISTS trigger_vehicles_updated_at ON routeiq.vehicles;
CREATE TRIGGER trigger_vehicles_updated_at
    BEFORE UPDATE ON routeiq.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE routeiq.vehicles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for authenticated users to see all vehicles
DROP POLICY IF EXISTS "Authenticated users can view all vehicles" ON routeiq.vehicles;
CREATE POLICY "Authenticated users can view all vehicles"
    ON routeiq.vehicles
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Policy for authenticated users to insert vehicles
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON routeiq.vehicles;
CREATE POLICY "Authenticated users can insert vehicles"
    ON routeiq.vehicles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to update vehicles
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON routeiq.vehicles;
CREATE POLICY "Authenticated users can update vehicles"
    ON routeiq.vehicles
    FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (true);

-- Policy for authenticated users to delete vehicles
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON routeiq.vehicles;
CREATE POLICY "Authenticated users can delete vehicles"
    ON routeiq.vehicles
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy for service role to bypass RLS (for API access)
DROP POLICY IF EXISTS "Service role can do anything with vehicles" ON routeiq.vehicles;
CREATE POLICY "Service role can do anything with vehicles"
    ON routeiq.vehicles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE routeiq.vehicles IS 'Stores vehicle information including specifications and service capabilities for RouteIQ application';
COMMENT ON COLUMN routeiq.vehicles.id IS 'Unique identifier for the vehicle';
COMMENT ON COLUMN routeiq.vehicles.name IS 'Vehicle name or display identifier';
COMMENT ON COLUMN routeiq.vehicles.description IS 'Optional description of the vehicle';
COMMENT ON COLUMN routeiq.vehicles.license_plate IS 'Vehicle license plate number';
COMMENT ON COLUMN routeiq.vehicles.vin IS 'Vehicle Identification Number';
COMMENT ON COLUMN routeiq.vehicles.make IS 'Vehicle manufacturer (e.g., Ford, Toyota)';
COMMENT ON COLUMN routeiq.vehicles.model IS 'Vehicle model (e.g., F-150, Camry)';
COMMENT ON COLUMN routeiq.vehicles.year IS 'Vehicle manufacture year';
COMMENT ON COLUMN routeiq.vehicles.color IS 'Vehicle color';
COMMENT ON COLUMN routeiq.vehicles.max_capacity_weight IS 'Maximum weight capacity in pounds or kg';
COMMENT ON COLUMN routeiq.vehicles.max_capacity_volume IS 'Maximum volume capacity in cubic feet or meters';
COMMENT ON COLUMN routeiq.vehicles.max_passengers IS 'Maximum number of passengers';
COMMENT ON COLUMN routeiq.vehicles.service_types IS 'Array of service type identifiers this vehicle can perform';
COMMENT ON COLUMN routeiq.vehicles.status IS 'Vehicle status: available, in_use, maintenance, out_of_service, or retired';
COMMENT ON COLUMN routeiq.vehicles.current_latitude IS 'Current latitude of the vehicle for tracking';
COMMENT ON COLUMN routeiq.vehicles.current_longitude IS 'Current longitude of the vehicle for tracking';
COMMENT ON COLUMN routeiq.vehicles.last_location_update IS 'Timestamp of last location update';
COMMENT ON COLUMN routeiq.vehicles.fuel_type IS 'Type of fuel: gasoline, diesel, electric, hybrid, propane, natural_gas, or other';
COMMENT ON COLUMN routeiq.vehicles.fuel_capacity IS 'Fuel tank capacity in gallons or kWh for electric';
COMMENT ON COLUMN routeiq.vehicles.current_fuel_level IS 'Current fuel level as percentage (0-100)';
COMMENT ON COLUMN routeiq.vehicles.last_maintenance_date IS 'Date of last maintenance';
COMMENT ON COLUMN routeiq.vehicles.next_maintenance_date IS 'Scheduled date for next maintenance';
COMMENT ON COLUMN routeiq.vehicles.odometer_reading IS 'Current odometer reading in miles or km';
COMMENT ON COLUMN routeiq.vehicles.assigned_driver_id IS 'UUID of assigned driver (references future drivers table)';
COMMENT ON COLUMN routeiq.vehicles.notes IS 'Additional notes about the vehicle';
COMMENT ON COLUMN routeiq.vehicles.tags IS 'Array of tags for categorizing vehicles';
COMMENT ON COLUMN routeiq.vehicles.deleted_at IS 'Soft delete timestamp, NULL if not deleted';
