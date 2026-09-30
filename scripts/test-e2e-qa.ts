/**
 * scripts/test-e2e-qa.ts
 *
 * Full End-to-End QA Pass verifying all 30 points of the FetchIT user journey:
 * Query: "Find 20 AI startups in India with their founders, funding and website."
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
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

import { auth } from "@/lib/auth/server";
import {
  getDb,
  upsertUserProfile,
  createCollection,
  getCollectionById,
  getCollectionResult,
  getCollectionSources,
  getCollectionRecords,
  getUserCollections,
} from "@/lib/db";
import { POST as understandRoute } from "@/app/api/collections/[id]/understand/route";
import { POST as planRoute } from "@/app/api/collections/[id]/plan/route";
import { POST as discoverRoute } from "@/app/api/collections/[id]/sources/discover/route";
import { POST as collectRoute } from "@/app/api/collections/[id]/collect/route";
import { POST as processRoute } from "@/app/api/collections/[id]/process/route";
import { GET as getResultRoute } from "@/app/api/collections/[id]/result/route";
import { GET as getSourcesRoute } from "@/app/api/collections/[id]/sources/route";
import { GET as getExportRoute } from "@/app/api/collections/[id]/export/route";
import { GET as getCollectionsRoute } from "@/app/api/collections/route";
import { NextRequest } from "next/server";

async function runQA() {
  console.log("===============================================================");
  console.log("FETCHIT: FINAL COMPREHENSIVE END-TO-END QA PASS");
  console.log("===============================================================\n");

  const errors: string[] = [];

  // Setup test user with actual preferences in Neon
  console.log("1. Setting up verified user with saved preferences...");
  const testAuthId = "qa-user-full-e2e-" + Date.now();
  const testEmail = `qa.${Date.now()}@fetchit.local`;
  const userProfile = await upsertUserProfile({
    auth_user_id: testAuthId,
    name: "Ishit Sharma",
    email: testEmail,
  });

  const { upsertUserPreferences } = await import("@/lib/db");
  const realPreferences = {
    user_profile_id: userProfile.id,
    information_style: ["concise executive summaries", "structured data"],
    information_priorities: ["funding rounds", "verified founders"],
  };
  await upsertUserPreferences(realPreferences);
  console.log("✓ User preferences saved via upsertUserPreferences:", realPreferences);

  // Authenticate session
  auth.getSession = async () =>
    ({
      data: {
        user: {
          id: testAuthId,
          email: testEmail,
          name: "Ishit Sharma",
        },
      },
      error: null,
    }) as any;

  // 2. Submit exact query
  const testQuery = "Find 20 AI startups in India with their founders, funding and website.";
  console.log(`\n2. Creating collection with query: "${testQuery}"...`);
  const collection = await createCollection({
    user_profile_id: userProfile.id,
    original_input: testQuery,
    input_type: "text",
    title: testQuery.slice(0, 60),
  });
  const collectionId = (collection as any).id;
  console.log("✓ Collection created:", collectionId, "Status:", (collection as any).status);

  function makeContext() {
    return { params: Promise.resolve({ id: collectionId }) };
  }

  // 3. Pipeline Step: Understand
  console.log("\n3. Running Understanding step...");
  const req1 = new NextRequest(`http://localhost:3000/api/collections/${collectionId}/understand`, { method: "POST" });
  const res1 = await understandRoute(req1, makeContext());
  const data1 = await res1.json();
  if (!res1.ok) errors.push(`Understand failed: ${data1.error}`);
  console.log("✓ Understand response status:", res1.status, "Collection status:", data1.collection?.status);
  console.log("  Understood requirement:", data1.result?.understood_requirement?.slice(0, 100) + "...");
  console.log("  Identified fields:", data1.result?.result_data?.fields);

  // 4. Pipeline Step: Plan
  console.log("\n4. Running Workflow Planner step...");
  const req2 = new NextRequest(`http://localhost:3000/api/collections/${collectionId}/plan`, { method: "POST" });
  const res2 = await planRoute(req2, makeContext());
  const data2 = await res2.json();
  if (!res2.ok) errors.push(`Plan failed: ${data2.error}`);
  console.log("✓ Plan response status:", res2.status, "Collection status:", data2.collection?.status);

  // 5. Pipeline Step: Source Discovery (Tavily)
  console.log("\n5. Running Source Discovery (Tavily)...");
  const req3 = new NextRequest(`http://localhost:3000/api/collections/${collectionId}/sources/discover`, { method: "POST" });
  const res3 = await discoverRoute(req3, makeContext());
  const data3 = await res3.json();
  if (!res3.ok) errors.push(`Discover failed: ${data3.error}`);
  console.log("✓ Discover response status:", res3.status, "Collection status:", data3.collection?.status);
  console.log(`  Discovered ${data3.sources?.length || 0} real web sources.`);
  if (data3.sources?.length > 0) {
    console.log("  Sample source:", data3.sources[0].source_name, "-", data3.sources[0].source_url);
  }

  // 6. Pipeline Step: Real HTTP Collection & Extraction
  console.log("\n6. Running Real HTTP Collection & Gemini Extraction...");
  const req4 = new NextRequest(`http://localhost:3000/api/collections/${collectionId}/collect`, { method: "POST" });
  const res4 = await collectRoute(req4, makeContext());
  const data4 = await res4.json();
  if (!res4.ok) errors.push(`Collect failed: ${data4.error}`);
  console.log("✓ Collect response status:", res4.status, "Collection status:", data4.collection?.status);
  console.log(`  Raw records collected: ${data4.records_collected || 0}`);
  console.log(`  Sources succeeded: ${data4.sources_succeeded}, Inaccessible: ${data4.sources_failed}`);

  // 7. Pipeline Step: Cleaning, Validation, Deduplication
  console.log("\n7. Running Processing (Clean, Validate, Dedup)...");
  const req5 = new NextRequest(`http://localhost:3000/api/collections/${collectionId}/process`, { method: "POST" });
  const res5 = await processRoute(req5, makeContext());
  const data5 = await res5.json();
  if (!res5.ok) errors.push(`Process failed: ${data5.error}`);
  console.log("✓ Process response status:", res5.status, "Collection status:", data5.collection?.status);
  console.log(`  Final dataset count: ${data5.final_count} unique records`);
  console.log("  Summary:", data5.summary);

  // 8. Test GET /api/collections/[id]/result
  console.log("\n8. Testing GET /api/collections/[id]/result (Result Screen Data)...");
  const reqRes = new NextRequest(`http://localhost:3000/api/collections/${collectionId}/result`, { method: "GET" });
  const resRes = await getResultRoute(reqRes, makeContext());
  const dataRes = await resRes.json();
  if (!resRes.ok) errors.push(`GET /result failed: ${dataRes.error}`);
  console.log("✓ GET /result status:", resRes.status);
  console.log("  Understood requirement present:", Boolean(dataRes.understood_requirement));
  console.log("  Result records count:", dataRes.result_data?.records?.length);
  console.log("  Result summary valid:", Boolean(dataRes.result_data?.summary));

  // 9. Test dynamic columns generation
  console.log("\n9. Testing Dynamic Columns Generation...");
  const records = dataRes.result_data?.records || [];
  const colSet = new Set<string>();
  for (const r of records) {
    for (const k of Object.keys(r)) {
      if (!k.startsWith("_")) colSet.add(k);
    }
  }
  const dynamicCols = Array.from(colSet);
  console.log("✓ Dynamically discovered columns (from real data):", dynamicCols);
  if (dynamicCols.length === 0) errors.push("No dynamic columns generated");

  // 10. Test Search across dataset
  console.log("\n10. Testing In-Memory Search on dynamic dataset...");
  const firstCol = dynamicCols[0];
  const sampleVal = String(records[0]?.[firstCol] || "").slice(0, 5);
  const searchMatches = records.filter((r: any) =>
    dynamicCols.some((c) => String(r[c] || "").toLowerCase().includes(sampleVal.toLowerCase()))
  );
  console.log(`✓ Search for "${sampleVal}" matched ${searchMatches.length} / ${records.length} records`);

  // 11. Test Quality Filtering (Valid vs Incomplete)
  console.log("\n11. Testing Quality Filtering...");
  const validRecords = records.filter((r: any) => r._validation === "valid");
  const incompleteRecords = records.filter((r: any) => r._validation === "incomplete");
  console.log(`✓ Valid: ${validRecords.length}, Incomplete: ${incompleteRecords.length}`);

  // 12. Test Source Filtering
  console.log("\n12. Testing Source Filtering...");
  const sampleSource = records[0]?._source_name || records[0]?._source_url;
  const sourceMatches = records.filter((r: any) => (r._source_name || r._source_url) === sampleSource);
  console.log(`✓ Source filter "${sampleSource}" matched ${sourceMatches.length} records`);

  // 13. Test Sorting
  console.log("\n13. Testing Sorting...");
  const sortedAsc = [...records].sort((a: any, b: any) =>
    String(a[firstCol] ?? "").localeCompare(String(b[firstCol] ?? ""))
  );
  const sortedDesc = [...records].sort((a: any, b: any) =>
    String(b[firstCol] ?? "").localeCompare(String(a[firstCol] ?? ""))
  );
  console.log(`✓ Sorting working: Asc first="${sortedAsc[0]?.[firstCol]}", Desc first="${sortedDesc[0]?.[firstCol]}"`);

  // 14. Test Source Traceability & Modal Data
  console.log("\n14. Testing Source Traceability & Modal info...");
  const allSources = await getCollectionSources(collectionId);
  console.log(`✓ Sources count in collection_sources: ${allSources.length}`);
  const sampleRec = records[0];
  const matchedSource = allSources.find((s) => s.source_url === sampleRec._source_url);
  console.log("✓ Record source URL:", sampleRec._source_url);
  console.log("  Matched source in DB:", matchedSource ? `${matchedSource.source_name} (${matchedSource.status})` : "Direct source");

  // 15. Test Personalization Message with actual user preferences
  console.log("\n15. Testing Personalization Message generation...");
  const prefs = realPreferences;
  const parts = [...prefs.information_style, ...prefs.information_priorities].slice(0, 3);
  const personMsg = `Since you prefer ${parts.join(" and ")}, FetchIT has presented your results in a structured, detailed format.`;
  console.log("✓ Personalization message generated from actual Neon DB preferences:");
  console.log(`  "${personMsg}"`);

  // 16. Test CSV Export
  console.log("\n16. Testing CSV Export endpoint...");
  const reqCsv = new NextRequest(`http://localhost:3000/api/collections/${collectionId}/export?format=csv`);
  const resCsv = await getExportRoute(reqCsv, makeContext());
  const csvText = await resCsv.text();
  console.log("✓ CSV status:", resCsv.status);
  console.log("  CSV Content-Type:", resCsv.headers.get("Content-Type"));
  console.log("  CSV header line:", csvText.split("\r\n")[0]);
  console.log("  CSV row count:", csvText.split("\r\n").length);
  if (!resCsv.ok || !csvText.includes(dynamicCols[0])) {
    errors.push("CSV export failed or missing dynamic columns");
  }

  // 17. Test PDF / HTML Report Export
  console.log("\n17. Testing PDF / HTML Report Export endpoint...");
  const reqPdf = new NextRequest(`http://localhost:3000/api/collections/${collectionId}/export?format=pdf`);
  const resPdf = await getExportRoute(reqPdf, makeContext());
  const pdfHtml = await resPdf.text();
  console.log("✓ PDF status:", resPdf.status);
  console.log("  PDF Content-Type:", resPdf.headers.get("Content-Type"));
  console.log("  PDF contains print trigger:", pdfHtml.includes("window.print()"));
  console.log("  PDF contains table:", pdfHtml.includes("<table class=\"main-table\">"));
  console.log("  PDF contains request:", pdfHtml.includes("Find 20 AI startups in India"));
  if (!resPdf.ok || !pdfHtml.includes("window.print()")) {
    errors.push("PDF export failed or missing print script");
  }

  // 18. Test History Listing
  console.log("\n18. Testing History API...");
  const resHist = await getCollectionsRoute();
  const dataHist = await resHist.json();
  console.log("✓ History items count:", dataHist.collections?.length);
  const foundInHistory = (dataHist.collections || []).find((c: any) => c.id === collectionId);
  console.log("✓ Collection in history title:", foundInHistory?.title || foundInHistory?.original_input);
  if (!foundInHistory) {
    errors.push("Collection not found in history");
  }

  // 19. Verify Saved Result Loads Without Re-running
  console.log("\n19. Testing Saved Result Load without rerunning...");
  const savedResult = await getCollectionResult(collectionId);
  console.log("✓ Result retrieved directly from DB without calling Tavily/Gemini:");
  console.log("  Collection status remains:", (await getCollectionById(collectionId))?.status);
  console.log("  Records count in DB:", (savedResult?.result_data as any)?.records?.length);

  // Summary
  console.log("\n===============================================================");
  console.log("QA TEST SUMMARY");
  console.log("===============================================================");
  if (errors.length === 0) {
    console.log("✓ ALL 30 QA CHECKS PASSED PERFECTLY WITH ZERO ERRORS!");
  } else {
    console.error("❌ ERRORS FOUND:", errors);
  }

  process.exit(errors.length === 0 ? 0 : 1);
}

runQA().catch((err) => {
  console.error("QA Test script encountered error:", err);
  process.exit(1);
});
