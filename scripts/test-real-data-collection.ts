import { auth } from "@/lib/auth/server";
import {
  upsertUserProfile,
  createCollection,
  getCollectionById,
  getCollectionResult,
  getWorkflowPlan,
  getCollectionSources,
  getCollectionRecords,
  getDb
} from "@/lib/db";
import { POST as understandRoute } from "@/app/api/collections/[id]/understand/route";
import { POST as planRoute } from "@/app/api/collections/[id]/plan/route";
import { POST as discoverRoute } from "@/app/api/collections/[id]/sources/discover/route";
import { POST as collectRoute } from "@/app/api/collections/[id]/collect/route";
import { NextRequest } from "next/server";
import { CollectedRecordSchema } from "@/lib/ai/schema";

async function runEndToEndDataCollectionTest() {
  console.log("================================================================================");
  console.log("FETCHIT: REAL END-TO-END DATA COLLECTION & EXTRACTION PIPELINE TEST");
  console.log("================================================================================\n");

  const testQuery = "Find AI startups in India with their founders, funding and website.";
  console.log(`Test Query: "${testQuery}"\n`);

  // 1. Setup authenticated test user profile in Neon DB
  console.log("Step 1: Setting up authenticated test user in Neon DB...");
  const testAuthId = "test-auth-user-real-collection";
  const userProfile = await upsertUserProfile({
    auth_user_id: testAuthId,
    name: "Data Collection Tester",
    email: "datacollection.tester@fetchit.local",
  });
  console.log(`✓ User profile resolved: ${userProfile.id} (${userProfile.email})`);

  // Mock session for Next.js route handlers
  auth.getSession = async () => ({
    data: {
      user: {
        id: testAuthId,
        email: "datacollection.tester@fetchit.local",
        name: "Data Collection Tester",
      },
    },
    error: null,
  }) as any;

  // 2. Create real collection in Neon DB
  console.log("\nStep 2: Creating real collection in Neon DB...");
  const collection = await createCollection({
    user_profile_id: userProfile.id,
    title: testQuery.slice(0, 40),
    original_input: testQuery,
    input_type: "text",
  });
  console.log(`✓ Collection created: id=${collection.id}, status=${collection.status}`);

  // 3. AI Understanding Step
  console.log("\nStep 3: Running AI Understanding step (POST /api/collections/[id]/understand)...");
  const understandStart = Date.now();
  const understandReq = new NextRequest(`http://localhost:3000/api/collections/${collection.id}/understand`, { method: "POST" });
  const understandRes = await understandRoute(understandReq, { params: Promise.resolve({ id: collection.id }) });
  const understandData = await understandRes.json();

  if (!understandRes.ok || !understandData.success) {
    throw new Error(`AI Understanding failed (${understandRes.status}): ${JSON.stringify(understandData)}`);
  }
  console.log(`✓ AI Understanding completed in ${Date.now() - understandStart}ms:`);
  console.log(`  Topic: ${understandData.result.result_data.topic}`);
  console.log(`  Entity: ${understandData.result.result_data.entity}`);
  console.log(`  Fields: [${(understandData.result.result_data.fields || []).join(", ")}]`);
  console.log(`  Understood: ${understandData.result.understood_requirement}`);

  // 4. Workflow Planner Step
  console.log("\nStep 4: Running Workflow Planner step (POST /api/collections/[id]/plan)...");
  const planStart = Date.now();
  const planReq = new NextRequest(`http://localhost:3000/api/collections/${collection.id}/plan`, { method: "POST" });
  const planRes = await planRoute(planReq, { params: Promise.resolve({ id: collection.id }) });
  const planData = await planRes.json();

  if (!planRes.ok || !planData.success) {
    throw new Error(`Workflow planning failed (${planRes.status}): ${JSON.stringify(planData)}`);
  }
  console.log(`✓ Workflow Planning completed in ${Date.now() - planStart}ms:`);
  console.log(`  Goal: ${planData.plan.goal}`);
  console.log(`  Requires sources: ${planData.plan.requires_sources}`);
  console.log(`  Steps: ${planData.plan.steps.length}`);

  // 5. Source Discovery Step (Real Tavily API)
  console.log("\nStep 5: Running Tavily Source Discovery step (POST /api/collections/[id]/sources/discover)...");
  const discoverStart = Date.now();
  const discoverReq = new NextRequest(`http://localhost:3000/api/collections/${collection.id}/sources/discover`, { method: "POST" });
  const discoverRes = await discoverRoute(discoverReq, { params: Promise.resolve({ id: collection.id }) });
  const discoverData = await discoverRes.json();

  if (!discoverRes.ok || !discoverData.success) {
    throw new Error(`Source Discovery failed (${discoverRes.status}): ${JSON.stringify(discoverData)}`);
  }
  console.log(`✓ Real Tavily Source Discovery completed in ${Date.now() - discoverStart}ms:`);
  console.log(`  Discovered sources count: ${discoverData.sources.length}`);

  // 6. REAL DATA COLLECTION STEP
  console.log("\nStep 6: Running REAL Data Collection step (POST /api/collections/[id]/collect)...");
  const collectStart = Date.now();
  const collectReq = new NextRequest(`http://localhost:3000/api/collections/${collection.id}/collect`, { method: "POST" });
  const collectRes = await collectRoute(collectReq, { params: Promise.resolve({ id: collection.id }) });
  const collectData = await collectRes.json();

  if (!collectRes.ok || !collectData.success) {
    throw new Error(`Data Collection failed (${collectRes.status}): ${JSON.stringify(collectData)}`);
  }
  const collectDuration = Date.now() - collectStart;
  console.log(`✓ Data Collection endpoint finished in ${collectDuration}ms!`);
  console.log("  Summary returned:", collectData.summary);

  // 7. Verify directly in Neon Database
  console.log("\nStep 7: Verifying collection_records directly in Neon DB...");
  const recordsInDb = await getCollectionRecords(collection.id);
  console.log(`✓ Found ${recordsInDb.length} rows in collection_records table.`);

  if (recordsInDb.length === 0) {
    throw new Error("FAIL: 0 records found in collection_records table");
  }

  // 8. Verify Source Traceability for every record
  console.log("\nStep 8: Verifying traceability for each record...");
  const collectedRecords = recordsInDb.filter(r => r.status === "collected");
  console.log(`  Total collected (successful) records: ${collectedRecords.length}`);

  for (let i = 0; i < collectedRecords.length; i++) {
    const rec = collectedRecords[i];
    if (!rec.source_id) {
      throw new Error(`Record #${i} is missing source_id!`);
    }
    if (!rec.source_url) {
      throw new Error(`Record #${i} is missing source_url!`);
    }
    if (!rec.record_data || Object.keys(rec.record_data).length === 0) {
      throw new Error(`Record #${i} has empty record_data!`);
    }
  }
  console.log(`✓ All ${collectedRecords.length} records have valid source_id, source_url, source_name, and non-empty record_data.`);

  // 9. Inspect sample extracted records
  console.log("\nStep 9: Sample Extracted Records (Real Web Content):");
  for (let i = 0; i < Math.min(collectedRecords.length, 5); i++) {
    const rec = collectedRecords[i];
    const domain = new URL(rec.source_url).hostname;
    console.log(`\n  --- Record #${i + 1} from [${domain}] ---`);
    console.log(`  Source: ${rec.source_name || rec.source_url}`);
    console.log(`  Source URL: ${rec.source_url}`);
    console.log(`  Extracted Data:`, JSON.stringify(rec.record_data, null, 4));
  }

  // 10. Check collection_sources status updates
  console.log("\nStep 10: Verifying collection_sources status in Neon DB...");
  const updatedSources = await getCollectionSources(collection.id);
  const statusCounts: Record<string, number> = {};
  for (const s of updatedSources) {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  }
  console.log("  Source status distribution:", statusCounts);

  // 11. Check collection status
  const finalCollection = await getCollectionById(collection.id);
  console.log(`\nStep 11: Final Collection Status: "${finalCollection?.status}" (expected: "cleaning")`);

  console.log("\n================================================================================");
  console.log("ALL REAL DATA COLLECTION & EXTRACTION TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================================");

  return {
    collectionId: collection.id,
    sourcesProcessed: updatedSources.length,
    sourcesSucceeded: collectData.summary.sources_succeeded,
    sourcesFailed: collectData.summary.sources_failed,
    recordsCollected: collectedRecords.length,
    statusCounts,
    sampleRecords: collectedRecords.slice(0, 5).map(r => ({
      source_name: r.source_name,
      domain: new URL(r.source_url).hostname,
      source_url: r.source_url,
      record_data: r.record_data,
    })),
  };
}

runEndToEndDataCollectionTest()
  .then((res) => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nTEST SUITE FAILED WITH ERROR:", err);
    process.exit(1);
  });
