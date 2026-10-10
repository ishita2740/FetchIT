-- FetchIT Production Features Migration
-- Adds: uploaded_files, saved_charts, feedback, language preference

-- 1. Add language preference to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

-- 2. Add default_output_preference and default_view to user_preferences
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_output_preference TEXT DEFAULT 'structured_dataset';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_result_view TEXT DEFAULT 'table';

-- 3. Table: uploaded_files
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_extension TEXT,
    storage_key TEXT NOT NULL,
    file_data BYTEA,
    extracted_text TEXT,
    status TEXT NOT NULL DEFAULT 'uploaded',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uploaded_files_status_check CHECK (
        status IN ('uploaded', 'processing', 'processed', 'failed')
    )
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_collection ON uploaded_files(collection_id);

DROP TRIGGER IF EXISTS trg_uploaded_files_updated_at ON uploaded_files;
CREATE TRIGGER trg_uploaded_files_updated_at
BEFORE UPDATE ON uploaded_files
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uploaded_files_owner_policy ON uploaded_files;
CREATE POLICY uploaded_files_owner_policy ON uploaded_files
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

-- 4. Table: saved_charts
CREATE TABLE IF NOT EXISTS saved_charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    chart_type TEXT NOT NULL,
    title TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    insight_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT saved_charts_type_check CHECK (
        chart_type IN (
            'bar', 'pie', 'donut', 'horizontal_bar',
            'stat', 'distribution', 'comparison', 'insight'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_saved_charts_user ON saved_charts(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_saved_charts_collection ON saved_charts(collection_id);

ALTER TABLE saved_charts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_charts_owner_policy ON saved_charts;
CREATE POLICY saved_charts_owner_policy ON saved_charts
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

-- 5. Table: feedback
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'general',
    message TEXT NOT NULL,
    page_context TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT feedback_category_check CHECK (
        category IN ('general', 'bug', 'feature', 'praise', 'other')
    )
);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_profile_id);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_owner_policy ON feedback;
CREATE POLICY feedback_owner_policy ON feedback
    FOR ALL
    USING (
        user_profile_id IS NULL OR
        user_profile_id IN (
            SELECT id FROM user_profiles WHERE auth_user_id = public.current_user_id()
        )
    )
    WITH CHECK (
        user_profile_id IS NULL OR
        user_profile_id IN (
            SELECT id FROM user_profiles WHERE auth_user_id = public.current_user_id()
        )
    );

-- 6. Update saved_documents to add collection_id if missing
ALTER TABLE saved_documents ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;
ALTER TABLE saved_documents ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'uploaded';
ALTER TABLE saved_documents ADD COLUMN IF NOT EXISTS file_size INTEGER;
