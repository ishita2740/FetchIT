import { StructuredRequirement, WorkflowPlan, DiscoveredSource } from "@/lib/ai/schema";
import { z } from "zod";

export interface SourceDiscoveryProvider {
  readonly name: string;
  discoverSources(
    requirement: StructuredRequirement,
    workflowPlan: WorkflowPlan
  ): Promise<DiscoveredSource[]>;
}

export class MissingDiscoveryConfigurationError extends Error {
  constructor(message?: string) {
    super(message || "No discovery provider configured. Please configure a search/discovery API key.");
    this.name = "MissingDiscoveryConfigurationError";
  }
}

export class SourceDiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceDiscoveryError";
  }
}

// Note: As per instructions, we do not implement a fake search provider.
// If no real provider is configured, we throw MissingDiscoveryConfigurationError.

export function getDiscoveryProvider(): SourceDiscoveryProvider {
  // Preferred provider: Tavily
  if (process.env.TAVILY_API_KEY) {
    const { TavilyDiscoveryProvider } = require("./tavily");
    return new TavilyDiscoveryProvider(process.env.TAVILY_API_KEY);
  }

  // No provider configured
  throw new MissingDiscoveryConfigurationError();
}
