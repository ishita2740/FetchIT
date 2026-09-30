/**
 * End-to-end test for the complete FetchIT pipeline including
 * Cleaning, Validation, and Deduplication.
 *
 * Uses server-side approach (same pattern as test-tavily-discovery.ts)
 * with mocked auth.getSession().
 *
 * Flow:
 * 1. Create collection
 * 2. Understand
 * 3. Plan
 * 4. Discover sources (Tavily)
 * 5. Collect data
 * 6. Process (Clean → Validate → Deduplicate)
 */

// Load env vars before any other imports
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
  // Remove surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

import { auth } from "@/lib/auth/server";
import {
  upsertUserProfile,
  createCollection,
  getCollectionById,
  getCollectionResult,
  getWorkflowPlan,
  getCollectionSources,
  getCollectionRecords,
  updateCollectionStatus,
} from "@/lib/db";
import { POST as understandRoute } from "@/app/api/collections/[id]/understand/route";
import { POST as planRoute } from "@/app/api/collections/[id]/plan/route";
import { POST as discoverRoute } from "@/app/api/collections/[id]/sources/discover/route";
import { POST as collectRoute } from "@/app/api/collections/[id]/collect/route";
import { POST as processRoute } from "@/app/api/collections/[id]/process/route";
import { NextRequest } from "next/server";

