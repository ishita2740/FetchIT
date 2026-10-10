import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const l = env.split('\n').find(x => x.startsWith('DATABASE_URL='));
const dbUrl = l.substring(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
process.env.DATABASE_URL = dbUrl;
const sql = neon(dbUrl);

async function check() {
  const users = await sql`SELECT id, auth_user_id, email, name FROM user_profiles`;
  console.log('User profiles:', users.length);
  for (const u of users) {
    console.log(` - ID: ${u.id}, auth_user_id: ${u.auth_user_id}, email: ${u.email}`);
  }

  const collections = await sql`SELECT id, user_profile_id, title, status, created_at FROM collections ORDER BY created_at DESC LIMIT 10`;
  console.log('\nCollections in DB:', collections.length);
  for (const c of collections) {
    console.log(` - ID: ${c.id}, Profile: ${c.user_profile_id}, Status: ${c.status}, Title: ${c.title}`);
  }

  const { getUserCollections } = await import('../lib/db.ts');
  const userProfileId = '74fbeed4-9336-4252-96bf-adf250f689d2';
  try {
    const userCols = await getUserCollections(userProfileId);
    console.log(`\ngetUserCollections for ${userProfileId}:`, userCols.length, 'collections found:');
    for (const uc of userCols) {
      console.log(`  * [${uc.status}] ${uc.title} (record_count: ${uc.record_count})`);
    }
  } catch (err) {
    console.error('\ngetUserCollections FAILED:', err);
  }

  const authUsers = await sql`SELECT id, email, name FROM neon_auth.user LIMIT 5`.catch(() => []);
  console.log('\nNeon Auth Users:', authUsers.length);
  for (const au of authUsers) {
    console.log(` - Auth ID: ${au.id}, Email: ${au.email}, Name: ${au.name}`);
  }

  const sessions = await sql`SELECT id, "userId", "expiresAt" FROM neon_auth.session ORDER BY "expiresAt" DESC LIMIT 5`.catch(() => []);
  console.log('\nNeon Auth Active Sessions:', sessions.length);
  for (const s of sessions) {
    console.log(` - Session ID: ${s.id}, User: ${s.userId}, Expires: ${s.expiresAt}`);
  }
}

check().catch(console.error);
