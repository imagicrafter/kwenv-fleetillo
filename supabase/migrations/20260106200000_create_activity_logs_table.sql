-- Migration: Create activity_logs table
-- Description: Table for tracking system-wide activity events for dashboard display
-- Created: 2026-01-06

-- Create the routeiq schema if it doesn't exist (safeguard)
CREATE SCHEMA IF NOT EXISTS routeiq;

-- Create activity_logs table in routeiq schema
CREATE TABLE IF NOT EXISTS routeiq.activity_logs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Activity categorization
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('booking', 'route', 'client', 'vehicle')),
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'created', 
        'updated', 
        'completed', 
        'started', 
        'cancelled', 
        'scheduled',
        'status_changed',
        'deleted'
    )),
    
    -- Human-readable description
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Related entities for display
    actor_name VARCHAR(255),
    
    -- Metadata for tracking changes
    old_value JSONB,
    new_value JSONB,
    
    -- Severity/type for styling
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('success', 'warning', 'info', 'error')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON routeiq.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON routeiq.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON routeiq.activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON routeiq.activity_logs(action);

-- Enable Row Level Security
ALTER TABLE routeiq.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Authenticated users can view all activity logs
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON routeiq.activity_logs;
CREATE POLICY "Authenticated users can view activity logs"
    ON routeiq.activity_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role can do anything (for triggers and API access)
DROP POLICY IF EXISTS "Service role can do anything on activity_logs" ON routeiq.activity_logs;
CREATE POLICY "Service role can do anything on activity_logs"
    ON routeiq.activity_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON routeiq.activity_logs TO authenticated;
GRANT ALL ON routeiq.activity_logs TO service_role;

-- Add comments for documentation
COMMENT ON TABLE routeiq.activity_logs IS 'Stores activity events for dashboard display and audit trail';
COMMENT ON COLUMN routeiq.activity_logs.entity_type IS 'Type of entity: booking, route, client, or vehicle';
COMMENT ON COLUMN routeiq.activity_logs.entity_id IS 'UUID of the related entity';
COMMENT ON COLUMN routeiq.activity_logs.action IS 'Action performed: created, updated, completed, etc.';
COMMENT ON COLUMN routeiq.activity_logs.title IS 'Human-readable activity title for display';
COMMENT ON COLUMN routeiq.activity_logs.actor_name IS 'Name of the person/driver who performed the action';
COMMENT ON COLUMN routeiq.activity_logs.severity IS 'Visual indicator: success (green), warning (yellow), info (blue), error (red)';
