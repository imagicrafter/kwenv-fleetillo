-- Migration: Add trigger to cascade soft deletes from routes to bookings
-- Description: When a route is soft-deleted (deleted_at is set), clear route_id on associated bookings
-- This ensures bookings become available for re-routing when their route is deleted
-- Created: 2026-01-11

-- Create function to handle route soft delete cascade
CREATE OR REPLACE FUNCTION routeiq.cascade_route_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When a route is soft-deleted (deleted_at changes from NULL to a value)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        -- Clear route_id on all bookings that were assigned to this route
        UPDATE routeiq.bookings
        SET route_id = NULL,
            stop_order = NULL,
            status = 'confirmed',  -- Reset status from 'scheduled' to 'confirmed'
            updated_at = NOW()
        WHERE route_id = OLD.id
          AND deleted_at IS NULL;
        
        RAISE NOTICE 'Cleared route_id for bookings from soft-deleted route: %', OLD.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on routes table
DROP TRIGGER IF EXISTS trigger_route_soft_delete_cascade ON routeiq.routes;

CREATE TRIGGER trigger_route_soft_delete_cascade
    AFTER UPDATE OF deleted_at ON routeiq.routes
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.cascade_route_soft_delete();

-- Add comment for documentation
COMMENT ON FUNCTION routeiq.cascade_route_soft_delete() IS 
'Cascades route soft deletes to bookings by clearing route_id and resetting status to confirmed. This ensures bookings become available for re-routing when their route is deleted.';
