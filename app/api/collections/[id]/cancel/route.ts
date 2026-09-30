import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  getUserProfileByAuthId,
  getCollectionById,
  updateCollectionStatus,
  getCollectionRecords,
} from "@/lib/db";

export async function POST(
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

    if (collection.status === "completed") {
      return NextResponse.json(
        { error: "Collection is already completed and cannot be cancelled" },
        { status: 400 }
      );
    }

    if (collection.status === "cancelled") {
      return NextResponse.json({
        success: true,
        collection,
        message: "Collection was already cancelled",
      });
    }

    const updated = await updateCollectionStatus(id, "cancelled");

    // Check if partial records exist to let the user know
    const existingRecords = await getCollectionRecords(id);

    return NextResponse.json({
      success: true,
      collection: updated,
      records_count: existingRecords.length,
      message: "Collection cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling collection:", error);
    return NextResponse.json(
      { error: "Failed to cancel collection" },
      { status: 500 }
    );
  }
}
