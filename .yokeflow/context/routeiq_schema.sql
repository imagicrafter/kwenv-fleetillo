-- ============================================================================
-- OptiRoute Database Schema
-- Schema Name: optiroute
-- Database: PostgreSQL (via Supabase)
--
-- This file contains the complete DDL for the OptiRoute application.
-- Run this script in the Supabase SQL Editor to create all tables.
-- ============================================================================

-- Create the optiroute schema
CREATE SCHEMA IF NOT EXISTS optiroute;

-- Set search path for the session
SET search_path TO optiroute, public;

-- ============================================================================
-- TABLE: clients
-- Purpose: Stores customer/client information including contact details,
--          billing address, service address, and geolocation data.
-- ============================================================================
CREATE TABLE optiroute.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),

    -- Primary/Billing Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',

    -- Service Address (if different from billing)
    service_address_line1 VARCHAR(255),
    service_address_line2 VARCHAR(255),
    service_city VARCHAR(100),
    service_state VARCHAR(100),
    service_postal_code VARCHAR(20),
    service_country VARCHAR(100),

    -- Geolocation (for route planning)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Status and Metadata
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended', 'archived')),
    notes TEXT,
    tags TEXT[],

    -- Timestamps (soft delete supported)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for clients
CREATE INDEX idx_clients_status ON optiroute.clients(status);
CREATE INDEX idx_clients_city ON optiroute.clients(city);
CREATE INDEX idx_clients_deleted_at ON optiroute.clients(deleted_at);
CREATE INDEX idx_clients_name ON optiroute.clients(name);
CREATE INDEX idx_clients_email ON optiroute.clients(email);

-- ============================================================================
-- TABLE: services
-- Purpose: Defines service types offered by the business.
--          Includes duration estimates, pricing, and scheduling requirements.
-- ============================================================================
CREATE TABLE optiroute.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),                    -- Short code for internal reference
    service_type VARCHAR(50) NOT NULL
        CHECK (service_type IN ('maintenance', 'repair', 'inspection', 'installation', 'consultation', 'other')),
    description TEXT,

    -- Duration (in minutes)
    average_duration_minutes INTEGER NOT NULL DEFAULT 60,
    minimum_duration_minutes INTEGER,
    maximum_duration_minutes INTEGER,

    -- Pricing
    base_price DECIMAL(10, 2),
    price_currency VARCHAR(3) DEFAULT 'USD',

    -- Scheduling constraints
    requires_appointment BOOLEAN NOT NULL DEFAULT true,
    max_per_day INTEGER,                 -- Max number of this service per day per vehicle

    -- Requirements (for vehicle compatibility)
    equipment_required TEXT[],
    skills_required TEXT[],

    -- Status and Metadata
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'discontinued')),
    notes TEXT,
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for services
CREATE INDEX idx_services_status ON optiroute.services(status);
CREATE INDEX idx_services_service_type ON optiroute.services(service_type);
CREATE INDEX idx_services_code ON optiroute.services(code);

-- ============================================================================
-- TABLE: locations
-- Purpose: Stores all location types including client addresses, depots,
--          disposal sites, and vehicle home bases.
-- ============================================================================
CREATE TABLE optiroute.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES optiroute.clients(id),  -- NULL for non-client locations
    name VARCHAR(255) NOT NULL,
    location_type VARCHAR(50) NOT NULL
        CHECK (location_type IN ('client', 'depot', 'disposal', 'maintenance', 'home', 'other')),

    -- Address (required)
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'USA',

    -- Geolocation (for route planning)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Flags
    is_primary BOOLEAN DEFAULT false,    -- Primary location for client/vehicle

    -- Metadata
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for locations
CREATE INDEX idx_locations_client_id ON optiroute.locations(client_id);
CREATE INDEX idx_locations_location_type ON optiroute.locations(location_type);
CREATE INDEX idx_locations_city ON optiroute.locations(city);
CREATE INDEX idx_locations_coordinates ON optiroute.locations(latitude, longitude);

