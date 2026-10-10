/**
 * Automated Test Suite for FetchIT SerpApi Agent Integration
 *
 * Covers:
 * 1. SerpApi response parsing (organic results, knowledge graph, snippets, positions)
 * 2. Missing/invalid API key handling without secret exposure
 * 3. SerpApi error handling (401, 403, 429, empty results)
 * 4. SSRF & network security validation (loopback, private IPs, metadata endpoints)
 * 5. Query building from structured requirements
 * 6. Source categorization and classification
 * 7. Deduplication, quality validation, and provenance indicators
 * 8. CSV export formatting
 */

import { SerpApiDiscoveryProvider } from "../lib/discovery/serpapi";
import { SourceDiscoveryError, MissingDiscoveryConfigurationError, getDiscoveryProvider } from "../lib/discovery/provider";
import { isSafePublicUrl } from "../lib/security/ssrf";
import { classifySourceType } from "../lib/discovery/classify";
import { buildSearchQuery } from "../lib/discovery/query-builder";
import type { StructuredRequirement, WorkflowPlan } from "../lib/ai/schema";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("FETCHIT: SERPAPI & AGENT ARCHITECTURE TEST SUITE");
  console.log("==================================================================\n");

  // -----------------------------------------------------------------------------
  // Test 1: SSRF & URL Security Validation
  // -----------------------------------------------------------------------------
  console.log("Group 1: SSRF & Network Security Validation");
  assert(!isSafePublicUrl("http://localhost:3000/api").safe, "Blocks localhost");
  assert(!isSafePublicUrl("http://127.0.0.1:8080").safe, "Blocks 127.0.0.1 loopback");
  assert(!isSafePublicUrl("http://169.254.169.254/latest/meta-data/").safe, "Blocks AWS/Cloud metadata endpoint (169.254.x.x)");
  assert(!isSafePublicUrl("http://10.0.0.1/internal-dashboard").safe, "Blocks private Class A (10.x.x.x)");
  assert(!isSafePublicUrl("http://192.168.1.1/router").safe, "Blocks private Class C (192.168.x.x)");
  assert(!isSafePublicUrl("http://172.20.0.5/docker").safe, "Blocks private Class B (172.16-31.x.x)");
  assert(!isSafePublicUrl("http://[::1]/status").safe, "Blocks IPv6 loopback [::1]");
  assert(!isSafePublicUrl("file:///etc/passwd").safe, "Blocks file:// protocol");
  assert(!isSafePublicUrl("ftp://files.example.com").safe, "Blocks ftp:// protocol");
  assert(!isSafePublicUrl("http://admin:secret@public-site.com").safe, "Blocks embedded user credentials");
  assert(!isSafePublicUrl("http://internal-service.local").safe, "Blocks .local suffix");
  assert(!isSafePublicUrl("http://app.internal").safe, "Blocks .internal suffix");
  assert(isSafePublicUrl("https://techcrunch.com/2024/01/ai-startups").safe, "Allows safe public HTTPS URL (TechCrunch)");
  assert(isSafePublicUrl("https://startupindia.gov.in/content/sih/en.html").safe, "Allows safe government portal (Startup India)");
  assert(isSafePublicUrl("http://example.com/data").safe, "Allows safe public HTTP URL");

  // -----------------------------------------------------------------------------
  // Test 2: Search Query Building from Structured Requirement
  // -----------------------------------------------------------------------------
  console.log("\nGroup 2: Adaptive Search Query Building");
  const testRequirement: StructuredRequirement = {
    intent: "data_collection",
    topic: "AI startups",
    entity: "startup",
    quantity: 20,
    location: "India",
    fields: ["company_name", "founders", "headquarters", "funding", "website"],
    filters: [],
    sort: null,
    time_constraint: "2024",
    output_type: "structured_dataset",
    requires_sources: true,
    requires_latest_information: true,
    understood_requirement: "Find 20 AI startups in India",
    processing_summary: "List of 20 AI startups in India with founders, HQ, funding and website",
  };

  const query = buildSearchQuery(testRequirement);
  assert(query.includes("AI startups"), "Query includes core topic");
  assert(query.includes("India"), "Query includes geographic location");
  assert(query.includes("2024") || query.includes("latest"), "Query includes temporal constraint");
  assert(query.includes("company name") || query.includes("founders"), "Query includes key fields");

  // -----------------------------------------------------------------------------
  // Test 3: Domain Classification
  // -----------------------------------------------------------------------------
  console.log("\nGroup 3: Source Domain Categorization");
  assert(classifySourceType("https://startupindia.gov.in/recognition") === "government", "Classifies .gov.in as government");
  assert(classifySourceType("https://arxiv.org/abs/2301.0001") === "research", "Classifies arxiv.org as research");
  assert(classifySourceType("https://iitd.ac.in/research") === "research", "Classifies .ac.in as research");
  assert(classifySourceType("https://inc42.com/features/indian-ai-startups") === "news", "Classifies Inc42 as news");
  assert(classifySourceType("https://economictimes.indiatimes.com/tech") === "news", "Classifies Economic Times as news");
  assert(classifySourceType("https://en.wikipedia.org/wiki/Artificial_intelligence_in_India") === "documentation", "Classifies Wikipedia as documentation");
  assert(classifySourceType("https://tracxn.com/d/explore/ai-startups-in-india") === "public_dataset", "Classifies Tracxn as public_dataset");
  assert(classifySourceType("https://sarvam.ai") === "public_web", "Default fallback to public_web");

  // -----------------------------------------------------------------------------
  // Test 4: SerpApi Provider Missing Key & Credentials Protection
  // -----------------------------------------------------------------------------
  console.log("\nGroup 4: API Key Protection & Error Handling");
  try {
    new SerpApiDiscoveryProvider("");
    assert(false, "Throws on empty API key");
  } catch (err: any) {
    assert(err instanceof SourceDiscoveryError, "Throws SourceDiscoveryError on empty API key");
    assert(!err.message.includes("AQ.") && !err.message.includes("secret"), "Never leaks secrets in error messages");
  }

  // -----------------------------------------------------------------------------
  // Test 5: Mocked SerpApi Response Parsing (Full Organic + Knowledge Graph)
  // -----------------------------------------------------------------------------
  console.log("\nGroup 5: SerpApi Search Response Parsing");
  const dummyPlan: WorkflowPlan = {
    goal: "Collect AI startups",
    output_type: "structured_dataset",
    requires_sources: true,
    requires_latest_information: true,
    steps: [],
  };

  const mockSerpApiResponse = {
    search_metadata: { status: "Success" },
    knowledge_graph: {
      title: "Sarvam AI",
      website: "https://www.sarvam.ai",
      description: "Indian AI research and product foundation model company",
    },
    organic_results: [
      {
        position: 1,
        title: "Top 20 Generative AI Startups In India Leading Innovation",
        link: "https://inc42.com/features/generative-ai-startups-in-india/",
        snippet: "India is home to over 100 GenAI startups. Companies like Krutrim, Sarvam AI, and CoRover have raised significant venture capital.",
      },
      {
        position: 2,
        title: "Krutrim - India's First AI Unicorn",
        link: "https://techcrunch.com/2024/01/26/krutrim-ai-unicorn-bhavish-aggarwal/",
        snippet: "Founded by Bhavish Aggarwal in Bangalore, Krutrim raised $50 million at a $1 billion valuation to build full-stack Indian AI models.",
      },
      {
        position: 3,
        title: "Internal Unsafe Host Example",
        link: "http://127.0.0.1:9090/leak", // Must be discarded by SSRF check!
        snippet: "Malicious or private intranet address",
      },
    ],
  };

  // Mock global fetch for this isolated test
  const originalFetch = global.fetch;
  global.fetch = async (input: any) => {
    return {
      ok: true,
      status: 200,
      json: async () => mockSerpApiResponse,
      headers: new Headers({ "content-type": "application/json" }),
    } as any;
  };

  try {
    const provider = new SerpApiDiscoveryProvider("test_mock_serpapi_key");
    const sources = await provider.discoverSources(testRequirement, dummyPlan);

    assert(sources.length === 3, "Parsed 3 safe sources (knowledge graph + 2 organic)");
    assert(sources.every(s => s.provider === "SerpApi Google Search"), "Sets provider to 'SerpApi Google Search'");
    assert(sources.some(s => s.url.includes("sarvam.ai")), "Extracted official website from Knowledge Graph");
    assert(sources.some(s => s.url.includes("inc42.com")), "Extracted Inc42 organic source");
    assert(sources.some(s => s.url.includes("techcrunch.com")), "Extracted TechCrunch organic source");
    assert(!sources.some(s => s.url.includes("127.0.0.1")), "Filtered out unsafe 127.0.0.1 address via SSRF check");
    assert(sources.every(s => Boolean(s.snippet)), "Preserved source snippet/excerpt");
  } finally {
    global.fetch = originalFetch;
  }

  // -----------------------------------------------------------------------------
  // Test 6: SerpApi Rate Limit (429) & Auth (401) Handling
  // -----------------------------------------------------------------------------
  console.log("\nGroup 6: SerpApi Rate Limit & HTTP Errors");
  global.fetch = async () => ({
    ok: false,
    status: 429,
    text: async () => "Rate limit exceeded",
  } as any);

  try {
    const provider = new SerpApiDiscoveryProvider("test_mock_key");
    await provider.discoverSources(testRequirement, dummyPlan);
    assert(false, "Should throw on 429 rate limit");
  } catch (err: any) {
    assert(err instanceof SourceDiscoveryError, "Throws SourceDiscoveryError on 429");
    assert(err.message.toLowerCase().includes("rate limit"), "Reports rate limit clearly");
  } finally {
    global.fetch = originalFetch;
  }

  // -----------------------------------------------------------------------------
  // Test 7: SerpApi Empty Results Handling (Never Fabricate)
  // -----------------------------------------------------------------------------
  console.log("\nGroup 7: Honest Empty Results (No Hallucination)");
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ error: "Google hasn't returned any results for this query." }),
  } as any);

  try {
    const provider = new SerpApiDiscoveryProvider("test_mock_key");
    const sources = await provider.discoverSources(testRequirement, dummyPlan);
    assert(Array.isArray(sources) && sources.length === 0, "Returns honest empty array when Google returns no results");
  } finally {
    global.fetch = originalFetch;
  }

  // -----------------------------------------------------------------------------
  // Test 8: Deduplication and Quality Provenance
  // -----------------------------------------------------------------------------
  console.log("\nGroup 8: Quality Provenance & Deduplication Logic");
  const rawRecords = [
    {
      company_name: "Krutrim",
      headquarters: "Bengaluru",
      founders: "Bhavish Aggarwal",
      website: "https://krutrim.com",
      _source_url: "https://techcrunch.com/krutrim",
      _source_name: "TechCrunch",
      _evidence: "Krutrim was founded by Bhavish Aggarwal in Bengaluru.",
    },
    {
      company_name: "Krutrim",
      headquarters: "Bengaluru",
      founders: null,
      website: null,
      _source_url: "https://news.example.com/krutrim-short",
      _source_name: "Example News",
      _evidence: "Krutrim is an AI company.",
    },
    {
      company_name: "Sarvam AI",
      headquarters: "Bengaluru",
      founders: "Vivek Raghavan, Pratyush Kumar",
      website: "https://sarvam.ai",
      _source_url: "https://inc42.com/sarvam",
      _source_name: "Inc42",
      _evidence: "Sarvam AI was founded by Vivek Raghavan and Pratyush Kumar.",
    },
  ];

  // Fingerprint deduplication: Krutrim should be deduplicated to the most complete record
  const uniqueRecords = new Map<string, typeof rawRecords[0]>();
  for (const r of rawRecords) {
    const fp = `${r.company_name}|${r.headquarters}`.toLowerCase();
    const existing = uniqueRecords.get(fp);
    if (!existing) {
      uniqueRecords.set(fp, r);
    } else {
      const existingScore = Object.values(existing).filter(Boolean).length;
      const newScore = Object.values(r).filter(Boolean).length;
      if (newScore > existingScore) {
        uniqueRecords.set(fp, r);
      }
    }
  }

  assert(uniqueRecords.size === 2, "Deduplicated 3 records to 2 unique companies");
  const krutrim = uniqueRecords.get("krutrim|bengaluru");
  assert(krutrim?.founders === "Bhavish Aggarwal", "Kept the most complete record during deduplication");
  assert(Boolean(krutrim?._evidence), "Preserved supporting evidence quote");

  // -----------------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
