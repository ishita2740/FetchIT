import {
  SourceDiscoveryProvider,
  SourceDiscoveryError,
} from "./provider";
import type { StructuredRequirement, WorkflowPlan, DiscoveredSource } from "@/lib/ai/schema";

/**
 * Maps a Tavily result URL domain to the closest FetchIT source type.
 */
function classifySourceType(
  url: string
): DiscoveredSource["type"] {
  const hostname = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();

  // Government domains
  if (
    hostname.endsWith(".gov") ||
    hostname.endsWith(".gov.in") ||
    hostname.endsWith(".nic.in") ||
    hostname.endsWith(".gov.uk") ||
    hostname.endsWith(".gov.au")
  ) {
    return "government";
  }

  // Research / academic
  if (
    hostname.endsWith(".edu") ||
    hostname.endsWith(".ac.in") ||
    hostname.endsWith(".ac.uk") ||
    hostname.includes("arxiv.org") ||
    hostname.includes("scholar.google") ||
    hostname.includes("researchgate.net") ||
    hostname.includes("pubmed") ||
    hostname.includes("ieee.org") ||
    hostname.includes("springer.com") ||
    hostname.includes("nature.com") ||
    hostname.includes("sciencedirect.com")
  ) {
    return "research";
  }

  // News
  if (
    hostname.includes("reuters.com") ||
    hostname.includes("bloomberg.com") ||
    hostname.includes("techcrunch.com") ||
    hostname.includes("cnbc.com") ||
    hostname.includes("bbc.com") ||
    hostname.includes("bbc.co.uk") ||
    hostname.includes("nytimes.com") ||
    hostname.includes("theguardian.com") ||
    hostname.includes("economictimes") ||
    hostname.includes("livemint.com") ||
    hostname.includes("moneycontrol.com") ||
    hostname.includes("ndtv.com") ||
    hostname.includes("thehindu.com") ||
    hostname.includes("hindustantimes.com") ||
    hostname.includes("news") ||
    hostname.includes("times") ||
    hostname.includes("tribune")
  ) {
    return "news";
  }

  // Documentation / wikis
  if (
    hostname.includes("wikipedia.org") ||
    hostname.includes("docs.") ||
    hostname.includes("documentation") ||
    hostname.includes("wiki")
  ) {
    return "documentation";
  }

  // Public datasets
  if (
    hostname.includes("kaggle.com") ||
    hostname.includes("data.gov") ||
    hostname.includes("dataworld") ||
    hostname.includes("statista.com") ||
    hostname.includes("worldbank.org") ||
    hostname.includes("un.org") ||
    hostname.includes("census")
  ) {
    return "public_dataset";
  }

  // Default: public web
  return "public_web";
}

/**
 * Builds a focused search query from the structured requirement.
 * Uses topic, entity, location, fields, and time constraints rather than
 * the raw user prompt to produce a targeted Tavily query.
 */
function buildSearchQuery(requirement: StructuredRequirement): string {
  const parts: string[] = [];

  // Core topic is always included
  if (requirement.topic) {
    parts.push(requirement.topic);
  }

  // Entity type for specificity
  if (requirement.entity) {
    parts.push(requirement.entity);
  }

  // Location scope
  if (requirement.location) {
    parts.push(requirement.location);
  }

  // Add a few key fields for query focus (max 3 to keep query tight)
  if (requirement.fields && requirement.fields.length > 0) {
    const keyFields = requirement.fields.slice(0, 3);
    parts.push(keyFields.join(" "));
  }

  // Time constraint
  if (requirement.time_constraint) {
    parts.push(requirement.time_constraint);
  }

  // If latest info is needed, nudge the query
  if (requirement.requires_latest_information) {
    parts.push("latest");
  }

  return parts.filter(Boolean).join(" ");
}

/**
 * TavilyDiscoveryProvider implements SourceDiscoveryProvider using
 * Tavily's search API to discover real web sources.
 */
export class TavilyDiscoveryProvider implements SourceDiscoveryProvider {
  readonly name = "Tavily Search";

  constructor(private readonly apiKey: string) {}

  async discoverSources(
    requirement: StructuredRequirement,
    workflowPlan: WorkflowPlan
  ): Promise<DiscoveredSource[]> {
    const query = buildSearchQuery(requirement);

    if (!query || query.trim().length === 0) {
      throw new SourceDiscoveryError("Could not generate a valid search query from the requirement.");
    }

    // Determine how many results to request.
    // Request more than the user's quantity to give the collection layer options.
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
        const errText = await res.text().catch(() => "");

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

      // Network / timeout errors
      throw new SourceDiscoveryError(
        `Failed to reach Tavily search API: ${err.message || String(err)}`
      );
    }

    // Parse Tavily response
    const results: any[] = responseData?.results;

    if (!results || !Array.isArray(results) || results.length === 0) {
      // Tavily returned no results — return empty, do NOT fabricate
      return [];
    }

    // Map Tavily results → DiscoveredSource[]
    const sources: DiscoveredSource[] = [];

    for (const result of results) {
      const url = result.url;
      const title = result.title;

      // Skip entries without a valid URL
      if (!url || typeof url !== "string") continue;

      // Validate URL format
      try {
        new URL(url);
      } catch {
        continue; // skip malformed URLs
      }

      const sourceType = classifySourceType(url);
      const relevanceScore = typeof result.score === "number" ? result.score : null;
      const snippet = typeof result.content === "string" ? result.content.slice(0, 200) : "";

      sources.push({
        name: title || url,
        url,
        type: sourceType,
        relevance: snippet
          ? `Tavily relevance${relevanceScore !== null ? ` (score: ${relevanceScore.toFixed(2)})` : ""}: ${snippet}`
          : `Discovered via Tavily search for "${query}"`,
        reason: `Found by searching for: "${query}"`,
        status: "discovered" as const,
      });
    }

    return sources;
  }
}
