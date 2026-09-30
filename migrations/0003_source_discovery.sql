-- FetchIT Database Schema Migration: Source Discovery

-- Adding necessary metadata for source discovery as requested:
-- - status: needed to differentiate between discovered, verified, inaccessible, rejected
-- - relevance: needed to prioritize sources based on AI's evaluation
-- - reason: needed to explain why this source was selected by discovery

ALTER TABLE collection_sources 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'discovered',
ADD COLUMN IF NOT EXISTS relevance TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Trigger for collection_sources updated_at
DROP TRIGGER IF EXISTS trg_collection_sources_updated_at ON collection_sources;
CREATE TRIGGER trg_collection_sources_updated_at
BEFORE UPDATE ON collection_sources
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
