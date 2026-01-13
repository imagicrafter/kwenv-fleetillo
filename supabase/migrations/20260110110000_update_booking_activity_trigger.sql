-- Migration: Update booking activity trigger to include route and vehicle info
-- Description: Enhance booking activity logs with Route Name/Code and Assigned Vehicle Name
-- Created: 2026-01-10

CREATE OR REPLACE FUNCTION routeiq.trigger_booking_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_title VARCHAR(255);
    v_action VARCHAR(50);
    v_severity VARCHAR(20);
    v_client_name VARCHAR(255);
    v_booking_ref VARCHAR(100);
    v_route_info RECORD; -- To store route name and vehicle name
BEGIN
    -- Get client name for context
    SELECT name INTO v_client_name FROM routeiq.clients WHERE id = COALESCE(NEW.client_id, OLD.client_id);
    v_booking_ref := COALESCE(NEW.booking_number, OLD.booking_number, LEFT(COALESCE(NEW.id, OLD.id)::text, 8));
    
    -- Attempt to find the active route for this booking
    -- We look for a route that includes this booking ID in its stop_sequence
    -- and is not deleted. We pick the most recent one by route_date.
    SELECT 
        r.route_name, -- or use route_code if preferred/available
        v.name AS vehicle_name
    INTO v_route_info
    FROM routeiq.routes r
    LEFT JOIN routeiq.vehicles v ON r.vehicle_id = v.id
    WHERE (NEW.id = ANY(r.stop_sequence) OR OLD.id = ANY(r.stop_sequence))
    AND r.deleted_at IS NULL
    ORDER BY r.route_date DESC
    LIMIT 1;

    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_title := 'Booking #' || v_booking_ref || ' created for ' || COALESCE(v_client_name, 'Unknown');
        
        -- Append route info if available (unlikely on insert, but possible if pre-assigned?)
        -- Usually bookings are inserted then added to routes.
        
        v_severity := 'info';
        
        PERFORM routeiq.log_activity(
            'booking',
            NEW.id,
            v_action,
            v_title,
            NULL,
            NULL,
            NULL,
            jsonb_build_object('status', NEW.status, 'scheduled_date', NEW.scheduled_date),
            v_severity
        );
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check for status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := CASE NEW.status
                WHEN 'completed' THEN 'completed'
                WHEN 'cancelled' THEN 'cancelled'
                WHEN 'scheduled' THEN 'scheduled'
                WHEN 'in_progress' THEN 'started'
                ELSE 'status_changed'
            END;
            
            v_severity := CASE NEW.status
                WHEN 'completed' THEN 'success'
                WHEN 'cancelled' THEN 'warning'
                WHEN 'in_progress' THEN 'info'
                ELSE 'info'
            END;
            
            -- Construct base title
            v_title := 'Booking #' || v_booking_ref || ' ' || 
                CASE NEW.status
                    WHEN 'completed' THEN 'completed'
                    WHEN 'cancelled' THEN 'was cancelled'
                    WHEN 'scheduled' THEN 'scheduled'
                    WHEN 'in_progress' THEN 'started'
                    WHEN 'confirmed' THEN 'confirmed'
                    ELSE 'status changed to ' || NEW.status
                END;
            
            -- Append Route and Vehicle Info if available
            -- Spec: "update the activity logs title with the route name and assigned vehicle"
            IF v_route_info.route_name IS NOT NULL THEN
                 v_title := v_title || ' on Route ' || v_route_info.route_name;
            END IF;
            
            IF v_route_info.vehicle_name IS NOT NULL THEN
                 v_title := v_title || ' (' || v_route_info.vehicle_name || ')';
            END IF;
            
            PERFORM routeiq.log_activity(
                'booking',
                NEW.id,
                v_action,
                v_title,
                NULL,
                NULL,
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status),
                v_severity
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger to ensure it's active (robustly)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'routeiq' AND table_name = 'bookings') THEN
        DROP TRIGGER IF EXISTS trigger_booking_activity ON routeiq.bookings;
        CREATE TRIGGER trigger_booking_activity
            AFTER INSERT OR UPDATE ON routeiq.bookings
            FOR EACH ROW
            EXECUTE FUNCTION routeiq.trigger_booking_activity();
    END IF;
END $$;
