-- Migration: Create route_tokens table
-- Issue: #103 - Driver route map link requires login and has poor mobile UX
-- Purpose: Store time-limited access tokens for public route map views

-- Create route_tokens table in fleetillo schema
CREATE TABLE IF NOT EXISTS fleetillo.route_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES fleetillo.routes(id) ON DELETE CASCADE,
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token lookups (primary access pattern)
CREATE INDEX IF NOT EXISTS idx_route_tokens_token ON fleetillo.route_tokens(token);

-- Index for cleanup queries (find expired tokens)
CREATE INDEX IF NOT EXISTS idx_route_tokens_expires_at ON fleetillo.route_tokens(expires_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION fleetillo.update_route_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_route_tokens_updated_at_trigger ON fleetillo.route_tokens;
CREATE TRIGGER update_route_tokens_updated_at_trigger
    BEFORE UPDATE ON fleetillo.route_tokens
    FOR EACH ROW
    EXECUTE FUNCTION fleetillo.update_route_tokens_updated_at();

-- Enable RLS (but allow public read for token validation)
ALTER TABLE fleetillo.route_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
DROP POLICY IF EXISTS route_tokens_service_role ON fleetillo.route_tokens;
CREATE POLICY route_tokens_service_role ON fleetillo.route_tokens
    FOR ALL
    USING (current_setting('role') = 'service_role');

-- Policy: Allow public read access for token validation
-- (tokens are UUID v4, so effectively impossible to guess)
DROP POLICY IF EXISTS route_tokens_public_read ON fleetillo.route_tokens;
CREATE POLICY route_tokens_public_read ON fleetillo.route_tokens
    FOR SELECT
    USING (true);

-- Add comment explaining purpose
COMMENT ON TABLE fleetillo.route_tokens IS 'Time-limited access tokens for public route map views. Tokens expire 24 hours after creation.';
