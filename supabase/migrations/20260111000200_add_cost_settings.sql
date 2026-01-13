-- Migration: Add cost-related settings
-- Description: Add settings for labor rate and fuel price
-- Created: 2026-01-11

INSERT INTO routeiq.settings (key, value, description) VALUES
    ('costs.laborRatePerHour', '50', 'Hourly labor rate in USD for cost calculations'),
    ('costs.fuelPricePerGallon', '3.50', 'Average fuel price per gallon for cost calculations'),
    ('costs.includeTrafficBuffer', 'true', 'Whether to include traffic buffer time in labor cost calculations')
ON CONFLICT (key) DO NOTHING;
