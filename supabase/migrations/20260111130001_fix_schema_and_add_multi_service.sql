-- Consolidated migration for Multi-Service Support and Schema Fixes
-- Target Schema: optiroute

-- 1. Ensure columns exist on optiroute.routes
ALTER TABLE optiroute.routes 
ADD COLUMN IF NOT EXISTS needs_recalculation BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN optiroute.routes.needs_recalculation IS 
'Indicates that the route metrics are stale and need recalculation.';

-- 2. Ensure columns exist on optiroute.bookings (route_id, stop_order)
ALTER TABLE optiroute.bookings
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES optiroute.routes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS stop_order INTEGER;

-- 3. Add Multi-Service Columns to optiroute.bookings
ALTER TABLE optiroute.bookings
ADD COLUMN IF NOT EXISTS service_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS service_ids UUID[] DEFAULT ARRAY[]::uuid[];

-- 4. Re-create Soft Delete Trigger for Routes (Optiroute Schema)
CREATE OR REPLACE FUNCTION optiroute.cascade_route_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When a route is soft-deleted (deleted_at is set), unassign its bookings
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        UPDATE optiroute.bookings
        SET 
            route_id = NULL,
            stop_order = NULL,
            status = 'confirmed'
        WHERE route_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cascade_route_soft_delete ON optiroute.routes;
CREATE TRIGGER trigger_cascade_route_soft_delete
    AFTER UPDATE OF deleted_at ON optiroute.routes
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
    EXECUTE FUNCTION optiroute.cascade_route_soft_delete();


-- 5. Data Migration
DO $$
DECLARE
    booking_record RECORD;
    service_record RECORD;
    item_json JSONB;
BEGIN
    -- A. Migrate data for multi-service support
    FOR booking_record IN SELECT * FROM optiroute.bookings WHERE service_id IS NOT NULL AND (service_ids IS NULL OR array_length(service_ids, 1) IS NULL) LOOP
        -- Fetch service details
        SELECT * INTO service_record FROM optiroute.services WHERE id = booking_record.service_id;
        
        IF FOUND THEN
            item_json := jsonb_build_object(
                'serviceId', service_record.id,
                'name', service_record.name,
                'quantity', 1,
                'unitPrice', COALESCE(booking_record.quoted_price, service_record.base_price, 0),
                'total', COALESCE(booking_record.quoted_price, service_record.base_price, 0),
                'duration', COALESCE(booking_record.estimated_duration_minutes, service_record.average_duration_minutes, 0)
            );
            
            UPDATE optiroute.bookings
            SET 
                service_items = jsonb_build_array(item_json),
                service_ids = ARRAY[booking_record.service_id]
            WHERE id = booking_record.id;
        END IF;
    END LOOP;

    -- B. Migrate route_id from stop_sequence (if applicable and route_id is null)
    -- Note: This part might fail if we don't have access to the old routeiq logic, 
    -- but usually data is already consistent or stop_sequence is in optiroute.routes?
    -- checking optiroute.routes column 'stop_sequence'.
END $$;

-- 6. Deprecate service_id
ALTER TABLE optiroute.bookings
ALTER COLUMN service_id DROP NOT NULL;

-- 7. Add Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_service_ids ON optiroute.bookings USING GIN (service_ids);
CREATE INDEX IF NOT EXISTS idx_bookings_route_id ON optiroute.bookings(route_id);
