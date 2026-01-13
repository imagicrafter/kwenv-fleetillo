-- Generate 12 bookings for each of 3 days: 2026-01-19, 2026-01-20, 2026-01-21
-- Total: 36 bookings with status='confirmed' for route planning
-- Uses multi-service format with service_ids and service_items

-- First, get IDs from related tables using subqueries
DO $$
DECLARE
    client_ids uuid[];
    location_ids uuid[];
    booking_date date;
    i integer;
    booking_num integer := 1;
    -- Service records
    pump_partial_id uuid;
    pump_partial_name text;
    pump_partial_price numeric;
    pump_partial_duration integer;
    pump_full_id uuid;
    pump_full_name text;
    pump_full_price numeric;
    pump_full_duration integer;
    -- Per-booking variables
    selected_client_id uuid;
    selected_location_id uuid;
    use_both_services boolean;
    booking_service_ids uuid[];
    booking_service_items jsonb;
    total_duration integer;
BEGIN
    -- Get available client IDs
    SELECT ARRAY_AGG(id) INTO client_ids 
    FROM routeiq.clients 
    WHERE deleted_at IS NULL 
    LIMIT 12;
    
    -- Get the Pump-Out Only (Partial Clean) service
    SELECT id, name, COALESCE(base_price, 75.00), COALESCE(average_duration_minutes, 30)
    INTO pump_partial_id, pump_partial_name, pump_partial_price, pump_partial_duration
    FROM routeiq.services 
    WHERE deleted_at IS NULL 
      AND name = 'Pump-Out Only (Partial Clean)'
    LIMIT 1;
    
    -- Get the Routine Full Pump-Out & Clean service
    SELECT id, name, COALESCE(base_price, 150.00), COALESCE(average_duration_minutes, 60)
    INTO pump_full_id, pump_full_name, pump_full_price, pump_full_duration
    FROM routeiq.services 
    WHERE deleted_at IS NULL 
      AND name = 'Routine Full Pump-Out & Clean'
    LIMIT 1;
    
    -- Verify services exist
    IF pump_partial_id IS NULL THEN
        RAISE EXCEPTION 'Service "Pump-Out Only (Partial Clean)" not found';
    END IF;
    IF pump_full_id IS NULL THEN
        RAISE EXCEPTION 'Service "Routine Full Pump-Out & Clean" not found';
    END IF;
    
    RAISE NOTICE 'Found services: % (%), % (%)', 
        pump_partial_name, pump_partial_id, 
        pump_full_name, pump_full_id;
    
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
            selected_client_id := client_ids[((i - 1) % COALESCE(array_length(client_ids, 1), 1)) + 1];
            selected_location_id := location_ids[((i - 1) % COALESCE(array_length(location_ids, 1), 1)) + 1];
            
            -- Vary services: 
            -- Every 3rd booking gets BOTH services
            -- Otherwise alternate between partial and full
            use_both_services := (i % 3 = 0);
            
            IF use_both_services THEN
                -- Both services
                booking_service_ids := ARRAY[pump_partial_id, pump_full_id];
                booking_service_items := jsonb_build_array(
                    jsonb_build_object(
                        'serviceId', pump_partial_id,
                        'name', pump_partial_name,
                        'quantity', 1,
                        'unitPrice', pump_partial_price,
                        'total', pump_partial_price,
                        'duration', pump_partial_duration
                    ),
                    jsonb_build_object(
                        'serviceId', pump_full_id,
                        'name', pump_full_name,
                        'quantity', 1,
                        'unitPrice', pump_full_price,
                        'total', pump_full_price,
                        'duration', pump_full_duration
                    )
                );
                total_duration := pump_partial_duration + pump_full_duration;
            ELSIF i % 2 = 0 THEN
                -- Full service only
                booking_service_ids := ARRAY[pump_full_id];
                booking_service_items := jsonb_build_array(
                    jsonb_build_object(
                        'serviceId', pump_full_id,
                        'name', pump_full_name,
                        'quantity', 1,
                        'unitPrice', pump_full_price,
                        'total', pump_full_price,
                        'duration', pump_full_duration
                    )
                );
                total_duration := pump_full_duration;
            ELSE
                -- Partial service only
                booking_service_ids := ARRAY[pump_partial_id];
                booking_service_items := jsonb_build_array(
                    jsonb_build_object(
                        'serviceId', pump_partial_id,
                        'name', pump_partial_name,
                        'quantity', 1,
                        'unitPrice', pump_partial_price,
                        'total', pump_partial_price,
                        'duration', pump_partial_duration
                    )
                );
                total_duration := pump_partial_duration;
            END IF;
            
            INSERT INTO routeiq.bookings (
                id,
                client_id,
                service_id,
                service_ids,
                service_items,
                location_id,
                vehicle_id,
                scheduled_date,
                scheduled_start_time,
                scheduled_end_time,
                estimated_duration_minutes,
                status,
                booking_type,
                special_instructions,
                booking_number,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                selected_client_id,
                booking_service_ids[1], -- Primary service for backwards compatibility
                booking_service_ids,
                booking_service_items,
                selected_location_id,
                NULL, -- No vehicle assigned yet (for route planning)
                booking_date,
                ('08:00:00'::time + (interval '30 minutes' * i)),
                ('08:00:00'::time + (interval '30 minutes' * i) + (total_duration * interval '1 minute')),
                total_duration,
                'confirmed', -- Must be confirmed for route planning
                'standard', -- booking_type
                CASE 
                    WHEN use_both_services THEN 'Multi-service booking #' || booking_num || ' (both services)'
                    ELSE 'Test booking #' || booking_num || ' for route planning'
                END,
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
    COUNT(DISTINCT location_id) as unique_locations,
    SUM(CASE WHEN array_length(service_ids, 1) > 1 THEN 1 ELSE 0 END) as multi_service_bookings
FROM routeiq.bookings
WHERE scheduled_date IN ('2026-01-19', '2026-01-20', '2026-01-21')
  AND deleted_at IS NULL
GROUP BY scheduled_date
ORDER BY scheduled_date;
