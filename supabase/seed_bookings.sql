-- Generate 12 bookings for each of 3 days: 2026-01-19, 2026-01-20, 2026-01-21
-- Total: 36 bookings with status='confirmed' for route planning

-- First, get IDs from related tables using subqueries
DO $$
DECLARE
    client_ids uuid[];
    service_ids uuid[];
    location_ids uuid[];
    booking_date date;
    i integer;
    booking_num integer := 1;
BEGIN
    -- Get available client IDs
    SELECT ARRAY_AGG(id) INTO client_ids 
    FROM routeiq.clients 
    WHERE deleted_at IS NULL 
    LIMIT 12;
    
    -- Get available service IDs
    SELECT ARRAY_AGG(id) INTO service_ids 
    FROM routeiq.services 
    WHERE deleted_at IS NULL 
    LIMIT 5;
    
    -- Get available location IDs
    SELECT ARRAY_AGG(id) INTO location_ids 
    FROM routeiq.locations 
    WHERE deleted_at IS NULL 
    LIMIT 20;
    
    -- Loop through each of the 3 days
    FOREACH booking_date IN ARRAY ARRAY['2026-01-19'::date, '2026-01-20'::date, '2026-01-21'::date]
    LOOP
        -- Create 12 bookings for each day
        FOR i IN 1..12 LOOP
            INSERT INTO routeiq.bookings (
                id,
                client_id,
                service_id,
                location_id,
                vehicle_id,
                scheduled_date,
                scheduled_start_time,
                scheduled_end_time,
                status,
                booking_type,
                special_instructions,
                booking_number,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                client_ids[((i - 1) % COALESCE(array_length(client_ids, 1), 1)) + 1],
                service_ids[((i - 1) % COALESCE(array_length(service_ids, 1), 1)) + 1],
                location_ids[((i - 1) % COALESCE(array_length(location_ids, 1), 1)) + 1],
                NULL, -- No vehicle assigned yet (for route planning)
                booking_date,
                ('08:00:00'::time + (interval '30 minutes' * i)),
                ('08:30:00'::time + (interval '30 minutes' * i)),
                'confirmed', -- Must be confirmed for route planning
                'standard', -- booking_type
                'Test booking #' || booking_num || ' for route planning',
                'BK-' || TO_CHAR(booking_date, 'YYYYMMDD') || '-' || LPAD(i::text, 3, '0'),
                NOW(),
                NOW()
            );
            booking_num := booking_num + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Created % bookings across 3 days', booking_num - 1;
END $$;

-- Verify the bookings were created
SELECT 
    scheduled_date,
    COUNT(*) as booking_count,
    COUNT(DISTINCT client_id) as unique_clients,
    COUNT(DISTINCT location_id) as unique_locations
FROM routeiq.bookings
WHERE scheduled_date IN ('2026-01-19', '2026-01-20', '2026-01-21')
  AND deleted_at IS NULL
GROUP BY scheduled_date
ORDER BY scheduled_date;
