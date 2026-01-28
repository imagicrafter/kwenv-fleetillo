-- ============================================================================
-- Migration: 20260127000000_create_import_tables
-- Description: Create import_batches and import_staging tables for CSV data import
--              Supports the data import pipeline: Parse → Stage → Review → Commit
-- Issue: #18 - CSV Parser & Data Normalization for Legacy Import
-- Created: 2026-01-27
-- ============================================================================

-- Set search path
SET search_path TO fleetillo, public;

-- ============================================================================
-- TABLE: import_batches
-- Purpose: Tracks each import run for audit and status management.
--          Each import attempt creates a batch record that moves through
--          states: processing → staged → committed (or failed/rolled_back)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fleetillo.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source information
    source_file TEXT NOT NULL,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'staged', 'committed', 'failed', 'rolled_back')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    -- Summary statistics (populated after parsing)
    summary JSONB DEFAULT '{}',

    -- Error tracking
    error_message TEXT,

    -- Audit
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes for import_batches
CREATE INDEX IF NOT EXISTS idx_import_batches_status
    ON fleetillo.import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_at
    ON fleetillo.import_batches(created_at DESC);

-- ============================================================================
-- TABLE: import_staging
-- Purpose: Holds parsed records for review before committing to production.
--          Each row represents a parsed entity (customer, location, or booking)
--          with both raw and transformed data for audit and debugging.
-- ============================================================================
CREATE TABLE IF NOT EXISTS fleetillo.import_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to batch
    batch_id UUID NOT NULL REFERENCES fleetillo.import_batches(id) ON DELETE CASCADE,

    -- Source row tracking
    row_number INTEGER NOT NULL,

    -- Entity classification
    entity_type TEXT NOT NULL
        CHECK (entity_type IN ('customer', 'location', 'booking')),

    -- Data storage
    raw_data JSONB NOT NULL,      -- Original CSV row values
    parsed_data JSONB NOT NULL,   -- Normalized/transformed data

    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'committed', 'error', 'commit_failed', 'skipped')),

    -- Production record reference (after commit)
    target_id UUID,               -- References the created production record

    -- Error tracking
    error_message TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for import_staging
CREATE INDEX IF NOT EXISTS idx_import_staging_batch
    ON fleetillo.import_staging(batch_id);
CREATE INDEX IF NOT EXISTS idx_import_staging_batch_status
    ON fleetillo.import_staging(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_import_staging_batch_entity
    ON fleetillo.import_staging(batch_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_import_staging_entity_status
    ON fleetillo.import_staging(entity_type, status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on import_batches
ALTER TABLE fleetillo.import_batches ENABLE ROW LEVEL SECURITY;

-- Policies for import_batches
CREATE POLICY "Authenticated users can view import batches"
    ON fleetillo.import_batches FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert import batches"
    ON fleetillo.import_batches FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update import batches"
    ON fleetillo.import_batches FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "Service role has full access to import batches"
    ON fleetillo.import_batches FOR ALL TO service_role
    USING (true);

-- Enable RLS on import_staging
ALTER TABLE fleetillo.import_staging ENABLE ROW LEVEL SECURITY;

-- Policies for import_staging
CREATE POLICY "Authenticated users can view staging records"
    ON fleetillo.import_staging FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert staging records"
    ON fleetillo.import_staging FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update staging records"
    ON fleetillo.import_staging FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete staging records"
    ON fleetillo.import_staging FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "Service role has full access to staging records"
    ON fleetillo.import_staging FOR ALL TO service_role
    USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE fleetillo.import_batches IS
    'Tracks import runs for audit and status. Each CSV import creates a batch.';

COMMENT ON TABLE fleetillo.import_staging IS
    'Holds parsed records for review before committing to production tables.';

COMMENT ON COLUMN fleetillo.import_batches.summary IS
    'JSON object with counts: totalRows, customersExtracted, locationsExtracted, bookingsGenerated, errorsCount, needsReviewCount';

COMMENT ON COLUMN fleetillo.import_staging.raw_data IS
    'Original CSV row values as JSON object';

COMMENT ON COLUMN fleetillo.import_staging.parsed_data IS
    'Normalized/transformed data ready for production insert';

COMMENT ON COLUMN fleetillo.import_staging.target_id IS
    'UUID of the production record created during commit (for rollback support)';
