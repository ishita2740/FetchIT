import {
  DataCollectionProvider,
  CollectionContext,
  ExtractedRecord,
  DataCollectionError,
} from "./provider";
import { getAIProvider } from "@/lib/ai/provider";

/**
/**
 * Strips script/style tags, noise elements, collapses whitespace,
 * and decodes basic HTML entities.
 */
function cleanHtml(html: string): string {
  return html
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<(?:br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/?(?:p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/**
 * Fetches a web page and returns its text content.
 * Does NOT bypass authentication, paywalls, CAPTCHAs, or robots restrictions.
 */
async function fetchWebContent(url: string): Promise<string> {
  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new DataCollectionError(`Invalid URL format: ${url}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      throw new DataCollectionError(
        `HTTP ${res.status} ${res.statusText || ""} for ${url}`.trim()
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/json") &&
      !contentType.includes("application/xml") &&
      !contentType.includes("text/xml")
    ) {
      throw new DataCollectionError(
        `Unsupported content type "${contentType}" for ${url}`
      );
    }

    const rawText = await res.text();
    const cleaned = cleanHtml(rawText);

    // Limit content to ~15,000 chars to fit safely within model context windows
    return cleaned.slice(0, 15000);
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new DataCollectionError(`Request timed out after 15s for ${url}`);
    }
    if (err instanceof DataCollectionError) throw err;
    throw new DataCollectionError(`Network error fetching ${url}: ${err.message || String(err)}`);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Builds the extraction prompt for the AI model.
 */
function buildExtractionPrompt(
  content: string,
  context: CollectionContext
): string {
  const fieldsStr = context.fields.join(", ");
  const quantityStr = context.quantity
    ? `Extract up to ${context.quantity} records if available in the text.`
    : "Extract all relevant records matching the requirements present in the text.";
  const entityStr = context.requirement.entity
    ? `Target entity: "${context.requirement.entity}".`
    : "";
  const locationStr = context.requirement.location
    ? `Location scope: "${context.requirement.location}". Focus on entities associated with this location.`
    : "";
  const topicStr = context.requirement.topic
    ? `Topic: "${context.requirement.topic}".`
    : "";

  return `You are FetchIT's Data Extraction Engine.

Your task is to extract real, factual structured records from the source web content below.

Original Request: "${context.original_input}"
${topicStr}
${entityStr}
${locationStr}
Requested Fields: [${fieldsStr}]
${quantityStr}

Source Name: ${context.source.source_name}
Source URL: ${context.source.source_url}

STRICT EXTRACTION RULES:
1. Extract ONLY entities and details that are EXPLICITLY STATED in the source text below.
2. NEVER fabricate, imagine, extrapolate, or hallucinate missing information.
3. If an entity is mentioned but a specific requested field (e.g. founders, funding, website) is not mentioned in the source, set that field value to null.
4. If no relevant entities matching the criteria are discussed in the source content, return {"records": []}.
5. Return ONLY a valid JSON object in this exact structure:
{
  "records": [
    {
      ${context.fields.map((f) => `"${f}": <value or null>`).join(",\n      ")}
    }
  ]
}

SOURCE CONTENT:
${content}

Return ONLY valid JSON. No markdown backticks, no markdown code block, no conversational preamble.`;
}

/**
 * Parses raw AI output to extract records array.
 */
function parseExtractionOutput(raw: string): Record<string, any>[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Attempt extracting between outer brackets
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        throw new DataCollectionError("Failed to parse AI extraction output as JSON");
      }
    } else {
      throw new DataCollectionError("Failed to parse AI extraction output as JSON");
    }
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && Array.isArray(parsed.records)) {
    return parsed.records;
  }

  if (parsed && Array.isArray(parsed.data)) {
    return parsed.data;
  }

  if (parsed && typeof parsed === "object") {
    // Check if single record object was returned instead of array
    const keys = Object.keys(parsed);
    if (keys.length > 0 && !keys.includes("records") && !keys.includes("error")) {
      return [parsed];
    }
    return [];
  }

  throw new DataCollectionError(
    "AI extraction output does not contain a valid records array"
  );
}

/**
 * Concrete DataCollectionProvider that:
 * 1. Fetches real web content from the source URL
 * 2. Uses the configured AI provider to extract structured records
 */
export class AIWebCollectionProvider implements DataCollectionProvider {
  readonly name = "AI Web Collection";

  async collectFromSource(context: CollectionContext): Promise<ExtractedRecord[]> {
    const sourceType = context.source.source_type;

    // User documents are handled separately
    if (sourceType === "user_document") {
      throw new DataCollectionError(
        "User document extraction requires the document extraction pipeline (not yet supported in this provider)."
      );
    }

    // 1. Fetch real web content
    let content: string;
    try {
      content = await fetchWebContent(context.source.source_url);
    } catch (err: any) {
      if (err instanceof DataCollectionError) throw err;
      throw new DataCollectionError(
        `Failed to fetch ${context.source.source_url}: ${err.message || String(err)}`
      );
    }

    if (!content || content.length < 50) {
      throw new DataCollectionError(
        `Source ${context.source.source_url} returned insufficient content (${content?.length || 0} chars)`
      );
    }

    // 2. Use AI to extract structured records
    const prompt = buildExtractionPrompt(content, context);
    const aiResponse = await callAIForExtraction(prompt);

    // 3. Parse and validate
    const rawRecords = parseExtractionOutput(aiResponse);

    if (!rawRecords || rawRecords.length === 0) {
      return [];
    }

    // 4. Build ExtractedRecord objects with source traceability
    const now = new Date().toISOString();
    return rawRecords.map((record) => ({
      record_data: record,
      source_url: context.source.source_url,
      source_name: context.source.source_name || context.source.source_url,
      collected_at: now,
    }));
  }
}

/**
 * Calls the configured AI provider for extraction using the same
 * provider infrastructure as understanding/planning.
 */
async function callAIForExtraction(prompt: string): Promise<string> {
  // Reuse the existing AI provider infrastructure
  // We need to call the raw API rather than the typed methods
  // so we build a direct fetch using the same config

  // Check for OpenAI-compatible (including Neon AI Gateway)
  const openaiKey = process.env.OPENAI_API_KEY || process.env.NEON_AI_GATEWAY_TOKEN;
  const openaiBase =
    process.env.OPENAI_API_KEY
      ? process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
      : process.env.NEON_AI_GATEWAY_BASE_URL ||
        "https://br-quiet-art-b5g8o5vq-api.ai.c-7.us-east-2.aws.neon.tech/v1";
  const openaiModel =
    process.env.OPENAI_API_KEY
      ? process.env.OPENAI_MODEL || "gpt-4o-mini"
      : process.env.NEON_AI_MODEL || "gemini-3-flash";

  if (openaiKey) {
    const url = `${openaiBase.replace(/\/+$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [
          {
            role: "system",
            content:
              "You are FetchIT's Data Extraction Engine. Extract structured records from source content. Output only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new DataCollectionError(`AI extraction request failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new DataCollectionError("AI extraction returned no content");
    }
    return content;
  }

  // Check for Google Gemini
  const geminiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    let res: Response | null = null;
    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      attempt++;
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      });

      if (res.ok) break;
      if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }
      break;
    }

    if (!res || !res.ok) {
      const errText = res ? await res.text().catch(() => "") : "Network error";
      throw new DataCollectionError(`Gemini extraction request failed (${res?.status || "network"}): ${errText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new DataCollectionError("Gemini extraction returned no content");
    return text;
  }

  // Check for Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.1,
        system:
          "You are FetchIT's Data Extraction Engine. Extract structured records from source content. Output only valid JSON.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new DataCollectionError(`Anthropic extraction request failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new DataCollectionError("Anthropic extraction returned no content");
    return text;
  }

  // Check for generic custom endpoint
  if (process.env.AI_BASE_URL && process.env.AI_API_KEY) {
    const url = `${process.env.AI_BASE_URL.replace(/\/+$/, "")}/chat/completions`;
    const model = process.env.AI_MODEL || "default";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are FetchIT's Data Extraction Engine. Extract structured records from source content. Output only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new DataCollectionError(`Custom AI extraction request failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new DataCollectionError("Custom AI extraction returned no content");
    return content;
  }

  throw new DataCollectionError(
    "No AI provider configured for data extraction. Please configure an AI API key."
  );
}

/**
 * Returns the configured DataCollectionProvider.
 * Requires an AI provider to be configured for extraction.
 */
export function getCollectionProvider(): DataCollectionProvider {
  // Verify that an AI provider is available for extraction
  const hasAI =
    process.env.OPENAI_API_KEY ||
    process.env.NEON_AI_GATEWAY_TOKEN ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    (process.env.AI_BASE_URL && process.env.AI_API_KEY);

  if (!hasAI) {
    const { MissingCollectionConfigurationError } = require("./provider");
    throw new MissingCollectionConfigurationError();
  }

  return new AIWebCollectionProvider();
}
