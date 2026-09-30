import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

import { getDb } from "../lib/db";

async function inspectDb() {
  const sql = getDb();
  const tables = await sql`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('public', 'neon_auth')
  `;
  console.log("Tables in public & neon_auth:", tables);

  const authUsers = await sql`SELECT * FROM neon_auth.user LIMIT 5`.catch(e => e.message);
  console.log("neon_auth.user:", authUsers);

  const authSessions = await sql`SELECT * FROM neon_auth.session LIMIT 5`.catch(e => e.message);
  console.log("neon_auth.session:", authSessions);

  const authAccounts = await sql`SELECT * FROM neon_auth.account LIMIT 5`.catch(e => e.message);
  console.log("neon_auth.account:", authAccounts);
}

inspectDb();
