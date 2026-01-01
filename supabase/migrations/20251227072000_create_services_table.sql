-- Migration: 003_create_services_table
-- Description: Create the services table for RouteIQ application
-- Created: 2025-12-27
--
-- This table stores service types, descriptions, and average duration times
-- for scheduling and route optimization purposes.

-- Create the services table
CREATE TABLE IF NOT EXISTS routeiq.services (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Service identification
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,  -- Short code for quick reference (e.g., 'OIL-CHANGE', 'TUNE-UP')

    -- Service categorization
    service_type VARCHAR(100) NOT NULL,  -- Category of service (e.g., 'maintenance', 'repair', 'inspection')

    -- Service details
    description TEXT,

    -- Duration information (in minutes)
    average_duration_minutes INTEGER NOT NULL DEFAULT 60,
    minimum_duration_minutes INTEGER,
    maximum_duration_minutes INTEGER,

    -- Pricing (optional, can be null if pricing is dynamic)
    base_price DECIMAL(10, 2),
    price_currency VARCHAR(3) DEFAULT 'USD',

    -- Scheduling constraints
    requires_appointment BOOLEAN DEFAULT true,
    max_per_day INTEGER,  -- Maximum number of this service type per day per vehicle/technician

    -- Service requirements
    equipment_required TEXT[],  -- Array of equipment/tools needed
    skills_required TEXT[],     -- Array of skills/certifications needed

    -- Status and metadata
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    notes TEXT,
    tags TEXT[],  -- Array of tags for categorization

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT check_duration_positive CHECK (average_duration_minutes > 0),
    CONSTRAINT check_min_duration CHECK (minimum_duration_minutes IS NULL OR minimum_duration_minutes > 0),
    CONSTRAINT check_max_duration CHECK (maximum_duration_minutes IS NULL OR maximum_duration_minutes >= minimum_duration_minutes),
    CONSTRAINT check_base_price_positive CHECK (base_price IS NULL OR base_price >= 0)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_services_name ON routeiq.services(name);
CREATE INDEX IF NOT EXISTS idx_services_code ON routeiq.services(code);
CREATE INDEX IF NOT EXISTS idx_services_service_type ON routeiq.services(service_type);
CREATE INDEX IF NOT EXISTS idx_services_status ON routeiq.services(status);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON routeiq.services(created_at);
CREATE INDEX IF NOT EXISTS idx_services_deleted_at ON routeiq.services(deleted_at);

-- Create trigger to automatically update updated_at (reuses existing function)
DROP TRIGGER IF EXISTS trigger_services_updated_at ON routeiq.services;
CREATE TRIGGER trigger_services_updated_at
    BEFORE UPDATE ON routeiq.services
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE routeiq.services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for authenticated users to see all services
DROP POLICY IF EXISTS "Authenticated users can view all services" ON routeiq.services;
CREATE POLICY "Authenticated users can view all services"
    ON routeiq.services
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Policy for authenticated users to insert services
DROP POLICY IF EXISTS "Authenticated users can insert services" ON routeiq.services;
CREATE POLICY "Authenticated users can insert services"
    ON routeiq.services
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to update services
DROP POLICY IF EXISTS "Authenticated users can update services" ON routeiq.services;
CREATE POLICY "Authenticated users can update services"
    ON routeiq.services
    FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (true);

-- Policy for authenticated users to soft delete services
DROP POLICY IF EXISTS "Authenticated users can delete services" ON routeiq.services;
CREATE POLICY "Authenticated users can delete services"
    ON routeiq.services
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy for service role to bypass RLS (for API access)
DROP POLICY IF EXISTS "Service role can do anything" ON routeiq.services;
CREATE POLICY "Service role can do anything"
    ON routeiq.services
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE routeiq.services IS 'Stores service types, descriptions, and duration times for RouteIQ scheduling and route optimization';
COMMENT ON COLUMN routeiq.services.id IS 'Unique identifier for the service';
COMMENT ON COLUMN routeiq.services.name IS 'Display name of the service';
COMMENT ON COLUMN routeiq.services.code IS 'Short unique code for quick reference';
COMMENT ON COLUMN routeiq.services.service_type IS 'Category of service (e.g., maintenance, repair, inspection)';
COMMENT ON COLUMN routeiq.services.description IS 'Detailed description of the service';
COMMENT ON COLUMN routeiq.services.average_duration_minutes IS 'Average time to complete the service in minutes';
COMMENT ON COLUMN routeiq.services.minimum_duration_minutes IS 'Minimum expected duration in minutes';
COMMENT ON COLUMN routeiq.services.maximum_duration_minutes IS 'Maximum expected duration in minutes';
COMMENT ON COLUMN routeiq.services.base_price IS 'Base price for the service';
COMMENT ON COLUMN routeiq.services.price_currency IS 'Currency for the base price (default: USD)';
COMMENT ON COLUMN routeiq.services.requires_appointment IS 'Whether this service requires an appointment';
COMMENT ON COLUMN routeiq.services.max_per_day IS 'Maximum number of this service type per day';
COMMENT ON COLUMN routeiq.services.equipment_required IS 'Array of equipment/tools needed for the service';
COMMENT ON COLUMN routeiq.services.skills_required IS 'Array of skills/certifications needed';
COMMENT ON COLUMN routeiq.services.status IS 'Service status: active, inactive, or discontinued';
COMMENT ON COLUMN routeiq.services.tags IS 'Array of tags for categorizing services';
COMMENT ON COLUMN routeiq.services.deleted_at IS 'Soft delete timestamp, NULL if not deleted';
