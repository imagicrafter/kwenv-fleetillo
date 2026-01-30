-- ============================================================================
-- Migration: 20260120000000_create_fleetillo_schema
-- Description: Create consolidated fleetillo schema from scratch
--              - Renames 'clients' to 'customers' throughout
--              - Combines all previous migrations into single clean schema
--              - Schema name: fleetillo (was routeiq/optiroute)
-- Created: 2026-01-20
-- ============================================================================

-- ============================================================================
-- SCHEMA CREATION
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS fleetillo;

-- Set search path for this migration
SET search_path TO fleetillo, public;

-- ============================================================================
-- HELPER FUNCTION: update_updated_at_column
-- Purpose: Automatically updates the updated_at timestamp on row updates
-- ============================================================================
CREATE OR REPLACE FUNCTION fleetillo.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE: customers (renamed from clients)
-- Purpose: Stores customer/client information including contact details,
--          billing address, service address, and geolocation data.
-- ============================================================================
CREATE TABLE fleetillo.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic customer information
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),

    -- Contact information
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
    service_country VARCHAR(100) DEFAULT 'USA',

    -- Geolocation (for route planning)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Status and Metadata
    status VARCHAR(50) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended', 'archived')),
    notes TEXT,
    tags TEXT[],

    -- Timestamps (soft delete supported)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for customers
CREATE INDEX idx_customers_name ON fleetillo.customers(name);
CREATE INDEX idx_customers_email ON fleetillo.customers(email);
CREATE INDEX idx_customers_status ON fleetillo.customers(status);
CREATE INDEX idx_customers_city ON fleetillo.customers(city);
CREATE INDEX idx_customers_service_city ON fleetillo.customers(service_city);
CREATE INDEX idx_customers_created_at ON fleetillo.customers(created_at);
CREATE INDEX idx_customers_deleted_at ON fleetillo.customers(deleted_at);

-- Trigger for customers
CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON fleetillo.customers
    FOR EACH ROW
    EXECUTE FUNCTION fleetillo.update_updated_at_column();

-- RLS for customers
ALTER TABLE fleetillo.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all customers"
    ON fleetillo.customers FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert customers"
    ON fleetillo.customers FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
    ON fleetillo.customers FOR UPDATE TO authenticated
    USING (deleted_at IS NULL) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
    ON fleetillo.customers FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Service role can do anything with customers"
    ON fleetillo.customers FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Comments for customers
COMMENT ON TABLE fleetillo.customers IS 'Customer records with contact details and service addresses';
COMMENT ON COLUMN fleetillo.customers.status IS 'Customer status: active, inactive, suspended, or archived';
COMMENT ON COLUMN fleetillo.customers.deleted_at IS 'Soft delete timestamp, NULL if not deleted';

-- ============================================================================
-- TABLE: services
-- Purpose: Defines service types offered by the business.
-- ============================================================================
CREATE TABLE fleetillo.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Service identification
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    service_type VARCHAR(100) NOT NULL,
    description TEXT,

    -- Duration (in minutes)
    average_duration_minutes INTEGER NOT NULL DEFAULT 60,
    minimum_duration_minutes INTEGER,
    maximum_duration_minutes INTEGER,

    -- Pricing
    base_price DECIMAL(10, 2),
    price_currency VARCHAR(3) DEFAULT 'USD',
    materials_cost DECIMAL(10, 2) DEFAULT 0,

    -- Scheduling constraints
    requires_appointment BOOLEAN DEFAULT true,
    max_per_day INTEGER,

    -- Requirements
    equipment_required TEXT[],
    skills_required TEXT[],

    -- Status and Metadata
    status VARCHAR(50) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'discontinued')),
    notes TEXT,
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT check_duration_positive CHECK (average_duration_minutes > 0),
    CONSTRAINT check_min_duration CHECK (minimum_duration_minutes IS NULL OR minimum_duration_minutes > 0),
    CONSTRAINT check_max_duration CHECK (maximum_duration_minutes IS NULL OR maximum_duration_minutes >= minimum_duration_minutes),
    CONSTRAINT check_base_price_positive CHECK (base_price IS NULL OR base_price >= 0)
);