-- ============================================================================
-- TABLE: vehicles
-- Purpose: Stores vehicle information, capabilities, and current status.
--          Vehicles are linked to services via service_types array.
-- ============================================================================
CREATE TABLE optiroute.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,          -- Display name (e.g., "Truck 1", "Van A")
    description TEXT,

    -- Identification
    license_plate VARCHAR(50),
    vin VARCHAR(50),

    -- Specifications
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),

    -- Capacity
    max_capacity_weight DECIMAL(10, 2),  -- In kg or lbs
    max_capacity_volume DECIMAL(10, 2),  -- In cubic meters or feet
    max_passengers INTEGER,

    -- Service Type Capabilities (array of service IDs this vehicle can handle)
    -- Used by route planner to match vehicles to bookings
    service_types TEXT[] NOT NULL DEFAULT '{}',

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'in_use', 'maintenance', 'out_of_service', 'retired')),

    -- Current Location (real-time tracking)
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMPTZ,

    -- Fuel
    fuel_type VARCHAR(20)
        CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid', 'propane', 'natural_gas', 'other')),
    fuel_capacity DECIMAL(10, 2),
    current_fuel_level DECIMAL(10, 2),

    -- Maintenance tracking
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    odometer_reading DECIMAL(10, 2),

    -- Assignment
    assigned_driver_id UUID,             -- Future: link to drivers table
    home_location_id UUID REFERENCES optiroute.locations(id),

    -- Metadata
    notes TEXT,
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for vehicles
CREATE INDEX idx_vehicles_status ON optiroute.vehicles(status);
CREATE INDEX idx_vehicles_service_types ON optiroute.vehicles USING GIN(service_types);
CREATE INDEX idx_vehicles_home_location ON optiroute.vehicles(home_location_id);

-- ============================================================================
-- TABLE: vehicle_locations (Junction Table)
-- Purpose: Links vehicles to their assigned locations (depot, home base, etc.)
--          A vehicle can have multiple assigned locations.
-- ============================================================================
CREATE TABLE optiroute.vehicle_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES optiroute.vehicles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES optiroute.locations(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,    -- Primary/home location for the vehicle
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique vehicle-location pairs
    UNIQUE(vehicle_id, location_id)
);

-- Indexes for vehicle_locations
CREATE INDEX idx_vehicle_locations_vehicle ON optiroute.vehicle_locations(vehicle_id);
CREATE INDEX idx_vehicle_locations_location ON optiroute.vehicle_locations(location_id);

-- ============================================================================
-- TABLE: bookings
-- Purpose: Stores service appointments/bookings linking clients to services.
--          Supports one-time and recurring bookings.
-- ============================================================================
CREATE TABLE optiroute.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Keys (required relationships)
    client_id UUID NOT NULL REFERENCES optiroute.clients(id),
    service_id UUID NOT NULL REFERENCES optiroute.services(id),
    vehicle_id UUID REFERENCES optiroute.vehicles(id),     -- Assigned after route planning
    location_id UUID REFERENCES optiroute.locations(id),   -- Service location

    -- Identification
    booking_number VARCHAR(50),          -- Human-readable booking reference

    -- Booking Type (for recurring bookings)
    booking_type VARCHAR(20) NOT NULL DEFAULT 'one_time'
        CHECK (booking_type IN ('one_time', 'recurring')),
    recurrence_pattern VARCHAR(20)
        CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    recurrence_end_date DATE,
    parent_booking_id UUID REFERENCES optiroute.bookings(id),  -- Link to parent for recurring

    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME NOT NULL,
    scheduled_end_time TIME,
    estimated_duration_minutes INTEGER,

    -- Actual Timing (filled after completion)
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    actual_duration_minutes INTEGER,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),

    -- Service Location Override (if different from client's default location)
    service_address_line1 VARCHAR(255),
    service_address_line2 VARCHAR(255),
    service_city VARCHAR(100),
    service_state VARCHAR(100),
    service_postal_code VARCHAR(20),
    service_country VARCHAR(100),

    -- Geolocation for this specific booking (resolved from address or client location)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Pricing
    quoted_price DECIMAL(10, 2),
    final_price DECIMAL(10, 2),
    price_currency VARCHAR(3) DEFAULT 'USD',

    -- Priority and Notes
    priority VARCHAR(10) NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    special_instructions TEXT,           -- Customer-facing instructions
    internal_notes TEXT,                 -- Internal notes for staff
    cancellation_reason TEXT,

    -- Communication Flags
    client_notified BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    confirmation_sent BOOLEAN DEFAULT false,

    -- Metadata
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for bookings
CREATE INDEX idx_bookings_client_id ON optiroute.bookings(client_id);
CREATE INDEX idx_bookings_service_id ON optiroute.bookings(service_id);
CREATE INDEX idx_bookings_vehicle_id ON optiroute.bookings(vehicle_id);
CREATE INDEX idx_bookings_location_id ON optiroute.bookings(location_id);
CREATE INDEX idx_bookings_scheduled_date ON optiroute.bookings(scheduled_date);
CREATE INDEX idx_bookings_status ON optiroute.bookings(status);
CREATE INDEX idx_bookings_booking_number ON optiroute.bookings(booking_number);
CREATE INDEX idx_bookings_parent ON optiroute.bookings(parent_booking_id);
CREATE INDEX idx_bookings_date_status ON optiroute.bookings(scheduled_date, status);

-- ============================================================================
-- TABLE: routes
-- Purpose: Stores planned and executed routes for vehicles.
--          Contains optimization data and stop sequence.
-- ============================================================================
CREATE TABLE optiroute.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name VARCHAR(255) NOT NULL,    -- Display name (e.g., "Route A - 2024-01-15")
    route_code VARCHAR(50),              -- Short code for reference

    -- Vehicle Assignment
    vehicle_id UUID REFERENCES optiroute.vehicles(id),

    -- Date and Time
    route_date DATE NOT NULL,
    planned_start_time TIME,
    planned_end_time TIME,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,

    -- Metrics (calculated during planning)
    total_distance_km DECIMAL(10, 2),
    total_duration_minutes INTEGER,
    total_stops INTEGER NOT NULL DEFAULT 0,

    -- Optimization settings and results
    optimization_type VARCHAR(20) NOT NULL DEFAULT 'balanced'
        CHECK (optimization_type IN ('time', 'distance', 'balanced', 'priority', 'custom')),
    optimization_score DECIMAL(5, 2),    -- Quality score 0-100
    algorithm_version VARCHAR(50),       -- Version of optimization algorithm used
    optimization_metadata JSONB,         -- Additional optimization data

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'planned', 'optimized', 'assigned', 'in_progress', 'completed', 'cancelled', 'failed')),

    -- Capacity tracking
    planned_capacity_weight DECIMAL(10, 2),
    planned_capacity_volume DECIMAL(10, 2),
    actual_capacity_weight DECIMAL(10, 2),
    actual_capacity_volume DECIMAL(10, 2),

    -- Cost tracking
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    cost_currency VARCHAR(3) DEFAULT 'USD',

    -- Constraints used during planning
    max_duration_minutes INTEGER,
    max_distance_km DECIMAL(10, 2),
    required_skills TEXT[],

    -- Route Data
    stop_sequence UUID[],                -- Ordered array of booking IDs
    route_geometry JSONB,                -- Encoded polyline and leg data from Google Routes API
    geo_fence_data JSONB,                -- Geofencing configuration

    -- Audit
    created_by UUID,
    assigned_to UUID,                    -- Driver/operator assignment
    notes TEXT,
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for routes
CREATE INDEX idx_routes_vehicle_id ON optiroute.routes(vehicle_id);
CREATE INDEX idx_routes_route_date ON optiroute.routes(route_date);
CREATE INDEX idx_routes_status ON optiroute.routes(status);
CREATE INDEX idx_routes_date_vehicle ON optiroute.routes(route_date, vehicle_id);

