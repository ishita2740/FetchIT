import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  getUserProfileByAuthId,
  getCollectionById,
  updateCollectionStatus,
  getCollectionResult,
  saveWorkflowPlan,
  getWorkflowPlan,
} from "@/lib/db";
import {
  getAIProvider,
  MissingAIConfigurationError,
} from "@/lib/ai/provider";

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
        { error: "Collection must be understood before planning." },
        { status: 400 }
      );
    }

    const structuredRequirement = collectionResult.result_data;

    const aiProvider = getAIProvider();
    const workflowPlan = await aiProvider.planWorkflow(structuredRequirement as any);

    const savedPlan = await saveWorkflowPlan(collection.id, workflowPlan);

    const updatedCollection = await updateCollectionStatus(collection.id, "planning");

    return NextResponse.json({
      success: true,
      collection: updatedCollection,
      plan: savedPlan.plan,
    });
  } catch (error: unknown) {
    console.error("AI Workflow Planning Error:", error);

    if (collectionId) {
      try {
        await updateCollectionStatus(collectionId, "failed");
      } catch (dbErr) {
        console.error("Failed to mark collection as failed:", dbErr);
      }
    }

    if (error instanceof MissingAIConfigurationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "AI_CONFIG_MISSING",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "An error occurred while planning the workflow.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const plan = await getWorkflowPlan(collection.id);

    return NextResponse.json({
      collection,
      plan: plan ? plan.plan : null,
    });
  } catch (error) {
    console.error("Error fetching workflow plan:", error);
    return NextResponse.json({ error: "Failed to fetch workflow plan" }, { status: 500 });
  }
}
