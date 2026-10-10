import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { getUserProfileByAuthId } from "@/lib/db";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

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
    const prompt = (formData.get("prompt") as string) || "Extract all visible information from this image into structured records.";

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported image type. Use JPG, PNG, or WebP." }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Image too large. Maximum size is 10 MB." }, { status: 400 });
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type;

    // Use vision-capable model
    const result = await analyzeImageWithVision(base64, mimeType, prompt, file.name);

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
      },
      prompt,
      analysis: result,
    });
  } catch (error) {
    console.error("[Image Analysis Error]", error);
    return NextResponse.json({ error: "Failed to analyze image" }, { status: 500 });
  }
}

async function analyzeImageWithVision(
  base64: string,
  mimeType: string,
  userPrompt: string,
  fileName: string
): Promise<{ summary: string; records: Record<string, any>[]; insights: string[] }> {
  const systemInstruction = `You are FetchIT's Image Analysis Engine.
Analyze the provided image carefully.
Respond ONLY with valid JSON in this exact format:
{
  "summary": "What this image shows (2-3 sentences)",
  "records": [{ "field": "value" }],
  "insights": ["Observation 1", "Observation 2"]
}
- Extract ONLY what is visibly present in the image
- Do NOT fabricate data
- records: structured data visible in the image (tables, lists, names, prices, etc.)
- insights: key observations about the image content
- If no structured records: return empty array`;

  const fullPrompt = `${systemInstruction}\n\nUser request: "${userPrompt}"\nImage filename: "${fileName}"`;

  // Try Gemini Vision first (best for vision with existing key)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    const model = process.env.GEMINI_VISION_MODEL || "gemini-flash-lite-latest";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: fullPrompt },
            ],
          }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        try { return JSON.parse(text); } catch { /* fall through */ }
      }
    }
  }

  // Try OpenAI vision
  if (process.env.OPENAI_API_KEY) {
    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: "text", text: fullPrompt },
          ],
        }],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        try { return JSON.parse(text); } catch { /* fall through */ }
      }
    }
  }

  // Try Anthropic Claude vision
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
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
            { type: "text", text: fullPrompt },
          ],
        }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.content?.[0]?.text;
      if (text) {
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) return JSON.parse(jsonMatch[0]);
        } catch { /* fall through */ }
      }
    }
  }

  throw new Error("No vision-capable AI provider available. Please configure GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.");
}
