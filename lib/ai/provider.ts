import { StructuredRequirement, StructuredRequirementSchema } from "./schema";

export interface UserPreferencesContext {
  interests?: string[];
  information_purpose?: string[];
  information_style?: string[];
  information_priorities?: string[];
}

export interface AIProvider {
  readonly name: string;
  understandRequest(
    userQuery: string,
    preferences?: UserPreferencesContext | null
  ): Promise<StructuredRequirement>;
  planWorkflow(
    requirement: StructuredRequirement
  ): Promise<any>;
}

export class MissingAIConfigurationError extends Error {
  constructor(message?: string) {
    super(
      message ||
        "No AI provider configured. Please configure an AI API key (e.g. GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or NEON_AI_GATEWAY_TOKEN) in your server environment."
    );
    this.name = "MissingAIConfigurationError";
  }
}

export class AIUnderstandingError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AIUnderstandingError";
  }
}

function buildPrompt(userQuery: string, preferences?: UserPreferencesContext | null): string {
  let prefContext = "";
  if (preferences) {
    const parts: string[] = [];
    if (preferences.interests?.length) {
      parts.push(`- General Interests: ${preferences.interests.join(", ")}`);
    }
    if (preferences.information_purpose?.length) {
      parts.push(`- Primary Information Purpose: ${preferences.information_purpose.join(", ")}`);
    }
    if (preferences.information_style?.length) {
      parts.push(`- Preferred Information Style: ${preferences.information_style.join(", ")}`);
    }
    if (preferences.information_priorities?.length) {
      parts.push(`- Information Priorities: ${preferences.information_priorities.join(", ")}`);
    }
    if (parts.length > 0) {
      prefContext = `\nUser Personalization Context:\n${parts.join("\n")}\n\nNote: The user's explicit request in their query ALWAYS takes precedence over general personalization preferences. Personalization should guide nuance, default expectations, and format preferences when not explicitly specified in the query.\n`;
    }
  }

  return `You are FetchIT's AI Understanding Engine.
Your task is to understand the user's natural language request and convert it into a structured, machine-readable requirement for data collection and research.

User Request: "${userQuery}"
${prefContext}
Analyze the request and provide a JSON response conforming strictly to this structure:
{
  "intent": string (e.g. "data_collection", "research", "exploration", "comparison", "summary"),
  "topic": string (concise topic of the request),
  "entity": string or null (e.g. "startup", "electric_vehicle", "internship", "paper"),
  "quantity": integer or null (e.g. 20 if specified, or null),
  "location": string or null (e.g. "India", "Global", or null),
  "fields": string[] (list of requested fields/attributes, e.g. ["company_name", "founders", "funding", "website"]),
  "filters": any[] (any specific criteria or filters mentioned),
  "sort": string or null (e.g. "funding_desc", "recent", or null),
  "time_constraint": string or null (e.g. "latest", "2024", or null),
  "output_type": "structured_dataset" | "research" | "summary" | "list",
  "requires_sources": boolean (true if sources, references, or reliability matter),
  "requires_latest_information": boolean (true if latest, current, or fresh info is needed),
  "understood_requirement": string (A clear, complete human-readable explanation of what FetchIT understood from the user's request),
  "processing_summary": string (A short, user-facing summary sentence, e.g. "FetchIT understood that you want a structured list of 20 AI startups in India, including their founders, funding and websites.")
}

Return ONLY valid JSON. No markdown backticks, no markdown code blocks, no additional conversational text.`;
}

function buildPlanPrompt(requirement: StructuredRequirement): string {
  return `You are FetchIT's Workflow Planner.
Your task is to convert a structured data collection requirement into a safe, explicit execution plan.

Requirement:
${JSON.stringify(requirement, null, 2)}

Produce a JSON response conforming strictly to this structure:
{
  "goal": string (overall goal of the workflow),
  "output_type": "structured_dataset" | "research" | "summary" | "list",
  "requires_sources": boolean,
  "requires_latest_information": boolean,
  "steps": [
    {
      "id": string (e.g. "step_1"),
      "type": "input_processing" | "document_extraction" | "source_discovery" | "data_collection" | "cleaning" | "validation" | "deduplication" | "summarization" | "analysis" | "result_generation",
      "description": string (concise description of action),
      "status": "pending",
      "depends_on": string[] (optional array of previous step ids)
    }
  ]
}

Rules:
1. DO NOT invent sources.
2. DO NOT fabricate records.
3. Only create the execution plan.
4. Do NOT use any step types other than the allowed ones.
5. Provide a dynamic list of steps based on the requirement.

Return ONLY valid JSON. No markdown backticks, no markdown code blocks, no additional conversational text.`;
}

class OpenAICompatibleProvider implements AIProvider {
  constructor(
    public readonly name: string,
    private readonly apiKey: string,
    private readonly baseURL: string,
    private readonly model: string
  ) {}

  async understandRequest(
    userQuery: string,
    preferences?: UserPreferencesContext | null
  ): Promise<StructuredRequirement> {
    const prompt = buildPrompt(userQuery, preferences);
    const url = `${this.baseURL.replace(/\/+$/, "")}/chat/completions`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are FetchIT's AI Understanding Engine. Output only valid JSON conforming to the requested schema.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new AIUnderstandingError(`AI request failed with status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new AIUnderstandingError("AI response contained no content");
    }

