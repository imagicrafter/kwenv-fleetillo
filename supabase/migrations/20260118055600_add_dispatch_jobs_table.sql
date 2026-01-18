-- Migration: Add dispatch_jobs table for scheduled batch dispatches
-- This table stores dispatch jobs that can be scheduled to run at a specific time
-- for one or more drivers. Drivers can only be in one active job at a time.

-- Create dispatch job status enum in routeiq schema
CREATE TYPE routeiq.dispatch_job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- Create dispatch_jobs table in routeiq schema
CREATE TABLE IF NOT EXISTS routeiq.dispatch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Job identification
    name VARCHAR(255) NOT NULL,
    
    -- Driver assignment (array of driver IDs)
    driver_ids UUID[] NOT NULL DEFAULT '{}',
    
    -- Scheduling
    scheduled_time TIMESTAMPTZ NOT NULL,
    
    -- Status tracking
    status routeiq.dispatch_job_status NOT NULL DEFAULT 'pending',
    
    -- Execution tracking
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Results
    dispatched_route_ids UUID[] DEFAULT '{}',
    error_message TEXT,
    
    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for finding jobs by status
CREATE INDEX idx_dispatch_jobs_status ON routeiq.dispatch_jobs(status);

-- Create index for finding jobs by scheduled time (for cron job processor)
CREATE INDEX idx_dispatch_jobs_scheduled_time ON routeiq.dispatch_jobs(scheduled_time) 
    WHERE status = 'pending';

-- Create GIN index for searching driver_ids array
CREATE INDEX idx_dispatch_jobs_driver_ids ON routeiq.dispatch_jobs USING GIN(driver_ids);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION routeiq.update_dispatch_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dispatch_jobs_updated_at
    BEFORE UPDATE ON routeiq.dispatch_jobs
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.update_dispatch_jobs_updated_at();

-- Enable Row Level Security
ALTER TABLE routeiq.dispatch_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "dispatch_jobs_policy" ON routeiq.dispatch_jobs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE routeiq.dispatch_jobs IS 'Stores scheduled batch dispatch jobs for automated route dispatching to drivers';
COMMENT ON COLUMN routeiq.dispatch_jobs.driver_ids IS 'Array of driver UUIDs assigned to this job. Each driver can only be in one active (pending/running) job at a time.';
COMMENT ON COLUMN routeiq.dispatch_jobs.scheduled_time IS 'When this dispatch job should be executed';
COMMENT ON COLUMN routeiq.dispatch_jobs.dispatched_route_ids IS 'Array of route UUIDs that were successfully dispatched by this job';
