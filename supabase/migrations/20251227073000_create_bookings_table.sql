-- Migration: Create bookings table
-- Description: Define and create the bookings table with booking details, client references,
--              service references, dates, and booking types (one-time/recurring)
-- Created: 2024-12-27

-- Create bookings table in routeiq schema
CREATE TABLE IF NOT EXISTS routeiq.bookings (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key references
    client_id UUID NOT NULL REFERENCES routeiq.clients(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES routeiq.services(id) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES routeiq.vehicles(id) ON DELETE SET NULL,

    -- Booking identification
    booking_number VARCHAR(50) UNIQUE,

    -- Booking type and recurrence
    booking_type VARCHAR(50) NOT NULL CHECK (booking_type IN ('one_time', 'recurring')),
    recurrence_pattern VARCHAR(50) CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    recurrence_end_date DATE,
    parent_booking_id UUID REFERENCES routeiq.bookings(id) ON DELETE CASCADE, -- For recurring booking instances

    -- Scheduling information
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME NOT NULL,
    scheduled_end_time TIME,
    estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0),

    -- Actual timing (for completed bookings)
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    actual_duration_minutes INTEGER CHECK (actual_duration_minutes > 0),

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Initial state
        'confirmed',         -- Booking confirmed
        'scheduled',         -- Scheduled on a route
        'in_progress',       -- Service currently being performed
        'completed',         -- Service completed
        'cancelled',         -- Booking cancelled
        'no_show',          -- Client didn't show up
        'rescheduled'       -- Booking was rescheduled
    )),

    -- Service location
    service_address_line1 VARCHAR(255),
    service_address_line2 VARCHAR(100),
    service_city VARCHAR(100),
    service_state VARCHAR(100),
    service_postal_code VARCHAR(20),
    service_country VARCHAR(100) DEFAULT 'USA',
    service_latitude DECIMAL(10, 8),
    service_longitude DECIMAL(11, 8),

    -- Pricing information
    quoted_price DECIMAL(10, 2) CHECK (quoted_price >= 0),
    final_price DECIMAL(10, 2) CHECK (final_price >= 0),
    price_currency VARCHAR(3) DEFAULT 'USD',

    -- Additional details
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    special_instructions TEXT,
    internal_notes TEXT,
    cancellation_reason TEXT,

    -- Client communication
    client_notified BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    confirmation_sent BOOLEAN DEFAULT false,

    -- Metadata
    tags TEXT[] DEFAULT '{}',

    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_scheduled_time CHECK (scheduled_end_time IS NULL OR scheduled_end_time > scheduled_start_time),
    CONSTRAINT valid_actual_time CHECK (actual_end_time IS NULL OR actual_end_time > actual_start_time),
    CONSTRAINT recurring_has_pattern CHECK (
        (booking_type = 'one_time' AND recurrence_pattern IS NULL) OR
        (booking_type = 'recurring' AND recurrence_pattern IS NOT NULL)
    ),
    CONSTRAINT quoted_price_valid CHECK (quoted_price IS NULL OR quoted_price >= 0),
    CONSTRAINT final_price_valid CHECK (final_price IS NULL OR final_price >= 0)
);

-- Create indexes for common query patterns
CREATE INDEX idx_bookings_client_id ON routeiq.bookings(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_service_id ON routeiq.bookings(service_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_vehicle_id ON routeiq.bookings(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_booking_number ON routeiq.bookings(booking_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_status ON routeiq.bookings(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_booking_type ON routeiq.bookings(booking_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_scheduled_date ON routeiq.bookings(scheduled_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_parent_booking_id ON routeiq.bookings(parent_booking_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_created_at ON routeiq.bookings(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_deleted_at ON routeiq.bookings(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create composite index for date range queries
CREATE INDEX idx_bookings_scheduled_date_status ON routeiq.bookings(scheduled_date, status) WHERE deleted_at IS NULL;

-- GIN index for tags array
CREATE INDEX idx_bookings_tags ON routeiq.bookings USING GIN(tags);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER trigger_bookings_updated_at
    BEFORE UPDATE ON routeiq.bookings
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE routeiq.bookings IS 'Stores booking information including one-time and recurring bookings with client and service references';
COMMENT ON COLUMN routeiq.bookings.id IS 'Unique identifier for the booking';
COMMENT ON COLUMN routeiq.bookings.client_id IS 'Reference to the client who made the booking';
COMMENT ON COLUMN routeiq.bookings.service_id IS 'Reference to the service being booked';
COMMENT ON COLUMN routeiq.bookings.vehicle_id IS 'Optional reference to the assigned vehicle';
COMMENT ON COLUMN routeiq.bookings.booking_number IS 'Human-readable unique booking number';
COMMENT ON COLUMN routeiq.bookings.booking_type IS 'Type of booking: one_time or recurring';
COMMENT ON COLUMN routeiq.bookings.recurrence_pattern IS 'Pattern for recurring bookings (daily, weekly, monthly, etc.)';
COMMENT ON COLUMN routeiq.bookings.parent_booking_id IS 'For recurring instances, reference to the parent booking';
COMMENT ON COLUMN routeiq.bookings.status IS 'Current status of the booking';
COMMENT ON COLUMN routeiq.bookings.priority IS 'Priority level of the booking';

-- Enable Row Level Security
ALTER TABLE routeiq.bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY bookings_select_policy ON routeiq.bookings
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY bookings_insert_policy ON routeiq.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY bookings_update_policy ON routeiq.bookings
    FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (deleted_at IS NULL);

CREATE POLICY bookings_delete_policy ON routeiq.bookings
    FOR DELETE
    TO authenticated
    USING (deleted_at IS NULL);

-- Create RLS policies for service role (unrestricted access)
CREATE POLICY bookings_service_role_all ON routeiq.bookings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON routeiq.bookings TO authenticated;
GRANT ALL ON routeiq.bookings TO service_role;
