-- Add missing timing metrics columns to routes table
-- Migration: 20260118120000_add_route_timing_metrics.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'routeiq' AND table_name = 'routes' AND column_name = 'total_service_time_minutes') THEN
        ALTER TABLE routeiq.routes ADD COLUMN total_service_time_minutes INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'routeiq' AND table_name = 'routes' AND column_name = 'total_travel_time_minutes') THEN
        ALTER TABLE routeiq.routes ADD COLUMN total_travel_time_minutes INTEGER;
    END IF;
END $$;
