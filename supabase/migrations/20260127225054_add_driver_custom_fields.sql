-- Add metadata JSONB column to drivers table
ALTER TABLE fleetillo.drivers
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_drivers_metadata
ON fleetillo.drivers USING GIN(metadata);

COMMENT ON COLUMN fleetillo.drivers.metadata IS 'JSONB storage for custom driver fields configured in Settings';
