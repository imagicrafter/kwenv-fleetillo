-- Add metadata JSONB column to vehicles table
ALTER TABLE fleetillo.vehicles
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_vehicles_metadata
ON fleetillo.vehicles USING GIN(metadata);

COMMENT ON COLUMN fleetillo.vehicles.metadata IS 'JSONB storage for custom vehicle fields configured in Settings';
