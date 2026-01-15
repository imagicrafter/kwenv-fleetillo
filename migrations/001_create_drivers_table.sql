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
CREATE TABLE IF NOT EXISTS optiroute.drivers (
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
CREATE INDEX idx_drivers_status ON optiroute.drivers(status);
CREATE INDEX idx_drivers_email ON optiroute.drivers(email);
CREATE INDEX idx_drivers_phone_number ON optiroute.drivers(phone_number);
CREATE INDEX idx_drivers_deleted_at ON optiroute.drivers(deleted_at);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON optiroute.drivers
    FOR EACH ROW EXECUTE FUNCTION optiroute.update_updated_at_column();

-- ============================================================================
-- VEHICLE TABLE UPDATES: Link vehicles to drivers
-- ============================================================================
-- Add default_driver_id column to vehicles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'optiroute'
        AND table_name = 'vehicles'
        AND column_name = 'default_driver_id'
    ) THEN
        ALTER TABLE optiroute.vehicles
        ADD COLUMN default_driver_id UUID REFERENCES optiroute.drivers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraint to vehicles table for assigned_driver_id
-- Note: assigned_driver_id column already exists in vehicles table
ALTER TABLE optiroute.vehicles
ADD CONSTRAINT fk_vehicles_driver
FOREIGN KEY (assigned_driver_id)
REFERENCES optiroute.drivers(id)
ON DELETE SET NULL;

-- ============================================================================
-- COMMENTS: Table and column documentation
-- ============================================================================
COMMENT ON TABLE optiroute.drivers IS 'Driver records with license information and employment status';
COMMENT ON COLUMN optiroute.drivers.status IS 'Driver status: active, inactive, on_leave, or terminated';
COMMENT ON COLUMN optiroute.drivers.license_expiry IS 'Expiration date for driver license - used for compliance tracking';
COMMENT ON COLUMN optiroute.drivers.profile_image_url IS 'URL to driver profile photo/avatar';
