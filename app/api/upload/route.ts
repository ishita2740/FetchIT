import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { getUserProfileByAuthId, saveUploadedFile } from "@/lib/db";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/json",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "txt", "csv", "xls", "xlsx", "json",
  "jpg", "jpeg", "png", "webp",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfileByAuthId(sessionUser.id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const collectionId = formData.get("collection_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Maximum size is 10 MB.` }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }

    // Validate extension
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `Unsupported file extension: .${ext}` }, { status: 400 });
    }

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate a storage key (we store in DB for now; can move to object storage later)
    const storageKey = `${profile.id}/${crypto.randomUUID()}.${ext}`;

    // Extract text depending on file type
    let extractedText: string | null = null;
    const isImage = file.type.startsWith("image/");

    if (!isImage) {
      try {
        extractedText = await extractTextFromBuffer(buffer, file.type, ext);
      } catch (e) {
        console.warn("[Upload] Text extraction failed:", e);
        // Non-fatal — we still save the file
      }
    }

    const uploadedFile = await saveUploadedFile({
      user_profile_id: profile.id,
      collection_id: collectionId || null,
      original_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      file_extension: ext,
      storage_key: storageKey,
      extracted_text: extractedText,
      status: isImage ? "uploaded" : (extractedText ? "processed" : "uploaded"),
    });

    return NextResponse.json({
      success: true,
      file: {
        id: uploadedFile.id,
        original_name: uploadedFile.original_name,
        mime_type: uploadedFile.mime_type,
        file_size: uploadedFile.file_size,
        file_extension: uploadedFile.file_extension,
        status: uploadedFile.status,
        extracted_text: extractedText ? extractedText.slice(0, 500) : null, // Preview only
        is_image: isImage,
      },
    });
  } catch (error) {
    console.error("[File Upload Error]", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

async function extractTextFromBuffer(buffer: Buffer, mimeType: string, ext: string): Promise<string> {
  // PDF
  if (mimeType === "application/pdf" || ext === "pdf") {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text?.slice(0, 50000) ?? "";
  }

  // DOCX
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value?.slice(0, 50000) ?? "";
  }

  // TXT / CSV / JSON
  if (["text/plain", "text/csv", "application/json"].includes(mimeType) || ["txt", "csv", "json"].includes(ext)) {
    return buffer.toString("utf-8").slice(0, 50000);
  }

  // XLSX / XLS
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    ["xlsx", "xls"].includes(ext)
  ) {
    try {
      const xlsxParseJson = require("xlsx-parse-json");
      const sheets = await xlsxParseJson(buffer);
      if (sheets && typeof sheets === "object") {
        const sheetName = Object.keys(sheets)[0];
        const rows = sheets[sheetName] as Record<string, any>[];
        return JSON.stringify(rows).slice(0, 50000);
      }
    } catch {
      // Fallback: just return raw CSV-like text
      return buffer.toString("utf-8").slice(0, 50000);
    }
  }

  return "";
}