-- ============================================================================
-- TRIGGER FUNCTION: update_updated_at_column
-- Purpose: Automatically updates the updated_at timestamp on row updates.
-- ============================================================================
CREATE OR REPLACE FUNCTION optiroute.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON optiroute.clients
    FOR EACH ROW EXECUTE FUNCTION optiroute.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON optiroute.services
    FOR EACH ROW EXECUTE FUNCTION optiroute.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON optiroute.locations
    FOR EACH ROW EXECUTE FUNCTION optiroute.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON optiroute.vehicles
    FOR EACH ROW EXECUTE FUNCTION optiroute.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON optiroute.bookings
    FOR EACH ROW EXECUTE FUNCTION optiroute.update_updated_at_column();

CREATE TRIGGER update_routes_updated_at
    BEFORE UPDATE ON optiroute.routes
    FOR EACH ROW EXECUTE FUNCTION optiroute.update_updated_at_column();

-- ============================================================================
-- COMMENTS: Table and column documentation
-- ============================================================================
COMMENT ON SCHEMA optiroute IS 'OptiRoute application schema for route planning and management';

COMMENT ON TABLE optiroute.clients IS 'Customer/client records with contact and address information';
COMMENT ON TABLE optiroute.services IS 'Service type definitions with duration and pricing';
COMMENT ON TABLE optiroute.locations IS 'All location types: client sites, depots, vehicle bases';
COMMENT ON TABLE optiroute.vehicles IS 'Fleet vehicles with capabilities and status';
COMMENT ON TABLE optiroute.vehicle_locations IS 'Junction table linking vehicles to assigned locations';
COMMENT ON TABLE optiroute.bookings IS 'Service appointments linking clients to services';
COMMENT ON TABLE optiroute.routes IS 'Planned and executed routes with optimization data';

COMMENT ON COLUMN optiroute.vehicles.service_types IS 'Array of service IDs this vehicle can perform - used for route planning compatibility';
COMMENT ON COLUMN optiroute.bookings.status IS 'Booking lifecycle: pending -> confirmed -> scheduled -> in_progress -> completed';
COMMENT ON COLUMN optiroute.routes.stop_sequence IS 'Ordered array of booking UUIDs representing the optimized stop order';
COMMENT ON COLUMN optiroute.routes.route_geometry IS 'JSONB containing encoded polyline and leg data from Google Routes API';
