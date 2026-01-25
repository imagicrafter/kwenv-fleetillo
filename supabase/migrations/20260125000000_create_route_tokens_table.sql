-- Migration: Create route_tokens table
-- Issue: #103 - Driver route map link requires login and has poor mobile UX
-- Purpose: Store time-limited access tokens for public route map views

-- Create route_tokens table in all schemas
DO $$
DECLARE
    schema_name TEXT;
    schemas TEXT[] := ARRAY['fleetillo', 'routeiq', 'optiroute'];
BEGIN
    FOREACH schema_name IN ARRAY schemas LOOP
        -- Check if schema exists
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = schema_name) THEN
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.route_tokens (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    route_id UUID NOT NULL REFERENCES %I.routes(id) ON DELETE CASCADE,
                    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
                    expires_at TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );

                -- Index for token lookups (primary access pattern)
                CREATE INDEX IF NOT EXISTS idx_route_tokens_token ON %I.route_tokens(token);

                -- Index for cleanup queries (find expired tokens)
                CREATE INDEX IF NOT EXISTS idx_route_tokens_expires_at ON %I.route_tokens(expires_at);

                -- Add trigger for updated_at
                CREATE OR REPLACE FUNCTION %I.update_route_tokens_updated_at()
                RETURNS TRIGGER AS $func$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $func$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS update_route_tokens_updated_at_trigger ON %I.route_tokens;
                CREATE TRIGGER update_route_tokens_updated_at_trigger
                    BEFORE UPDATE ON %I.route_tokens
                    FOR EACH ROW
                    EXECUTE FUNCTION %I.update_route_tokens_updated_at();

                -- Enable RLS (but allow public read for token validation)
                ALTER TABLE %I.route_tokens ENABLE ROW LEVEL SECURITY;

                -- Policy: Allow service role full access
                DROP POLICY IF EXISTS route_tokens_service_role ON %I.route_tokens;
                CREATE POLICY route_tokens_service_role ON %I.route_tokens
                    FOR ALL
                    USING (current_setting(''role'') = ''service_role'');

                -- Policy: Allow public read access for token validation
                -- (tokens are UUID v4, so effectively impossible to guess)
                DROP POLICY IF EXISTS route_tokens_public_read ON %I.route_tokens;
                CREATE POLICY route_tokens_public_read ON %I.route_tokens
                    FOR SELECT
                    USING (true);

                RAISE NOTICE ''Created route_tokens table in schema: %'', %L;
            ',
            schema_name, schema_name,
            schema_name, schema_name,
            schema_name, schema_name, schema_name, schema_name,
            schema_name, schema_name, schema_name,
            schema_name, schema_name,
            schema_name);
        END IF;
    END LOOP;
END $$;

-- Add comment explaining purpose
COMMENT ON TABLE fleetillo.route_tokens IS 'Time-limited access tokens for public route map views. Tokens expire 24 hours after creation.';
