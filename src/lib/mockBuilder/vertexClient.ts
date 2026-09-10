/**
 * Shared Vertex / Gemini JSON generation for mock-builder AI stages.
 */

import { GoogleAuth } from "google-auth-library";

export function resolveVertexLocation(
  location = process.env.GOOGLE_CLOUD_LOCATION || "",
): string {
  const loc = location.trim();
  if (!loc) return "us-central1";
  if (loc.toLowerCase() !== "global") return loc;
  const noRemap = (process.env.VERTEX_GENAI_NO_GLOBAL_REMAP || "")
    .trim()
    .toLowerCase();
  if (noRemap === "1" || noRemap === "true" || noRemap === "yes") {
    return "global";
  }
  return (
    (process.env.VERTEX_GENAI_LOCATION || "us-central1").trim() || "us-central1"
  );
}

export function mockBuilderModelId(): string {
  return (
    process.env.MOCK_PAPER_REVIEW_MODEL ||
    process.env.MODEL_QUALITY_GATE ||
    process.env.MODEL_VERIFIER ||
    process.env.MODEL_CLASSIFIER ||
    "gemini-2.5-flash"
  );
}

function vertexGenerateUrl(
  project: string,
  location: string,
  model: string,
): string {
  if (location === "global") {
    return `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${model}:generateContent`;
  }
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

async function getVertexAccessToken(): Promise<string | null> {
  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return typeof token === "string" ? token : token?.token ?? null;
  } catch {
    return null;
  }
}

async function postGenerateContent(input: {
  url: string;
  headers: Record<string, string>;
  promptText: string;
}): Promise<string | null> {
  const res = await fetch(input.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...input.headers,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: input.promptText }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return (
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    null
  );
}

/**
 * Parse model JSON that may be an object, an array, or fenced markdown.
 * Prefer a full-body parse so array responses are not truncated to the first `{...}`.
 */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;

  try {
    return JSON.parse(body);
  } catch {
    // fall through to brace/bracket slicing
  }

  const objStart = body.indexOf("{");
  const arrStart = body.indexOf("[");
  const useArray =
    arrStart >= 0 && (objStart < 0 || arrStart < objStart);

  if (useArray) {
    const end = body.lastIndexOf("]");
    if (end > arrStart) {
      return JSON.parse(body.slice(arrStart, end + 1));
    }
  }

  const start = objStart;
  const end = body.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON object in model response");
  return JSON.parse(body.slice(start, end + 1));
}

export type LlmJsonSource = "vertex" | "gemini" | null;

/**
 * Prefer Vertex ADC (GOOGLE_CLOUD_PROJECT), then Gemini API key.
 */
export async function generateJsonWithLlm(
  prompt: unknown,
  options?: { model?: string },
): Promise<{ text: string; source: Exclude<LlmJsonSource, null> } | null> {
  const promptText =
    typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  const model = options?.model || mockBuilderModelId();

  const project =
    process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT || "";
  if (project) {
    const location = resolveVertexLocation(
      process.env.VERTEX_GENAI_LOCATION ||
        process.env.GOOGLE_CLOUD_LOCATION ||
        "",
    );
    const token = await getVertexAccessToken();
    if (token) {
      const text = await postGenerateContent({
        url: vertexGenerateUrl(project, location, model),
        headers: { Authorization: `Bearer ${token}` },
        promptText,
      });
      if (text) return { text, source: "vertex" };
    }
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    const text = await postGenerateContent({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      headers: {},
      promptText,
    });
    if (text) return { text, source: "gemini" };
  }

  return null;
}
