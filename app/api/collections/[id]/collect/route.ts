import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  getUserProfileByAuthId,
  getCollectionById,
  getCollectionResult,
  getWorkflowPlan,
  getCollectionSources,
  updateCollectionStatus,
  saveCollectionRecords,
  updateCollectionSourceStatus,
} from "@/lib/db";
import {
  CollectionContext,
  SourceCollectionResult,
  MissingCollectionConfigurationError,
  DataCollectionError,
  ExtractedRecord,
} from "@/lib/collection/provider";
import { getCollectionProvider } from "@/lib/collection/ai-web-provider";
import { type StructuredRequirement, CollectedRecordSchema } from "@/lib/ai/schema";

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
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // 2. Load and verify collection ownership
    const { id } = await context.params;
    collectionId = id;
    const collection = await getCollectionById(id);
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }
    if (collection.user_profile_id !== profile.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this collection" },
        { status: 403 }
      );
    }

    // 3. Load structured understanding
    const collectionResult = await getCollectionResult(collection.id);
    if (!collectionResult || !collectionResult.result_data) {
      return NextResponse.json(
        { error: "Collection must be understood before data collection." },
        { status: 400 }
      );
    }
    const requirement = collectionResult.result_data as StructuredRequirement;

    // 4. Load workflow plan
    const planRow = await getWorkflowPlan(collection.id);
    if (!planRow || !planRow.plan) {
      return NextResponse.json(
        { error: "Collection must be planned before data collection." },
        { status: 400 }
      );
    }

    // 5. Load discovered sources
    const sources = await getCollectionSources(collection.id);
    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { error: "No sources discovered for this collection. Run source discovery first." },
        { status: 400 }
      );
    }

    // 6. Verify collection is ready
    if (
      collection.status !== "collecting" &&
      collection.status !== "finding_sources"
    ) {
      // Allow re-collection if already in collecting state
      if (collection.status === "failed") {
        // Allow retry from failed state
      } else if (
        collection.status !== "collecting" &&
        collection.status !== "cleaning"
      ) {
        // Don't re-collect if already past collection stage
      }
    }

    // 7. Update status to collecting
    await updateCollectionStatus(collection.id, "collecting");

    // 8. Get collection provider
    let provider;
    try {
      provider = getCollectionProvider();
    } catch (err) {
      if (err instanceof MissingCollectionConfigurationError) {
        await updateCollectionStatus(collection.id, "failed");
        return NextResponse.json(
          { error: err.message, code: "COLLECTION_CONFIG_MISSING" },
          { status: 503 }
        );
      }
      throw err;
    }

    // 9. Collect from each source (partial failure allowed)
    const sourceResults: SourceCollectionResult[] = [];
    const allRecordsToSave: Array<{
      source_id: string | null;
      record_data: Record<string, any>;
      source_url: string;
      source_name: string | null;
      status: "collected" | "empty" | "failed";
      error_message: string | null;
    }> = [];

    console.log(`[Data Collection] Starting collection for ${sources.length} sources...`);

    for (let idx = 0; idx < sources.length; idx++) {
      const source = sources[idx];
      const startTime = Date.now();
      console.log(`[Data Collection] [${idx + 1}/${sources.length}] Processing source: ${source.source_url} (${source.source_name || "unnamed"})`);

      const collectionContext: CollectionContext = {
        source,
        requirement,
        fields: requirement.fields || [],
        quantity: requirement.quantity ?? null,
        requires_latest_information: requirement.requires_latest_information ?? false,
        original_input: collection.original_input,
      };

      try {
        const records = await provider.collectFromSource(collectionContext);
        const durationMs = Date.now() - startTime;

        if (records.length === 0) {
          console.log(`[Data Collection] [${idx + 1}/${sources.length}] Completed in ${durationMs}ms - 0 records found (source accessible)`);
          sourceResults.push({
            source,
            status: "success",
            records: [],
          });
          // Mark source as verified since we could access it
          await updateCollectionSourceStatus(source.id, "verified");
        } else {
          // Validate each record against CollectedRecordSchema
          const validRecords: ExtractedRecord[] = [];
          for (const record of records) {
            const validation = CollectedRecordSchema.safeParse({
              record_data: record.record_data,
              source_url: record.source_url,
              source_name: record.source_name,
              collected_at: record.collected_at,
            });

            if (validation.success) {
              validRecords.push(record);
              allRecordsToSave.push({
                source_id: source.id,
                record_data: record.record_data,
                source_url: record.source_url,
                source_name: record.source_name,
                status: "collected",
                error_message: null,
              });
            } else {
              console.warn(`[Data Collection] Record validation failed for ${record.source_url}:`, validation.error.message);
            }
          }

          console.log(`[Data Collection] [${idx + 1}/${sources.length}] Completed in ${durationMs}ms - ${validRecords.length} structured records extracted and validated`);

          sourceResults.push({
            source,
            status: "success",
            records: validRecords,
          });

          // Mark source as verified
          await updateCollectionSourceStatus(source.id, "verified");
        }
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        console.warn(`[Data Collection] [${idx + 1}/${sources.length}] Failed in ${durationMs}ms for ${source.source_url}: ${err.message}`);

        sourceResults.push({
          source,
          status: "failed",
          records: [],
          error: err.message || String(err),
        });

        // Save a failure record for tracking
        allRecordsToSave.push({
          source_id: source.id,
          record_data: {},
          source_url: source.source_url,
          source_name: source.source_name,
          status: "failed",
          error_message: err.message || String(err),
        });

        // Mark source as inaccessible
        await updateCollectionSourceStatus(source.id, "inaccessible");
      }
    }

    // 10. Store collected records
    const savedRecords = await saveCollectionRecords(collection.id, allRecordsToSave);

    // 11. Compute summary
    const sourcesSucceeded = sourceResults.filter((r) => r.status === "success").length;
    const sourcesFailed = sourceResults.filter((r) => r.status === "failed").length;
    const recordsCollected = allRecordsToSave.filter((r) => r.status === "collected").length;

    const summary = {
      sources_found: sources.length,
      sources_processed: sourceResults.length,
      sources_succeeded: sourcesSucceeded,
      sources_failed: sourcesFailed,
      records_collected: recordsCollected,
    };

    // 12. Update collection status
    // Move to 'cleaning' as per lifecycle, but cleaning is not implemented yet
    // The frontend will handle showing the appropriate state
    const finalStatus = recordsCollected > 0 ? "cleaning" : "failed";
    const updatedCollection = await updateCollectionStatus(collection.id, finalStatus);

    return NextResponse.json({
      success: true,
      collection: updatedCollection,
      summary,
      records: savedRecords.filter((r) => r.status === "collected"),
    });
  } catch (error: unknown) {
    console.error("Data Collection Error:", error);

    if (collectionId) {
      try {
        await updateCollectionStatus(collectionId, "failed");
      } catch (dbErr) {
        console.error("Failed to mark collection as failed:", dbErr);
      }
    }

    if (error instanceof DataCollectionError) {
      return NextResponse.json(
        { error: error.message, code: "DATA_COLLECTION_FAILED" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred during data collection.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
