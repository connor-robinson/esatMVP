/**
 * Shared Vertex / Gemini JSON generation for mock-builder AI stages.
 */

import crypto from "crypto";
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

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

function readVertexServiceAccount(): ServiceAccount | null {
  const raw = (
    process.env.VERTEX_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    ""
  ).trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    return null;
  }
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getServiceAccountAccessToken(
  account: ServiceAccount,
): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = base64url(
      JSON.stringify({
        iss: account.client_email,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    );
    const unsigned = `${header}.${claim}`;
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(unsigned);
    signer.end();
    const signature = signer
      .sign(account.private_key, "base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const assertion = `${unsigned}.${signature}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

async function getVertexAccessToken(): Promise<{
  token: string | null;
  detail: string;
}> {
  const sa = readVertexServiceAccount();
  if (sa) {
    const token = await getServiceAccountAccessToken(sa);
    if (token) {
      return { token, detail: "service_account_json" };
    }
    return {
      token: null,
      detail:
        "VERTEX_SERVICE_ACCOUNT_JSON present but token exchange failed",
    };
  }

  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const value = typeof token === "string" ? token : token?.token ?? null;
    if (value) return { token: value, detail: "adc" };
    return {
      token: null,
      detail:
        "ADC available but returned no token (on Vercel set VERTEX_SERVICE_ACCOUNT_JSON)",
    };
  } catch (e) {
    return {
      token: null,
      detail: `ADC unavailable: ${
        e instanceof Error ? e.message : "unknown"
      } (on Vercel set VERTEX_SERVICE_ACCOUNT_JSON or GEMINI_API_KEY)`,
    };
  }
}

async function postGenerateContent(input: {
  url: string;
  headers: Record<string, string>;
  promptText: string;
}): Promise<{ text: string | null; error?: string }> {
  try {
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
      signal: AbortSignal.timeout(60000),
    });
    const bodyText = await res.text();
    if (!res.ok) {
      const snippet = bodyText.replace(/\s+/g, " ").slice(0, 240);
      return {
        text: null,
        error: `HTTP ${res.status} from model endpoint: ${snippet || res.statusText}`,
      };
    }
    let data: {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    try {
      data = JSON.parse(bodyText) as typeof data;
    } catch {
      return { text: null, error: "Model response was not JSON" };
    }
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      null;
    if (!text) {
      return { text: null, error: "Model returned no candidate text" };
    }
    return { text };
  } catch (e) {
    return {
      text: null,
      error: e instanceof Error ? e.message : "fetch failed",
    };
  }
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

export type LlmJsonResult =
  | { text: string; source: Exclude<LlmJsonSource, null>; error?: undefined }
  | { text?: undefined; source?: null; error: string };

/**
 * Prefer Vertex (service account JSON, then ADC), then Gemini API key.
 */
export async function generateJsonWithLlm(
  prompt: unknown,
  options?: { model?: string },
): Promise<LlmJsonResult> {
  const promptText =
    typeof prompt === "string" ? prompt : JSON.stringify(prompt);
  const model = options?.model || mockBuilderModelId();
  const errors: string[] = [];

  const project =
    process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_PROJECT || "";
  if (project) {
    const location = resolveVertexLocation(
      process.env.VERTEX_GENAI_LOCATION ||
        process.env.GOOGLE_CLOUD_LOCATION ||
        "",
    );
    const { token, detail } = await getVertexAccessToken();
    if (token) {
      const posted = await postGenerateContent({
        url: vertexGenerateUrl(project, location, model),
        headers: { Authorization: `Bearer ${token}` },
        promptText,
      });
      if (posted.text) return { text: posted.text, source: "vertex" };
      errors.push(
        `vertex(${location}/${model} via ${detail}): ${posted.error ?? "empty"}`,
      );
    } else {
      errors.push(`vertex: ${detail}`);
    }
  } else {
    errors.push("vertex: GOOGLE_CLOUD_PROJECT unset");
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    const posted = await postGenerateContent({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      headers: {},
      promptText,
    });
    if (posted.text) return { text: posted.text, source: "gemini" };
    errors.push(`gemini(${model}): ${posted.error ?? "empty"}`);
  } else {
    errors.push("gemini: GEMINI_API_KEY unset");
  }

  return { error: errors.join(" | ") };
}
