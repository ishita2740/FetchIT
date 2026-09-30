import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  getUserProfileByAuthId,
  getCollectionById,
  getCollectionRecords,
} from "@/lib/db";

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

    const records = await getCollectionRecords(collection.id);

    // Compute summary stats
    const collectedRecords = records.filter((r) => r.status === "collected");
    const failedRecords = records.filter((r) => r.status === "failed");

    return NextResponse.json({
      collection,
      records: collectedRecords,
      summary: {
        total_records: records.length,
        collected: collectedRecords.length,
        failed: failedRecords.length,
      },
    });
  } catch (error) {
    console.error("Error fetching collection records:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection records" },
      { status: 500 }
    );
  }
}
