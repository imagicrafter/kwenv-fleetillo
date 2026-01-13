-- Create settings table for storing application configuration
-- Settings are global for the organization

CREATE TABLE IF NOT EXISTS routeiq.settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON routeiq.settings(key);

-- Enable RLS
ALTER TABLE routeiq.settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
-- Allow all authenticated users to read settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'settings_select_policy' AND tablename = 'settings' AND schemaname = 'routeiq'
    ) THEN
        CREATE POLICY "settings_select_policy" ON routeiq.settings FOR SELECT USING (true);
    END IF;
END $$;

-- Allow all authenticated users to update settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'settings_update_policy' AND tablename = 'settings' AND schemaname = 'routeiq'
    ) THEN
        CREATE POLICY "settings_update_policy" ON routeiq.settings FOR UPDATE USING (true);
    END IF;
END $$;

-- Allow all authenticated users to insert settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'settings_insert_policy' AND tablename = 'settings' AND schemaname = 'routeiq'
    ) THEN
        CREATE POLICY "settings_insert_policy" ON routeiq.settings FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Insert default settings
INSERT INTO routeiq.settings (key, value, description) VALUES
    ('schedule.dayStartTime', '"08:00"', 'Work day start time (HH:MM format)'),
    ('schedule.dayEndTime', '"17:00"', 'Work day end time (HH:MM format)'),
    ('routing.unitSystem', '"imperial"', 'Unit system: "imperial" (mph) or "metric" (km/h)'),
    ('routing.avgTravelSpeed', '30', 'Average travel speed in km/h (converted for display if imperial)'),
    ('routing.trafficBufferPercent', '20', 'Percentage buffer added to travel time for traffic'),
    ('routing.defaultServiceDurationMinutes', '30', 'Default service duration if not specified')
ON CONFLICT (key) DO NOTHING;

-- Add comments
COMMENT ON TABLE routeiq.settings IS 'Application configuration settings';
COMMENT ON COLUMN routeiq.settings.key IS 'Setting key in dot notation (e.g., routing.avgTravelSpeed)';
COMMENT ON COLUMN routeiq.settings.value IS 'Setting value as JSON';
COMMENT ON COLUMN routeiq.settings.description IS 'Human-readable description of the setting';
