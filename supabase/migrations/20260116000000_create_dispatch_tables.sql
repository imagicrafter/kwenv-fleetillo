-- ============================================================================
-- Migration: 20260116000000_create_dispatch_tables
-- Description: Create dispatch tracking tables for the OptiRoute Dispatch Service
-- Created: 2026-01-16
-- Requirements: 8.1, 8.2
-- ============================================================================

-- ============================================================================
-- TABLE: dispatches
-- Purpose: Stores dispatch records for route assignment notifications sent to drivers.
--          Tracks the overall dispatch status and requested communication channels.
-- Requirements: 8.1 - Store dispatch records with id, route_id, driver_id, status,
--               requested_channels, created_at, updated_at
-- ============================================================================
CREATE TABLE IF NOT EXISTS routeiq.dispatches (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key references
    route_id UUID NOT NULL REFERENCES routeiq.routes(id),
    driver_id UUID NOT NULL REFERENCES routeiq.drivers(id),

    -- Dispatch status
    -- pending: Created, not yet processed
    -- sending: Currently sending to channels
    -- delivered: At least one channel succeeded
    -- partial: Some channels succeeded, some failed
    -- failed: All channels failed
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sending', 'delivered', 'partial', 'failed')),

    -- Requested communication channels (array of channel types)
    requested_channels TEXT[] NOT NULL,

    -- Additional metadata (JSON for flexibility)
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: channel_dispatches
-- Purpose: Stores individual channel delivery attempts for each dispatch.
--          Tracks per-channel status, provider message IDs, and error details.
-- Requirements: 8.2 - Store channel attempts with id, dispatch_id, channel, status,
--               provider_message_id, error_message, sent_at, delivered_at
-- ============================================================================
CREATE TABLE IF NOT EXISTS routeiq.channel_dispatches (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to parent dispatch (cascade delete)
    dispatch_id UUID NOT NULL REFERENCES routeiq.dispatches(id) ON DELETE CASCADE,

    -- Channel type (telegram, email, sms, push)
    channel VARCHAR(20) NOT NULL,

    -- Channel dispatch status
    -- pending: Not yet attempted
    -- sending: Currently sending
    -- delivered: Successfully delivered
    -- failed: Delivery failed
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sending', 'delivered', 'failed')),

    -- Provider-specific message identifier
    provider_message_id VARCHAR(255),

    -- Error message if delivery failed
    error_message TEXT,

    -- Delivery timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES: dispatches table
-- Purpose: Optimize common query patterns for dispatch lookups
-- ============================================================================
CREATE INDEX idx_dispatches_route_id ON routeiq.dispatches(route_id);
CREATE INDEX idx_dispatches_driver_id ON routeiq.dispatches(driver_id);
CREATE INDEX idx_dispatches_status ON routeiq.dispatches(status);
CREATE INDEX idx_dispatches_created_at ON routeiq.dispatches(created_at);

-- ============================================================================
-- INDEXES: channel_dispatches table
-- Purpose: Optimize common query patterns for channel dispatch lookups
-- ============================================================================
CREATE INDEX idx_channel_dispatches_dispatch_id ON routeiq.channel_dispatches(dispatch_id);
CREATE INDEX idx_channel_dispatches_channel ON routeiq.channel_dispatches(channel);
CREATE INDEX idx_channel_dispatches_status ON routeiq.channel_dispatches(status);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- ============================================================================
CREATE TRIGGER update_dispatches_updated_at
    BEFORE UPDATE ON routeiq.dispatches
    FOR EACH ROW EXECUTE FUNCTION routeiq.update_updated_at_column();

CREATE TRIGGER update_channel_dispatches_updated_at
    BEFORE UPDATE ON routeiq.channel_dispatches
    FOR EACH ROW EXECUTE FUNCTION routeiq.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY: dispatches table
-- ============================================================================
ALTER TABLE routeiq.dispatches ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view all dispatches
CREATE POLICY "Authenticated users can view all dispatches"
    ON routeiq.dispatches
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for authenticated users to insert dispatches
CREATE POLICY "Authenticated users can insert dispatches"
    ON routeiq.dispatches
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to update dispatches
CREATE POLICY "Authenticated users can update dispatches"
    ON routeiq.dispatches
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for authenticated users to delete dispatches
CREATE POLICY "Authenticated users can delete dispatches"
    ON routeiq.dispatches
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy for service role to bypass RLS (for API access)
CREATE POLICY "Service role can do anything with dispatches"
    ON routeiq.dispatches
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- ROW LEVEL SECURITY: channel_dispatches table
-- ============================================================================
ALTER TABLE routeiq.channel_dispatches ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view all channel_dispatches
CREATE POLICY "Authenticated users can view all channel_dispatches"
    ON routeiq.channel_dispatches
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for authenticated users to insert channel_dispatches
CREATE POLICY "Authenticated users can insert channel_dispatches"
    ON routeiq.channel_dispatches
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to update channel_dispatches
CREATE POLICY "Authenticated users can update channel_dispatches"
    ON routeiq.channel_dispatches
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for authenticated users to delete channel_dispatches
CREATE POLICY "Authenticated users can delete channel_dispatches"
    ON routeiq.channel_dispatches
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy for service role to bypass RLS (for API access)
CREATE POLICY "Service role can do anything with channel_dispatches"
    ON routeiq.channel_dispatches
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- COMMENTS: Table and column documentation
-- ============================================================================
COMMENT ON TABLE routeiq.dispatches IS 'Stores dispatch records for route assignment notifications sent to drivers';
COMMENT ON COLUMN routeiq.dispatches.id IS 'Unique identifier for the dispatch';
COMMENT ON COLUMN routeiq.dispatches.route_id IS 'Reference to the route being dispatched';
COMMENT ON COLUMN routeiq.dispatches.driver_id IS 'Reference to the driver receiving the dispatch';
COMMENT ON COLUMN routeiq.dispatches.status IS 'Overall dispatch status: pending, sending, delivered, partial, or failed';
COMMENT ON COLUMN routeiq.dispatches.requested_channels IS 'Array of communication channels requested for this dispatch';
COMMENT ON COLUMN routeiq.dispatches.metadata IS 'Additional dispatch metadata in JSON format';
COMMENT ON COLUMN routeiq.dispatches.created_at IS 'Timestamp when the dispatch was created';
COMMENT ON COLUMN routeiq.dispatches.updated_at IS 'Timestamp when the dispatch was last updated';

COMMENT ON TABLE routeiq.channel_dispatches IS 'Stores individual channel delivery attempts for each dispatch';
COMMENT ON COLUMN routeiq.channel_dispatches.id IS 'Unique identifier for the channel dispatch';
COMMENT ON COLUMN routeiq.channel_dispatches.dispatch_id IS 'Reference to the parent dispatch';
COMMENT ON COLUMN routeiq.channel_dispatches.channel IS 'Communication channel type (telegram, email, sms, push)';
COMMENT ON COLUMN routeiq.channel_dispatches.status IS 'Channel delivery status: pending, sending, delivered, or failed';
COMMENT ON COLUMN routeiq.channel_dispatches.provider_message_id IS 'Message ID returned by the channel provider';
COMMENT ON COLUMN routeiq.channel_dispatches.error_message IS 'Error message if delivery failed';
COMMENT ON COLUMN routeiq.channel_dispatches.sent_at IS 'Timestamp when the message was sent';
COMMENT ON COLUMN routeiq.channel_dispatches.delivered_at IS 'Timestamp when delivery was confirmed';
COMMENT ON COLUMN routeiq.channel_dispatches.created_at IS 'Timestamp when the channel dispatch was created';
COMMENT ON COLUMN routeiq.channel_dispatches.updated_at IS 'Timestamp when the channel dispatch was last updated';
