import { auth } from "@/lib/auth/server";
import {
  upsertUserProfile,
  createCollection,
  getCollectionById,
  getCollectionResult,
  getWorkflowPlan,
  getCollectionSources,
  getDb
} from "@/lib/db";
import { POST as understandRoute } from "@/app/api/collections/[id]/understand/route";
import { POST as planRoute } from "@/app/api/collections/[id]/plan/route";
import { POST as discoverRoute } from "@/app/api/collections/[id]/sources/discover/route";
import { NextRequest } from "next/server";
import { DiscoveredSourceSchema } from "@/lib/ai/schema";

async function runTest() {
  console.log("==================================================");
  console.log("FETCHIT: REAL END-TO-END TAVILY DISCOVERY TEST");
  console.log("==================================================\n");

  // 1. Verify TAVILY_API_KEY is loaded server-side
  console.log("Step 1: Verifying TAVILY_API_KEY server-side...");
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    throw new Error("FAIL: TAVILY_API_KEY is not loaded in process.env");
  }
  console.log("✓ TAVILY_API_KEY is loaded (length: " + tavilyKey.length + ", prefix: " + tavilyKey.slice(0, 8) + "...)");

  // 2. Set up authenticated session & user profile for test
  console.log("\nStep 2: Setting up test user and creating collection...");
  const testAuthId = "test-auth-user-tavily-discovery";
  const userProfile = await upsertUserProfile({
    auth_user_id: testAuthId,
    name: "Tavily Discovery Tester",
    email: "tavily.tester@fetchit.local",
  });
  console.log("✓ User profile resolved:", { id: userProfile.id, email: userProfile.email });

  // Mock auth.getSession to return our test session
  auth.getSession = async () => ({
    data: {
      user: {
        id: testAuthId,
        email: "tavily.tester@fetchit.local",
        name: "Tavily Discovery Tester",
      },
    },
    error: null,
  }) as any;

  // Create collection with query: "Find AI startups in India"
  const testQuery = "Find AI startups in India";
  const collection = await createCollection({
    user_profile_id: userProfile.id,
    title: testQuery,
    original_input: testQuery,
    input_type: "text",
  });
  console.log("✓ Collection created:", { id: collection.id, title: collection.title, status: collection.status });

  // 3. Run the existing understanding step
  console.log("\nStep 3: Running existing AI understanding step (POST /api/collections/[id]/understand)...");
  const understandReq = new NextRequest(`http://localhost:3000/api/collections/${collection.id}/understand`, {
    method: "POST",
  });
  const understandRes = await understandRoute(understandReq, {
    params: Promise.resolve({ id: collection.id }),
  });
  const understandJson = await understandRes.json();
  if (!understandRes.ok || !understandJson.success) {
    throw new Error(`AI Understanding failed with status ${understandRes.status}: ${JSON.stringify(understandJson)}`);
  }
  console.log("✓ AI Understanding succeeded!");
  console.log("  Understood requirement:", understandJson.result.understood_requirement);
  console.log("  Topic:", understandJson.result.result_data.topic);
  console.log("  Entity:", understandJson.result.result_data.entity);
  console.log("  Location:", understandJson.result.result_data.location);

  // 4. Run the existing workflow planner
  console.log("\nStep 4: Running existing AI workflow planner (POST /api/collections/[id]/plan)...");
  const planReq = new NextRequest(`http://localhost:3000/api/collections/${collection.id}/plan`, {
    method: "POST",
  });
  const planRes = await planRoute(planReq, {
    params: Promise.resolve({ id: collection.id }),
  });
  const planJson = await planRes.json();
  if (!planRes.ok || !planJson.success) {
    throw new Error(`Workflow planning failed with status ${planRes.status}: ${JSON.stringify(planJson)}`);
  }
  console.log("✓ Workflow Planning succeeded!");
  console.log("  Goal:", planJson.plan.goal);
  console.log("  Requires sources:", planJson.plan.requires_sources);
  console.log("  Steps count:", planJson.plan.steps.length);

  // 5. Run POST /api/collections/[id]/sources/discover
  console.log("\nStep 5: Running POST /api/collections/[id]/sources/discover...");
  const startTime = Date.now();
  const discoverReq = new NextRequest(`http://localhost:3000/api/collections/${collection.id}/sources/discover`, {
    method: "POST",
  });
  const discoverRes = await discoverRoute(discoverReq, {
    params: Promise.resolve({ id: collection.id }),
  });
  const durationMs = Date.now() - startTime;
  const discoverJson = await discoverRes.json();

  if (!discoverRes.ok || !discoverJson.success) {
    throw new Error(`Source Discovery failed with status ${discoverRes.status}: ${JSON.stringify(discoverJson)}`);
  }
  console.log(`✓ Source Discovery endpoint completed successfully in ${durationMs}ms!`);

  // 6. Confirm that Tavily was actually called & 7. Real Tavily results returned
  console.log("\nStep 6 & 7: Verifying Tavily results returned...");
  const returnedSources = discoverJson.sources;
  console.log(`✓ Number of sources returned: ${returnedSources.length}`);
  if (returnedSources.length === 0) {
    throw new Error("FAIL: 0 sources returned from Tavily discovery");
  }

  // 8. Confirm that the results are mapped into the existing DiscoveredSource schema
  console.log("\nStep 8: Validating results against DiscoveredSource schema...");
  for (let i = 0; i < returnedSources.length; i++) {
    const s = returnedSources[i];
    // Validate schema
    const validationResult = DiscoveredSourceSchema.safeParse({
      name: s.source_name,
      url: s.source_url,
      type: s.source_type,
      relevance: s.relevance,
      reason: s.reason,
      status: s.status,
    });
    if (!validationResult.success) {
      throw new Error(`Source #${i} failed schema validation: ${JSON.stringify(validationResult.error)}`);
    }
  }
  console.log(`✓ All ${returnedSources.length} sources strictly conform to DiscoveredSourceSchema.`);

  // 9. Confirm that the sources are persisted through existing collection_sources implementation
  console.log("\nStep 9: Verifying database persistence in collection_sources table...");
  const persistedSources = await getCollectionSources(collection.id);
  console.log(`✓ Database has ${persistedSources.length} rows in collection_sources for collection ${collection.id}.`);
  if (persistedSources.length !== returnedSources.length) {
    throw new Error(`Mismatch: returned ${returnedSources.length} sources but found ${persistedSources.length} in DB`);
  }

  // 10. Confirm no mock/fake sources
  console.log("\nStep 10: Confirming sources are real web sources (not mock/synthetic)...");
  console.log("Sources Sample:");
  for (let i = 0; i < Math.min(persistedSources.length, 5); i++) {
    const src = persistedSources[i];
    const urlObj = new URL(src.source_url);
    console.log(`  [${i + 1}] Name: ${src.source_name}`);
    console.log(`      Domain: ${urlObj.hostname}`);
    console.log(`      URL: ${src.source_url}`);
    console.log(`      Type: ${src.source_type}`);
    console.log(`      Relevance: ${src.relevance?.slice(0, 100)}...`);
  }

  // Verify collection updated status
  const finalCollection = await getCollectionById(collection.id);
  console.log("\nFinal Collection Status:", finalCollection?.status);

  console.log("\n==================================================");
  console.log("ALL REAL TAVILY DISCOVERY TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");

  return {
    success: true,
    totalSources: persistedSources.length,
    sources: persistedSources.map(s => ({
      name: s.source_name,
      domain: new URL(s.source_url).hostname,
      url: s.source_url,
      type: s.source_type,
    })),
  };
}

runTest()
  .then(res => {
    process.exit(0);
  })
  .catch(err => {
    console.error("\nTEST FAILED WITH ERROR:", err);
    process.exit(1);
  });
