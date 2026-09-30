// Run from FetchIT project root to resolve 'postgres' module
import { getDb } from '../lib/db';

async function main() {
  const sql = getDb();

  const rows = await sql`
    SELECT id, LEFT(token, 30) as token_prefix, LENGTH(token) as token_len, "createdAt"
    FROM neon_auth.session
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;
  console.log("Sessions:");
  for (const r of rows) {
    console.log(`  id=${r.id} token_len=${r.token_len} token_prefix=${r.token_prefix} created=${r.createdAt}`);
  }

  const accs = await sql`
    SELECT "providerId", "userId", "createdAt"
    FROM neon_auth.account
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;
  console.log("\nAccounts:");
  for (const a of accs) {
    console.log(`  provider=${a.providerId} userId=${a.userId} created=${a.createdAt}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
