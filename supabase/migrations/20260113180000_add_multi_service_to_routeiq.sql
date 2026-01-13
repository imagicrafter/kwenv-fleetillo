-- Migration to add multi-service columns to routeiq.bookings
-- The previous migration only added these to optiroute.bookings
-- This ensures both schemas support multi-service bookings

-- Add multi-service columns to routeiq.bookings
ALTER TABLE routeiq.bookings
ADD COLUMN IF NOT EXISTS service_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS service_ids UUID[] DEFAULT ARRAY[]::uuid[];

-- Add route association columns if missing
ALTER TABLE routeiq.bookings
ADD COLUMN IF NOT EXISTS route_id UUID,
ADD COLUMN IF NOT EXISTS stop_order INTEGER;

-- Make service_id nullable (for multi-service bookings where primary isn't needed)
ALTER TABLE routeiq.bookings
ALTER COLUMN service_id DROP NOT NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_routeiq_bookings_service_ids ON routeiq.bookings USING GIN (service_ids);
CREATE INDEX IF NOT EXISTS idx_routeiq_bookings_route_id ON routeiq.bookings(route_id) WHERE deleted_at IS NULL;

-- Data migration: populate service_ids and service_items from existing service_id
DO $$
DECLARE
    booking_record RECORD;
    service_record RECORD;
    item_json JSONB;
BEGIN
    FOR booking_record IN 
        SELECT b.id, b.service_id, b.quoted_price, b.estimated_duration_minutes
        FROM routeiq.bookings b
        WHERE b.service_id IS NOT NULL 
          AND (b.service_ids IS NULL OR array_length(b.service_ids, 1) IS NULL)
          AND b.deleted_at IS NULL
    LOOP
        -- Fetch service details
        SELECT * INTO service_record FROM routeiq.services WHERE id = booking_record.service_id;
        
        IF FOUND THEN
            item_json := jsonb_build_object(
                'serviceId', service_record.id,
                'name', service_record.name,
                'quantity', 1,
                'unitPrice', COALESCE(booking_record.quoted_price, service_record.base_price, 0),
                'total', COALESCE(booking_record.quoted_price, service_record.base_price, 0),
                'duration', COALESCE(booking_record.estimated_duration_minutes, service_record.average_duration_minutes, 0)
            );
            
            UPDATE routeiq.bookings
            SET 
                service_items = jsonb_build_array(item_json),
                service_ids = ARRAY[booking_record.service_id]
            WHERE id = booking_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Multi-service columns migration completed for routeiq.bookings';
END $$;

-- Add comments
COMMENT ON COLUMN routeiq.bookings.service_ids IS 'Array of service UUIDs for multi-service bookings';
COMMENT ON COLUMN routeiq.bookings.service_items IS 'JSONB array containing detailed service items (serviceId, name, quantity, unitPrice, total, duration)';
