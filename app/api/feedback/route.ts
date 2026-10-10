import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { getUserProfileByAuthId, saveFeedback } from "@/lib/db";

const VALID_CATEGORIES = new Set(["general", "bug", "feature", "praise", "other"]);

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();

    let profileId: string | null = null;
    if (sessionUser) {
      const profile = await getUserProfileByAuthId(sessionUser.id);
      profileId = profile?.id ?? null;
    }

    const body = await request.json();
    const { category = "general", message, page_context } = body as {
      category?: string;
      message: string;
      page_context?: string;
    };

    if (!message || typeof message !== "string" || message.trim().length < 3) {
      return NextResponse.json({ error: "Message must be at least 3 characters" }, { status: 400 });
    }

    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const feedback = await saveFeedback({
      user_profile_id: profileId,
      category,
      message: message.trim().slice(0, 2000),
      page_context: page_context ?? null,
    });

    return NextResponse.json({ success: true, id: feedback.id });
  } catch (error) {
    console.error("[Feedback POST]", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
