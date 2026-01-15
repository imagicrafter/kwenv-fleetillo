-- ============================================================================
-- Migration: 20260115000001_add_drivers_rls_policies
-- Description: Add Row Level Security policies to the drivers table
-- Created: 2026-01-15
-- Note: This migration adds RLS policies that were missing from the initial
--       drivers table creation. It can be safely re-run as it uses
--       DROP POLICY IF EXISTS before creating each policy.
-- ============================================================================

-- Enable Row Level Security on the drivers table
ALTER TABLE routeiq.drivers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: drivers table
-- ============================================================================

-- Policy for authenticated users to view all drivers (excluding soft-deleted)
DROP POLICY IF EXISTS "Authenticated users can view all drivers" ON routeiq.drivers;
CREATE POLICY "Authenticated users can view all drivers"
    ON routeiq.drivers
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Policy for authenticated users to insert drivers
DROP POLICY IF EXISTS "Authenticated users can insert drivers" ON routeiq.drivers;
CREATE POLICY "Authenticated users can insert drivers"
    ON routeiq.drivers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for authenticated users to update drivers (excluding soft-deleted)
DROP POLICY IF EXISTS "Authenticated users can update drivers" ON routeiq.drivers;
CREATE POLICY "Authenticated users can update drivers"
    ON routeiq.drivers
    FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (true);

-- Policy for authenticated users to delete drivers
DROP POLICY IF EXISTS "Authenticated users can delete drivers" ON routeiq.drivers;
CREATE POLICY "Authenticated users can delete drivers"
    ON routeiq.drivers
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy for service role to bypass RLS (for backend API access)
DROP POLICY IF EXISTS "Service role can do anything with drivers" ON routeiq.drivers;
CREATE POLICY "Service role can do anything with drivers"
    ON routeiq.drivers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
