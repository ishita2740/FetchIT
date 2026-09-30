import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  getUserProfileByAuthId,
  getCollectionById,
  getCollectionResult,
  getCollectionRecords,
  updateCollectionStatus,
  saveCollectionResult,
  type CollectionRecord,
} from "@/lib/db";
import { type StructuredRequirement } from "@/lib/ai/schema";

// ─── CLEANING ────────────────────────────────────────────────────

/**
 * Deterministic cleaning:
 * - Trim all string values
 * - Normalize empty/whitespace strings to null
 * - Normalize "N/A", "n/a", "none", "null", "-", "unknown" to null
 * - Lowercase-trim field keys (no renaming, just whitespace)
 * - Remove records where record_data is empty or all values are null
 */
function cleanRecord(
  data: Record<string, any>
): Record<string, any> | null {
  const NULL_SYNONYMS = new Set([
    "",
    "n/a",
    "na",
    "none",
    "null",
    "undefined",
    "-",
    "--",
    "unknown",
    "not available",
    "not specified",
    "not found",
    "not disclosed",
    "undisclosed",
  ]);

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;

    if (value === null || value === undefined) {
      cleaned[trimmedKey] = null;
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (NULL_SYNONYMS.has(trimmed.toLowerCase())) {
        cleaned[trimmedKey] = null;
      } else {
        cleaned[trimmedKey] = trimmed;
      }
      continue;
    }

    if (Array.isArray(value)) {
      // Clean array elements
      const cleanedArr = value
        .map((v) => (typeof v === "string" ? v.trim() : v))
        .filter(
          (v) =>
            v !== null &&
            v !== undefined &&
            !(typeof v === "string" && NULL_SYNONYMS.has(v.toLowerCase()))
        );
      cleaned[trimmedKey] = cleanedArr.length > 0 ? cleanedArr : null;
      continue;
    }

    cleaned[trimmedKey] = value;
  }

  // Check if the record has any non-null value
  const hasValue = Object.values(cleaned).some((v) => v !== null);
  return hasValue ? cleaned : null;
}

// ─── VALIDATION ─────────────────────────────────────────────────

type ValidationResult = "valid" | "incomplete" | "invalid";

/**
 * Validates a cleaned record against the structured requirement fields.
 * - valid: has values for > 50% of requested fields
 * - incomplete: has values for at least 1 requested field but ≤ 50%
 * - invalid: has no values for any requested field
 */
function validateRecord(
  data: Record<string, any>,
  requiredFields: string[]
): ValidationResult {
  if (!requiredFields || requiredFields.length === 0) {
    // No specific fields required — any non-empty record is valid
    const hasAnyValue = Object.values(data).some((v) => v !== null);
    return hasAnyValue ? "valid" : "invalid";
  }

  // Normalize field names for comparison
  const normalizeKey = (k: string) => k.toLowerCase().replace(/[_\-\s]+/g, "");

  const dataKeysNormalized = new Map<string, any>();
  for (const [k, v] of Object.entries(data)) {
    dataKeysNormalized.set(normalizeKey(k), v);
  }

  let filledCount = 0;
  for (const field of requiredFields) {
    const norm = normalizeKey(field);
    const value = dataKeysNormalized.get(norm);
    if (value !== null && value !== undefined) {
      filledCount++;
    }
  }

  if (filledCount === 0) return "invalid";
  if (filledCount / requiredFields.length > 0.5) return "valid";
  return "incomplete";
}

// ─── DEDUPLICATION ──────────────────────────────────────────────

/**
 * Generates a fingerprint string from a record's key identifying fields.
 * Uses lowercased, trimmed values of the first 3 non-null fields.
 */
function recordFingerprint(
  data: Record<string, any>,
  fields: string[]
): string {
  const normalizeKey = (k: string) => k.toLowerCase().replace(/[_\-\s]+/g, "");

  // Build a map of normalized keys to values
  const dataMap = new Map<string, any>();
  for (const [k, v] of Object.entries(data)) {
    dataMap.set(normalizeKey(k), v);
  }

  // Use the first 3 requirement fields as identity keys
  const identityFields = fields.slice(0, 3);
  const parts: string[] = [];

  for (const field of identityFields) {
    const norm = normalizeKey(field);
    const value = dataMap.get(norm);
    if (value !== null && value !== undefined) {
      const str = String(value).toLowerCase().trim();
      // Normalize whitespace for comparison
      parts.push(str.replace(/\s+/g, " "));
    } else {
      parts.push("__null__");
    }
  }

  return parts.join("|");
}

