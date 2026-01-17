-- ============================================================================
-- Migration: add_driver_dispatch_preferences
-- Description: Add dispatch preference columns to drivers table for channel
--              selection and fallback behavior in the dispatch service.
-- Created: 2026-01-16
-- Requirements: 11.1 (Driver Dispatch Preferences)
-- ============================================================================

-- ============================================================================
-- ALTER TABLE: Add dispatch preference columns to drivers
-- Purpose: Enable drivers to configure their preferred notification channel
--          and whether fallback to alternative channels is enabled.
-- ============================================================================

-- Add preferred_channel column (default: 'telegram')
-- This determines the primary channel for dispatch notifications
ALTER TABLE routeiq.drivers 
  ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(20) DEFAULT 'telegram';

-- Add fallback_enabled column (default: true)
-- When true, if the primary channel fails, the system will attempt
-- delivery through the next available channel
ALTER TABLE routeiq.drivers 
  ADD COLUMN IF NOT EXISTS fallback_enabled BOOLEAN DEFAULT true;

-- ============================================================================
-- COMMENTS: Column documentation
-- ============================================================================
COMMENT ON COLUMN routeiq.drivers.preferred_channel IS 'Preferred notification channel for dispatch messages (telegram, email). Defaults to telegram.';
COMMENT ON COLUMN routeiq.drivers.fallback_enabled IS 'When true, enables fallback to alternative channels if primary channel fails. Defaults to true.';

-- ============================================================================
-- Note: telegram_chat_id and email columns already exist in drivers table
-- from the original drivers table migration (20260115000000_create_drivers_table.sql)
-- ============================================================================