-- Indexes for services
CREATE INDEX idx_services_name ON fleetillo.services(name);
CREATE INDEX idx_services_code ON fleetillo.services(code);
CREATE INDEX idx_services_service_type ON fleetillo.services(service_type);
CREATE INDEX idx_services_status ON fleetillo.services(status);
CREATE INDEX idx_services_created_at ON fleetillo.services(created_at);
CREATE INDEX idx_services_deleted_at ON fleetillo.services(deleted_at);

-- Trigger for services
CREATE TRIGGER trigger_services_updated_at
    BEFORE UPDATE ON fleetillo.services
    FOR EACH ROW
    EXECUTE FUNCTION fleetillo.update_updated_at_column();

-- RLS for services
ALTER TABLE fleetillo.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all services"
    ON fleetillo.services FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert services"
    ON fleetillo.services FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update services"
    ON fleetillo.services FOR UPDATE TO authenticated
    USING (deleted_at IS NULL) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete services"
    ON fleetillo.services FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Service role can do anything with services"
    ON fleetillo.services FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Comments for services
COMMENT ON TABLE fleetillo.services IS 'Service type definitions with duration and pricing';
COMMENT ON COLUMN fleetillo.services.materials_cost IS 'Average cost of materials/supplies consumed when performing this service';

-- ============================================================================
-- TABLE: drivers
-- Purpose: Stores driver information including contact details, license info,
--          employment status, and dispatch preferences.
-- ============================================================================
CREATE TABLE fleetillo.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50),
    email VARCHAR(255),
    telegram_chat_id VARCHAR(100),

    -- License Information
    license_number VARCHAR(100),
    license_expiry DATE,
    license_class VARCHAR(20),

    -- Employment Status
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
    hire_date DATE,

    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),

    -- Dispatch Preferences
    preferred_channel VARCHAR(20) DEFAULT 'telegram',
    fallback_enabled BOOLEAN DEFAULT true,

    -- Additional Information
    notes TEXT,
    profile_image_url TEXT,

    -- Timestamps (soft delete supported)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for drivers
CREATE INDEX idx_drivers_status ON fleetillo.drivers(status);
CREATE INDEX idx_drivers_email ON fleetillo.drivers(email);
CREATE INDEX idx_drivers_phone_number ON fleetillo.drivers(phone_number);
CREATE INDEX idx_drivers_deleted_at ON fleetillo.drivers(deleted_at);

-- Trigger for drivers
CREATE TRIGGER trigger_drivers_updated_at
    BEFORE UPDATE ON fleetillo.drivers
    FOR EACH ROW
    EXECUTE FUNCTION fleetillo.update_updated_at_column();

-- RLS for drivers
ALTER TABLE fleetillo.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all drivers"
    ON fleetillo.drivers FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert drivers"
    ON fleetillo.drivers FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update drivers"
    ON fleetillo.drivers FOR UPDATE TO authenticated
    USING (deleted_at IS NULL) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete drivers"
    ON fleetillo.drivers FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Service role can do anything with drivers"
    ON fleetillo.drivers FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Comments for drivers
COMMENT ON TABLE fleetillo.drivers IS 'Driver records with license information and employment status';
COMMENT ON COLUMN fleetillo.drivers.preferred_channel IS 'Preferred notification channel for dispatch messages (telegram, email)';
COMMENT ON COLUMN fleetillo.drivers.fallback_enabled IS 'When true, enables fallback to alternative channels if primary fails';

