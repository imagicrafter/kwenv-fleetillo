-- Migration: 001_create_routeiq_schema
-- Description: Create the routeiq schema for the application
-- Created: 2025-12-27

-- Create the routeiq schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS routeiq;

-- Grant usage on the schema to authenticated and anon roles
GRANT USAGE ON SCHEMA routeiq TO authenticated;
GRANT USAGE ON SCHEMA routeiq TO anon;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA routeiq
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA routeiq
GRANT SELECT ON TABLES TO anon;
