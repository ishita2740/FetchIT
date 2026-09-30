import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  getUserProfileByAuthId,
  getCollectionById,
  updateCollectionStatus,
  getCollectionResult,
  getWorkflowPlan,
  saveDiscoveredSources
} from "@/lib/db";
import {
  getDiscoveryProvider,
  MissingDiscoveryConfigurationError,
  SourceDiscoveryError
} from "@/lib/discovery/provider";
import { DiscoveredSourceSchema } from "@/lib/ai/schema";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let collectionId: string | null = null;
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfileByAuthId(session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

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

    const collectionResult = await getCollectionResult(collection.id);
    if (!collectionResult || !collectionResult.result_data) {
      return NextResponse.json(
        { error: "Collection must be understood before source discovery." },
        { status: 400 }
      );
    }

    const planRow = await getWorkflowPlan(collection.id);
    if (!planRow || !planRow.plan) {
      return NextResponse.json(
        { error: "Collection must be planned before source discovery." },
        { status: 400 }
      );
    }

    // Verify if source discovery is required
    const workflowPlan = planRow.plan;
    if (!workflowPlan.requires_sources) {
      // Fast forward
      await updateCollectionStatus(collection.id, "collecting");
      return NextResponse.json({
        success: true,
        collection: await getCollectionById(collection.id),
        sources: [],
        message: "Source discovery skipped (not required)",
      });
    }

    await updateCollectionStatus(collection.id, "finding_sources");

    const discoveryProvider = getDiscoveryProvider();
    const discoveredSources = await discoveryProvider.discoverSources(
      collectionResult.result_data as any,
      workflowPlan
    );

    // Validate with Zod
    const validatedSources = discoveredSources.map(src => DiscoveredSourceSchema.parse(src));

    // Store in DB
    const savedSources = await saveDiscoveredSources(collection.id, validatedSources);

    // Update status. (As per prompt: "After successful discovery: finding_sources -> collecting. However, do not actually begin collection... use the most appropriate existing status without pretending that collection has started.")
    // Actually the prompt says: 
    // "After successful discovery: finding_sources -> collecting"
    // So we just update to 'collecting' because the UI shouldn't show fake progress. 
    // It says "If the collection is waiting for the next execution stage, use the most appropriate existing status without pretending that collection has started."
    // Actually, 'finding_sources' to 'collecting' means it's now IN 'collecting' status, waiting to be processed by the not-yet-built layer.
    const updatedCollection = await updateCollectionStatus(collection.id, "collecting");

    return NextResponse.json({
      success: true,
      collection: updatedCollection,
      sources: savedSources,
    });
  } catch (error: unknown) {
    console.error("Source Discovery Error:", error);

    if (collectionId) {
      try {
        await updateCollectionStatus(collectionId, "failed");
      } catch (dbErr) {
        console.error("Failed to mark collection as failed:", dbErr);
      }
    }

    if (error instanceof MissingDiscoveryConfigurationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "DISCOVERY_CONFIG_MISSING",
        },
        { status: 503 }
      );
    }

    if (error instanceof SourceDiscoveryError) {
      return NextResponse.json(
        {
          error: "Failed to discover sources. " + error.message,
          code: "SOURCE_DISCOVERY_FAILED",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: "An error occurred while discovering sources.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