/**
 * Counts the number of non-null values in a record.
 * Used to pick the "most complete" record among duplicates.
 */
function recordCompleteness(data: Record<string, any>): number {
  return Object.values(data).filter((v) => v !== null && v !== undefined).length;
}

interface ProcessedRecord {
  original: CollectionRecord;
  cleaned_data: Record<string, any>;
  validation: ValidationResult;
  is_duplicate: boolean;
  duplicate_of?: string; // source_url of the kept record
}

// ─── MAIN PROCESSING PIPELINE ───────────────────────────────────

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let collectionId: string | null = null;

  try {
    // 1. Authenticate
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfileByAuthId(session.user.id);
    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // 2. Load collection
    const { id } = await context.params;
    collectionId = id;
    const collection = await getCollectionById(id);
    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }
    if (collection.user_profile_id !== profile.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this collection" },
        { status: 403 }
      );
    }

    // Must be in 'cleaning' status (set by collect route)
    if (
      collection.status !== "cleaning" &&
      collection.status !== "validating" &&
      collection.status !== "deduplicating" &&
      collection.status !== "failed"
    ) {
      return NextResponse.json(
        {
          error: `Collection is in '${collection.status}' status. Processing requires 'cleaning' status.`,
        },
        { status: 400 }
      );
    }

    // 3. Load structured requirement for field validation
    const collectionResult = await getCollectionResult(collection.id);
    if (!collectionResult || !collectionResult.result_data) {
      return NextResponse.json(
        { error: "No understanding result found for this collection." },
        { status: 400 }
      );
    }
    const requirement = collectionResult.result_data as StructuredRequirement;
    const fields = requirement.fields || [];

    // 4. Load collected records
    const allRecords = await getCollectionRecords(collection.id);
    const collectedRecords = allRecords.filter(
      (r) => r.status === "collected"
    );

    if (collectedRecords.length === 0) {
      await updateCollectionStatus(collection.id, "failed");
      return NextResponse.json(
        {
          error: "No collected records to process.",
          summary: {
            total_raw: allRecords.length,
            collected: 0,
            failed: allRecords.filter((r) => r.status === "failed").length,
          },
        },
        { status: 400 }
      );
    }

    console.log(
      `[Processing] Starting cleaning/validation/dedup for collection ${collection.id} — ${collectedRecords.length} records`
    );

    // ─── STAGE 1: CLEANING ──────────────────────────────────
    await updateCollectionStatus(collection.id, "cleaning");

    const processed: ProcessedRecord[] = [];
    let cleanedCount = 0;
    let droppedByCleaningCount = 0;

    for (const record of collectedRecords) {
      const cleaned = cleanRecord(record.record_data);
      if (cleaned === null) {
        droppedByCleaningCount++;
        processed.push({
          original: record,
          cleaned_data: {},
          validation: "invalid",
          is_duplicate: false,
        });
      } else {
        cleanedCount++;
        processed.push({
          original: record,
          cleaned_data: cleaned,
          validation: "valid", // will be updated in validation stage
          is_duplicate: false,
        });
      }
    }

    console.log(
      `[Processing] Cleaning complete: ${cleanedCount} cleaned, ${droppedByCleaningCount} dropped (all-null)`
    );

    // ─── STAGE 2: VALIDATION ────────────────────────────────
    await updateCollectionStatus(collection.id, "validating");

    let validCount = 0;
    let incompleteCount = 0;
    let invalidCount = droppedByCleaningCount; // already counted

    for (const item of processed) {
      if (Object.keys(item.cleaned_data).length === 0) continue; // already invalid

      const result = validateRecord(item.cleaned_data, fields);
      item.validation = result;

      switch (result) {
        case "valid":
          validCount++;
          break;
        case "incomplete":
          incompleteCount++;
          break;
        case "invalid":
          invalidCount++;
          break;
      }
    }

    console.log(
      `[Processing] Validation complete: ${validCount} valid, ${incompleteCount} incomplete, ${invalidCount} invalid`
    );

    // ─── STAGE 3: DEDUPLICATION ─────────────────────────────
    await updateCollectionStatus(collection.id, "deduplicating");

    // Only deduplicate valid and incomplete records
    const deduplicatable = processed.filter(
      (p) => p.validation === "valid" || p.validation === "incomplete"
    );

    // Build fingerprint groups
    const fingerprintGroups = new Map<string, ProcessedRecord[]>();
    for (const item of deduplicatable) {
      const fp = recordFingerprint(item.cleaned_data, fields);
      const group = fingerprintGroups.get(fp) || [];
      group.push(item);
      fingerprintGroups.set(fp, group);
    }

    let duplicateCount = 0;
    const duplicateExamples: Array<{
      kept_source: string;
      dropped_source: string;
      fingerprint: string;
    }> = [];

    for (const [fp, group] of fingerprintGroups.entries()) {
      if (group.length <= 1) continue;

      // Sort by completeness (most complete first), then by "valid" > "incomplete"
      group.sort((a, b) => {
        // Prefer valid over incomplete
        if (a.validation === "valid" && b.validation !== "valid") return -1;
        if (b.validation === "valid" && a.validation !== "valid") return 1;
        // Then by completeness
        return (
          recordCompleteness(b.cleaned_data) -
          recordCompleteness(a.cleaned_data)
        );
      });

      // Keep the first (most complete), mark the rest as duplicates
      const kept = group[0];
      for (let i = 1; i < group.length; i++) {
        group[i].is_duplicate = true;
        group[i].duplicate_of = kept.original.source_url;
        duplicateCount++;

        if (duplicateExamples.length < 5) {
          duplicateExamples.push({
            kept_source: kept.original.source_url,
            dropped_source: group[i].original.source_url,
            fingerprint: fp,
          });
        }
      }
    }

    console.log(`[Processing] Deduplication complete: ${duplicateCount} duplicates removed`);

    // ─── BUILD FINAL DATASET ────────────────────────────────

    const finalRecords = processed.filter(
      (p) =>
        !p.is_duplicate &&
        (p.validation === "valid" || p.validation === "incomplete")
    );

    // Build the final result data
    const finalData = finalRecords.map((p) => ({
      ...p.cleaned_data,
      _source_url: p.original.source_url,
      _source_name: p.original.source_name,
      _source_id: p.original.source_id,
      _validation: p.validation,
    }));

    // Processing summary
    const processingSummary = {
      raw_records: collectedRecords.length,
      after_cleaning: cleanedCount,
      dropped_by_cleaning: droppedByCleaningCount,
      valid: validCount,
      incomplete: incompleteCount,
      invalid: invalidCount,
      duplicates_removed: duplicateCount,
      duplicate_examples: duplicateExamples,
      final_count: finalRecords.length,
    };

    // Save final result to collection_results (upsert)
    await saveCollectionResult({
      collection_id: collection.id,
      understood_requirement:
        requirement.understood_requirement || collection.original_input,
      processing_summary: `Processed ${collectedRecords.length} raw records → ${cleanedCount} cleaned → ${validCount} valid, ${incompleteCount} incomplete → ${duplicateCount} duplicates removed → ${finalRecords.length} final records.`,
      result_data: {
        records: finalData,
        summary: processingSummary,
        fields: fields,
        query: collection.original_input,
        output_type: requirement.output_type || "structured_dataset",
      },
      final_answer: `Found ${finalRecords.length} unique records matching your request.`,
    });

    // ─── COMPLETE ───────────────────────────────────────────
    const updatedCollection = await updateCollectionStatus(
      collection.id,
      "completed"
    );

    console.log(
      `[Processing] Collection ${collection.id} completed with ${finalRecords.length} final records`
    );

    return NextResponse.json({
      success: true,
      collection: updatedCollection,
      summary: processingSummary,
      final_records: finalData,
      final_count: finalRecords.length,
    });
  } catch (error: unknown) {
    console.error("[Processing] Error:", error);

    if (collectionId) {
      try {
        await updateCollectionStatus(collectionId, "failed");
      } catch (dbErr) {
        console.error("[Processing] Failed to mark collection as failed:", dbErr);
      }
    }

    return NextResponse.json(
      { error: "An error occurred during data processing.", code: "PROCESSING_ERROR" },
      { status: 500 }
    );
  }
}
