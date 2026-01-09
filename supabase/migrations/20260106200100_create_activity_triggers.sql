-- Migration: Create activity log triggers
-- Description: Automatically log activities when entities are created or updated
-- Created: 2026-01-06

-- Helper function to log activities
CREATE OR REPLACE FUNCTION routeiq.log_activity(
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_action VARCHAR(50),
    p_title VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_actor_name VARCHAR(255) DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_severity VARCHAR(20) DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO routeiq.activity_logs (
        entity_type,
        entity_id,
        action,
        title,
        description,
        actor_name,
        old_value,
        new_value,
        severity
    ) VALUES (
        p_entity_type,
        p_entity_id,
        p_action,
        p_title,
        p_description,
        p_actor_name,
        p_old_value,
        p_new_value,
        p_severity
    )
    RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- BOOKING TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION routeiq.trigger_booking_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_title VARCHAR(255);
    v_action VARCHAR(50);
    v_severity VARCHAR(20);
    v_client_name VARCHAR(255);
    v_booking_ref VARCHAR(100);
BEGIN
    -- Get client name for context
    SELECT name INTO v_client_name FROM routeiq.clients WHERE id = COALESCE(NEW.client_id, OLD.client_id);
    v_booking_ref := COALESCE(NEW.booking_number, OLD.booking_number, LEFT(COALESCE(NEW.id, OLD.id)::text, 8));
    
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
            
            v_title := 'Booking #' || v_booking_ref || ' ' || 
                CASE NEW.status
                    WHEN 'completed' THEN 'completed'
                    WHEN 'cancelled' THEN 'was cancelled'
                    WHEN 'scheduled' THEN 'scheduled on route'
                    WHEN 'in_progress' THEN 'started'
                    WHEN 'confirmed' THEN 'confirmed'
                    ELSE 'status changed to ' || NEW.status
                END;
            
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

DROP TRIGGER IF EXISTS trigger_booking_activity ON routeiq.bookings;
CREATE TRIGGER trigger_booking_activity
    AFTER INSERT OR UPDATE ON routeiq.bookings
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.trigger_booking_activity();

-- ============================================
-- ROUTE TRIGGERS
-- ============================================

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

DROP TRIGGER IF EXISTS trigger_route_activity ON routeiq.routes;
CREATE TRIGGER trigger_route_activity
    AFTER INSERT OR UPDATE ON routeiq.routes
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.trigger_route_activity();

-- ============================================
-- CLIENT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION routeiq.trigger_client_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_title VARCHAR(255);
    v_action VARCHAR(50);
    v_severity VARCHAR(20);
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_title := 'New customer added: ' || NEW.name;
        IF NEW.company_name IS NOT NULL THEN
            v_title := v_title || ' (' || NEW.company_name || ')';
        END IF;
        v_severity := 'success';
        
        PERFORM routeiq.log_activity(
            'client',
            NEW.id,
            v_action,
            v_title,
            NULL,
            NULL,
            NULL,
            jsonb_build_object('name', NEW.name, 'status', NEW.status),
            v_severity
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_client_activity ON routeiq.clients;
CREATE TRIGGER trigger_client_activity
    AFTER INSERT ON routeiq.clients
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.trigger_client_activity();

-- ============================================
-- VEHICLE TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION routeiq.trigger_vehicle_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_title VARCHAR(255);
    v_action VARCHAR(50);
    v_severity VARCHAR(20);
    v_vehicle_name VARCHAR(255);
BEGIN
    v_vehicle_name := COALESCE(NEW.name, OLD.name, 'Vehicle');
    
    IF TG_OP = 'UPDATE' THEN
        -- Check for status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := 'status_changed';
            v_severity := CASE NEW.status
                WHEN 'available' THEN 'success'
                WHEN 'in_use' THEN 'info'
                WHEN 'maintenance' THEN 'warning'
                WHEN 'out_of_service' THEN 'error'
                ELSE 'info'
            END;
            
            v_title := v_vehicle_name || ' marked as ' || REPLACE(NEW.status, '_', ' ');
            
            PERFORM routeiq.log_activity(
                'vehicle',
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

DROP TRIGGER IF EXISTS trigger_vehicle_activity ON routeiq.vehicles;
CREATE TRIGGER trigger_vehicle_activity
    AFTER UPDATE ON routeiq.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.trigger_vehicle_activity();

-- Add comments
COMMENT ON FUNCTION routeiq.log_activity IS 'Helper function to insert activity log entries';
COMMENT ON FUNCTION routeiq.trigger_booking_activity IS 'Automatically logs booking create and status change events';
COMMENT ON FUNCTION routeiq.trigger_route_activity IS 'Automatically logs route create and status change events';
COMMENT ON FUNCTION routeiq.trigger_client_activity IS 'Automatically logs new client creation events';
COMMENT ON FUNCTION routeiq.trigger_vehicle_activity IS 'Automatically logs vehicle status change events';
