-- Migration: Add referential integrity constraints and validation
-- Description: Enhance database referential integrity with additional constraints,
--              validation functions, and documentation for existing FK relationships
-- Created: 2024-12-28

-- ============================================================================
-- SECTION 1: Validate existing foreign key relationships
-- ============================================================================

-- Add constraint names to existing foreign keys for better error messages
-- Note: Supabase/PostgreSQL automatically names constraints, but we can add
-- comments to document the relationships

COMMENT ON CONSTRAINT bookings_client_id_fkey ON routeiq.bookings IS
    'Foreign key: bookings.client_id -> clients.id (ON DELETE RESTRICT). Prevents deletion of clients with active bookings.';

COMMENT ON CONSTRAINT bookings_service_id_fkey ON routeiq.bookings IS
    'Foreign key: bookings.service_id -> services.id (ON DELETE RESTRICT). Prevents deletion of services with active bookings.';

COMMENT ON CONSTRAINT bookings_vehicle_id_fkey ON routeiq.bookings IS
    'Foreign key: bookings.vehicle_id -> vehicles.id (ON DELETE SET NULL). Allows vehicle deletion by nullifying booking references.';

COMMENT ON CONSTRAINT bookings_parent_booking_id_fkey ON routeiq.bookings IS
    'Foreign key: bookings.parent_booking_id -> bookings.id (ON DELETE CASCADE). Deletes child recurring bookings when parent is deleted.';

COMMENT ON CONSTRAINT maintenance_schedules_vehicle_id_fkey ON routeiq.maintenance_schedules IS
    'Foreign key: maintenance_schedules.vehicle_id -> vehicles.id (ON DELETE CASCADE). Deletes maintenance records when vehicle is deleted.';

COMMENT ON CONSTRAINT routes_vehicle_id_fkey ON routeiq.routes IS
    'Foreign key: routes.vehicle_id -> vehicles.id (ON DELETE RESTRICT). Prevents deletion of vehicles with assigned routes.';

-- ============================================================================
-- SECTION 2: Add validation functions for array-based relationships
-- ============================================================================

-- Function to validate that all UUIDs in routes.stop_sequence reference existing bookings
CREATE OR REPLACE FUNCTION routeiq.validate_route_stop_sequence()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate if stop_sequence is not null and not empty
    IF NEW.stop_sequence IS NOT NULL AND array_length(NEW.stop_sequence, 1) > 0 THEN
        -- Check if all booking IDs in stop_sequence exist in bookings table
        IF EXISTS (
            SELECT 1
            FROM unnest(NEW.stop_sequence) AS booking_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM routeiq.bookings
                WHERE id = booking_id
                AND deleted_at IS NULL
            )
        ) THEN
            RAISE EXCEPTION 'Invalid stop_sequence: One or more booking IDs do not exist or are deleted'
                USING HINT = 'All booking IDs in stop_sequence must reference existing, non-deleted bookings';
        END IF;

        -- Update total_stops to match array length
        NEW.total_stops := array_length(NEW.stop_sequence, 1);
    ELSE
        -- If stop_sequence is null or empty, set total_stops to 0
        NEW.total_stops := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate stop_sequence before insert/update
DROP TRIGGER IF EXISTS trigger_validate_route_stop_sequence ON routeiq.routes;
CREATE TRIGGER trigger_validate_route_stop_sequence
    BEFORE INSERT OR UPDATE OF stop_sequence ON routeiq.routes
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.validate_route_stop_sequence();

COMMENT ON FUNCTION routeiq.validate_route_stop_sequence() IS
    'Validates that all booking IDs in routes.stop_sequence reference existing, non-deleted bookings. Also auto-updates total_stops count.';

-- ============================================================================
-- SECTION 3: Add check constraints for data integrity
-- ============================================================================

-- Ensure route planned times are valid
ALTER TABLE routeiq.routes
    DROP CONSTRAINT IF EXISTS routes_valid_planned_times,
    ADD CONSTRAINT routes_valid_planned_times
        CHECK (planned_end_time IS NULL OR planned_start_time IS NULL OR planned_end_time > planned_start_time);

-- Ensure route actual times are valid
ALTER TABLE routeiq.routes
    DROP CONSTRAINT IF EXISTS routes_valid_actual_times,
    ADD CONSTRAINT routes_valid_actual_times
        CHECK (actual_end_time IS NULL OR actual_start_time IS NULL OR actual_end_time > actual_start_time);

