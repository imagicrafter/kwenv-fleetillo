-- Make scheduled_start_time optional (nullable)
-- This allows bookings to be created without a specific time, 
-- which will be assigned later during route planning

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'routeiq' AND table_name = 'bookings') THEN
        ALTER TABLE routeiq.bookings 
        ALTER COLUMN scheduled_start_time DROP NOT NULL;
    END IF;
END $$;

-- Update the constraint to allow scheduled_start_time to be NULL
-- (the existing constraint already handles this case implicitly)
