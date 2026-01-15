-- ============================================================================
-- Migration: 001_create_drivers_table
-- Description: Create the drivers table for driver management
-- Created: 2026-01-15
-- ============================================================================

-- ============================================================================
-- TABLE: drivers
-- Purpose: Stores driver information including contact details, license info,
--          employment status, and emergency contacts.
-- ============================================================================
CREATE TABLE IF NOT EXISTS routeiq.drivers (
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

    -- Additional Information
    notes TEXT,
    profile_image_url TEXT,

    -- Timestamps (soft delete supported)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES: drivers table
-- ============================================================================
CREATE INDEX idx_drivers_status ON routeiq.drivers(status);
CREATE INDEX idx_drivers_email ON routeiq.drivers(email);
CREATE INDEX idx_drivers_phone_number ON routeiq.drivers(phone_number);
CREATE INDEX idx_drivers_deleted_at ON routeiq.drivers(deleted_at);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON routeiq.drivers
    FOR EACH ROW EXECUTE FUNCTION routeiq.update_updated_at_column();

-- ============================================================================
-- VEHICLE TABLE UPDATES: Link vehicles to drivers
-- ============================================================================
-- Add default_driver_id column to vehicles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'routeiq'
        AND table_name = 'vehicles'
        AND column_name = 'default_driver_id'
    ) THEN
        ALTER TABLE routeiq.vehicles
        ADD COLUMN default_driver_id UUID REFERENCES routeiq.drivers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraint to vehicles table for assigned_driver_id
-- Note: assigned_driver_id column already exists in vehicles table
ALTER TABLE routeiq.vehicles
ADD CONSTRAINT fk_vehicles_driver
FOREIGN KEY (assigned_driver_id)
REFERENCES routeiq.drivers(id)
ON DELETE SET NULL;

-- ============================================================================
-- COMMENTS: Table and column documentation
-- ============================================================================
COMMENT ON TABLE routeiq.drivers IS 'Driver records with license information and employment status';
COMMENT ON COLUMN routeiq.drivers.status IS 'Driver status: active, inactive, on_leave, or terminated';
COMMENT ON COLUMN routeiq.drivers.license_expiry IS 'Expiration date for driver license - used for compliance tracking';
COMMENT ON COLUMN routeiq.drivers.profile_image_url IS 'URL to driver profile photo/avatar';

-- ============================================================================
-- ROW LEVEL SECURITY: drivers table
-- ============================================================================
ALTER TABLE routeiq.drivers ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view all drivers
DROP POLICY IF EXISTS "Authenticated users can view all drivers" ON routeiq.drivers;
CREATE POLICY "Authenticated users can view all drivers"
    ON routeiq.drivers
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Policy for authenticated users to insert drivers
DROP POLICY IF EXISTS "Authenticated users can insert drivers" ON routeiq.drivers;
CREATE POLICY "Authenticated users can insert drivers"
    ON routeiq.drivers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to update drivers
DROP POLICY IF EXISTS "Authenticated users can update drivers" ON routeiq.drivers;
CREATE POLICY "Authenticated users can update drivers"
    ON routeiq.drivers
    FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (true);

-- Policy for authenticated users to delete drivers
DROP POLICY IF EXISTS "Authenticated users can delete drivers" ON routeiq.drivers;
CREATE POLICY "Authenticated users can delete drivers"
    ON routeiq.drivers
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy for service role to bypass RLS (for API access)
DROP POLICY IF EXISTS "Service role can do anything with drivers" ON routeiq.drivers;
CREATE POLICY "Service role can do anything with drivers"
    ON routeiq.drivers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
