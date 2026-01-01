-- Create maintenance_schedules table
-- This table tracks maintenance schedules and records for vehicles

CREATE TABLE IF NOT EXISTS routeiq.maintenance_schedules (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    vehicle_id UUID NOT NULL REFERENCES routeiq.vehicles(id) ON DELETE CASCADE,

    -- Maintenance information
    maintenance_type VARCHAR(100) NOT NULL,
    description TEXT,

    -- Scheduling information
    scheduled_date DATE NOT NULL,
    due_date DATE,
    completed_date DATE,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',

    -- Odometer tracking
    odometer_at_maintenance DECIMAL(10, 2),
    next_maintenance_odometer DECIMAL(10, 2),

    -- Cost tracking
    cost DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Service provider
    performed_by VARCHAR(255),
    service_provider VARCHAR(255),

    -- Additional information
    notes TEXT,
    attachments TEXT[], -- URLs or file paths to maintenance receipts, reports, etc.

    -- Standard timestamp columns
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT maintenance_schedules_status_check
        CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled')),
    CONSTRAINT maintenance_schedules_dates_check
        CHECK (completed_date IS NULL OR completed_date >= scheduled_date),
    CONSTRAINT maintenance_schedules_odometer_check
        CHECK (odometer_at_maintenance IS NULL OR odometer_at_maintenance >= 0),
    CONSTRAINT maintenance_schedules_next_odometer_check
        CHECK (next_maintenance_odometer IS NULL OR next_maintenance_odometer >= 0),
    CONSTRAINT maintenance_schedules_cost_check
        CHECK (cost IS NULL OR cost >= 0)
);

-- Add comments for documentation
COMMENT ON TABLE routeiq.maintenance_schedules IS 'Stores maintenance schedules and records for vehicles';
COMMENT ON COLUMN routeiq.maintenance_schedules.id IS 'Unique identifier for the maintenance schedule';
COMMENT ON COLUMN routeiq.maintenance_schedules.vehicle_id IS 'Reference to the vehicle being maintained';
COMMENT ON COLUMN routeiq.maintenance_schedules.maintenance_type IS 'Type of maintenance (e.g., Oil Change, Tire Rotation, Brake Inspection)';
COMMENT ON COLUMN routeiq.maintenance_schedules.description IS 'Detailed description of the maintenance work';
COMMENT ON COLUMN routeiq.maintenance_schedules.scheduled_date IS 'Date when maintenance is scheduled';
COMMENT ON COLUMN routeiq.maintenance_schedules.due_date IS 'Date when maintenance is due';
COMMENT ON COLUMN routeiq.maintenance_schedules.completed_date IS 'Date when maintenance was completed';
COMMENT ON COLUMN routeiq.maintenance_schedules.status IS 'Current status of the maintenance schedule';
COMMENT ON COLUMN routeiq.maintenance_schedules.odometer_at_maintenance IS 'Odometer reading when maintenance was performed';
COMMENT ON COLUMN routeiq.maintenance_schedules.next_maintenance_odometer IS 'Odometer reading when next maintenance is due';
COMMENT ON COLUMN routeiq.maintenance_schedules.cost IS 'Cost of the maintenance';
COMMENT ON COLUMN routeiq.maintenance_schedules.currency IS 'Currency code for the cost';
COMMENT ON COLUMN routeiq.maintenance_schedules.performed_by IS 'Name of technician who performed the maintenance';
COMMENT ON COLUMN routeiq.maintenance_schedules.service_provider IS 'Name of service provider or shop';
COMMENT ON COLUMN routeiq.maintenance_schedules.notes IS 'Additional notes about the maintenance';
COMMENT ON COLUMN routeiq.maintenance_schedules.attachments IS 'Array of URLs or file paths to related documents';
COMMENT ON COLUMN routeiq.maintenance_schedules.deleted_at IS 'Soft delete timestamp';

-- Create indexes for common queries
CREATE INDEX idx_maintenance_schedules_vehicle_id
    ON routeiq.maintenance_schedules(vehicle_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_maintenance_schedules_scheduled_date
    ON routeiq.maintenance_schedules(scheduled_date)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_maintenance_schedules_status
    ON routeiq.maintenance_schedules(status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_maintenance_schedules_due_date
    ON routeiq.maintenance_schedules(due_date)
    WHERE deleted_at IS NULL AND due_date IS NOT NULL;

CREATE INDEX idx_maintenance_schedules_completed_date
    ON routeiq.maintenance_schedules(completed_date)
    WHERE deleted_at IS NULL AND completed_date IS NOT NULL;

-- Create GIN index for attachments array
CREATE INDEX idx_maintenance_schedules_attachments
    ON routeiq.maintenance_schedules USING GIN(attachments)
    WHERE deleted_at IS NULL AND attachments IS NOT NULL;

-- Create trigger for automatic updated_at timestamp
CREATE TRIGGER trigger_maintenance_schedules_updated_at
    BEFORE UPDATE ON routeiq.maintenance_schedules
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE routeiq.maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for SELECT: authenticated users can view non-deleted records
CREATE POLICY maintenance_schedules_select_policy
    ON routeiq.maintenance_schedules
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Policy for INSERT: authenticated users can create records
CREATE POLICY maintenance_schedules_insert_policy
    ON routeiq.maintenance_schedules
    FOR INSERT
    TO authenticated
    WITH CHECK (deleted_at IS NULL);

-- Policy for UPDATE: authenticated users can update non-deleted records
CREATE POLICY maintenance_schedules_update_policy
    ON routeiq.maintenance_schedules
    FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (deleted_at IS NULL OR deleted_at IS NOT NULL); -- Allow soft delete

-- Policy for DELETE: authenticated users can delete (this is for hard deletes, soft deletes use UPDATE)
CREATE POLICY maintenance_schedules_delete_policy
    ON routeiq.maintenance_schedules
    FOR DELETE
    TO authenticated
    USING (deleted_at IS NULL);

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON routeiq.maintenance_schedules TO authenticated;

-- Grant all permissions to service_role (bypass RLS)
GRANT ALL ON routeiq.maintenance_schedules TO service_role;
