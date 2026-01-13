-- Migration: Add fuel efficiency column to vehicles
-- Description: Add fuel_efficiency_mpg for cost calculations
-- Created: 2026-01-11

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'routeiq' 
        AND table_name = 'vehicles' 
        AND column_name = 'fuel_efficiency_mpg'
    ) THEN
        ALTER TABLE routeiq.vehicles 
        ADD COLUMN fuel_efficiency_mpg DECIMAL(6, 2);
    END IF;
END $$;

COMMENT ON COLUMN routeiq.vehicles.fuel_efficiency_mpg IS 
    'Fuel efficiency in miles per gallon (or equivalent for electric/hybrid)';
