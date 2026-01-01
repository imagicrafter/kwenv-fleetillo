-- Create routes table to store generated route plans with vehicle, date, and optimization details
-- Migration: 20251228100000_create_routes_table.sql

-- Create routes table
CREATE TABLE IF NOT EXISTS routeiq.routes (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Route identification
    route_name VARCHAR(255) NOT NULL,
    route_code VARCHAR(100) UNIQUE,

    -- Vehicle assignment
    vehicle_id UUID REFERENCES routeiq.vehicles(id) ON DELETE RESTRICT,

    -- Date and time scheduling
    route_date DATE NOT NULL,
    planned_start_time TIME,
    planned_end_time TIME,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,

    -- Route metrics and optimization details
    total_distance_km DECIMAL(10, 2),
    total_duration_minutes INTEGER,
    total_stops INTEGER DEFAULT 0,

    -- Optimization parameters
    optimization_type VARCHAR(50) DEFAULT 'balanced' CHECK (optimization_type IN ('time', 'distance', 'balanced', 'priority', 'custom')),
    optimization_score DECIMAL(5, 2), -- Score from 0-100 indicating optimization quality
    algorithm_version VARCHAR(50), -- Track which optimization algorithm version was used

    -- Route status
    status VARCHAR(50) DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'planned', 'optimized', 'assigned', 'in_progress', 'completed', 'cancelled', 'failed')),

    -- Capacity tracking
    planned_capacity_weight DECIMAL(10, 2),
    planned_capacity_volume DECIMAL(10, 2),
    actual_capacity_weight DECIMAL(10, 2),
    actual_capacity_volume DECIMAL(10, 2),

    -- Financial tracking
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    cost_currency VARCHAR(3) DEFAULT 'USD',

    -- Route constraints and requirements
    max_duration_minutes INTEGER,
    max_distance_km DECIMAL(10, 2),
    required_skills TEXT[], -- Skills required for this route

    -- Geographic boundaries (for route optimization)
    geo_fence_data JSONB, -- Store polygon/boundary data if needed

    -- Route sequence and stops
    -- Stored as array of booking IDs in order
    stop_sequence UUID[], -- Array of booking IDs in order of visitation

    -- Additional route data
    route_geometry JSONB, -- Store full route path/polyline data
    optimization_metadata JSONB, -- Store additional optimization parameters and results

    -- Notes and metadata
    notes TEXT,
    tags TEXT[],

    -- Audit fields
    created_by UUID, -- User who created the route
    assigned_to UUID, -- Driver/user assigned to execute the route

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX idx_routes_vehicle_id ON routeiq.routes(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_route_date ON routeiq.routes(route_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_status ON routeiq.routes(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_route_code ON routeiq.routes(route_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_created_by ON routeiq.routes(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_assigned_to ON routeiq.routes(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_vehicle_date ON routeiq.routes(vehicle_id, route_date) WHERE deleted_at IS NULL;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_routes_updated_at
    BEFORE UPDATE ON routeiq.routes
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE routeiq.routes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Allow authenticated users to view routes"
    ON routeiq.routes
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Allow authenticated users to insert routes"
    ON routeiq.routes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update routes"
    ON routeiq.routes
    FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Allow authenticated users to delete routes"
    ON routeiq.routes
    FOR DELETE
    TO authenticated
    USING (true);

-- Create policy for service_role to bypass RLS
CREATE POLICY "Allow service_role full access to routes"
    ON routeiq.routes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE routeiq.routes IS 'Stores generated route plans with vehicle assignments, dates, and optimization details';
COMMENT ON COLUMN routeiq.routes.id IS 'Unique identifier for the route';
COMMENT ON COLUMN routeiq.routes.route_name IS 'Human-readable name for the route';
COMMENT ON COLUMN routeiq.routes.route_code IS 'Unique code for the route (e.g., RT-20231215-001)';
COMMENT ON COLUMN routeiq.routes.vehicle_id IS 'Reference to the vehicle assigned to this route';
COMMENT ON COLUMN routeiq.routes.route_date IS 'Date when the route is scheduled to be executed';
COMMENT ON COLUMN routeiq.routes.planned_start_time IS 'Planned start time for the route';
COMMENT ON COLUMN routeiq.routes.planned_end_time IS 'Planned end time for the route';
COMMENT ON COLUMN routeiq.routes.actual_start_time IS 'Actual time the route was started';
COMMENT ON COLUMN routeiq.routes.actual_end_time IS 'Actual time the route was completed';
COMMENT ON COLUMN routeiq.routes.total_distance_km IS 'Total distance of the route in kilometers';
COMMENT ON COLUMN routeiq.routes.total_duration_minutes IS 'Total estimated duration of the route in minutes';
COMMENT ON COLUMN routeiq.routes.total_stops IS 'Total number of stops on the route';
COMMENT ON COLUMN routeiq.routes.optimization_type IS 'Type of optimization applied (time, distance, balanced, priority, custom)';
COMMENT ON COLUMN routeiq.routes.optimization_score IS 'Quality score of the optimization (0-100)';
COMMENT ON COLUMN routeiq.routes.algorithm_version IS 'Version of the optimization algorithm used';
COMMENT ON COLUMN routeiq.routes.status IS 'Current status of the route';
COMMENT ON COLUMN routeiq.routes.stop_sequence IS 'Array of booking IDs in the order they should be visited';
COMMENT ON COLUMN routeiq.routes.route_geometry IS 'Geographic path data for the route (e.g., polyline)';
COMMENT ON COLUMN routeiq.routes.optimization_metadata IS 'Additional optimization parameters and results';
COMMENT ON COLUMN routeiq.routes.created_by IS 'User who created the route';
COMMENT ON COLUMN routeiq.routes.assigned_to IS 'Driver/user assigned to execute the route';
COMMENT ON COLUMN routeiq.routes.deleted_at IS 'Timestamp for soft delete';