    return parseAndValidateOutput(content);
  }

  async planWorkflow(requirement: StructuredRequirement): Promise<any> {
    const prompt = buildPlanPrompt(requirement);
    const url = `${this.baseURL.replace(/\/+$/, "")}/chat/completions`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are FetchIT's Workflow Planner. Output only valid JSON conforming to the requested schema.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new AIUnderstandingError(`AI request failed with status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new AIUnderstandingError("AI response contained no content");
    }

    return parseAndValidatePlan(content);
  }
}

class GoogleGeminiProvider implements AIProvider {
  readonly name = "Google Gemini";

  constructor(private readonly apiKey: string, private readonly model: string = "gemini-flash-lite-latest") {}

  private async fetchWithRetry(url: string, payload: any, maxRetries = 3): Promise<Response> {
    let attempt = 0;
    while (true) {
      attempt++;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return res;
      if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
        const delayMs = attempt * 1500;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return res;
    }
  }

  async understandRequest(
    userQuery: string,
    preferences?: UserPreferencesContext | null
  ): Promise<StructuredRequirement> {
    const prompt = buildPrompt(userQuery, preferences);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const res = await this.fetchWithRetry(url, {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new AIUnderstandingError(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new AIUnderstandingError("Gemini returned an empty response");
    }

    return parseAndValidateOutput(text);
  }

  async planWorkflow(requirement: StructuredRequirement): Promise<any> {
    const prompt = buildPlanPrompt(requirement);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const res = await this.fetchWithRetry(url, {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new AIUnderstandingError(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new AIUnderstandingError("Gemini returned an empty response");
    }

    return parseAndValidatePlan(text);
  }
}

class AnthropicProvider implements AIProvider {
  readonly name = "Anthropic Claude";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = "claude-3-5-sonnet-20241022"
  ) {}

  async understandRequest(
    userQuery: string,
    preferences?: UserPreferencesContext | null
  ): Promise<StructuredRequirement> {
    const prompt = buildPrompt(userQuery, preferences);
    const url = "https://api.anthropic.com/v1/messages";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1500,
        temperature: 0.1,
        system: "You are FetchIT's AI Understanding Engine. Respond with pure JSON only.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new AIUnderstandingError(`Anthropic API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      throw new AIUnderstandingError("Anthropic returned an empty response");
    }

    return parseAndValidateOutput(text);
  }

  async planWorkflow(requirement: StructuredRequirement): Promise<any> {
    const prompt = buildPlanPrompt(requirement);
    const url = "https://api.anthropic.com/v1/messages";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1500,
        temperature: 0.1,
        system: "You are FetchIT's Workflow Planner. Respond with pure JSON only.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new AIUnderstandingError(`Anthropic API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      throw new AIUnderstandingError("Anthropic returned an empty response");
    }

    return parseAndValidatePlan(text);
  }
}

function parseAndValidateOutput(raw: string): StructuredRequirement {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new AIUnderstandingError("Failed to parse AI output as JSON: " + (err instanceof Error ? err.message : String(err)));
  }

  const result = StructuredRequirementSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new AIUnderstandingError(`AI output failed schema validation: ${issues}`);
  }

  return result.data;
}

function parseAndValidatePlan(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new AIUnderstandingError("Failed to parse AI output as JSON: " + (err instanceof Error ? err.message : String(err)));
  }

  const { WorkflowPlanSchema } = require("./schema");
  const result = WorkflowPlanSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new AIUnderstandingError(`AI output failed schema validation: ${issues}`);
  }

  return result.data;
}

export function getAIProvider(): AIProvider {
  // Check OpenAI
  if (process.env.OPENAI_API_KEY) {
    return new OpenAICompatibleProvider(
      "OpenAI",
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      process.env.OPENAI_MODEL || "gpt-4o-mini"
    );
  }

  // Check Google Gemini
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY) {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY!;
    return new GoogleGeminiProvider(key, process.env.GEMINI_MODEL || "gemini-flash-lite-latest");
  }

  // Check Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022"
    );
  }

  // Check Neon AI Gateway
  if (process.env.NEON_AI_GATEWAY_TOKEN) {
    const baseURL = process.env.NEON_AI_GATEWAY_BASE_URL || "https://br-quiet-art-b5g8o5vq-api.ai.c-7.us-east-2.aws.neon.tech/v1";
    return new OpenAICompatibleProvider(
      "Neon AI Gateway",
      process.env.NEON_AI_GATEWAY_TOKEN,
      baseURL,
      process.env.NEON_AI_MODEL || "gemini-3-flash"
    );
  }

  // Generic custom OpenAI-compatible endpoint
  if (process.env.AI_BASE_URL && process.env.AI_API_KEY) {
    return new OpenAICompatibleProvider(
      "Custom AI Endpoint",
      process.env.AI_API_KEY,
      process.env.AI_BASE_URL,
      process.env.AI_MODEL || "default"
    );
  }

  throw new MissingAIConfigurationError();
}

export function getAIProviderStatus(): {
  configured: boolean;
  provider: string | null;
  supportedProviders: string[];
} {
  try {
    const p = getAIProvider();
    return {
      configured: true,
      provider: p.name,
      supportedProviders: ["Google Gemini", "OpenAI", "Anthropic Claude", "Neon AI Gateway"],
    };
  } catch {
    return {
      configured: false,
      provider: null,
      supportedProviders: ["Google Gemini", "OpenAI", "Anthropic Claude", "Neon AI Gateway"],
    };
  }
}
