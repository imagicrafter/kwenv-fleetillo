-- Add custom_fields JSONB column to drivers table
ALTER TABLE fleetillo.drivers
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_drivers_custom_fields
ON fleetillo.drivers USING GIN(custom_fields);

COMMENT ON COLUMN fleetillo.drivers.custom_fields IS 'JSONB storage for custom driver fields configured in Settings';
