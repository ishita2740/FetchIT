import type { StructuredRequirement } from "@/lib/ai/schema";

/**
 * Builds a focused, high-precision search query from the structured requirement.
 * Combines topic, entity, location, key requested fields, and time constraints.
 */
export function buildSearchQuery(requirement: StructuredRequirement): string {
  const parts: string[] = [];

  // Core topic
  if (requirement.topic && requirement.topic.trim()) {
    parts.push(requirement.topic.trim());
  }

  // Entity type if not redundant with topic
  if (
    requirement.entity &&
    requirement.entity.trim() &&
    (!requirement.topic || !requirement.topic.toLowerCase().includes(requirement.entity.toLowerCase().trim()))
  ) {
    parts.push(requirement.entity.trim());
  }

  // Location scope if not redundant with topic
  if (
    requirement.location &&
    requirement.location.trim() &&
    (!requirement.topic || !requirement.topic.toLowerCase().includes(requirement.location.toLowerCase().trim()))
  ) {
    parts.push(requirement.location.trim());
  }

  // Key requested fields to direct search towards factual data
  if (requirement.fields && requirement.fields.length > 0) {
    const keyFields = requirement.fields
      .map(f => f.replace(/_/g, " ").trim())
      .slice(0, 3);
    parts.push(keyFields.join(" "));
  }

  // Time constraint
  if (requirement.time_constraint && requirement.time_constraint.trim()) {
    parts.push(requirement.time_constraint.trim());
  }

  // Latest information flag
  if (requirement.requires_latest_information) {
    parts.push("latest");
  }

  return parts.filter(Boolean).join(" ").trim();
}
