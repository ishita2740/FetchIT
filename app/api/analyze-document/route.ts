import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { getUserProfileByAuthId, getUploadedFile } from "@/lib/db";

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

    const body = await request.json();
    const { file_id, prompt } = body as { file_id: string; prompt?: string };

    if (!file_id) {
      return NextResponse.json({ error: "file_id is required" }, { status: 400 });
    }

    // Load the uploaded file
    const uploadedFile = await getUploadedFile(file_id);
    if (!uploadedFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Ownership check
    if (uploadedFile.user_profile_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isImage = uploadedFile.mime_type.startsWith("image/");

    if (isImage) {
      // Image analysis requires vision-capable model
      return NextResponse.json(
        { error: "Use /api/analyze-image for image files" },
        { status: 400 }
      );
    }

    if (!uploadedFile.extracted_text) {
      return NextResponse.json(
        { error: "No extracted text available for this file. The file may not have been processed yet." },
        { status: 400 }
      );
    }

    const userPrompt = prompt?.trim() || "Extract and summarize all important information from this document into structured records.";

    // Use AI to analyze the document
    const analysisResult = await analyzeDocumentWithAI(
      uploadedFile.extracted_text,
      uploadedFile.original_name,
      userPrompt
    );

    return NextResponse.json({
      success: true,
      file: {
        id: uploadedFile.id,
        original_name: uploadedFile.original_name,
        mime_type: uploadedFile.mime_type,
      },
      prompt: userPrompt,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error("[Document Analysis Error]", error);
    return NextResponse.json({ error: "Failed to analyze document" }, { status: 500 });
  }
}

async function analyzeDocumentWithAI(
  extractedText: string,
  fileName: string,
  userPrompt: string
): Promise<{ summary: string; records: Record<string, any>[]; insights: string[] }> {
  const systemPrompt = `You are FetchIT's Document Analysis Engine.
The user has uploaded a document and wants information extracted from it.
Analyze the document content carefully and respond with valid JSON only.

Your response MUST be a valid JSON object with this structure:
{
  "summary": "A concise 2-3 sentence summary of the document",
  "records": [
    { "field1": "value1", "field2": "value2" }
  ],
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"]
}

Rules:
- Extract ONLY information present in the document
- Do NOT fabricate data
- Records should represent the main structured data in the document
- Insights should be meaningful observations about the content
- If no structured records can be extracted, return an empty records array
- Return ONLY valid JSON, no markdown`;

  const userMessage = `Document: "${fileName}"

User Request: "${userPrompt}"

Document Content:
${extractedText.slice(0, 12000)}`;

  // Try providers in order
  const openaiKey = process.env.OPENAI_API_KEY || process.env.NEON_AI_GATEWAY_TOKEN;
  if (openaiKey) {
    const base = process.env.OPENAI_API_KEY
      ? process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
      : process.env.NEON_AI_GATEWAY_BASE_URL || "https://br-quiet-art-b5g8o5vq-api.ai.c-7.us-east-2.aws.neon.tech/v1";
    const model = process.env.OPENAI_API_KEY
      ? process.env.OPENAI_MODEL || "gpt-4o-mini"
      : process.env.NEON_AI_MODEL || "gemini-3-flash";

    const res = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return JSON.parse(data.choices[0].message.content);
    }
  }

  // Gemini
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return JSON.parse(text);
    }
  }

  // Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.content?.[0]?.text;
      if (text) return JSON.parse(text);
    }
  }

  throw new Error("No AI provider available for document analysis");
}
