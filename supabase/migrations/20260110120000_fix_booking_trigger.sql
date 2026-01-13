-- Migration: Fix booking activity trigger logic
-- Created: 2026-01-10 12:00:00

CREATE OR REPLACE FUNCTION routeiq.trigger_booking_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_title VARCHAR(255);
    v_action VARCHAR(50);
    v_severity VARCHAR(20);
    v_client_name VARCHAR(255);
    v_booking_ref VARCHAR(100);
    v_route_info RECORD; -- To store route name and vehicle name
    v_target_id UUID;
BEGIN
    v_target_id := COALESCE(NEW.id, OLD.id);

    -- Get client name for context
    SELECT name INTO v_client_name FROM routeiq.clients WHERE id = COALESCE(NEW.client_id, OLD.client_id);
    v_booking_ref := COALESCE(NEW.booking_number, OLD.booking_number, LEFT(v_target_id::text, 8));
    
    -- Attempt to find the active route for this booking
    -- Use array containment operator for robustness
    SELECT 
        r.route_name,
        v.name AS vehicle_name
    INTO v_route_info
    FROM routeiq.routes r
    LEFT JOIN routeiq.vehicles v ON r.vehicle_id = v.id
    WHERE r.stop_sequence @> ARRAY[v_target_id]
    AND r.deleted_at IS NULL
    ORDER BY r.route_date DESC
    LIMIT 1;

    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_title := 'Booking #' || v_booking_ref || ' created for ' || COALESCE(v_client_name, 'Unknown');
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
