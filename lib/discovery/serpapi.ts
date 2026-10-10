import {
  SourceDiscoveryProvider,
  SourceDiscoveryError,
} from "./provider";
import type { StructuredRequirement, WorkflowPlan, DiscoveredSource } from "@/lib/ai/schema";
import { classifySourceType } from "./classify";
import { buildSearchQuery } from "./query-builder";
import { isSafePublicUrl } from "@/lib/security/ssrf";

/**
 * SerpApiDiscoveryProvider implements SourceDiscoveryProvider using
 * SerpApi's Google Search engine API to discover real, authoritative web sources.
 */
export class SerpApiDiscoveryProvider implements SourceDiscoveryProvider {
  readonly name = "SerpApi Google Search";

  constructor(private readonly apiKey: string) {
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      throw new SourceDiscoveryError(
        "SerpApiDiscoveryProvider requires a non-empty API key."
      );
    }
  }

  async discoverSources(
    requirement: StructuredRequirement,
    workflowPlan: WorkflowPlan
  ): Promise<DiscoveredSource[]> {
    const query = buildSearchQuery(requirement);

    if (!query || query.trim().length === 0) {
      throw new SourceDiscoveryError(
        "Could not generate a valid search query from the requirement."
      );
    }

    // Determine how many results to request (between 5 and 20)
    const maxResults = Math.min(
      Math.max(requirement.quantity ?? 10, 5),
      20
    );

    // Build query parameters
    const params = new URLSearchParams({
      engine: "google",
      q: query,
      api_key: this.apiKey,
      num: String(maxResults),
      hl: "en",
    });

    // If geographic scope mentions India, prioritize Indian search index
    const locationLower = (requirement.location || "").toLowerCase();
    if (
      locationLower.includes("india") ||
      locationLower.includes("in") ||
      query.toLowerCase().includes("india")
    ) {
      params.set("gl", "in");
      params.set("hl", "en");
    }

    const endpoint = `https://serpapi.com/search.json?${params.toString()}`;

    let responseData: any;
    const maxRetries = 2;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000); // 35s timeout for proxy routing

      try {
        const res = await fetch(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "FetchIT-ResearchAgent/1.0",
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new SourceDiscoveryError(
              "SerpApi API key is invalid or unauthorized. Please verify your SERPAPI_API_KEY environment variable."
            );
          }

          if (res.status === 429) {
            throw new SourceDiscoveryError(
              "SerpApi rate limit reached. Please check your account quota or try again later."
            );
          }

          // Retry on 500 / 502 / 503 transient errors
          if ((res.status === 500 || res.status === 502 || res.status === 503) && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }

          throw new SourceDiscoveryError(
            `SerpApi Google search failed with HTTP status ${res.status}.`
          );
        }

        responseData = await res.json();
        break; // Success
      } catch (err: any) {
        if (err instanceof SourceDiscoveryError) throw err;

        if (err.name === "AbortError") {
          if (attempt < maxRetries) {
            continue;
          }
          throw new SourceDiscoveryError("SerpApi search request timed out after 15 seconds.");
        }

        if (attempt >= maxRetries) {
          throw new SourceDiscoveryError(
            `Failed to reach SerpApi search API: ${err.message || String(err)}`
          );
        }
        await new Promise((r) => setTimeout(r, 1000));
      } finally {
        clearTimeout(timeout);
      }
    }

    // Inspect SerpApi body for logical errors
    if (responseData?.error) {
      const errStr = String(responseData.error);
      if (
        errStr.toLowerCase().includes("google hasn't returned any results") ||
        errStr.toLowerCase().includes("no results")
      ) {
        // Legitimate empty result - return empty list, never fabricate
        return [];
      }
      throw new SourceDiscoveryError(`SerpApi response error: ${errStr}`);
    }

    const sources: DiscoveredSource[] = [];
    const seenUrls = new Set<string>();

    function addCandidateSource(
      url: string,
      title: string,
      snippet: string,
      positionRank?: number
    ) {
      if (!url || typeof url !== "string") return;

      // 1. SSRF and URL validation check
      const safety = isSafePublicUrl(url);
      if (!safety.safe) return;

      const normalizedUrl = safety.parsedUrl!.href;
      if (seenUrls.has(normalizedUrl)) return;
      seenUrls.add(normalizedUrl);

      const sourceType = classifySourceType(normalizedUrl);
      const cleanSnippet = snippet ? snippet.replace(/\s+/g, " ").trim().slice(0, 250) : "";

      sources.push({
        name: title.trim() || normalizedUrl,
        url: normalizedUrl,
        type: sourceType,
        relevance: cleanSnippet
          ? `SerpApi Google result${positionRank ? ` (rank #${positionRank})` : ""}: ${cleanSnippet}`
          : `Discovered via SerpApi Google Search for "${query}"`,
        reason: `Found in top Google search results for "${query}"`,
        status: "discovered",
        provider: "SerpApi Google Search",
        snippet: cleanSnippet,
      });
    }

    // 1. Check knowledge graph if available (often contains official company website)
    if (responseData?.knowledge_graph) {
      const kg = responseData.knowledge_graph;
      if (kg.website) {
        addCandidateSource(kg.website, kg.title || "Official Website", "Official website from Google Knowledge Graph", 0);
      } else if (kg.source?.link) {
        addCandidateSource(kg.source.link, kg.title || "Knowledge Graph Reference", "Reference from Google Knowledge Graph", 0);
      }
    }

    // 2. Check answer box if available
    if (responseData?.answer_box?.link) {
      const ab = responseData.answer_box;
      addCandidateSource(ab.link, ab.title || "Featured Answer Source", ab.snippet || "Google Featured Snippet", 0);
    }

    // 3. Parse organic search results
    const organicResults: any[] = responseData?.organic_results;
    if (Array.isArray(organicResults)) {
      for (const item of organicResults) {
        if (!item?.link) continue;
        addCandidateSource(
          item.link,
          item.title || item.link,
          item.snippet || "",
          item.position
        );
      }
    }

    return sources;
  }
}
