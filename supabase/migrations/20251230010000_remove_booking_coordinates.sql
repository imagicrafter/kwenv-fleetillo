-- Migration: Remove service_latitude and service_longitude from bookings table
-- These coordinates are now retrieved from the locations table via location_id
-- Run this AFTER verifying that:
--   1. All locations have latitude/longitude populated
--   2. All bookings have a valid location_id
--   3. Route planning is working with location-based coordinates

-- ============================================================================
-- PRE-MIGRATION VERIFICATION QUERIES
-- Run these first to ensure data integrity
-- ============================================================================

-- Check how many locations are missing coordinates
-- SELECT COUNT(*) as locations_without_coords 
-- FROM routeiq.locations 
-- WHERE deleted_at IS NULL 
--   AND (latitude IS NULL OR longitude IS NULL);

-- Check how many bookings are missing location_id
-- SELECT COUNT(*) as bookings_without_location 
-- FROM routeiq.bookings 
-- WHERE deleted_at IS NULL 
--   AND location_id IS NULL;

-- ============================================================================
-- MIGRATION
-- ============================================================================

BEGIN;

-- Optional: Create backup table before dropping columns
CREATE TABLE IF NOT EXISTS routeiq.bookings_coords_backup AS
SELECT id, service_latitude, service_longitude 
FROM routeiq.bookings 
WHERE service_latitude IS NOT NULL 
   OR service_longitude IS NOT NULL;

-- Drop the coordinate columns from bookings
ALTER TABLE routeiq.bookings DROP COLUMN IF EXISTS service_latitude;
ALTER TABLE routeiq.bookings DROP COLUMN IF EXISTS service_longitude;

-- Also drop the address columns if you want to fully rely on locations
-- (Uncomment if desired - these might still be useful for display purposes)
-- ALTER TABLE routeiq.bookings DROP COLUMN IF EXISTS service_address_line1;
-- ALTER TABLE routeiq.bookings DROP COLUMN IF EXISTS service_address_line2;
-- ALTER TABLE routeiq.bookings DROP COLUMN IF EXISTS service_city;
-- ALTER TABLE routeiq.bookings DROP COLUMN IF EXISTS service_state;
-- ALTER TABLE routeiq.bookings DROP COLUMN IF EXISTS service_postal_code;
-- ALTER TABLE routeiq.bookings DROP COLUMN IF EXISTS service_country;

COMMIT;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To restore the columns and data:
-- 
-- BEGIN;
-- 
-- ALTER TABLE routeiq.bookings ADD COLUMN IF NOT EXISTS service_latitude NUMERIC(10, 8);
-- ALTER TABLE routeiq.bookings ADD COLUMN IF NOT EXISTS service_longitude NUMERIC(11, 8);
-- 
-- UPDATE routeiq.bookings b
-- SET service_latitude = backup.service_latitude,
--     service_longitude = backup.service_longitude
-- FROM routeiq.bookings_coords_backup backup
-- WHERE b.id = backup.id;
-- 
-- COMMIT;
-- 
-- DROP TABLE IF EXISTS routeiq.bookings_coords_backup;
