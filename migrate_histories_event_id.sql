-- Add unique event_id for upsert ingest from Raspberry Pi
ALTER TABLE histories
  ADD COLUMN IF NOT EXISTS event_id VARCHAR(100);

-- Backfill existing rows so NOT NULL + UNIQUE can be applied
UPDATE histories
SET event_id = 'legacy-' || id::text
WHERE event_id IS NULL;

ALTER TABLE histories
  ALTER COLUMN event_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'histories_event_id_key'
  ) THEN
    ALTER TABLE histories
      ADD CONSTRAINT histories_event_id_key UNIQUE (event_id);
  END IF;
END $$;
