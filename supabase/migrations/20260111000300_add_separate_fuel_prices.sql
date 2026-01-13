-- Migration: Add separate fuel price settings for gasoline and diesel
-- Description: Replaces single fuel price with separate gasoline and diesel prices
-- Created: 2026-01-11

-- Add new separate fuel price settings
INSERT INTO routeiq.settings (key, value, description) VALUES
    ('costs.gasolinePricePerGallon', '3.50', 'Gasoline price per gallon for cost calculations'),
    ('costs.dieselPricePerGallon', '3.80', 'Diesel price per gallon for cost calculations')
ON CONFLICT (key) DO NOTHING;

-- Optionally remove the old single fuel price setting (keeping for backwards compatibility)
-- DELETE FROM routeiq.settings WHERE key = 'costs.fuelPricePerGallon';
