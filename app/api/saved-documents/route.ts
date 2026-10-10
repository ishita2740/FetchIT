import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { getUserProfileByAuthId, getUserSavedDocumentsExtended, saveDocument, deleteSavedDocument } from "@/lib/db";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getUserProfileByAuthId(sessionUser.id);
    if (!profile) return NextResponse.json({ documents: [] });

    const documents = await getUserSavedDocumentsExtended(profile.id);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[Saved Documents GET]", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getUserProfileByAuthId(sessionUser.id);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = await request.json();
    const { file_name, file_type, file_url, extracted_text, document_type, file_size, collection_id } = body;

    if (!file_name) return NextResponse.json({ error: "file_name is required" }, { status: 400 });

    const doc = await saveDocument({
      user_profile_id: profile.id,
      collection_id: collection_id ?? null,
      file_name,
      file_type: file_type ?? null,
      file_url: file_url ?? null,
      extracted_text: extracted_text ?? null,
      document_type: document_type ?? "uploaded",
      file_size: file_size ?? null,
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error("[Saved Documents POST]", error);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getUserProfileByAuthId(sessionUser.id);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get("id");
    if (!docId) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await deleteSavedDocument(docId, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Saved Documents DELETE]", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
