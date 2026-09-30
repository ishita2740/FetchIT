-- FetchIT Database Schema Migration: Workflow Planner

CREATE TABLE IF NOT EXISTS collection_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL UNIQUE REFERENCES collections(id) ON DELETE CASCADE,
    plan JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_collection_workflows_updated_at ON collection_workflows;
CREATE TRIGGER trg_collection_workflows_updated_at
BEFORE UPDATE ON collection_workflows
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_collection_workflows_collection_id ON collection_workflows(collection_id);

ALTER TABLE collection_workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collection_workflows_owner_policy ON collection_workflows;
CREATE POLICY collection_workflows_owner_policy ON collection_workflows
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