async function runTest() {
  console.log("==================================================");
  console.log("FETCHIT: E2E PROCESSING (CLEAN/VALIDATE/DEDUP) TEST");
  console.log("==================================================\n");

  // 1. Setup test user
  console.log("Step 1: Setting up test user...");
  const testAuthId = "test-auth-user-processing-e2e";
  const userProfile = await upsertUserProfile({
    auth_user_id: testAuthId,
    name: "Processing E2E Tester",
    email: "processing.tester@fetchit.local",
  });
  console.log("✓ User profile:", { id: userProfile.id, email: userProfile.email });

  // Mock auth
  auth.getSession = async () =>
    ({
      data: {
        user: {
          id: testAuthId,
          email: "processing.tester@fetchit.local",
          name: "Processing E2E Tester",
        },
      },
      error: null,
    }) as any;

  // 2. Create collection
  console.log("\nStep 2: Creating collection...");
  const query = "Find AI startups in India with their founders, funding and website";
  const collection = await createCollection({
    user_profile_id: userProfile.id,
    original_input: query,
    input_type: "text",
    title: "AI Startups India (Processing E2E Test)",
  });
  const collectionId = (collection as any).id;
  console.log("✓ Collection:", collectionId);

  // Helper to build a fake NextRequest
  function makeRequest() {
    return new NextRequest("http://localhost:3000/api/test", { method: "POST" });
  }
  function makeContext() {
    return { params: Promise.resolve({ id: collectionId }) };
  }

  // 3. Understand
  console.log("\nStep 3: Understanding...");
  const undRes = await understandRoute(makeRequest(), makeContext());
  const undData = await undRes.json();
  if (!undRes.ok) throw new Error(`Understand failed: ${JSON.stringify(undData)}`);
  const requirement = undData.result?.result_data;
  console.log("✓ Status:", undData.collection.status);
  console.log("✓ Fields:", requirement?.fields?.join(", ") || "N/A");

  // 4. Plan
  console.log("\nStep 4: Planning...");
  const planRes = await planRoute(makeRequest(), makeContext());
  const planData = await planRes.json();
  if (!planRes.ok) throw new Error(`Plan failed: ${JSON.stringify(planData)}`);
  console.log("✓ Status:", planData.collection.status);
  console.log("✓ Steps:", planData.plan?.steps?.length || 0);

  // 5. Discover
  console.log("\nStep 5: Discovering sources (Tavily)...");
  const discRes = await discoverRoute(makeRequest(), makeContext());
  const discData = await discRes.json();
  if (!discRes.ok) throw new Error(`Discover failed: ${JSON.stringify(discData)}`);
  console.log("✓ Status:", discData.collection.status);
  console.log("✓ Sources:", discData.sources?.length || 0);

  // 6. Collect
  console.log("\nStep 6: Collecting data from real sources...");
  const collectRes = await collectRoute(makeRequest(), makeContext());
  const collectData = await collectRes.json();
  if (!collectRes.ok) throw new Error(`Collect failed: ${JSON.stringify(collectData)}`);
  console.log("✓ Status:", collectData.collection.status);
  console.log("✓ Records collected:", collectData.summary?.records_collected || 0);
  console.log("✓ Sources succeeded:", collectData.summary?.sources_succeeded || 0);
  console.log("✓ Sources failed:", collectData.summary?.sources_failed || 0);

  // Verify records in DB
  const rawRecords = await getCollectionRecords(collectionId);
  const collectedRecords = rawRecords.filter((r) => r.status === "collected");
  console.log("✓ DB records: total=" + rawRecords.length + ", collected=" + collectedRecords.length);

  // 7. Process (Clean → Validate → Deduplicate)
  console.log("\nStep 7: Processing (Clean → Validate → Deduplicate)...");
  const processRes = await processRoute(makeRequest(), makeContext());
  const processData = await processRes.json();

  if (!processRes.ok) {
    console.error("✗ Processing failed:", JSON.stringify(processData, null, 2));
    process.exit(1);
  }

  const summary = processData.summary;

  console.log("✓ Final status:", processData.collection.status);
  console.log("\n─── PROCESSING SUMMARY ───");
  console.log("  Raw records:", summary.raw_records);
  console.log("  After cleaning:", summary.after_cleaning);
  console.log("  Dropped by cleaning:", summary.dropped_by_cleaning);
  console.log("  Valid:", summary.valid);
  console.log("  Incomplete:", summary.incomplete);
  console.log("  Invalid:", summary.invalid);
  console.log("  Duplicates removed:", summary.duplicates_removed);
  console.log("  FINAL COUNT:", summary.final_count);

  if (summary.duplicate_examples?.length > 0) {
    console.log("\n─── DUPLICATE EXAMPLES ───");
    for (const dup of summary.duplicate_examples) {
      console.log(`  Kept: ${dup.kept_source}`);
      console.log(`  Dropped: ${dup.dropped_source}`);
      console.log("");
    }
  }

  // Show sample final records
  if (processData.final_records?.length > 0) {
    console.log("─── SAMPLE FINAL RECORDS (first 3) ───");
    for (const rec of processData.final_records.slice(0, 3)) {
      const { _source_url, _source_name, _source_id, _validation, ...fields } = rec;
      console.log(`  [${_validation}] from ${_source_name || _source_url}`);
      for (const [k, v] of Object.entries(fields)) {
        console.log(`    ${k}: ${v ?? "N/A"}`);
      }
      console.log("");
    }
  }

  // Verify source traceability
  const allHaveSource = processData.final_records?.every(
    (r: any) => r._source_url && r._source_url.startsWith("http")
  );

  // Verify collection_results was saved
  const finalResult = await getCollectionResult(collectionId);
  const finalCollection = await getCollectionById(collectionId);

  console.log("─── VERIFICATION ───");
  console.log("  Source traceability:", allHaveSource ? "✓ All records have source URLs" : "✗ Missing");
  console.log("  collection_results saved:", finalResult ? "✓" : "✗");
  console.log("  Final collection status:", finalCollection?.status);
  console.log("  Final records in result_data:", (finalResult?.result_data as any)?.records?.length || 0);

  console.log("\n==================================================");
  console.log("RESULT: " + (processData.collection.status === "completed" ? "✓ PASSED" : "✗ FAILED"));
  console.log(`Pipeline: Understanding → Planning → Discovery → Collection → Cleaning → Validation → Deduplication → Complete`);
  console.log(`Final dataset: ${processData.final_count} unique, validated records`);
  console.log("==================================================");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
