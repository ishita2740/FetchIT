import { StructuredRequirement } from "@/lib/ai/schema";
import { CollectionSource } from "@/lib/db";

/**
 * Represents a single raw extracted record from a source.
 */
export interface ExtractedRecord {
  record_data: Record<string, any>;
  source_url: string;
  source_name: string;
  collected_at: string;
}

/**
 * Result of collecting data from a single source.
 */
export interface SourceCollectionResult {
  source: CollectionSource;
  status: "success" | "failed" | "unsupported";
  records: ExtractedRecord[];
  error?: string;
}

/**
 * Context passed to the data collection provider for each source.
 */
export interface CollectionContext {
  source: CollectionSource;
  requirement: StructuredRequirement;
  fields: string[];
  quantity: number | null;
  requires_latest_information: boolean;
  original_input: string;
}

/**
 * Abstraction for the data collection layer.
 * Implementations fetch content from a source and extract structured records.
 */
export interface DataCollectionProvider {
  readonly name: string;

  /**
   * Collect data from a single source given the structured requirement context.
   * Returns extracted records or throws on unrecoverable failure.
   */
  collectFromSource(context: CollectionContext): Promise<ExtractedRecord[]>;
}

export class DataCollectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataCollectionError";
  }
}

export class MissingCollectionConfigurationError extends Error {
  constructor(message?: string) {
    super(
      message ||
        "No data collection provider configured. Please configure an AI API key for content extraction."
    );
    this.name = "MissingCollectionConfigurationError";
  }
}
