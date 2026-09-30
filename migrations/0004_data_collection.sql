-- FetchIT Database Schema Migration: Data Collection Engine

-- 1. Table: collection_records
CREATE TABLE IF NOT EXISTS collection_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    source_id UUID REFERENCES collection_sources(id) ON DELETE CASCADE,
    record_data JSONB NOT NULL,
    source_url TEXT NOT NULL,
    source_name TEXT,
    status TEXT NOT NULL DEFAULT 'collected',
    error_message TEXT,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_collection_records_collection_id ON collection_records(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_records_source_id ON collection_records(source_id);
CREATE INDEX IF NOT EXISTS idx_collection_records_status ON collection_records(status);

-- 3. Row Level Security
ALTER TABLE collection_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collection_records_owner_policy ON collection_records;
CREATE POLICY collection_records_owner_policy ON collection_records
    FOR ALL
    USING (
        collection_id IN (
            SELECT c.id FROM collections c
            JOIN user_profiles up ON c.user_profile_id = up.id
            WHERE up.auth_user_id = public.current_user_id()
        )
    )
    WITH CHECK (
        collection_id IN (
            SELECT c.id FROM collections c
            JOIN user_profiles up ON c.user_profile_id = up.id
            WHERE up.auth_user_id = public.current_user_id()
        )
    );
