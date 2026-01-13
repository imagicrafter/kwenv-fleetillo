-- Migration: Simplify booking-route relationship
-- Description: Replace booking.vehicle_id with booking.route_id for proper FK cascade
--              When a route is deleted, bookings automatically become free for re-routing
-- Created: 2026-01-11

-- ============================================================================
-- PHASE 1: Add new columns (non-breaking)
-- ============================================================================

-- Add route_id column with FK to routes table
-- ON DELETE SET NULL ensures bookings are freed when their route is deleted
ALTER TABLE routeiq.bookings 
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routeiq.routes(id) ON DELETE SET NULL;

-- Add stop_order column for ordering bookings within a route
-- This replaces the stop_sequence array on routes with a proper relational approach
ALTER TABLE routeiq.bookings 
ADD COLUMN IF NOT EXISTS stop_order INTEGER;

-- Create index on route_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_bookings_route_id 
ON routeiq.bookings(route_id) 
WHERE deleted_at IS NULL;

-- Create composite index for route + order queries
CREATE INDEX IF NOT EXISTS idx_bookings_route_order 
ON routeiq.bookings(route_id, stop_order) 
WHERE deleted_at IS NULL AND route_id IS NOT NULL;

-- ============================================================================
-- PHASE 1b: Migrate existing data from stop_sequence to route_id
-- ============================================================================

-- For each route with a stop_sequence, update the corresponding bookings
-- This uses a DO block to iterate through routes and their stop sequences
DO $$
DECLARE
    route_record RECORD;
    booking_id UUID;
    order_idx INTEGER;
BEGIN
    -- Loop through all routes with non-empty stop_sequence
    FOR route_record IN 
        SELECT id, stop_sequence, vehicle_id 
        FROM routeiq.routes 
        WHERE stop_sequence IS NOT NULL 
          AND array_length(stop_sequence, 1) > 0
          AND deleted_at IS NULL
    LOOP
        order_idx := 1;
        
        -- Loop through each booking ID in the stop_sequence
        FOREACH booking_id IN ARRAY route_record.stop_sequence
        LOOP
            -- Update the booking with route_id and stop_order
            UPDATE routeiq.bookings
            SET route_id = route_record.id,
                stop_order = order_idx
            WHERE id = booking_id
              AND deleted_at IS NULL;
            
            order_idx := order_idx + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Data migration completed: Updated bookings with route_id and stop_order';
END;
$$;

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN routeiq.bookings.route_id IS 'Reference to the route this booking is assigned to. NULL means unassigned/available for routing.';
COMMENT ON COLUMN routeiq.bookings.stop_order IS 'Order of this booking within its assigned route. 1-indexed.';

-- ============================================================================
-- NOTE: vehicle_id removal and stop_sequence deprecation will be done in a 
-- separate migration after verifying the new system works correctly.
-- ============================================================================
