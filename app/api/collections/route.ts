import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getUserProfileByAuthId, getUserCollections, createCollection } from "@/lib/db";

export async function GET() {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfileByAuthId(session.user.id);
    if (!profile) {
      return NextResponse.json({ collections: [] });
    }

    const collections = await getUserCollections(profile.id);
    return NextResponse.json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfileByAuthId(session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { original_input, input_type = "text", title } = body;

    if (!original_input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const collection = await createCollection({
      user_profile_id: profile.id,
      title,
      original_input,
      input_type,
    });

    return NextResponse.json({ collection });
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}
