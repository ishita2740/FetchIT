import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  getUserProfileByAuthId,
  getUserPreferences,
  getCollectionById,
  updateCollectionStatus,
  saveCollectionResult,
  getCollectionResult,
} from "@/lib/db";
import {
  getAIProvider,
  MissingAIConfigurationError,
  AIUnderstandingError,
} from "@/lib/ai/provider";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let collectionId: string | null = null;
  try {
    // 1. Verify Neon Auth session
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Resolve user profile
    const profile = await getUserProfileByAuthId(session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // 3. Resolve collection and verify ownership
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

    // 4. Update status to understanding
    await updateCollectionStatus(collection.id, "understanding");

    // 5. Retrieve user's preferences
    const preferences = await getUserPreferences(profile.id);

    // 6. Invoke AI understanding engine
    const aiProvider = getAIProvider();
    const understanding = await aiProvider.understandRequest(
      collection.original_input,
      preferences
        ? {
            interests: preferences.interests,
            information_purpose: preferences.information_purpose,
            information_style: preferences.information_style,
            information_priorities: preferences.information_priorities,
          }
        : null
    );

    // 7. Save understanding result to collection_results
    const savedResult = await saveCollectionResult({
      collection_id: collection.id,
      understood_requirement: understanding.understood_requirement,
      processing_summary: understanding.processing_summary,
      result_data: understanding,
      final_answer: null,
    });

    // 8. Update collection status to planning
    const updatedCollection = await updateCollectionStatus(collection.id, "planning");

    return NextResponse.json({
      success: true,
      collection: updatedCollection,
      result: savedResult,
    });
  } catch (error: unknown) {
    console.error("AI Understanding Engine Error:", error);

    // Update collection status to failed if collection exists
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
          requiredConfig: [
            "GEMINI_API_KEY",
            "OPENAI_API_KEY",
            "ANTHROPIC_API_KEY",
            "NEON_AI_GATEWAY_TOKEN",
          ],
        },
        { status: 503 }
      );
    }

    if (error instanceof AIUnderstandingError) {
      return NextResponse.json(
        {
          error: "FetchIT was unable to understand this request. Please try rephrasing.",
          code: "AI_UNDERSTANDING_FAILED",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: "An error occurred while processing your request.",
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

    const result = await getCollectionResult(collection.id);

    return NextResponse.json({
      collection,
      result,
    });
  } catch (error) {
    console.error("Error fetching collection result:", error);
    return NextResponse.json({ error: "Failed to fetch collection" }, { status: 500 });
  }
}
