import { neon } from "@neondatabase/serverless";

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql;
}

export type UserProfile = {
  id: string;
  auth_user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  age: number | null;
  gender: string | null;
  created_at: string;
  updated_at: string;
};

export type UserPreferences = {
  id: string;
  user_profile_id: string;
  interests: string[];
  information_purpose: string[];
  information_style: string[];
  information_priorities: string[];
  created_at: string;
  updated_at: string;
};

export async function getUserProfileByAuthId(authUserId: string): Promise<UserProfile | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM user_profiles
    WHERE auth_user_id = ${authUserId}
    LIMIT 1
  `;
  return (rows[0] as UserProfile) || null;
}

export async function upsertUserProfile(profile: {
  auth_user_id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  age?: number | null;
  gender?: string | null;
}): Promise<UserProfile> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO user_profiles (auth_user_id, name, email, phone, age, gender, updated_at)
    VALUES (
      ${profile.auth_user_id},
      ${profile.name ?? null},
      ${profile.email ?? null},
      ${profile.phone ?? null},
      ${profile.age ?? null},
      ${profile.gender ?? null},
      NOW()
    )
    ON CONFLICT (auth_user_id)
    DO UPDATE SET
      name = COALESCE(EXCLUDED.name, user_profiles.name),
      email = COALESCE(EXCLUDED.email, user_profiles.email),
      phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
      age = COALESCE(EXCLUDED.age, user_profiles.age),
      gender = COALESCE(EXCLUDED.gender, user_profiles.gender),
      updated_at = NOW()
    RETURNING *
  `;
  return rows[0] as UserProfile;
}

export async function getUserPreferences(userProfileId: string): Promise<UserPreferences | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM user_preferences
    WHERE user_profile_id = ${userProfileId}
    LIMIT 1
  `;
  return (rows[0] as UserPreferences) || null;
}

export async function upsertUserPreferences(prefs: {
  user_profile_id: string;
  interests?: string[];
  information_purpose?: string[];
  information_style?: string[];
  information_priorities?: string[];
}): Promise<UserPreferences> {
  const sql = getDb();
  const interestsJson = JSON.stringify(prefs.interests ?? []);
  const purposeJson = JSON.stringify(prefs.information_purpose ?? []);
  const styleJson = JSON.stringify(prefs.information_style ?? []);
  const prioritiesJson = JSON.stringify(prefs.information_priorities ?? []);

  // Check if preferences already exist for this user profile
  const existing = await sql`
    SELECT id FROM user_preferences WHERE user_profile_id = ${prefs.user_profile_id} LIMIT 1
  `;

  if (existing.length > 0) {
    const rows = await sql`
      UPDATE user_preferences
      SET
        interests = ${interestsJson}::jsonb,
        information_purpose = ${purposeJson}::jsonb,
        information_style = ${styleJson}::jsonb,
        information_priorities = ${prioritiesJson}::jsonb,
        updated_at = NOW()
      WHERE user_profile_id = ${prefs.user_profile_id}
      RETURNING *
    `;
    return rows[0] as UserPreferences;
  } else {
    const rows = await sql`
      INSERT INTO user_preferences (
        user_profile_id,
        interests,
        information_purpose,
        information_style,
        information_priorities
      ) VALUES (
        ${prefs.user_profile_id},
        ${interestsJson}::jsonb,
        ${purposeJson}::jsonb,
        ${styleJson}::jsonb,
        ${prioritiesJson}::jsonb
      )
      RETURNING *
    `;
    return rows[0] as UserPreferences;
  }
}

export async function getUserCollections(userProfileId: string) {
  const sql = getDb();
  return await sql`
    SELECT 
      c.*,
      cr.understood_requirement,
      cr.processing_summary,
      cr.final_answer,
      (cr.result_data->>'output_type') as output_type,
      CASE 
        WHEN jsonb_typeof(cr.result_data->'records') = 'array' 
        THEN jsonb_array_length(cr.result_data->'records') 
        ELSE 0 
      END as record_count
    FROM collections c
    LEFT JOIN collection_results cr ON cr.collection_id = c.id
    WHERE c.user_profile_id = ${userProfileId}
    ORDER BY c.created_at DESC
  `;
}

export async function createCollection(params: {
  user_profile_id: string;
  title?: string;
  original_input: string;
  input_type: string;
}) {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO collections (
      user_profile_id,
      title,
      original_input,
      input_type,
      status
    ) VALUES (
      ${params.user_profile_id},
      ${params.title || params.original_input.slice(0, 50)},
      ${params.original_input},
      ${params.input_type},
      'draft'
    )
    RETURNING *
  `;
  return rows[0];
}

export async function getUserSavedDocuments(userProfileId: string) {
  const sql = getDb();
  return await sql`
    SELECT * FROM saved_documents
    WHERE user_profile_id = ${userProfileId}
    ORDER BY created_at DESC
  `;
}

