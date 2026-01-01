-- 1) Add the column
ALTER TABLE routeiq.bookings
ADD COLUMN location_id uuid NULL;

-- 2) Create the foreign key
ALTER TABLE routeiq.bookings
ADD CONSTRAINT fk_bookings_location
FOREIGN KEY (location_id)
REFERENCES routeiq.locations(id)
ON DELETE SET NULL;

-- 3) Refresh PostgREST cache (optional; Supabase usually handles this)
NOTIFY pgrst, 'reload schema';