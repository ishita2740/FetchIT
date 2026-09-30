-- FetchIT Initial Database Schema Migration
-- Designed for Neon PostgreSQL with Neon Auth integration

-- 1. Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Helper function to extract current authenticated user ID
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text AS $$
BEGIN
    RETURN COALESCE(
        nullif(current_setting('app.current_user_id', true), ''),
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')
    );
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Table: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    phone TEXT,
    age INTEGER,
    gender TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for user_profiles updated_at
DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. Table: user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
    interests JSONB NOT NULL DEFAULT '[]'::jsonb,
    information_purpose JSONB NOT NULL DEFAULT '[]'::jsonb,
    information_style JSONB NOT NULL DEFAULT '[]'::jsonb,
    information_priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for user_preferences updated_at
DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Table: collections
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT,
    original_input TEXT NOT NULL,
    input_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT collections_input_type_check CHECK (
        input_type IN ('text', 'voice', 'image', 'document', 'video')
    ),
    CONSTRAINT collections_status_check CHECK (
        status IN (
            'draft',
            'understanding',
            'planning',
            'finding_sources',
            'collecting',
            'cleaning',
            'validating',
            'deduplicating',
            'completed',
            'failed',
            'cancelled'
        )
    )
);

-- Trigger for collections updated_at
DROP TRIGGER IF EXISTS trg_collections_updated_at ON collections;
CREATE TRIGGER trg_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. Table: collection_results
CREATE TABLE IF NOT EXISTS collection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL UNIQUE REFERENCES collections(id) ON DELETE CASCADE,
    understood_requirement TEXT,
    final_answer TEXT,
    processing_summary TEXT,
    result_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table: collection_sources
CREATE TABLE IF NOT EXISTS collection_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    source_name TEXT,
    source_url TEXT,
    source_type TEXT,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Table: saved_documents
CREATE TABLE IF NOT EXISTS saved_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_url TEXT,
    extracted_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_profile_id ON collections(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at);
CREATE INDEX IF NOT EXISTS idx_collection_results_collection_id ON collection_results(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_sources_collection_id ON collection_sources(collection_id);
CREATE INDEX IF NOT EXISTS idx_saved_documents_user_profile_id ON saved_documents(user_profile_id);

-- 10. Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_documents ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
DROP POLICY IF EXISTS user_profiles_owner_policy ON user_profiles;
CREATE POLICY user_profiles_owner_policy ON user_profiles
    FOR ALL
    USING (auth_user_id = public.current_user_id())
    WITH CHECK (auth_user_id = public.current_user_id());

-- Policies for user_preferences
DROP POLICY IF EXISTS user_preferences_owner_policy ON user_preferences;
CREATE POLICY user_preferences_owner_policy ON user_preferences
    FOR ALL
    USING (
        user_profile_id IN (
            SELECT id FROM user_profiles WHERE auth_user_id = public.current_user_id()
        )
    )
    WITH CHECK (
        user_profile_id IN (
            SELECT id FROM user_profiles WHERE auth_user_id = public.current_user_id()
        )
    );

-- Policies for collections
DROP POLICY IF EXISTS collections_owner_policy ON collections;
CREATE POLICY collections_owner_policy ON collections
    FOR ALL
    USING (
        user_profile_id IN (
            SELECT id FROM user_profiles WHERE auth_user_id = public.current_user_id()
        )
    )
    WITH CHECK (
        user_profile_id IN (
            SELECT id FROM user_profiles WHERE auth_user_id = public.current_user_id()
        )
    );

-- Policies for collection_results
DROP POLICY IF EXISTS collection_results_owner_policy ON collection_results;
CREATE POLICY collection_results_owner_policy ON collection_results
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

-- Policies for collection_sources
DROP POLICY IF EXISTS collection_sources_owner_policy ON collection_sources;
CREATE POLICY collection_sources_owner_policy ON collection_sources
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

-- Policies for saved_documents
DROP POLICY IF EXISTS saved_documents_owner_policy ON saved_documents;
CREATE POLICY saved_documents_owner_policy ON saved_documents
    FOR ALL
    USING (
        user_profile_id IN (
            SELECT id FROM user_profiles WHERE auth_user_id = public.current_user_id()
        )
    )
    WITH CHECK (
        user_profile_id IN (
            SELECT id FROM user_profiles WHERE auth_user_id = public.current_user_id()
        )
    );