export type Collection = {
  id: string;
  user_profile_id: string;
  title: string | null;
  original_input: string;
  input_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type CollectionResult = {
  id: string;
  collection_id: string;
  understood_requirement: string | null;
  final_answer: string | null;
  processing_summary: string | null;
  result_data: unknown;
  created_at: string;
};

export async function getCollectionById(collectionId: string): Promise<Collection | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM collections
    WHERE id = ${collectionId}
    LIMIT 1
  `;
  return (rows[0] as Collection) || null;
}

export async function updateCollectionStatus(collectionId: string, status: string): Promise<Collection> {
  const sql = getDb();
  const rows = await sql`
    UPDATE collections
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${collectionId}
    RETURNING *
  `;
  return rows[0] as Collection;
}

export async function saveCollectionResult(params: {
  collection_id: string;
  understood_requirement: string;
  processing_summary: string;
  result_data: unknown;
  final_answer?: string | null;
}): Promise<CollectionResult> {
  const sql = getDb();
  const resultJson = JSON.stringify(params.result_data);
  const rows = await sql`
    INSERT INTO collection_results (
      collection_id,
      understood_requirement,
      processing_summary,
      result_data,
      final_answer
    ) VALUES (
      ${params.collection_id},
      ${params.understood_requirement},
      ${params.processing_summary},
      ${resultJson}::jsonb,
      ${params.final_answer ?? null}
    )
    ON CONFLICT (collection_id)
    DO UPDATE SET
      understood_requirement = EXCLUDED.understood_requirement,
      processing_summary = EXCLUDED.processing_summary,
      result_data = EXCLUDED.result_data,
      final_answer = EXCLUDED.final_answer
    RETURNING *
  `;
  return rows[0] as CollectionResult;
}

export async function getCollectionResult(collectionId: string): Promise<CollectionResult | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM collection_results
    WHERE collection_id = ${collectionId}
    LIMIT 1
  `;
  return (rows[0] as CollectionResult) || null;
}

export type CollectionWorkflow = {
  id: string;
  collection_id: string;
  plan: any; // jsonb
  created_at: string;
  updated_at: string;
};

export async function saveWorkflowPlan(collectionId: string, plan: any): Promise<CollectionWorkflow> {
  const sql = getDb();
  const planJson = JSON.stringify(plan);
  
  const rows = await sql`
    INSERT INTO collection_workflows (collection_id, plan)
    VALUES (${collectionId}, ${planJson}::jsonb)
    ON CONFLICT (collection_id)
    DO UPDATE SET
      plan = EXCLUDED.plan,
      updated_at = NOW()
    RETURNING *
  `;
  return rows[0] as CollectionWorkflow;
}

export async function getWorkflowPlan(collectionId: string): Promise<CollectionWorkflow | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM collection_workflows
    WHERE collection_id = ${collectionId}
    LIMIT 1
  `;
  return (rows[0] as CollectionWorkflow) || null;
}

export type CollectionSource = {
  id: string;
  collection_id: string;
  source_name: string;
  source_url: string;
  source_type: string;
  status: string;
  relevance: string | null;
  reason: string | null;
  collected_at: string;
  updated_at: string;
};

export async function saveDiscoveredSources(collectionId: string, sources: any[]): Promise<CollectionSource[]> {
  const sql = getDb();
  
  if (!sources || sources.length === 0) return [];
  
  // Clean duplicates before inserting
  const uniqueSources = sources.filter((s, idx, self) => 
    idx === self.findIndex((t) => t.url === s.url)
  );

  const inserted: CollectionSource[] = [];

  for (const source of uniqueSources) {
    try {
      const rows = await sql`
        INSERT INTO collection_sources (
          collection_id, 
          source_name, 
          source_url, 
          source_type, 
          status, 
          relevance, 
          reason
        )
        VALUES (
          ${collectionId}, 
          ${source.name}, 
          ${source.url}, 
          ${source.type}, 
          ${source.status || 'discovered'}, 
          ${source.relevance || null}, 
          ${source.reason || null}
        )
        RETURNING *
      `;
      inserted.push(rows[0] as CollectionSource);
    } catch (e: any) {
      // Ignore unique constraint violations if we add a unique index later,
      // or handle duplicates gracefully. Right now, there's no unique constraint on (collection_id, source_url)
      // but we filter them in the application logic above.
      console.warn("Could not insert source:", source.url, e.message);
    }
  }

  return inserted;
}

export async function getCollectionSources(collectionId: string): Promise<CollectionSource[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM collection_sources
    WHERE collection_id = ${collectionId}
    ORDER BY collected_at ASC
  `;
  return rows as CollectionSource[];
}

export type CollectionRecord = {
  id: string;
  collection_id: string;
  source_id: string | null;
  record_data: Record<string, any>;
  source_url: string;
  source_name: string | null;
  status: 'collected' | 'empty' | 'failed';
  error_message: string | null;
  collected_at: string;
  created_at: string;
};

export async function saveCollectionRecords(
  collectionId: string,
  records: Array<{
    source_id?: string | null;
    record_data: Record<string, any>;
    source_url: string;
    source_name?: string | null;
    status?: 'collected' | 'empty' | 'failed';
    error_message?: string | null;
  }>
): Promise<CollectionRecord[]> {
  const sql = getDb();
  if (!records || records.length === 0) return [];

  const inserted: CollectionRecord[] = [];
  for (const item of records) {
    try {
      const recordJson = JSON.stringify(item.record_data);
      const rows = await sql`
        INSERT INTO collection_records (
          collection_id,
          source_id,
          record_data,
          source_url,
          source_name,
          status,
          error_message
        ) VALUES (
          ${collectionId},
          ${item.source_id || null},
          ${recordJson}::jsonb,
          ${item.source_url},
          ${item.source_name || null},
          ${item.status || 'collected'},
          ${item.error_message || null}
        )
        RETURNING *
      `;
      inserted.push(rows[0] as CollectionRecord);
    } catch (e: any) {
      console.warn("Could not insert collection record:", item.source_url, e.message);
    }
  }

  return inserted;
}

export async function getCollectionRecords(collectionId: string): Promise<CollectionRecord[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM collection_records
    WHERE collection_id = ${collectionId}
    ORDER BY created_at ASC
  `;
  return rows as CollectionRecord[];
}

export async function updateCollectionSourceStatus(
  sourceId: string,
  status: 'discovered' | 'verified' | 'inaccessible' | 'rejected'
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE collection_sources
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${sourceId}
  `;
}


