-- Fix route activity trigger to use route_code instead of route_number
-- The route_number column doesn't exist in the routes table

CREATE OR REPLACE FUNCTION routeiq.trigger_route_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_title VARCHAR(255);
    v_action VARCHAR(50);
    v_severity VARCHAR(20);
    v_vehicle_name VARCHAR(255);
    v_route_ref VARCHAR(100);
BEGIN
    -- Get vehicle name for context
    SELECT name INTO v_vehicle_name FROM routeiq.vehicles WHERE id = COALESCE(NEW.vehicle_id, OLD.vehicle_id);
    -- FIX: Changed from route_number to route_code
    v_route_ref := COALESCE(NEW.route_code, OLD.route_code, LEFT(COALESCE(NEW.id, OLD.id)::text, 8));
    
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_title := 'Route #' || v_route_ref || ' created';
        IF v_vehicle_name IS NOT NULL THEN
            v_title := v_title || ' for ' || v_vehicle_name;
        END IF;
        v_severity := 'info';
        
        PERFORM routeiq.log_activity(
            'route',
            NEW.id,
            v_action,
            v_title,
            NULL,
            NULL,
            NULL,
            jsonb_build_object('status', NEW.status, 'route_date', NEW.route_date),
            v_severity
        );
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check for status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := CASE NEW.status
                WHEN 'completed' THEN 'completed'
                WHEN 'in_progress' THEN 'started'
                ELSE 'status_changed'
            END;
            
            v_severity := CASE NEW.status
                WHEN 'completed' THEN 'success'
                WHEN 'in_progress' THEN 'info'
                ELSE 'info'
            END;
            
            v_title := 'Route #' || v_route_ref || ' ' || 
                CASE NEW.status
                    WHEN 'completed' THEN 'completed'
                    WHEN 'in_progress' THEN 'started'
                    ELSE 'status changed to ' || NEW.status
                END;
            
            IF v_vehicle_name IS NOT NULL AND NEW.status IN ('completed', 'in_progress') THEN
                v_title := v_title || ' by ' || v_vehicle_name;
            END IF;
            
            PERFORM routeiq.log_activity(
                'route',
                NEW.id,
                v_action,
                v_title,
                NULL,
                v_vehicle_name,
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status),
                v_severity
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
