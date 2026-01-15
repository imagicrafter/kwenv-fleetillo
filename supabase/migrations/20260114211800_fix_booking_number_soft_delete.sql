-- Migration: Fix Booking Number Soft Delete Uniqueness
-- This migration replaces the unconditional UNIQUE constraint on booking_number
-- with a partial unique index that only enforces uniqueness on non-deleted records.
-- This allows reusing booking numbers from soft-deleted records.

-- Step 1: Drop the existing UNIQUE constraint
ALTER TABLE routeiq.bookings DROP CONSTRAINT IF EXISTS bookings_booking_number_key;

-- Step 2: Create a partial unique index (only enforces uniqueness when deleted_at IS NULL)
CREATE UNIQUE INDEX idx_bookings_booking_number_unique_active 
ON routeiq.bookings (booking_number) 
WHERE deleted_at IS NULL;

-- Optional: Drop the old non-unique index if it exists (we have a better one now)
DROP INDEX IF EXISTS routeiq.idx_bookings_booking_number;

COMMENT ON INDEX routeiq.idx_bookings_booking_number_unique_active IS 
'Partial unique index: booking_number must be unique among non-deleted records only';
