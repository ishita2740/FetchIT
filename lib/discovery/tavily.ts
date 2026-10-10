import {
  SourceDiscoveryProvider,
  SourceDiscoveryError,
} from "./provider";
import type { StructuredRequirement, WorkflowPlan, DiscoveredSource } from "@/lib/ai/schema";
import { classifySourceType } from "./classify";
import { buildSearchQuery } from "./query-builder";
import { isSafePublicUrl } from "@/lib/security/ssrf";

/**
 * TavilyDiscoveryProvider implements SourceDiscoveryProvider using
 * Tavily's search API to discover real web sources.
 */
export class TavilyDiscoveryProvider implements SourceDiscoveryProvider {
  readonly name = "Tavily Search";

  constructor(private readonly apiKey: string) {
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      throw new SourceDiscoveryError(
        "TavilyDiscoveryProvider requires a non-empty API key."
      );
    }
  }

  async discoverSources(
    requirement: StructuredRequirement,
    workflowPlan: WorkflowPlan
  ): Promise<DiscoveredSource[]> {
    const query = buildSearchQuery(requirement);

    if (!query || query.trim().length === 0) {
      throw new SourceDiscoveryError("Could not generate a valid search query from the requirement.");
    }

    // Determine how many results to request (between 5 and 20)
    const maxResults = Math.min(
      Math.max(requirement.quantity ?? 10, 5),
      20
    );

    let responseData: any;

    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "FetchIT-ResearchAgent/1.0",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          max_results: maxResults,
          search_depth: "advanced",
          include_answer: false,
          include_raw_content: false,
        }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new SourceDiscoveryError(
            "Tavily API key is invalid or unauthorized. Please check your TAVILY_API_KEY."
          );
        }

        if (res.status === 429) {
          throw new SourceDiscoveryError(
            "Tavily API rate limit reached. Please try again later."
          );
        }

        throw new SourceDiscoveryError(
          `Tavily search failed with status ${res.status}.`
        );
      }

      responseData = await res.json();
    } catch (err: any) {
      if (err instanceof SourceDiscoveryError) throw err;

      throw new SourceDiscoveryError(
        `Failed to reach Tavily search API: ${err.message || String(err)}`
      );
    }

    const results: any[] = responseData?.results;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return [];
    }

    const sources: DiscoveredSource[] = [];
    const seenUrls = new Set<string>();

    for (const result of results) {
      const url = result.url;
      const title = result.title;

      if (!url || typeof url !== "string") continue;

      // SSRF & URL validation
      const safety = isSafePublicUrl(url);
      if (!safety.safe) continue;

      const normalizedUrl = safety.parsedUrl!.href;
      if (seenUrls.has(normalizedUrl)) continue;
      seenUrls.add(normalizedUrl);

      const sourceType = classifySourceType(normalizedUrl);
      const relevanceScore = typeof result.score === "number" ? result.score : null;
      const snippet = typeof result.content === "string" ? result.content.slice(0, 220) : "";

      sources.push({
        name: title || normalizedUrl,
        url: normalizedUrl,
        type: sourceType,
        relevance: snippet
          ? `Tavily relevance${relevanceScore !== null ? ` (score: ${relevanceScore.toFixed(2)})` : ""}: ${snippet}`
          : `Discovered via Tavily search for "${query}"`,
        reason: `Found by searching for: "${query}"`,
        status: "discovered" as const,
        provider: "Tavily Search",
        snippet,
      });
    }

    return sources;
  }
}