-- Ensure route metrics are non-negative
ALTER TABLE routeiq.routes
    DROP CONSTRAINT IF EXISTS routes_valid_distance,
    ADD CONSTRAINT routes_valid_distance
        CHECK (total_distance_km IS NULL OR total_distance_km >= 0);

ALTER TABLE routeiq.routes
    DROP CONSTRAINT IF EXISTS routes_valid_duration,
    ADD CONSTRAINT routes_valid_duration
        CHECK (total_duration_minutes IS NULL OR total_duration_minutes >= 0);

-- Ensure optimization score is between 0 and 100
ALTER TABLE routeiq.routes
    DROP CONSTRAINT IF EXISTS routes_valid_optimization_score,
    ADD CONSTRAINT routes_valid_optimization_score
        CHECK (optimization_score IS NULL OR (optimization_score >= 0 AND optimization_score <= 100));

-- Ensure capacity values are non-negative
ALTER TABLE routeiq.routes
    DROP CONSTRAINT IF EXISTS routes_valid_capacity_weight,
    ADD CONSTRAINT routes_valid_capacity_weight
        CHECK (
            (planned_capacity_weight IS NULL OR planned_capacity_weight >= 0) AND
            (actual_capacity_weight IS NULL OR actual_capacity_weight >= 0)
        );

ALTER TABLE routeiq.routes
    DROP CONSTRAINT IF EXISTS routes_valid_capacity_volume,
    ADD CONSTRAINT routes_valid_capacity_volume
        CHECK (
            (planned_capacity_volume IS NULL OR planned_capacity_volume >= 0) AND
            (actual_capacity_volume IS NULL OR actual_capacity_volume >= 0)
        );

-- Ensure cost values are non-negative
ALTER TABLE routeiq.routes
    DROP CONSTRAINT IF EXISTS routes_valid_costs,
    ADD CONSTRAINT routes_valid_costs
        CHECK (
            (estimated_cost IS NULL OR estimated_cost >= 0) AND
            (actual_cost IS NULL OR actual_cost >= 0)
        );

-- ============================================================================
-- SECTION 4: Add indexes for foreign key lookups and performance
-- ============================================================================

-- Index for finding bookings by route (useful for cascade operations)
-- Use BTREE (or skip entirely if id is already the PK)
DROP INDEX IF EXISTS idx_bookings_route_lookup;
CREATE INDEX IF NOT EXISTS idx_bookings_route_lookup
    ON routeiq.bookings USING BTREE (id);

-- Composite index for booking validation in routes
CREATE INDEX IF NOT EXISTS idx_bookings_id_deleted
    ON routeiq.bookings (id, deleted_at)
    WHERE deleted_at IS NULL;

-- Index for finding routes by booking ID (reverse lookup using GIN for array)
-- This helps when we need to find all routes containing a specific booking
CREATE INDEX IF NOT EXISTS idx_routes_stop_sequence
    ON routeiq.routes USING GIN (stop_sequence array_ops)
    WHERE deleted_at IS NULL;

-- ============================================================================
-- SECTION 5: Document future foreign key constraints
-- ============================================================================

-- Add comments documenting foreign keys that should be added when users/drivers table is created
COMMENT ON COLUMN routeiq.routes.created_by IS
    'User ID who created the route. FUTURE FK: Should reference users.id when users table is created.';

COMMENT ON COLUMN routeiq.routes.assigned_to IS
    'Driver/user ID assigned to execute the route. FUTURE FK: Should reference users.id or drivers.id when created.';

COMMENT ON COLUMN routeiq.vehicles.assigned_driver_id IS
    'Driver ID assigned to this vehicle. FUTURE FK: Should reference drivers.id when drivers table is created.';

-- ============================================================================
-- SECTION 6: Add helper functions for referential integrity checks
-- ============================================================================

