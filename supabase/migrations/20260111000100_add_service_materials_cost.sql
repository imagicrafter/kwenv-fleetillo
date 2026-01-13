-- Migration: Add materials cost column to services
-- Description: Add materials_cost for tracking cost of supplies per service
-- Created: 2026-01-11

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'routeiq' 
        AND table_name = 'services' 
        AND column_name = 'materials_cost'
    ) THEN
        ALTER TABLE routeiq.services 
        ADD COLUMN materials_cost DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

COMMENT ON COLUMN routeiq.services.materials_cost IS 
    'Average cost of materials/supplies consumed when performing this service';
