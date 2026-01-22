-- ============================================================================
-- Migration: 20260122000000_add_data_import_schema_enhancements
-- Description: Add schema enhancements for data import functionality
--              - metadata JSONB column on locations for site-specific requirements
--              - crm_status and crm_id columns on bookings for CRM tracking
--              - GT-PUMP service creation
--              - Pre-create 12 drivers from CSV
-- Created: 2026-01-22
-- GitHub Issue: #15 - Schema enhancements for data import
-- ============================================================================

-- ============================================================================
-- ADD METADATA TO LOCATIONS TABLE
-- ============================================================================

-- Add metadata JSONB column to fleetillo.locations
-- Stores location-specific requirements including:
--   capacity_gallons, trap_count, service_frequency_weeks,
--   hose_length_req, requires_tanker, preferred_service_time, capacity_notes
ALTER TABLE fleetillo.locations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_locations_metadata
ON fleetillo.locations USING GIN(metadata);

-- Add comment for documentation
COMMENT ON COLUMN fleetillo.locations.metadata IS 'JSONB storage for location-specific requirements (capacity_gallons, trap_count, service_frequency_weeks, hose_length_req, requires_tanker, preferred_service_time, capacity_notes)';

-- ============================================================================
-- ADD CRM TRACKING TO BOOKINGS TABLE
-- ============================================================================

-- Add crm_status column to track external CRM status
ALTER TABLE fleetillo.bookings
ADD COLUMN IF NOT EXISTS crm_status TEXT;

-- Add crm_id column with unique constraint for duplicate prevention
ALTER TABLE fleetillo.bookings
ADD COLUMN IF NOT EXISTS crm_id TEXT;

-- Add unique index on crm_id to prevent duplicate imports
-- (partial index - only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_crm_id_unique
ON fleetillo.bookings(crm_id)
WHERE crm_id IS NOT NULL;

-- Add regular index for crm_status queries
CREATE INDEX IF NOT EXISTS idx_bookings_crm_status
ON fleetillo.bookings(crm_status)
WHERE deleted_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN fleetillo.bookings.crm_status IS 'External CRM status (e.g., SCHEDULED, DISPATCHED, COMPLETED)';
COMMENT ON COLUMN fleetillo.bookings.crm_id IS 'External Reference ID to prevent duplicate imports (unique constraint)';

-- ============================================================================
-- CREATE GT-PUMP SERVICE
-- ============================================================================

-- Insert GT-PUMP service if it doesn't exist
INSERT INTO fleetillo.services (
    name,
    code,
    service_type,
    description,
    average_duration_minutes,
    status
) VALUES (
    'Grease Trap Pumping',
    'GT-PUMP',
    'pumping',
    'Standard grease trap pumping service',
    30,
    'active'
) ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- PRE-CREATE DRIVERS FROM CSV
-- ============================================================================

-- Insert the 12 drivers from the CSV data if they don't exist
-- Using ON CONFLICT with a check on first_name + last_name combination
-- Note: We create these as active drivers to support historical booking attribution

-- Amari Dinkins
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'Amari', 'Dinkins', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'Amari' AND last_name = 'Dinkins' AND deleted_at IS NULL
);

-- Jiro Prioleau
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'Jiro', 'Prioleau', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'Jiro' AND last_name = 'Prioleau' AND deleted_at IS NULL
);

-- William Emerson
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'William', 'Emerson', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'William' AND last_name = 'Emerson' AND deleted_at IS NULL
);

-- Jamel Lloyd
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'Jamel', 'Lloyd', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'Jamel' AND last_name = 'Lloyd' AND deleted_at IS NULL
);

-- John Elledge
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'John', 'Elledge', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'John' AND last_name = 'Elledge' AND deleted_at IS NULL
);

-- Travis Menius
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'Travis', 'Menius', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'Travis' AND last_name = 'Menius' AND deleted_at IS NULL
);

-- CHRLS Route (treating "CHRLS" as first name, "Route" as last name)
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'CHRLS', 'Route', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'CHRLS' AND last_name = 'Route' AND deleted_at IS NULL
);

-- Upstate Route 2 (treating "Upstate Route" as first name, "2" as last name)
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'Upstate Route', '2', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'Upstate Route' AND last_name = '2' AND deleted_at IS NULL
);

-- OuterBanks Route (treating "OuterBanks" as first name, "Route" as last name)
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'OuterBanks', 'Route', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'OuterBanks' AND last_name = 'Route' AND deleted_at IS NULL
);

-- MB Route (treating "MB" as first name, "Route" as last name)
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'MB', 'Route', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'MB' AND last_name = 'Route' AND deleted_at IS NULL
);

-- Augusta Route (treating "Augusta" as first name, "Route" as last name)
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'Augusta', 'Route', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'Augusta' AND last_name = 'Route' AND deleted_at IS NULL
);

-- WNC Route (treating "WNC" as first name, "Route" as last name)
INSERT INTO fleetillo.drivers (first_name, last_name, status)
SELECT 'WNC', 'Route', 'active'
WHERE NOT EXISTS (
    SELECT 1 FROM fleetillo.drivers
    WHERE first_name = 'WNC' AND last_name = 'Route' AND deleted_at IS NULL
);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
