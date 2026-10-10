const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:npg_T93unRcLChUX@ep-bitter-morning-b53ik9m5-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require";

const sql = neon(DATABASE_URL);

async function run() {
  // Each statement must use tagged template
  const stmts = [
    `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'`,
    `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_output_preference TEXT DEFAULT 'structured_dataset'`,
    `ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_result_view TEXT DEFAULT 'table'`,
    `CREATE TABLE IF NOT EXISTS uploaded_files (
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_profile_id)`,
    `CREATE INDEX IF NOT EXISTS idx_uploaded_files_collection ON uploaded_files(collection_id)`,
    `ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY`,
    `CREATE TABLE IF NOT EXISTS saved_charts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
      chart_type TEXT NOT NULL,
      title TEXT NOT NULL,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      insight_text TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_saved_charts_user ON saved_charts(user_profile_id)`,
    `CREATE INDEX IF NOT EXISTS idx_saved_charts_collection ON saved_charts(collection_id)`,
    `ALTER TABLE saved_charts ENABLE ROW LEVEL SECURITY`,
    `CREATE TABLE IF NOT EXISTS feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
      category TEXT NOT NULL DEFAULT 'general',
      message TEXT NOT NULL,
      page_context TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_profile_id)`,
    `ALTER TABLE feedback ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE saved_documents ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL`,
    `ALTER TABLE saved_documents ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'uploaded'`,
    `ALTER TABLE saved_documents ADD COLUMN IF NOT EXISTS file_size INTEGER`,
  ];

  for (const stmt of stmts) {
    try {
      await sql({ raw: stmt });
      console.log('OK:', stmt.slice(0, 60).replace(/\s+/g, ' '));
    } catch (e) {
      console.log('SKIP:', stmt.slice(0, 50).replace(/\s+/g, ' '), '|', e.message?.slice(0, 80));
    }
  }
  console.log('\\nMigration complete!');
}

run().catch(e => console.error(e));
