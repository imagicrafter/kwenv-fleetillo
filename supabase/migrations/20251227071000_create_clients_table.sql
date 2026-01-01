-- Migration: 002_create_clients_table
-- Description: Create the clients table for RouteIQ application
-- Created: 2025-12-27
--
-- Note: This creates the table in the 'routeiq' schema since Supabase's
-- API configuration restricts accessible schemas. If a separate 'routeiq'
-- schema is desired, it must be exposed via Supabase Dashboard:
-- Settings > API > Exposed Schemas > Add 'routeiq'

-- Create the clients table
CREATE TABLE IF NOT EXISTS routeiq.clients (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic client information
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),

    -- Contact information
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),

    -- Primary address (billing/main address)
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',

    -- Service address (where services are performed, if different from primary)
    service_address_line1 VARCHAR(255),
    service_address_line2 VARCHAR(255),
    service_city VARCHAR(100),
    service_state VARCHAR(100),
    service_postal_code VARCHAR(20),
    service_country VARCHAR(100) DEFAULT 'USA',

    -- Geolocation for routing (for service address)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Client status and metadata
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'archived')),
    notes TEXT,
    tags TEXT[], -- Array of tags for categorization

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_clients_name ON routeiq.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON routeiq.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON routeiq.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_city ON routeiq.clients(city);
CREATE INDEX IF NOT EXISTS idx_clients_service_city ON routeiq.clients(service_city);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON routeiq.clients(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON routeiq.clients(deleted_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION routeiq.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_clients_updated_at ON routeiq.clients;
CREATE TRIGGER trigger_clients_updated_at
    BEFORE UPDATE ON routeiq.clients
    FOR EACH ROW
    EXECUTE FUNCTION routeiq.update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE routeiq.clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for authenticated users to see all clients
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON routeiq.clients;
CREATE POLICY "Authenticated users can view all clients"
    ON routeiq.clients
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Policy for authenticated users to insert clients
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON routeiq.clients;
CREATE POLICY "Authenticated users can insert clients"
    ON routeiq.clients
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to update clients
DROP POLICY IF EXISTS "Authenticated users can update clients" ON routeiq.clients;
CREATE POLICY "Authenticated users can update clients"
    ON routeiq.clients
    FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (true);

-- Policy for authenticated users to soft delete clients
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON routeiq.clients;
CREATE POLICY "Authenticated users can delete clients"
    ON routeiq.clients
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy for service role to bypass RLS (for API access)
DROP POLICY IF EXISTS "Service role can do anything" ON routeiq.clients;
CREATE POLICY "Service role can do anything"
    ON routeiq.clients
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE routeiq.clients IS 'Stores client information including contact details and service addresses for RouteIQ application';
COMMENT ON COLUMN routeiq.clients.id IS 'Unique identifier for the client';
COMMENT ON COLUMN routeiq.clients.name IS 'Client name (individual or primary contact)';
COMMENT ON COLUMN routeiq.clients.company_name IS 'Company or business name if applicable';
COMMENT ON COLUMN routeiq.clients.email IS 'Primary email address for communication';
COMMENT ON COLUMN routeiq.clients.phone IS 'Primary phone number';
COMMENT ON COLUMN routeiq.clients.mobile_phone IS 'Mobile phone number';
COMMENT ON COLUMN routeiq.clients.latitude IS 'Latitude of the service address for routing';
COMMENT ON COLUMN routeiq.clients.longitude IS 'Longitude of the service address for routing';
COMMENT ON COLUMN routeiq.clients.status IS 'Client status: active, inactive, suspended, or archived';
COMMENT ON COLUMN routeiq.clients.tags IS 'Array of tags for categorizing clients';
COMMENT ON COLUMN routeiq.clients.deleted_at IS 'Soft delete timestamp, NULL if not deleted';