-- ============================================================================
-- TABLE: locations
-- Purpose: Stores all location types including customer addresses, depots,
--          disposal sites, and vehicle home bases.
-- ============================================================================
CREATE TABLE fleetillo.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to customer (NULL for non-customer locations)
    customer_id UUID REFERENCES fleetillo.customers(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL DEFAULT 'Main',
    location_type VARCHAR(50) NOT NULL DEFAULT 'client'
        CHECK (location_type IN ('client', 'depot', 'disposal', 'maintenance', 'home', 'other')),

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

-- Indexes for locations
CREATE INDEX idx_locations_customer_id ON fleetillo.locations(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_city ON fleetillo.locations(city) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_type ON fleetillo.locations(location_type) WHERE deleted_at IS NULL;

-- Trigger for locations
CREATE TRIGGER trigger_locations_updated_at
    BEFORE UPDATE ON fleetillo.locations
    FOR EACH ROW
    EXECUTE FUNCTION fleetillo.update_updated_at_column();

-- RLS for locations
ALTER TABLE fleetillo.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all locations"
    ON fleetillo.locations FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert locations"
    ON fleetillo.locations FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update locations"
    ON fleetillo.locations FOR UPDATE TO authenticated
    USING (deleted_at IS NULL) WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Authenticated users can delete locations"
    ON fleetillo.locations FOR DELETE TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Service role can do anything with locations"
    ON fleetillo.locations FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Comments for locations
COMMENT ON TABLE fleetillo.locations IS 'Multiple locations/addresses for customers and routing points (depots, etc.)';
COMMENT ON COLUMN fleetillo.locations.customer_id IS 'Reference to the customer who owns this location (optional)';
COMMENT ON COLUMN fleetillo.locations.location_type IS 'Type of location for routing purposes';

-- ============================================================================
-- TABLE: vehicles
-- Purpose: Stores vehicle information, capabilities, and current status.
-- ============================================================================
CREATE TABLE fleetillo.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic vehicle information
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Vehicle identification
    license_plate VARCHAR(50),
    vin VARCHAR(50),

    -- Vehicle specifications
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),

    -- Capacity and constraints
    max_capacity_weight DECIMAL(10, 2),
    max_capacity_volume DECIMAL(10, 2),
    max_passengers INTEGER,

    -- Service type capabilities
    service_types TEXT[] NOT NULL DEFAULT '{}',

    -- Vehicle status
    status VARCHAR(50) DEFAULT 'available'
        CHECK (status IN ('available', 'in_use', 'maintenance', 'out_of_service', 'retired')),

    -- Current location (for tracking)
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMPTZ,

    -- Fuel/energy information
    fuel_type VARCHAR(50)
        CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid', 'propane', 'natural_gas', 'other')),
    fuel_capacity DECIMAL(10, 2),
    current_fuel_level DECIMAL(5, 2),
    fuel_efficiency_mpg DECIMAL(6, 2),

    -- Maintenance tracking
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    odometer_reading DECIMAL(12, 2),

    -- Driver assignment
    assigned_driver_id UUID REFERENCES fleetillo.drivers(id) ON DELETE SET NULL,
    default_driver_id UUID REFERENCES fleetillo.drivers(id) ON DELETE SET NULL,
    -- Metadata
    notes TEXT,
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for vehicles
CREATE INDEX idx_vehicles_name ON fleetillo.vehicles(name);
CREATE INDEX idx_vehicles_license_plate ON fleetillo.vehicles(license_plate);
CREATE INDEX idx_vehicles_status ON fleetillo.vehicles(status);
CREATE INDEX idx_vehicles_service_types ON fleetillo.vehicles USING GIN(service_types);
CREATE INDEX idx_vehicles_fuel_type ON fleetillo.vehicles(fuel_type);
CREATE INDEX idx_vehicles_assigned_driver ON fleetillo.vehicles(assigned_driver_id);
CREATE INDEX idx_vehicles_created_at ON fleetillo.vehicles(created_at);
CREATE INDEX idx_vehicles_deleted_at ON fleetillo.vehicles(deleted_at);

-- Trigger for vehicles
CREATE TRIGGER trigger_vehicles_updated_at
    BEFORE UPDATE ON fleetillo.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION fleetillo.update_updated_at_column();

-- RLS for vehicles
ALTER TABLE fleetillo.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all vehicles"
    ON fleetillo.vehicles FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert vehicles"
    ON fleetillo.vehicles FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
    ON fleetillo.vehicles FOR UPDATE TO authenticated
    USING (deleted_at IS NULL) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete vehicles"
    ON fleetillo.vehicles FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Service role can do anything with vehicles"
    ON fleetillo.vehicles FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Comments for vehicles
COMMENT ON TABLE fleetillo.vehicles IS 'Fleet vehicles with specifications and service capabilities';
COMMENT ON COLUMN fleetillo.vehicles.service_types IS 'Array of service type identifiers this vehicle can perform';
COMMENT ON COLUMN fleetillo.vehicles.fuel_efficiency_mpg IS 'Fuel efficiency in miles per gallon';

-- ============================================================================
-- TABLE: vehicle_locations (Junction Table)
-- Purpose: Links vehicles to their assigned locations (depot, home base, etc.)
-- ============================================================================
CREATE TABLE fleetillo.vehicle_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES fleetillo.vehicles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES fleetillo.locations(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vehicle_id, location_id)
);

