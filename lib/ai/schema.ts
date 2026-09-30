import { z } from "zod";

export const StructuredRequirementSchema = z.object({
  intent: z.string().describe("The primary intent, e.g. data_collection, research, exploration, comparison, summary"),
  topic: z.string().describe("The core topic of the request"),
  entity: z.string().nullable().optional().describe("The entity type being requested, e.g. startup, company, vehicle, internship"),
  quantity: z.number().int().positive().nullable().optional().describe("Specific quantity requested, e.g. 20, or null if unspecified"),
  location: z.string().nullable().optional().describe("Geographic location or scope, e.g. India, Global, or null"),
  fields: z.array(z.string()).describe("List of attributes/columns requested, e.g. company_name, founders, funding, website"),
  filters: z.array(z.any()).default([]).describe("Filters or conditions specified in the query"),
  sort: z.string().nullable().optional().describe("Sorting preference or criteria, or null"),
  time_constraint: z.string().nullable().optional().describe("Time constraints, e.g. 2024, recent, last 6 months, or null"),
  output_type: z.enum(["structured_dataset", "research", "summary", "list"]).default("structured_dataset").describe("Target format"),
  requires_sources: z.boolean().default(true).describe("Whether citations/sources are requested or required"),
  requires_latest_information: z.boolean().default(false).describe("Whether fresh/current information is required"),
  understood_requirement: z.string().describe("Human-readable explanation of what FetchIT understood"),
  processing_summary: z.string().describe("Concise user-facing explanation of the understood request"),
});

export type StructuredRequirement = z.infer<typeof StructuredRequirementSchema>;

export const WorkflowStepSchema = z.object({
  id: z.string().describe("Unique step identifier, e.g., 'step_1'"),
  type: z.enum([
    "input_processing",
    "document_extraction",
    "source_discovery",
    "data_collection",
    "cleaning",
    "validation",
    "deduplication",
    "summarization",
    "analysis",
    "result_generation"
  ]).describe("The type of action for this step"),
  description: z.string().describe("Concise description of what this step will do"),
  status: z.enum(["pending", "in_progress", "completed", "failed"]).default("pending"),
  depends_on: z.array(z.string()).optional().describe("Array of step IDs this step depends on"),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const WorkflowPlanSchema = z.object({
  goal: z.string().describe("The overall goal of this workflow"),
  output_type: z.enum(["structured_dataset", "research", "summary", "list"]).describe("The expected output format"),
  requires_sources: z.boolean().describe("Whether this workflow must discover sources"),
  requires_latest_information: z.boolean().describe("Whether fresh info is required"),
  steps: z.array(WorkflowStepSchema).describe("The ordered list of steps to execute"),
});

export type WorkflowPlan = z.infer<typeof WorkflowPlanSchema>;

export const DiscoveredSourceSchema = z.object({
  name: z.string().describe("Human-readable name of the source"),
  url: z.string().url().describe("Valid HTTP/HTTPS URL to the source"),
  type: z.enum([
    "official_website",
    "government",
    "public_dataset",
    "research",
    "news",
    "documentation",
    "public_web",
    "user_document"
  ]).describe("The category of the source"),
  relevance: z.string().describe("Why this source is highly relevant to the query"),
  reason: z.string().describe("Reasoning for selecting this specific source URL"),
  status: z.enum(["discovered", "verified", "inaccessible", "rejected"]).default("discovered")
});

export type DiscoveredSource = z.infer<typeof DiscoveredSourceSchema>;

export const CollectedRecordSchema = z.object({
  record_data: z.record(z.string(), z.any()).describe("Key-value pairs of extracted fields matching the structured requirement"),
  source_url: z.string().url().describe("The URL the record was extracted from"),
  source_name: z.string().optional().describe("Human-readable name of the source"),
  collected_at: z.string().optional().describe("ISO timestamp of when the data was collected"),
});

export type CollectedRecord = z.infer<typeof CollectedRecordSchema>;

export const CollectionSummarySchema = z.object({
  sources_found: z.number().int().nonnegative(),
  sources_processed: z.number().int().nonnegative(),
  sources_succeeded: z.number().int().nonnegative(),
  sources_failed: z.number().int().nonnegative(),
  records_collected: z.number().int().nonnegative(),
});

export type CollectionSummary = z.infer<typeof CollectionSummarySchema>;

