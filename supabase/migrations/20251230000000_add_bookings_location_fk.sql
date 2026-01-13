DO $$
BEGIN
    -- 1) Add the location_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'routeiq'
        AND table_name = 'bookings'
        AND column_name = 'location_id'
    ) THEN
        ALTER TABLE routeiq.bookings
        ADD COLUMN location_id uuid NULL;
    END IF;

    -- 2) Create the foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'routeiq'
        AND table_name = 'bookings'
        AND constraint_name = 'fk_bookings_location'
    ) THEN
        ALTER TABLE routeiq.bookings
        ADD CONSTRAINT fk_bookings_location
        FOREIGN KEY (location_id)
        REFERENCES routeiq.locations(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 3) Refresh PostgREST cache (optional; Supabase usually handles this)
NOTIFY pgrst, 'reload schema';