-- Function to check if a booking can be deleted (not used in any routes)
CREATE OR REPLACE FUNCTION routeiq.can_delete_booking(booking_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1
        FROM routeiq.routes
        WHERE booking_uuid = ANY(stop_sequence)
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION routeiq.can_delete_booking(UUID) IS
    'Checks if a booking can be safely deleted (i.e., not referenced in any active route stop_sequence).';

-- Function to get all routes that include a specific booking
CREATE OR REPLACE FUNCTION routeiq.get_routes_for_booking(booking_uuid UUID)
RETURNS TABLE (
    route_id UUID,
    route_name VARCHAR(255),
    route_date DATE,
    status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.route_name,
        r.route_date,
        r.status
    FROM routeiq.routes r
    WHERE booking_uuid = ANY(r.stop_sequence)
    AND r.deleted_at IS NULL
    ORDER BY r.route_date DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION routeiq.get_routes_for_booking(UUID) IS
    'Returns all routes that include the specified booking in their stop_sequence.';

-- Function to validate booking assignment to route (booking must be scheduled/confirmed)
CREATE OR REPLACE FUNCTION routeiq.validate_booking_for_route()
RETURNS TRIGGER AS $$
DECLARE
    invalid_bookings TEXT[];
BEGIN
    -- Only validate if stop_sequence has bookings
    IF NEW.stop_sequence IS NOT NULL AND array_length(NEW.stop_sequence, 1) > 0 THEN
        -- Find bookings that are not in valid status for routing
        SELECT array_agg(b.booking_number)
        INTO invalid_bookings
        FROM unnest(NEW.stop_sequence) AS booking_id
        LEFT JOIN routeiq.bookings b ON b.id = booking_id
        WHERE b.status NOT IN ('confirmed', 'scheduled', 'pending');

        -- If we found any invalid bookings, raise an error
        IF invalid_bookings IS NOT NULL THEN
            RAISE WARNING 'Route contains bookings with non-routable status: %', invalid_bookings
                USING HINT = 'Only bookings with status confirmed, scheduled, or pending can be added to routes';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate booking status (warning only, not blocking)
DROP TRIGGER IF EXISTS trigger_validate_booking_status_for_route ON routeiq.routes;
CREATE TRIGGER trigger_validate_booking_status_for_route
    BEFORE INSERT OR UPDATE OF stop_sequence ON routeiq.routes
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.validate_booking_for_route();

COMMENT ON FUNCTION routeiq.validate_booking_for_route() IS
    'Validates that bookings in route stop_sequence have appropriate status (confirmed, scheduled, or pending). Raises warning for invalid statuses.';

-- ============================================================================
-- SECTION 7: Add cascade behavior documentation
-- ============================================================================

-- Document the cascade behavior for all FK relationships
COMMENT ON TABLE routeiq.bookings IS
    'Stores booking information with enforced referential integrity:
    - client_id: RESTRICT (cannot delete client with bookings)
    - service_id: RESTRICT (cannot delete service with bookings)
    - vehicle_id: SET NULL (can delete vehicle, nullifies booking reference)
    - parent_booking_id: CASCADE (deleting parent deletes all child recurrences)';

COMMENT ON TABLE routeiq.maintenance_schedules IS
    'Stores vehicle maintenance schedules with enforced referential integrity:
    - vehicle_id: CASCADE (deleting vehicle deletes all maintenance records)';

COMMENT ON TABLE routeiq.routes IS
    'Stores optimized route plans with enforced referential integrity:
    - vehicle_id: RESTRICT (cannot delete vehicle with assigned routes)
    - stop_sequence: VALIDATED (all booking IDs must exist and be non-deleted)
    - Future FKs: created_by, assigned_to (when users/drivers table exists)';

-- ============================================================================
-- Summary of Foreign Key Constraints
-- ============================================================================

-- List all foreign key relationships in the database:
--
-- 1. bookings.client_id -> clients.id (ON DELETE RESTRICT)
--    Prevents deletion of clients that have bookings
--
-- 2. bookings.service_id -> services.id (ON DELETE RESTRICT)
--    Prevents deletion of services that have bookings
--
-- 3. bookings.vehicle_id -> vehicles.id (ON DELETE SET NULL)
--    Allows vehicle deletion, sets booking.vehicle_id to NULL
--
-- 4. bookings.parent_booking_id -> bookings.id (ON DELETE CASCADE)
--    Deletes all child recurring bookings when parent is deleted
--
-- 5. maintenance_schedules.vehicle_id -> vehicles.id (ON DELETE CASCADE)
--    Deletes all maintenance records when vehicle is deleted
--
-- 6. routes.vehicle_id -> vehicles.id (ON DELETE RESTRICT)
--    Prevents deletion of vehicles that have assigned routes
--
-- 7. routes.stop_sequence -> bookings.id (VALIDATED via trigger)
--    Ensures all booking IDs in array exist and are not deleted
--
-- Future constraints (when users/drivers tables are created):
-- 8. routes.created_by -> users.id
-- 9. routes.assigned_to -> users.id or drivers.id
-- 10. vehicles.assigned_driver_id -> drivers.id