-- Indexes for vehicle_locations
CREATE INDEX idx_vehicle_locations_vehicle ON fleetillo.vehicle_locations(vehicle_id);
CREATE INDEX idx_vehicle_locations_location ON fleetillo.vehicle_locations(location_id);
CREATE UNIQUE INDEX idx_vehicle_locations_primary
    ON fleetillo.vehicle_locations(vehicle_id)
    WHERE is_primary = true;

-- RLS for vehicle_locations
ALTER TABLE fleetillo.vehicle_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicle_locations"
    ON fleetillo.vehicle_locations FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert vehicle_locations"
    ON fleetillo.vehicle_locations FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicle_locations"
    ON fleetillo.vehicle_locations FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete vehicle_locations"
    ON fleetillo.vehicle_locations FOR DELETE TO authenticated
    USING (true);

-- Comments for vehicle_locations
COMMENT ON TABLE fleetillo.vehicle_locations IS 'Junction table linking vehicles to their associated locations';
COMMENT ON COLUMN fleetillo.vehicle_locations.is_primary IS 'If true, this is the vehicle default home location';

-- ============================================================================
-- TABLE: routes
-- Purpose: Stores planned and executed routes for vehicles.
-- ============================================================================
CREATE TABLE fleetillo.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Route identification
    route_name VARCHAR(255) NOT NULL,
    route_code VARCHAR(100) UNIQUE,

    -- Vehicle assignment
    vehicle_id UUID REFERENCES fleetillo.vehicles(id) ON DELETE RESTRICT,

    -- Date and time scheduling
    route_date DATE NOT NULL,
    planned_start_time TIME,
    planned_end_time TIME,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,

    -- Route metrics
    total_distance_km DECIMAL(10, 2),
    total_duration_minutes INTEGER,
    total_stops INTEGER DEFAULT 0,
    total_service_time_minutes INTEGER,
    total_travel_time_minutes INTEGER,

    -- Optimization parameters
    optimization_type VARCHAR(50) DEFAULT 'balanced'
        CHECK (optimization_type IN ('time', 'distance', 'balanced', 'priority', 'custom')),
    optimization_score DECIMAL(5, 2),
    algorithm_version VARCHAR(50),
    optimization_metadata JSONB,

    -- Route status
    status VARCHAR(50) DEFAULT 'draft' NOT NULL
        CHECK (status IN ('draft', 'planned', 'optimized', 'assigned', 'dispatched', 'in_progress', 'completed', 'cancelled', 'failed')),

    -- Recalculation flag
    needs_recalculation BOOLEAN DEFAULT FALSE,

    -- Capacity tracking
    planned_capacity_weight DECIMAL(10, 2),
    planned_capacity_volume DECIMAL(10, 2),
    actual_capacity_weight DECIMAL(10, 2),
    actual_capacity_volume DECIMAL(10, 2),

    -- Financial tracking
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    cost_currency VARCHAR(3) DEFAULT 'USD',

    -- Route constraints
    max_duration_minutes INTEGER,
    max_distance_km DECIMAL(10, 2),
    required_skills TEXT[],

    -- Geographic data
    geo_fence_data JSONB,
    stop_sequence UUID[],
    route_geometry JSONB,

    -- Audit
    created_by UUID,
    assigned_to UUID,
    notes TEXT,
    tags TEXT[],

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for routes
CREATE INDEX idx_routes_vehicle_id ON fleetillo.routes(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_route_date ON fleetillo.routes(route_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_status ON fleetillo.routes(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_route_code ON fleetillo.routes(route_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_created_by ON fleetillo.routes(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_assigned_to ON fleetillo.routes(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_vehicle_date ON fleetillo.routes(vehicle_id, route_date) WHERE deleted_at IS NULL;

-- Trigger for routes
CREATE TRIGGER trigger_routes_updated_at
    BEFORE UPDATE ON fleetillo.routes
    FOR EACH ROW
    EXECUTE FUNCTION fleetillo.update_updated_at_column();

-- RLS for routes
ALTER TABLE fleetillo.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all routes"
    ON fleetillo.routes FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert routes"
    ON fleetillo.routes FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update routes"
    ON fleetillo.routes FOR UPDATE TO authenticated
    USING (deleted_at IS NULL) WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Authenticated users can delete routes"
    ON fleetillo.routes FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Service role can do anything with routes"
    ON fleetillo.routes FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Comments for routes
COMMENT ON TABLE fleetillo.routes IS 'Planned and executed routes with vehicle assignments and optimization data';
COMMENT ON COLUMN fleetillo.routes.stop_sequence IS 'Array of booking UUIDs in the order they should be visited';
COMMENT ON COLUMN fleetillo.routes.route_geometry IS 'Geographic path data for the route (polyline)';
COMMENT ON COLUMN fleetillo.routes.needs_recalculation IS 'Indicates route metrics are stale and need recalculation';

-- ============================================================================
-- TABLE: bookings
-- Purpose: Stores service appointments/bookings linking customers to services.
-- ============================================================================
CREATE TABLE fleetillo.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign Keys
    customer_id UUID NOT NULL REFERENCES fleetillo.customers(id) ON DELETE RESTRICT,
    service_id UUID REFERENCES fleetillo.services(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES fleetillo.locations(id) ON DELETE RESTRICT,
    route_id UUID REFERENCES fleetillo.routes(id) ON DELETE SET NULL,

    -- Identification
    booking_number VARCHAR(50) UNIQUE,

    -- Booking type and recurrence
    booking_type VARCHAR(50) NOT NULL DEFAULT 'one_time'
        CHECK (booking_type IN ('one_time', 'recurring')),
    recurrence_pattern VARCHAR(50)
        CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    recurrence_end_date DATE,
    parent_booking_id UUID REFERENCES fleetillo.bookings(id) ON DELETE CASCADE,

    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME,
    scheduled_end_time TIME,
    estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0),

    -- Route ordering
    stop_order INTEGER,

    -- Multi-service support
    service_ids UUID[] DEFAULT ARRAY[]::uuid[],
    service_items JSONB DEFAULT '[]'::jsonb,

    -- Actual timing (for completed bookings)
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    actual_duration_minutes INTEGER CHECK (actual_duration_minutes > 0),

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'confirmed', 'scheduled', 'in_progress',
            'completed', 'cancelled', 'no_show', 'rescheduled'
        )),

    -- Service location override
    service_address_line1 VARCHAR(255),
    service_address_line2 VARCHAR(100),
    service_city VARCHAR(100),
    service_state VARCHAR(100),
    service_postal_code VARCHAR(20),
    service_country VARCHAR(100) DEFAULT 'USA',
    service_latitude DECIMAL(10, 8),
    service_longitude DECIMAL(11, 8),

    -- Pricing
    quoted_price DECIMAL(10, 2) CHECK (quoted_price >= 0),
    final_price DECIMAL(10, 2) CHECK (final_price >= 0),
    price_currency VARCHAR(3) DEFAULT 'USD',

    -- Priority and Notes
    priority VARCHAR(20) DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    special_instructions TEXT,
    internal_notes TEXT,
    cancellation_reason TEXT,

    -- Communication Flags
    customer_notified BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    confirmation_sent BOOLEAN DEFAULT false,

    -- Metadata
    tags TEXT[] DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_scheduled_time CHECK (scheduled_end_time IS NULL OR scheduled_end_time > scheduled_start_time),
    CONSTRAINT valid_actual_time CHECK (actual_end_time IS NULL OR actual_end_time > actual_start_time),
    CONSTRAINT recurring_has_pattern CHECK (
        (booking_type = 'one_time' AND recurrence_pattern IS NULL) OR
        (booking_type = 'recurring' AND recurrence_pattern IS NOT NULL)
    )
);

-- Indexes for bookings
CREATE INDEX idx_bookings_customer_id ON fleetillo.bookings(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_service_id ON fleetillo.bookings(service_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_location_id ON fleetillo.bookings(location_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_route_id ON fleetillo.bookings(route_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_booking_number ON fleetillo.bookings(booking_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_status ON fleetillo.bookings(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_booking_type ON fleetillo.bookings(booking_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_scheduled_date ON fleetillo.bookings(scheduled_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_parent_booking_id ON fleetillo.bookings(parent_booking_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_created_at ON fleetillo.bookings(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_deleted_at ON fleetillo.bookings(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_bookings_scheduled_date_status ON fleetillo.bookings(scheduled_date, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_route_order ON fleetillo.bookings(route_id, stop_order) WHERE deleted_at IS NULL AND route_id IS NOT NULL;
CREATE INDEX idx_bookings_tags ON fleetillo.bookings USING GIN(tags);
CREATE INDEX idx_bookings_service_ids ON fleetillo.bookings USING GIN(service_ids);

-- Trigger for bookings
CREATE TRIGGER trigger_bookings_updated_at
    BEFORE UPDATE ON fleetillo.bookings
    FOR EACH ROW
    EXECUTE FUNCTION fleetillo.update_updated_at_column();

-- RLS for bookings
ALTER TABLE fleetillo.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all bookings"
    ON fleetillo.bookings FOR SELECT TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert bookings"
    ON fleetillo.bookings FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update bookings"
    ON fleetillo.bookings FOR UPDATE TO authenticated
    USING (deleted_at IS NULL) WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Authenticated users can delete bookings"
    ON fleetillo.bookings FOR DELETE TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Service role can do anything with bookings"
    ON fleetillo.bookings FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Grants for bookings
GRANT SELECT, INSERT, UPDATE, DELETE ON fleetillo.bookings TO authenticated;
GRANT ALL ON fleetillo.bookings TO service_role;

-- Comments for bookings
COMMENT ON TABLE fleetillo.bookings IS 'Service appointments linking customers to services';
COMMENT ON COLUMN fleetillo.bookings.customer_id IS 'Reference to the customer who made the booking';
COMMENT ON COLUMN fleetillo.bookings.route_id IS 'Reference to the route this booking is assigned to. NULL means unassigned.';
COMMENT ON COLUMN fleetillo.bookings.stop_order IS 'Order of this booking within its assigned route. 1-indexed.';
COMMENT ON COLUMN fleetillo.bookings.service_ids IS 'Array of service UUIDs for multi-service bookings';
COMMENT ON COLUMN fleetillo.bookings.service_items IS 'JSONB array containing detailed service items';

-- ============================================================================
-- TABLE: dispatches
-- Purpose: Stores dispatch records for route assignment notifications.
-- ============================================================================
CREATE TABLE fleetillo.dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key references
    route_id UUID NOT NULL REFERENCES fleetillo.routes(id),
    driver_id UUID NOT NULL REFERENCES fleetillo.drivers(id),

    -- Dispatch status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sending', 'delivered', 'partial', 'failed')),

    -- Requested communication channels
    requested_channels TEXT[] NOT NULL,

    -- Additional metadata
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for dispatches
CREATE INDEX idx_dispatches_route_id ON fleetillo.dispatches(route_id);
CREATE INDEX idx_dispatches_driver_id ON fleetillo.dispatches(driver_id);
CREATE INDEX idx_dispatches_status ON fleetillo.dispatches(status);
CREATE INDEX idx_dispatches_created_at ON fleetillo.dispatches(created_at);

-- Trigger for dispatches
CREATE TRIGGER trigger_dispatches_updated_at
    BEFORE UPDATE ON fleetillo.dispatches
    FOR EACH ROW
    EXECUTE FUNCTION fleetillo.update_updated_at_column();

-- RLS for dispatches
ALTER TABLE fleetillo.dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all dispatches"
    ON fleetillo.dispatches FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert dispatches"
    ON fleetillo.dispatches FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update dispatches"
    ON fleetillo.dispatches FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete dispatches"
    ON fleetillo.dispatches FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Service role can do anything with dispatches"
    ON fleetillo.dispatches FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Comments for dispatches
COMMENT ON TABLE fleetillo.dispatches IS 'Dispatch records for route assignment notifications sent to drivers';
COMMENT ON COLUMN fleetillo.dispatches.status IS 'Overall dispatch status: pending, sending, delivered, partial, or failed';

-- ============================================================================
-- TABLE: channel_dispatches
-- Purpose: Stores individual channel delivery attempts for each dispatch.
-- ============================================================================
CREATE TABLE fleetillo.channel_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to parent dispatch
    dispatch_id UUID NOT NULL REFERENCES fleetillo.dispatches(id) ON DELETE CASCADE,

    -- Channel type
    channel VARCHAR(20) NOT NULL,

    -- Channel dispatch status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sending', 'delivered', 'failed')),

    -- Provider-specific message identifier
    provider_message_id VARCHAR(255),

    -- Error message if delivery failed
    error_message TEXT,

    -- Delivery timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for channel_dispatches
CREATE INDEX idx_channel_dispatches_dispatch_id ON fleetillo.channel_dispatches(dispatch_id);
CREATE INDEX idx_channel_dispatches_channel ON fleetillo.channel_dispatches(channel);
CREATE INDEX idx_channel_dispatches_status ON fleetillo.channel_dispatches(status);

-- Trigger for channel_dispatches
CREATE TRIGGER trigger_channel_dispatches_updated_at
    BEFORE UPDATE ON fleetillo.channel_dispatches
    FOR EACH ROW
    EXECUTE FUNCTION fleetillo.update_updated_at_column();

-- RLS for channel_dispatches
ALTER TABLE fleetillo.channel_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all channel_dispatches"
    ON fleetillo.channel_dispatches FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert channel_dispatches"
    ON fleetillo.channel_dispatches FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update channel_dispatches"
    ON fleetillo.channel_dispatches FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete channel_dispatches"
    ON fleetillo.channel_dispatches FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Service role can do anything with channel_dispatches"
    ON fleetillo.channel_dispatches FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Comments for channel_dispatches
COMMENT ON TABLE fleetillo.channel_dispatches IS 'Individual channel delivery attempts for each dispatch';

-- ============================================================================
-- TABLE: dispatch_jobs
-- Purpose: Stores scheduled batch dispatch jobs for automated dispatching.
-- ============================================================================
CREATE TYPE fleetillo.dispatch_job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

CREATE TABLE fleetillo.dispatch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Job identification
    name VARCHAR(255) NOT NULL,

    -- Driver assignment
    driver_ids UUID[] NOT NULL DEFAULT '{}',

    -- Scheduling
    scheduled_time TIMESTAMPTZ NOT NULL,

    -- Status tracking
    status fleetillo.dispatch_job_status NOT NULL DEFAULT 'pending',

    -- Execution tracking
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Results
    dispatched_route_ids UUID[] DEFAULT '{}',
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for dispatch_jobs
CREATE INDEX idx_dispatch_jobs_status ON fleetillo.dispatch_jobs(status);
CREATE INDEX idx_dispatch_jobs_scheduled_time ON fleetillo.dispatch_jobs(scheduled_time)
    WHERE status = 'pending';
CREATE INDEX idx_dispatch_jobs_driver_ids ON fleetillo.dispatch_jobs USING GIN(driver_ids);

-- Trigger for dispatch_jobs
CREATE TRIGGER trigger_dispatch_jobs_updated_at
    BEFORE UPDATE ON fleetillo.dispatch_jobs
    FOR EACH ROW
    EXECUTE FUNCTION fleetillo.update_updated_at_column();

-- RLS for dispatch_jobs
ALTER TABLE fleetillo.dispatch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All operations for dispatch_jobs"
    ON fleetillo.dispatch_jobs FOR ALL
    USING (true) WITH CHECK (true);

-- Comments for dispatch_jobs
COMMENT ON TABLE fleetillo.dispatch_jobs IS 'Scheduled batch dispatch jobs for automated route dispatching';
COMMENT ON COLUMN fleetillo.dispatch_jobs.driver_ids IS 'Array of driver UUIDs assigned to this job';

-- ============================================================================
-- TABLE: settings
-- Purpose: Stores application configuration settings.
-- ============================================================================
CREATE TABLE fleetillo.settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for settings
CREATE INDEX idx_settings_key ON fleetillo.settings(key);

-- RLS for settings
ALTER TABLE fleetillo.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can read settings"
    ON fleetillo.settings FOR SELECT
    USING (true);

CREATE POLICY "All users can update settings"
    ON fleetillo.settings FOR UPDATE
    USING (true);

CREATE POLICY "All users can insert settings"
    ON fleetillo.settings FOR INSERT
    WITH CHECK (true);

-- Insert default settings
INSERT INTO fleetillo.settings (key, value, description) VALUES
    ('schedule.dayStartTime', '"08:00"', 'Work day start time (HH:MM format)'),
    ('schedule.dayEndTime', '"17:00"', 'Work day end time (HH:MM format)'),
    ('routing.unitSystem', '"imperial"', 'Unit system: "imperial" (mph) or "metric" (km/h)'),
    ('routing.avgTravelSpeed', '30', 'Average travel speed in km/h'),
    ('routing.trafficBufferPercent', '20', 'Percentage buffer added to travel time for traffic'),
    ('routing.defaultServiceDurationMinutes', '30', 'Default service duration if not specified')
ON CONFLICT (key) DO NOTHING;

-- Comments for settings
COMMENT ON TABLE fleetillo.settings IS 'Application configuration settings';
COMMENT ON COLUMN fleetillo.settings.key IS 'Setting key in dot notation (e.g., routing.avgTravelSpeed)';
COMMENT ON COLUMN fleetillo.settings.value IS 'Setting value as JSON';

-- ============================================================================
-- SCHEMA COMMENTS
-- ============================================================================
COMMENT ON SCHEMA fleetillo IS 'Fleetillo route planning and management application schema';

-- ============================================================================
-- GRANTS: Allow Supabase roles to access the schema
-- ============================================================================
GRANT USAGE ON SCHEMA fleetillo TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA fleetillo TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA fleetillo TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA fleetillo TO anon, authenticated, service_role;

-- Allow future tables/sequences/functions to be accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA fleetillo
    GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA fleetillo
    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA fleetillo
    GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
