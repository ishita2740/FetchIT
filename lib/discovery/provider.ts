import { StructuredRequirement, WorkflowPlan, DiscoveredSource } from "@/lib/ai/schema";

export interface SourceDiscoveryProvider {
  readonly name: string;
  discoverSources(
    requirement: StructuredRequirement,
    workflowPlan: WorkflowPlan
  ): Promise<DiscoveredSource[]>;
}

export class MissingDiscoveryConfigurationError extends Error {
  constructor(message?: string) {
    super(
      message ||
        "No search discovery provider configured. Please configure SERPAPI_API_KEY (or TAVILY_API_KEY) in your server environment."
    );
    this.name = "MissingDiscoveryConfigurationError";
  }
}

export class SourceDiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceDiscoveryError";
  }
}

/**
 * Returns the active discovery provider based on configuration.
 * Priority:
 * 1. DISCOVERY_PROVIDER="serpapi" -> SerpApi
 * 2. DISCOVERY_PROVIDER="tavily" -> Tavily
 * 3. Default when SERPAPI_API_KEY is set -> SerpApi (Track 1 primary)
 * 4. Default when TAVILY_API_KEY is set -> Tavily
 */
export function getDiscoveryProvider(): SourceDiscoveryProvider {
  const explicit = (process.env.DISCOVERY_PROVIDER || "").toLowerCase().trim();

  // 1. Explicitly requested SerpApi
  if (explicit === "serpapi") {
    if (!process.env.SERPAPI_API_KEY) {
      throw new MissingDiscoveryConfigurationError(
        "DISCOVERY_PROVIDER is set to 'serpapi' but SERPAPI_API_KEY is missing. Please configure SERPAPI_API_KEY in your environment."
      );
    }
    const { SerpApiDiscoveryProvider } = require("./serpapi");
    return new SerpApiDiscoveryProvider(process.env.SERPAPI_API_KEY);
  }

  // 2. Explicitly requested Tavily
  if (explicit === "tavily") {
    if (!process.env.TAVILY_API_KEY) {
      throw new MissingDiscoveryConfigurationError(
        "DISCOVERY_PROVIDER is set to 'tavily' but TAVILY_API_KEY is missing. Please configure TAVILY_API_KEY in your environment."
      );
    }
    const { TavilyDiscoveryProvider } = require("./tavily");
    return new TavilyDiscoveryProvider(process.env.TAVILY_API_KEY);
  }

  // 3. Default priority: SerpApi takes precedence for the Hackathon
  if (process.env.SERPAPI_API_KEY) {
    const { SerpApiDiscoveryProvider } = require("./serpapi");
    return new SerpApiDiscoveryProvider(process.env.SERPAPI_API_KEY);
  }

  // 4. Secondary fallback: Tavily
  if (process.env.TAVILY_API_KEY) {
    const { TavilyDiscoveryProvider } = require("./tavily");
    return new TavilyDiscoveryProvider(process.env.TAVILY_API_KEY);
  }

  // No search provider configured
  throw new MissingDiscoveryConfigurationError(
    "No search discovery provider configured. Please configure SERPAPI_API_KEY in your environment."
  );
}

/**
 * Inspects environment to report which discovery provider is active.
 */
export function getDiscoveryStatus(): {
  configured: boolean;
  activeProvider: "serpapi" | "tavily" | null;
  hasSerpApiKey: boolean;
  hasTavilyKey: boolean;
} {
  const hasSerpApiKey = Boolean(process.env.SERPAPI_API_KEY);
  const hasTavilyKey = Boolean(process.env.TAVILY_API_KEY);
  const explicit = (process.env.DISCOVERY_PROVIDER || "").toLowerCase().trim();

  let activeProvider: "serpapi" | "tavily" | null = null;
  if (explicit === "serpapi" && hasSerpApiKey) activeProvider = "serpapi";
  else if (explicit === "tavily" && hasTavilyKey) activeProvider = "tavily";
  else if (hasSerpApiKey) activeProvider = "serpapi";
  else if (hasTavilyKey) activeProvider = "tavily";

  return {
    configured: activeProvider !== null,
    activeProvider,
    hasSerpApiKey,
    hasTavilyKey,
  };
}
